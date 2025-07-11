// worker.ts
import { Worker } from 'bullmq';
import Docker from 'dockerode';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const docker = new Docker();
const redisConnection = { host: 'localhost', port: 6379 };

const TEMP_DIR = join(process.cwd(), 'temp_code');
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

async function executeInContainer(language: string, code: string, input: string) {
  const imageName = `project-p_sandbox-${language}`;
  const uniqueDir = join(TEMP_DIR, `job-${Date.now()}-${Math.random()}`);
  mkdirSync(uniqueDir, { recursive: true });

  let fileName, command;

  switch (language) {
    case 'python':
      fileName = 'script.py';
      command = ['python', '-u', fileName];
      break;
    case 'node':
      fileName = 'script.js';
      command = ['node', fileName];
      break;
    case 'cpp':
      fileName = 'main.cpp';
      command = ['/bin/sh', '-c', `g++ ${fileName} -o main.out && ./main.out`];
      break;
    case 'java':
      fileName = 'Main.java';
      command = ['/bin/sh', '-c', `javac ${fileName} && java Main`];
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }

  writeFileSync(join(uniqueDir, fileName), code);

  const hostConfig = {
    // We set AutoRemove to false so we can collect logs after it exits.
    // We will remove the container manually in the 'finally' block.
    AutoRemove: false,
    NetworkMode: 'none',
    Memory: 256 * 1024 * 1024,
    CpuQuota: 50000,
    Binds: [`${uniqueDir}:/app:ro`],
  };

  const container = await docker.createContainer({
    Image: imageName,
    Cmd: command,
    WorkingDir: '/app',
    HostConfig: hostConfig,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    OpenStdin: true,
  });

  try {
    const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: true });
    await container.start();
    stream.write(input);
    stream.end();

    // Wait for the container to finish execution. This is the most reliable event.
    const data = await container.wait({ timeout: 15000 });
    const statusCode = data.StatusCode;

    // AFTER the container has exited, collect all buffered logs.
    const logBuffer = await container.logs({ stdout: true, stderr: true });
    
    // Sanitize the raw string to remove any invalid UTF-8 characters
    const logs = logBuffer.toString('utf-8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    let output = '';
    let error = '';

    // Distinguish output from error based on the container's exit code.
    if (statusCode === 0) {
      output = logs;
    } else {
      error = logs || `Process exited with error code ${statusCode}`;
    }

    return { stdout: output, stderr: error };

  } catch (err) {
    // This catches the timeout error from container.wait()
    await container.stop().catch(e => console.error("Failed to stop timed-out container", e));
    throw new Error('Execution timed out after 15 seconds.');
  } finally {
    // Ensure the container and temporary files are always cleaned up.
    await container.remove({ force: true }).catch(e => console.error("Failed to remove container", e));
    rmSync(uniqueDir, { recursive: true, force: true });
  }
}

// The rest of the worker logic remains the same
new Worker('execution-queue', async job => {
  const { language, code, input, jobId } = job.data;
  console.log(`[WORKER] Processing job ${jobId}. Language: ${language}.`);

  await prisma.executionResult.upsert({
    where: { jobId },
    update: { status: 'PENDING' },
    create: { jobId, status: 'PENDING' },
  });

  try {
    const { stdout, stderr } = await executeInContainer(language, code, input);
    console.log(`[WORKER] Job ${jobId} completed with stdout: "${stdout}", stderr: "${stderr}"`);
    
    await prisma.executionResult.update({
      where: { jobId },
      data: { status: 'COMPLETED', output: stdout, error: stderr },
    });

  } catch (error) {
    console.error(`[WORKER] Job ${jobId} failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    await prisma.executionResult.update({
      where: { jobId },
      data: { status: 'FAILED', error: errorMessage },
    });
    
    throw new Error(errorMessage);
  }
}, { connection: redisConnection });

console.log('🚀 Execution Worker started successfully.');
