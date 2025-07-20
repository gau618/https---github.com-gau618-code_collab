// File: worker.ts

import { Worker } from "bullmq";
import Docker from "dockerode";
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const docker = new Docker();
// Ensure you have Redis running at this address for BullMQ
const redisConnection = { host: "localhost", port: 6379 };

// Create a temporary directory to store code files for execution
const TEMP_DIR = join(process.cwd(), "temp_code");
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Executes code in a secure, isolated Docker container.
 * @param language The programming language (python, node, cpp, java).
 * @param code The source code to execute.
 * @param input The standard input to pass to the code. Defaults to an empty string.
 * @returns An object with stdout and stderr from the execution.
 */
async function executeInContainer(
  language: string,
  code: string,
  // FIX: Provide a default empty string for input. This prevents the TypeError
  // when a job is queued without an explicit input value.
  input: string = "" 
) {
  console.log(`[DOCKER] Preparing to execute ${language} code.`);
  
  const imageName = `project-p_sandbox-${language}`;
  const uniqueDir = join(TEMP_DIR, `job-${Date.now()}-${Math.random()}`);
  mkdirSync(uniqueDir, { recursive: true });

  let fileName: string;
  let command: string[];

  // Language-specific setup for file names and execution commands
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

  // Write the code to a temporary file
  writeFileSync(join(uniqueDir, fileName), code);

  // Docker container configuration for a secure sandbox
  const hostConfig = {
    AutoRemove: false, // We will remove it manually in the finally block
    NetworkMode: "none", // Disable networking for security
    Memory: 256 * 1024 * 1024, // 256MB memory limit
    CpuQuota: 50000, // Limit to 5% of a CPU core
    PidsLimit: 100, // Prevent fork bombs
    CapDrop: ["ALL"], // Drop all Linux capabilities
    Binds: [`${uniqueDir}:/app`], // Mount the code directory
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
    // The container must be started BEFORE attaching to its streams.
    await container.start();
    console.log(`[DOCKER] Container ${container.id.substring(0,12)} started.`);

    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
    });

    // Write input to the container and signal that no more input is coming.
    stream.write(input);
    stream.end();

    // Wait for the container to finish, with a 15-second timeout.
    const data = await container.wait({ timeout: 15000 });
    const statusCode = data.StatusCode;

    const logBuffer = await container.logs({ stdout: true, stderr: true });
    // Clean up potential non-printable characters from the raw Docker log stream
    const logs = logBuffer
      .toString("utf-8")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");

    return {
      stdout: statusCode === 0 ? logs : "",
      stderr: statusCode !== 0 ? (logs || `Process exited with code ${statusCode}`) : "",
    };

  } catch (err) {
    console.error(`[DOCKER] Container execution failed or timed out for ${container.id.substring(0,12)}.`, err);
    
    try {
        const logBuffer = await container.logs({ stdout: true, stderr: true });
        const logs = logBuffer.toString("utf-8").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
        console.error(`[DOCKER] Container logs on failure:\n--- START LOGS ---\n${logs}\n--- END LOGS ---`);
    } catch (logErr) {
        console.error("[DOCKER] Could not retrieve logs from failed container.", logErr);
    }

    await container
      .stop()
      .catch((e) => console.error("Failed to stop timed-out container", e));
      
    throw new Error("Execution timed out after 15 seconds or failed to run.");

  } finally {
    await container
      .remove({ force: true })
      .catch((e) => console.error("Failed to remove container", e));
    rmSync(uniqueDir, { recursive: true, force: true });
    console.log(`[DOCKER] Cleaned up container and temp directory for job.`);
  }
}

// --- BullMQ Worker Setup ---
new Worker(
  "execution-queue",
  async (job) => {
    // Destructure job data, providing a default for `input` just in case.
    const { language, code, input = '', jobId } = job.data;
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
      console.log(`[WORKER] Job ${jobId} completed.`);

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

      throw new Error(errorMessage); // Re-throw to let BullMQ know the job failed
    }
  },
  { connection: redisConnection }
);

console.log("🚀 Execution Worker started successfully. Waiting for jobs...");
