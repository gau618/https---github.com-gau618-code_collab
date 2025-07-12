import { Worker } from "bullmq";
import Docker from "dockerode";
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const docker = new Docker();
const redisConnection = { host: "localhost", port: 6379 };

const TEMP_DIR = join(process.cwd(), "temp_code");
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

async function executeInContainer(
  language: string,
  code: string,
  input: string
) {
  const imageName = `project-p_sandbox-${language}`;
  const uniqueDir = join(TEMP_DIR, `job-${Date.now()}-${Math.random()}`);
  mkdirSync(uniqueDir, { recursive: true });

  let fileName: string;
  let command: string[];

  switch (language) {
    case "python":
      fileName = "script.py";
      command = ["python", "-u", fileName];
      break;
    case "node":
      fileName = "script.js";
      command = ["node", fileName];
      break;
    case "cpp":
      fileName = "main.cpp";
      command = ["/bin/sh", "-c", `g++ ${fileName} -o main.out && ./main.out`];
      break;
    case "java": {
      const match = code.match(/public\s+class\s+(\w+)/);
      if (!match) {
        throw new Error("Java code must include one public class.");
      }

      const className = match[1];
      fileName = `${className}.java`;
      command = ["/bin/sh", "-c", `javac ${fileName} && java ${className}`];
      break;
    }

    default:
      throw new Error(`Unsupported language: ${language}`);
  }

  writeFileSync(join(uniqueDir, fileName), code);

  const hostConfig = {
    AutoRemove: false,
    NetworkMode: "none",
    Memory: 256 * 1024 * 1024,
    CpuQuota: 50000, // Limit to 5% of a CPU core
    PidsLimit: 100, // Prevent fork bombs
    CapDrop: ["ALL"], // Drop Linux capabilities
    ReadonlyRootfs: false, // Optional: may cause issues if true
    Binds: [`${uniqueDir}:/app`],
  };

  const container = await docker.createContainer({
    Image: imageName,
    Cmd: command,
    WorkingDir: "/app",
    HostConfig: hostConfig,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    OpenStdin: true,
  });

  try {
    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
    });
    await container.start();
    stream.write(input);
    stream.end();

    const data = await container.wait({ timeout: 15000 });
    const statusCode = data.StatusCode;

    const logBuffer = await container.logs({ stdout: true, stderr: true });
    const logs = logBuffer
      .toString("utf-8")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");

    let output = "";
    let error = "";

    if (statusCode === 0) {
      output = logs;
    } else {
      error = logs || `Process exited with error code ${statusCode}`;
    }

    return { stdout: output, stderr: error };
  } catch (err) {
    await container
      .stop()
      .catch((e) => console.error("Failed to stop timed-out container", e));
    throw new Error("Execution timed out after 15 seconds.");
  } finally {
    await container
      .remove({ force: true })
      .catch((e) => console.error("Failed to remove container", e));
    rmSync(uniqueDir, { recursive: true, force: true });
  }
}

// Queue worker setup
new Worker(
  "execution-queue",
  async (job) => {
    const { language, code, input, jobId } = job.data;
    console.log(`[WORKER] Processing job ${jobId}. Language: ${language}.`);

    await prisma.executionResult.upsert({
      where: { jobId },
      update: { status: "PENDING" },
      create: { jobId, status: "PENDING" },
    });

    try {
      const { stdout, stderr } = await executeInContainer(
        language,
        code,
        input
      );
      console.log(
        `[WORKER] Job ${jobId} completed with stdout: "${stdout}", stderr: "${stderr}"`
      );

      await prisma.executionResult.update({
        where: { jobId },
        data: { status: "COMPLETED", output: stdout, error: stderr },
      });
    } catch (error) {
      console.error(`[WORKER] Job ${jobId} failed:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      await prisma.executionResult.update({
        where: { jobId },
        data: { status: "FAILED", error: errorMessage },
      });

      throw new Error(errorMessage);
    }
  },
  { connection: redisConnection }
);

console.log("🚀 Execution Worker started successfully.");
