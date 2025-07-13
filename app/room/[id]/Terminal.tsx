/* ------------------------------------------------------------------
   app/room/[id]/Terminal.tsx
   ------------------------------------------------------------------ */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Copy,
  Minimize2,
  Loader2,
} from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';

/* ---------- Types ------------------------------------------------ */
type OutputKind = 'command' | 'stdout' | 'stderr' | 'info' | 'ai';

interface TermLine {
  id: string;
  kind: OutputKind;
  text: string;
}

interface Props {
  roomId: string;
  currentFile?: { id: string; name: string };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/* ---------- Component ------------------------------------------- */
export default function Terminal({
  roomId,
  currentFile,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  const { getCurrentContent } = useEditor();

  const [lines, setLines] = useState<TermLine[]>([]);
  const [cmd, setCmd] = useState('');
  const [busy, setBusy] = useState(false);

  const termRef = useRef<HTMLDivElement>(null);
  const aiAbort = useRef<AbortController | null>(null);

  /* ----- Helpers ------------------------------------------------- */
  const push = (kind: OutputKind, text: string) =>
    setLines((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, kind, text },
    ]);

  /** Scroll to bottom each time output changes */
  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [lines]);

  /** Abort pending AI call when component unmounts */
  useEffect(() => () => aiAbort.current?.abort(), []);

  /* ----- AI error explainer ------------------------------------- */
  const explainError = async (err: string) => {
    const code = getCurrentContent();
    try {
      aiAbort.current?.abort(); // cancel any previous call
      aiAbort.current = new AbortController();

      const res = await fetch('/api/gemini-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: aiAbort.current.signal,
        body: JSON.stringify({ roomId, errorText: err ,code}),
      });

      const { explanation } = await res.json();
      if (explanation) push('ai', explanation);
    } catch (e) {
      if ((e as any).name !== 'AbortError')
        push('info', '⚠️  AI explanation unavailable.');
    }
  };

  /* ----- Execute ------------------------------------------------- */
  const runFile = async () => {
    if (!currentFile) return push('stderr', 'No file selected.');

    const code = getCurrentContent();
    if (!code.trim()) return push('stderr', 'File is empty.');

    const ext = currentFile.name.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'node',
      ts: 'node',
      py: 'python',
      cpp: 'cpp',
      java: 'java',
    };
    const lang = langMap[ext || ''] || '';

    if (!lang) {
      return push('stderr', `Unsupported file type ".${ext}"`);
    }

    setBusy(true);
    push('info', `▶️  Running ${currentFile.name} ...`);

    try {
      const res = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          code,
          fileName: currentFile.name,
          roomId,
        }),
      });
      const { jobId, error } = await res.json();
      if (error) throw new Error(error);

      /* poll */
      let poll;
      await new Promise<void>((done, fail) => {
        poll = setInterval(async () => {
          const r = await fetch(`/api/terminal/result?jobId=${jobId}`);
          const data = await r.json();

          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            clearInterval(poll);
            if (data.output) push('stdout', data.output);
            if (data.error) {
              push('stderr', data.error);
              explainError(data.error); // AI explanation
            }
            if (!data.output && !data.error)
              push('info', '✅  Execution finished (no output).');
            done();
          }
        }, 1500);
      });
    } catch (e: any) {
      push('stderr', e.message);
      explainError(e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ----- Command line ------------------------------------------- */
  const handleSubmitCmd = () => {
    if (!cmd.trim()) return;
    push('command', `$ ${cmd}`);
    const lower = cmd.trim().toLowerCase();

    if (lower === 'clear') setLines([]);
    else if (lower === 'run') runFile();
    else push('stderr', `Unknown command: ${cmd}`);

    setCmd('');
  };

  /* -------------------------------------------------------------- */
  if (isCollapsed)
    return (
      <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4">
        <span className="text-sm text-gray-300">Terminal</span>
        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
          <Minimize2 className="w-4 h-4 rotate-180" />
        </Button>
      </div>
    );

  return (
    <div className="h-80 bg-gray-900 border-t border-gray-700 flex flex-col font-mono">
      {/* header */}
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300 font-medium">Terminal</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={runFile}
            disabled={busy}
            title="Run current file"
          >
            {busy ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLines([])}
            title="Clear terminal"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigator.clipboard.writeText(lines.map((l) => l.text).join('\n'))
            }
            title="Copy output"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* output */}
      <div
        ref={termRef}
        className="flex-1 p-4 overflow-y-auto text-sm whitespace-pre-wrap"
      >
        {lines.map((l) => (
          <div key={l.id}>
            {l.kind === 'command' && <span className="text-green-400">$ </span>}
            <span
              className={
                l.kind === 'stderr'
                  ? 'text-red-400'
                  : l.kind === 'info'
                  ? 'text-yellow-400'
                  : l.kind === 'ai'
                  ? 'text-cyan-300'
                  : 'text-gray-100'
              }
            >
              {l.text}
            </span>
          </div>
        ))}
        {busy && <div className="text-yellow-400 animate-pulse">Executing...</div>}
      </div>

      {/* prompt */}
      <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center px-4">
        <span className="text-green-400 mr-2">$</span>
        <input
          type="text"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmitCmd()}
          className="flex-1 bg-transparent text-gray-100 outline-none"
          placeholder='Type "run" or "clear" …'
          disabled={busy}
        />
      </div>
    </div>
  );
}
