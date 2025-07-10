"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Loader2, 
  FileText, 
  AlertCircle,
  Settings,
  Download,
  Share2
} from "lucide-react";

type Status = "connecting" | "online" | "offline" | "error";
type Props = { 
  fileId: string | null;
  currentUser: { id: string; name: string };
};

const docCache = new Map<string, Y.Doc>();
const providerCache = new Map<string, HocuspocusProvider>();

export default function CollaborativeEditor({ fileId, currentUser }: Props) {
  const { data: session, status: authStatus } = useSession();
  const jwt = session?.accessToken as string | undefined;

  const [editor, setEditor] = useState<any>(null);
  const [connStatus, setConnStatus] = useState<Status>("offline");
  const [collaborators, setCollaborators] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const bindingRef = useRef<MonacoBinding>();

  const onMount: OnMount = (inst) => setEditor(inst);

  const handleStatus = useCallback(({ status }: { status: string }) => {
    setConnStatus(
      status === "connected"
        ? "online"
        : status === "connecting"
        ? "connecting"
        : "offline"
    );
  }, []);

  const handleAwarenessChange = useCallback(() => {
    if (bindingRef.current?.awareness) {
      const states = bindingRef.current.awareness.getStates();
      setCollaborators(states.size - 1); // Exclude current user
    }
  }, []);

  useEffect(() => {
    if (!fileId || !editor || !jwt) return;

    const model = editor.getModel();
    if (!model) return;

    const ydoc =
      docCache.get(fileId) ?? (() => {
        const d = new Y.Doc();
        docCache.set(fileId, d);
        return d;
      })();

    const cacheKey = `${fileId}:${jwt}`;
    let provider = providerCache.get(cacheKey);
    if (!provider) {
      provider = new HocuspocusProvider({
        url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ?? "ws://localhost:8081",
        name: fileId,
        token: jwt,
        useAuthenticationToken: true,
        document: ydoc,
        onOpen: () => console.log("🧩 Socket opened"),
        onClose: () => console.log("❌ Socket closed"),
        onMessage: (msg) => console.log("📩 WS message:", msg),
      });
      providerCache.set(cacheKey, provider);
    }

    provider.on("status", handleStatus);

    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(
      ydoc.getText("monaco"),
      model,
      new Set([editor]),
      provider.awareness
    );

    // Listen for awareness changes
    bindingRef.current.awareness.on("change", handleAwarenessChange);

    return () => {
      provider.off("status", handleStatus);
      if (bindingRef.current) {
        bindingRef.current.awareness.off("change", handleAwarenessChange);
        bindingRef.current.destroy();
        bindingRef.current = undefined;
      }
    };
  }, [fileId, editor, jwt, handleStatus, handleAwarenessChange]);

  if (!fileId)
    return (
      <EmptyState 
        icon={<FileText className="w-12 h-12 text-gray-400" />}
        title="No File Selected"
        description="Select a file from the sidebar to start collaborating"
      />
    );

  if (authStatus === "loading")
    return (
      <EmptyState 
        icon={<Loader2 className="w-12 h-12 text-blue-500 animate-spin" />}
        title="Authenticating"
        description="Verifying your credentials..."
      />
    );

  if (!jwt)
    return (
      <EmptyState 
        icon={<AlertCircle className="w-12 h-12 text-amber-500" />}
        title="Authentication Required"
        description="Please sign in to edit this file"
        action={
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Sign In
          </Button>
        }
      />
    );

  return (
    <div className="h-full w-full relative bg-gray-900 overflow-hidden">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <StatusIndicator status={connStatus} />
            <CollaboratorCount count={collaborators} />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="pt-12 h-full w-full overflow-hidden">
        <Editor
          key={fileId}
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          onMount={onMount}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            wordWrap: "on",
            lineNumbers: "on",
            renderWhitespace: "selection",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            fontFamily: "'Fira Code', 'Monaco', 'Menlo', monospace",
            fontLigatures: true,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-12 right-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-20 min-w-64">
          <h3 className="text-white font-medium mb-3">Editor Settings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>File ID:</span>
              <span className="font-mono text-xs">{fileId}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>User:</span>
              <span>{currentUser.name}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Status:</span>
              <span className="capitalize">{connStatus}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ status }: { status: Status }) {
  const config = {
    online: {
      icon: <Wifi className="w-4 h-4" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
      text: "Connected"
    },
    connecting: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
      text: "Connecting"
    },
    offline: {
      icon: <WifiOff className="w-4 h-4" />,
      color: "text-gray-400",
      bg: "bg-gray-500/20",
      text: "Offline"
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: "text-red-400",
      bg: "bg-red-500/20",
      text: "Error"
    }
  };

  const { icon, color, bg, text } = config[status];

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${bg}`}>
      <span className={color}>{icon}</span>
      <span className={`text-sm font-medium ${color}`}>{text}</span>
    </div>
  );
}

function CollaboratorCount({ count }: { count: number }) {
  return (
    <div className="flex items-center space-x-2 text-gray-300">
      <Users className="w-4 h-4" />
      <span className="text-sm">
        {count === 0 ? "Just you" : `${count + 1} collaborator${count > 0 ? 's' : ''}`}
      </span>
    </div>
  );
}

function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 overflow-hidden">
      <div className="text-center space-y-4 max-w-md mx-auto p-8">
        <div className="flex justify-center">{icon}</div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
