// app/room/[id]/Terminal.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash2, 
  Copy,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useEditor } from '@/contexts/EditorContext';

interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error' | 'info';
  content: string;
}

interface TerminalProps {
  roomId: string;
  currentFile?: { id: string; name: string; content: string };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Terminal({ roomId, currentFile, isCollapsed, onToggleCollapse }: TerminalProps) {
  const { getCurrentContent } = useEditor();
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to the bottom of the terminal on new output
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const addOutput = useCallback((type: TerminalOutput['type'], content: string) => {
    const newOutput: TerminalOutput = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
    };
    setOutput(prev => [...prev, newOutput]);
  }, []);

  // Function to poll the backend for the result of an execution job
  const pollForResult = useCallback((jobId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/terminal/result?jobId=${jobId}`);
        if (!res.ok) {
          // Stop polling if the job is not found or there's a server error
          throw new Error(`Failed to fetch result: ${res.statusText}`);
        }
        
        const result = await res.json();

        if (result.status === 'COMPLETED' || result.status === 'FAILED') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          
          if (result.output) addOutput('output', result.output);
          if (result.error) addOutput('error', result.error);
          if (!result.output && !result.error && result.status === 'COMPLETED') {
            addOutput('info', 'Execution finished with no output.');
          }
          
          setIsRunning(false);
        }
      } catch (error) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        const message = error instanceof Error ? error.message : 'Polling failed.';
        addOutput('error', message);
        setIsRunning(false);
      }
    }, 2000); // Poll every 2 seconds
  }, [addOutput]);

  // Main function to start a code execution job
  const handleExecute = useCallback(async (language: string, code: string, input: string = '') => {
    if (isRunning) return;

    setIsRunning(true);
    addOutput('info', `Executing ${language} code...`);

    try {
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code, input }),
      });

      const { jobId, error } = await response.json();

      if (error) throw new Error(error);

      addOutput('info', `Execution started with Job ID: ${jobId}`);
      pollForResult(jobId);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      addOutput('error', message);
      setIsRunning(false);
    }
  }, [isRunning, addOutput, pollForResult]);

  // Handler for the "Run" button
  const runCurrentFile = useCallback(() => {
    if (!currentFile) {
      addOutput('error', 'No file selected.');
      return;
    }
    const code = getCurrentContent();
    if (!code.trim()) {
      addOutput('error', 'The file is empty.');
      return;
    }

    const extension = currentFile.name.split('.').pop()?.toLowerCase();
    let language = '';

    switch (extension) {
      case 'js': language = 'node'; break;
      case 'py': language = 'python'; break;
      case 'cpp': language = 'cpp'; break;
      case 'java': language = 'java'; break;
      default:
        addOutput('error', `File type ".${extension}" is not supported for execution.`);
        return;
    }

    handleExecute(language, code);
  }, [currentFile, getCurrentContent, addOutput, handleExecute]);

  // Handler for the text input in the terminal
  const handleCommandSubmit = () => {
    if (!currentCommand.trim()) return;

    addOutput('command', `$ ${currentCommand}`);

    const parts = currentCommand.trim().split(' ');
    const command = parts[0].toLowerCase();
    
    // Client-side commands
    if (command === 'clear') {
      setOutput([]);
    } else if (['python', 'node', 'cpp', 'java'].includes(command)) {
      // For execution commands, use the content of the currently active file
      if (!currentFile) {
        addOutput('error', `No file selected to run with "${command}".`);
      } else {
        handleExecute(command, getCurrentContent());
      }
    } else {
      addOutput('error', `Command not found: ${command}. Supported commands: python, node, cpp, java, clear.`);
    }
    setCurrentCommand('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommandSubmit();
  };
  
  const clearTerminal = () => setOutput([]);
  
  const copyOutput = () => {
    const outputText = output.map(item => item.content).join('\n');
    navigator.clipboard.writeText(outputText);
  };
  
  // --- UI Rendering ---

  if (isCollapsed) {
    return (
      <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4">
        {/* ... Collapsed UI ... */}
      </div>
    );
  }

  return (
    <div className="h-80 bg-gray-900 border-t border-gray-700 flex flex-col font-mono">
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300 font-medium">Terminal</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={runCurrentFile} disabled={!currentFile || isRunning} title="Run current file"><Play className="w-3 h-3" /></Button>
          <Button variant="ghost" size="sm" onClick={clearTerminal} title="Clear terminal"><Trash2 className="w-3 h-3" /></Button>
          <Button variant="ghost" size="sm" onClick={copyOutput} title="Copy output"><Copy className="w-3 h-3" /></Button>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}><Minimize2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <div ref={terminalRef} className="flex-1 p-4 overflow-y-auto text-sm">
        {output.map((item) => (
          <div key={item.id} className="whitespace-pre-wrap">
            {item.type === 'command' && <span className="text-green-400">$ </span>}
            <span className={
              item.type === 'error' ? 'text-red-400' :
              item.type === 'info' ? 'text-yellow-400' :
              'text-gray-100'
            }>
              {item.content}
            </span>
          </div>
        ))}
        {isRunning && <div className="text-yellow-400 animate-pulse">Executing...</div>}
      </div>

      <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center px-4">
        <span className="text-green-400 mr-2">$</span>
        <input
          type="text"
          value={currentCommand}
          onChange={(e) => setCurrentCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isRunning}
          className="flex-1 bg-transparent text-gray-100 outline-none"
          placeholder="Type a command (e.g., 'python') to run the current file..."
          autoFocus
        />
      </div>
    </div>
  );
}