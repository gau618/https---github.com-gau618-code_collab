import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/* ───────── Types ───────── */
export type StreamEvent =
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "exit"; code: number | null };

interface ProcessInfo {
  proc: ChildProcessWithoutNullStreams;
  emitter: EventEmitter;
  buffer: StreamEvent[];
  roomId: string;
  tempFile?: string;
  attached: boolean;
  exitSeen?: number;
}

/* ───────── Temp folder ───────── */
const TEMP_DIR = join(process.cwd(), "temp");
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

const CLEANUP_TTL = 30_000; // 30 seconds

/* ───────── Implementation ───────── */
class ProcessManager {
  private readonly procs = new Map<string, ProcessInfo>();

  spawnProcess(opts: {
    roomId: string;
    type: "node" | "python" | "package-manager";
    command: string;
    fileContent?: string;
    fileName?: string;
  }): string {
    const { roomId, type, command, fileContent, fileName } = opts;

    let cmd = command.trim();
    let args: string[] = [];
    let tempFile: string | undefined;

    if (type === "node" || type === "python") {
      if (!fileContent || !fileName) throw new Error("Missing file data");
      tempFile = join(TEMP_DIR, `${roomId}_${Date.now()}_${fileName}`);
      writeFileSync(tempFile, fileContent, "utf8");

      cmd = type === "node" ? "node" : "python3";
      args = [tempFile];
    } else {
      const parts = command.split(" ").filter(Boolean);
      cmd = parts[0];
      args = parts.slice(1);
    }

    const proc = spawn(cmd, args, { cwd: TEMP_DIR, stdio: "pipe" });
    const emitter = new EventEmitter();
    const buffer: StreamEvent[] = [];
    const id = randomUUID();

    const info: ProcessInfo = {
      proc,
      emitter,
      buffer,
      roomId,
      tempFile,
      attached: false,
    };

    this.procs.set(id, info); // ✅ Set BEFORE handlers

    const push = (evt: StreamEvent) => {
      const current = this.procs.get(id);
      if (!current) return;
      if (current.emitter.listenerCount("event") === 0) {
        current.buffer.push(evt);
      } else {
        current.emitter.emit("event", evt);
      }
    };

    proc.stdout.on("data", (d) => push({ type: "stdout", data: d.toString() }));
    proc.stderr.on("data", (d) => push({ type: "stderr", data: d.toString() }));
    proc.on("error", (e) => push({ type: "stderr", data: e.message }));
    proc.on("close", (code) => {
      setTimeout(() => {
        push({ type: "exit", code });
        const info = this.procs.get(id);
        if (info) {
          info.exitSeen = Date.now();
          if (info.attached) this.armCleanup(id);
        }
      }, 1000); // 1s delay before pushing exit
    });

    console.log("✅ Process started with ID:", id);
    return id;
  }

  writeInput(id: string, input: string) {
    const info = this.procs.get(id);
    if (!info) throw new Error("Process not found");
    info.proc.stdin.write(input + "\n");
  }

  getEmitter(id: string) {
    const info = this.procs.get(id);
    if (!info) {
      console.warn("❌ getEmitter: Process not found for ID:", id);
      throw new Error("Process not found");
    }

    if (!info.attached) {
      info.attached = true;
      console.log("🔌 Emitter attached for ID:", id);

      // ✅ Flush buffer
      for (const evt of info.buffer) {
        console.log("[Replaying event to SSE]:", evt);
        info.emitter.emit("event", evt);
      }
      info.buffer.length = 0;

      // ✅ Arm cleanup if already exited
      if (info.exitSeen) {
        console.log("🧹 Already exited, arming cleanup for", id);
        this.armCleanup(id);
      }
    }

    return info.emitter;
  }

  private armCleanup(id: string) {
    setTimeout(() => this.cleanup(id), CLEANUP_TTL);
  }

  private cleanup(id: string) {
    const info = this.procs.get(id);
    if (!info) return;

    try {
      info.proc.stdin.destroy();
      info.proc.stdout.destroy();
      info.proc.stderr.destroy();
    } catch {}

    if (info.tempFile && existsSync(info.tempFile)) {
      try {
        unlinkSync(info.tempFile);
      } catch {}
    }

    this.procs.delete(id);
    console.log("🧹 Cleaned up process ID:", id);
  }
}

/* ───────── Global singleton ───────── */
declare global {
  // eslint-disable-next-line no-var
  var __PROCESS_MANAGER__: ProcessManager | undefined;
}

export const processManager =
  global.__PROCESS_MANAGER__ ??
  (global.__PROCESS_MANAGER__ = new ProcessManager());
