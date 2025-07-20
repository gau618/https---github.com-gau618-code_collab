// File: app/room/[id]/CollaborativeEditor.tsx

"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MonacoBinding } from "y-monaco";
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
  Share2,
  Mic,
  StopCircle,
} from "lucide-react";
import { useEditor } from "@/contexts/EditorContext";
import { speak, stopSpeaking } from "@/utils/speech"; // Assuming you have this utility

/* -------------------------------------------------------------------------- */
/*  Type definitions                                                         */
/* -------------------------------------------------------------------------- */
type Status = "connecting" | "online" | "offline" | "error";
type AiActivityStatus = "idle" | "listening" | "generating" | "speaking";

/* -------------------------------------------------------------------------- */
/*  Language helpers                                                        */
/* -------------------------------------------------------------------------- */
const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    cpp: "cpp",
    java: "java",
  };
  return languageMap[extension || ""] || "plaintext";
};

/* -------------------------------------------------------------------------- */
/*  Main component                                                          */
/* -------------------------------------------------------------------------- */
export default function CollaborativeEditor() {
  /* ---------------------------- auth / context --------------------------- */
  const { data: session, status: authStatus } = useSession();
  const { currentFile, provider, yDoc, getCurrentCode } = useEditor();
  const jwt = session?.accessToken as string | undefined;

  /* ---------------------------- local state ------------------------------ */
  const [editor, setEditor] = useState<any>(null);
  const [monaco, setMonaco] = useState<any>(null);
  const [connStatus, setConnStatus] = useState<Status>("offline");
  const [collaborators, setCollaborators] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>("plaintext");
  const bindingRef = useRef<MonacoBinding>();

  const [aiActivityStatus, setAiActivityStatus] =
    useState<AiActivityStatus>("idle");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const apiAbortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  /* ----------------------- Update language on file change ----------------- */
  useEffect(() => {
    if (currentFile?.name) {
      const newLang = getLanguageFromFileName(currentFile.name);
      setCurrentLanguage(newLang);
      if (editor && monaco) {
        const model = editor.getModel();
        if (model) monaco.editor.setModelLanguage(model, newLang);
      }
    }
  }, [currentFile?.name, editor, monaco]);

  /* ----------------------------- onMount -------------------------------- */
  const onMount: OnMount = (editorInstance, monacoInstance) => {
    setEditor(editorInstance);
    setMonaco(monacoInstance);
  };

  /* ---------------------------------------------------------------------- */
  /*  Connection Status & Monaco Binding                                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (editor && monaco && yDoc && provider) {
      const yText = yDoc.getText("monaco");
      const model = editor.getModel();

      const onStatus = ({ status }: { status: string }) =>
        setConnStatus(status as Status);
      const onAwarenessChange = () =>
        setCollaborators(
          provider.awareness.getStates().size > 0
            ? provider.awareness.getStates().size - 1
            : 0
        );

      provider.on("status", onStatus);
      provider.awareness.on("change", onAwarenessChange);

      if (model) {
        bindingRef.current?.destroy();
        bindingRef.current = new MonacoBinding(
          yText,
          model,
          new Set([editor]),
          provider.awareness
        );
        provider.awareness.setLocalStateField("user", {
          name: session?.user?.name || "Anonymous",
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        });
      }

      return () => {
        provider.off("status", onStatus);
        provider.awareness.off("change", onAwarenessChange);
        bindingRef.current?.destroy();
      };
    }
  }, [editor, monaco, yDoc, provider, session?.user]);

  /* ---------------------------------------------------------------------- */
  /*  AI INLINE AUTO-COMPLETION                                            */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!editor || !monaco) return;

    const inlineCompletionsProvider =
      monaco.languages.registerInlineCompletionsProvider(
        { pattern: "**" }, // Register for all languages
        {
          async provideInlineCompletions(
            model: any,
            position: any,
            context: any,
            token: any
          ) {
            const codeContext = model.getValue();
            const currentLine = model.getLineContent(position.lineNumber);
            if (
              !currentLine.trim() ||
              context.triggerKind !==
                monaco.languages.InlineCompletionTriggerKind.Automatic
            ) {
              return { items: [] };
            }

            try {
              const res = await fetch("/api/gemini-assist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  codeContext,
                  language: currentLanguage,
                  currentLine,
                }),
              });

              if (!res.ok) return { items: [] };
              const { suggestion } = await res.json();

              if (suggestion && !token.isCancellationRequested) {
                return { items: [{ insertText: suggestion.trim() }] };
              }
            } catch (err) {
              console.error("[InlineSuggest] Error:", err);
            }
            return { items: [] };
          },
          freeInlineCompletions() {},
        }
      );

    return () => inlineCompletionsProvider.dispose();
  }, [editor, monaco, currentLanguage]);

  /* --------------------- voice-synthesis setup --------------------------- */
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        setAvailableVoices(voices);
        if (!selectedVoiceURI) {
          const defaultVoice = voices.find((v) => v.default) || voices[0];
          setSelectedVoiceURI(defaultVoice?.voiceURI || null);
        }
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  /* --------------------- AI voice question / answer helpers -------------- */
  const handleStopAI = useCallback(() => {
    stopSpeaking();
    recognitionRef.current?.abort();
    apiAbortControllerRef.current?.abort();
    setAiActivityStatus("idle");
  }, []);

  const handleAskDoubt = useCallback(() => {
    if (aiActivityStatus !== "idle") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported by your browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setAiActivityStatus("listening");
    recognition.onresult = async (event) => {
      setAiActivityStatus("generating");
      const question = event.results[0][0].transcript;
      const codeContext = getCurrentCode();
      apiAbortControllerRef.current = new AbortController();
      const { signal } = apiAbortControllerRef.current;
      try {
        const selectedVoice = availableVoices.find(
          (v) => v.voiceURI === selectedVoiceURI
        );
        const targetLanguage = selectedVoice?.lang || "en-US";
        const res = await fetch("/api/gemini-doubt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            codeContext,
            language: currentLanguage,
            targetLanguage,
          }),
          signal,
        });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error || `status: ${res.status}`);
        }
        const { answer } = await res.json();
        if (!signal.aborted) {
          setAiActivityStatus("speaking");
          speak(answer, selectedVoice || null);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Doubt resolution failed:", err);
          speak("Sorry, an error occurred.", null);
        }
      } finally {
        if (!signal.aborted) setAiActivityStatus("idle");
      }
    };
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setAiActivityStatus("idle");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setAiActivityStatus((prev) => (prev === "listening" ? "idle" : prev));
    };
    recognition.start();
  }, [
    getCurrentCode,
    aiActivityStatus,
    availableVoices,
    selectedVoiceURI,
    currentLanguage,
  ]);

  /* ---------------------------------------------------------------------- */
  /*  Early-return UI states                                              */
  /* ---------------------------------------------------------------------- */
  if (!currentFile)
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

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="h-full w-full relative bg-gray-900 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <StatusIndicator status={connStatus} />
            <CollaboratorCount count={collaborators} />
            {currentFile.name && (
              <LanguageIndicator language={currentLanguage} />
            )}
          </div>
          <div className="flex items-center space-x-2">
            {aiActivityStatus === "idle" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAskDoubt}
                title="Ask AI a Question"
              >
                <Mic className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStopAI}
                className="text-red-400 hover:text-red-300"
                title="Stop AI Response"
              >
                <StopCircle className="w-4 h-4 animate-pulse" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="pt-12 h-full w-full overflow-hidden">
        <Editor
          key={currentFile.id} // This key is crucial for re-mounting the editor on file change
          height="100%"
          language={currentLanguage}
          theme="vs-dark"
          onMount={onMount}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            wordWrap: "on",
            inlineSuggest: { enabled: true },
            automaticLayout: true,
            fontFamily: "'Fira Code', 'Monaco', 'Menlo', monospace",
            fontLigatures: true,
          }}
        />
      </div>
      {showSettings && (
        <div className="absolute top-12 right-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-20 min-w-64">
          <h3 className="text-white font-medium mb-3">Editor Settings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center text-gray-300">
              <span>File:</span>
              <span className="font-mono text-xs">{currentFile.name}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span>Language:</span>
              <span className="capitalize">{currentLanguage}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300 pt-2 border-t border-gray-700/50">
              <label htmlFor="voice-select" className="mr-2">
                AI Voice:
              </label>
              <select
                id="voice-select"
                value={selectedVoiceURI || ""}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="bg-gray-700 text-white text-xs rounded px-2 py-1 w-full max-w-[150px] truncate"
              >
                {availableVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helper components                                                       */
/* -------------------------------------------------------------------------- */
function StatusIndicator({ status }: { status: Status }) {
  const config = {
    online: {
      icon: <Wifi className="w-4 h-4" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
      text: "Connected",
    },
    connecting: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
      text: "Connecting",
    },
    offline: {
      icon: <WifiOff className="w-4 h-4" />,
      color: "text-gray-400",
      bg: "bg-gray-500/20",
      text: "Offline",
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: "text-red-400",
      bg: "bg-red-500/20",
      text: "Error",
    },
  }[status];
  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1 rounded-full ${config.bg}`}
    >
      <span className={config.color}>{config.icon}</span>
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
}

function CollaboratorCount({ count }: { count: number }) {
  return (
    <div className="flex items-center space-x-2 text-gray-300">
      <Users className="w-4 h-4" />
      <span className="text-sm">
        {count === 0
          ? "Just you"
          : `${count + 1} collaborator${count > 0 ? "s" : ""}`}
      </span>
    </div>
  );
}

function LanguageIndicator({ language }: { language: string }) {
  const getLanguageColor = (lang: string): string =>
    ({
      javascript: "text-yellow-400",
      typescript: "text-blue-400",
      python: "text-green-400",
      html: "text-orange-400",
      css: "text-blue-300",
      json: "text-yellow-300",
      markdown: "text-gray-300",
    }[lang] || "text-gray-400");
  return (
    <div className="flex items-center space-x-2 px-2 py-1 bg-gray-700/50 rounded">
      <div
        className={`w-2 h-2 rounded-full ${getLanguageColor(language).replace(
          "text-",
          "bg-"
        )}`}
      />
      <span className={`text-xs font-medium ${getLanguageColor(language)}`}>
        {language.toUpperCase()}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-900/50">
      <div className="text-center space-y-4 max-w-md mx-auto p-8">
        <div className="flex justify-center">{icon}</div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-100">{title}</h3>
          <p className="text-gray-400">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
