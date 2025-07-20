// File: app/room/[id]/Terminal.tsx

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Copy,
  Minimize2,
  Loader2,
} from "lucide-react";
import { useEditor } from "@/contexts/EditorContext";

// --- Types ---
type OutputKind = "command" | "stdout" | "stderr" | "info";
interface TermLine {
  id: string;
  kind: OutputKind;
  text: string;
}
interface Props {
  roomId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// --- Component ---
export default function Terminal({
  roomId,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  // Get necessary functions and state from the central EditorContext.
  const { currentFile, runCode, refreshFileList, openFileByPath } = useEditor();

  // State for managing terminal output, input, and history.
  const [lines, setLines] = useState<TermLine[]>([
    {
      id: "init",
      kind: "info",
      text: "Terminal ready. Type 'help' for commands.",
    },
  ]);
  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwdId, setCwdId] = useState<string | null>(null);
  const [cwdPath, setCwdPath] = useState<string>("/");
  const termRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  // Helper to add a new line to the terminal output.
  const push = useCallback((kind: OutputKind, text: string) => {
    setLines((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, kind, text },
    ]);
  }, []);

  // Effect to auto-scroll to the bottom of the terminal on new output.
  useEffect(() => {
    termRef.current?.scrollTo({
      top: termRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines]);

  // --- Command Handlers ---
  // Handles generic commands executed on the server.
  const executeRemoteCommand = async (command: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/terminal/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, cwdId: cwdId, cwdPath, roomId }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.output) push("stdout", data.output);
        // Refresh the file tree if a file system command was executed.
        if (["mkdir", "touch", "rm"].includes(command.split(" ")[0])) {
          if (refreshFileList) refreshFileList();
        }
      } else {
        push("stderr", data.error || "An unknown error occurred.");
      }
    } catch (e: any) {
      push("stderr", "Failed to connect to terminal service.");
    } finally {
      setBusy(false);
    }
  };

  // Handles the 'cd' command to change the current working directory.
  const handleCdCommand = async (target: string) => {
    if (!target) {
      setCwdId(null);
      setCwdPath("/");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/terminal/cd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPath: target,
          currentCwdId: cwdId,
          currentCwdPath: cwdPath,
          roomId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCwdId(data.newCwdId);
        setCwdPath(data.newCwdPath);
      } else {
        push("stderr", data.error);
      }
    } catch (e) {
      push("stderr", "Failed to execute cd command.");
    } finally {
      setBusy(false);
    }
  };

  // Handles the 'open' command to open a file in the editor.
  const handleOpenCommand = (target: string) => {
    if (!target) return push("stderr", "Usage: open <file_name>");
    if (!openFileByPath)
      return push("stderr", "File opening is not configured.");
    const fullPath = cwdPath === "/" ? `/${target}` : `${cwdPath}/${target}`;
    openFileByPath(fullPath);
  };

  // Handles the 'run' command to execute the currently open file.
  const handleRunCommand = async () => {
    if (!currentFile) {
      push("stderr", "No file selected to run.");
      return;
    }
    if (!runCode) {
      push("stderr", "Code execution is not configured.");
      return;
    }

    setBusy(true);
    push("info", `▶️  Queuing ${currentFile.name} for execution...`);

    try {
      const { jobId } = await runCode(); // Calls the context, gets a jobId back
      push("info", `✅ Job submitted. Waiting for result...`);

      // Polls the server for the result of the asynchronous execution job.
      const poller = setInterval(async () => {
        try {
          const res = await fetch(`/api/terminal/result?jobId=${jobId}`);
          if (!res.ok) return;
          const data = await res.json();

          if (data.status === "COMPLETED" || data.status === "FAILED") {
            clearInterval(poller); // Stop polling once the job is done
            if (data.output) push("stdout", data.output);
            if (data.error) push("stderr", data.error);
            setBusy(false); // Release the terminal
          }
        } catch (error) {
          clearInterval(poller);
          push("stderr", "Error fetching execution result.");
          setBusy(false);
        }
      }, 2000); // Poll every 2 seconds
    } catch (error: any) {
      push("stderr", error.message);
      setBusy(false); // Release terminal on submission error
    }
  };

  // Main command submission handler.
  const handleSubmitCmd = async () => {
    if (!cmd.trim() || busy) return;
    const fullCmd = cmd.trim();
    push("command", `${cwdPath} $ ${fullCmd}`);
    setHistory((prev) => [fullCmd, ...prev].slice(0, 50));
    setHistoryIndex(-1);
    setCmd("");
    const [command, ...args] = fullCmd.split(/\s+/);
    switch (command.toLowerCase()) {
      case "clear":
        setLines([]);
        break;
      case "help":
        push("info", "ls, cd, mkdir, touch, cat, rm, open, run, clear");
        break;
      case "run":
        await handleRunCommand();
        break;
      case "cd":
        await handleCdCommand(args[0] || "/");
        break;
      case "open":
        handleOpenCommand(args[0]);
        break;
      case "ls":
      case "mkdir":
      case "touch":
      case "cat":
      case "rm":
        await executeRemoteCommand(fullCmd);
        break;
      default:
        push("stderr", `Command not found: ${command}.`);
    }
  };

  // Handles keyboard events for command history (up/down arrows) and submission (Enter).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmitCmd();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      if (newIndex >= 0) setCmd(history[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setCmd(newIndex >= 0 ? history[newIndex] : "");
    }
  };

  if (isCollapsed) {
    return (
      <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4">
        <span className="text-sm text-gray-300">Terminal</span>
        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
          <Minimize2 className="w-4 h-4 rotate-180" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[300px] bg-gray-900 border-t border-gray-700 flex flex-col font-mono">
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300 font-medium">Terminal</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={handleRunCommand} disabled={busy || !currentFile} title="Run current file">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLines([])} title="Clear terminal">
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(lines.map((l) => l.text).join("\n"))} title="Copy output">
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse} title="Collapse terminal">
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div ref={termRef} className="flex-1 p-4 overflow-y-auto text-sm whitespace-pre-wrap">
        {lines.map((l) => (
          <div key={l.id}>
            {l.kind === "command" ? (
              <>
                <span className="text-gray-500">{l.text.split(" $ ")[0]} ${" "}</span>
                <span className="text-gray-100">{l.text.substring(l.text.indexOf("$") + 2)}</span>
              </>
            ) : (
              <span className={l.kind === "stderr" ? "text-red-400" : l.kind === "info" ? "text-yellow-400" : "text-gray-100"}>
                {l.text}
              </span>
            )}
          </div>
        ))}
        {busy && <div className="text-yellow-400 animate-pulse">Executing...</div>}
      </div>
      <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center px-4 flex-shrink-0">
        <span className="text-cyan-400">{cwdPath}</span>
        <span className="text-green-400 mx-2">$</span>
        <input
          type="text"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-gray-100 outline-none"
          placeholder="Type a command..."
          disabled={busy}
          autoFocus
        />
      </div>
    </div>
  );
}
