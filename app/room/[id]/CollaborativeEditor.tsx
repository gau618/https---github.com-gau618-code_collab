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
  Share2,
  Mic,
  StopCircle,
} from "lucide-react";
import { useEditor } from "@/contexts/EditorContext";
import { speak, stopSpeaking } from "@/utils/speech";

/* -------------------------------------------------------------------------- */
/*  Type definitions                                                          */
/* -------------------------------------------------------------------------- */
type Status = "connecting" | "online" | "offline" | "error";
type AiActivityStatus = "idle" | "listening" | "generating" | "speaking";
type Props = {
  fileId: string | null;
  currentUser: { id: string; name: string };
  fileName?: string;
};

/* -------------------------------------------------------------------------- */
/*  Language helpers & shared caches                                          */
/* -------------------------------------------------------------------------- */
const docCache = new Map<string, Y.Doc>();
const providerCache = new Map<string, HocuspocusProvider>();

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
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */
export default function CollaborativeEditor({
  fileId,
  currentUser,
  fileName,
}: Props) {
  /* ---------------------------- auth / context --------------------------- */
  const { data: session, status: authStatus } = useSession();
  const jwt = session?.accessToken as string | undefined;
  const { setGetCurrentContent } = useEditor();

  /* ---------------------------- local state ------------------------------ */
  const [editor, setEditor] = useState<any>(null);
  const [monaco, setMonaco] = useState<any>(null);
  const [connStatus, setConnStatus] = useState<Status>("offline");
  const [collaborators, setCollaborators] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>("javascript");
  const bindingRef = useRef<MonacoBinding>();

  const [aiActivityStatus, setAiActivityStatus] =
    useState<AiActivityStatus>("idle");
  const apiAbortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  /* --------------------- voice-synthesis state --------------------------- */
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);

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

  /* ----------------------- update language on file ---------------------- */
  useEffect(() => {
    if (fileName) setCurrentLanguage(getLanguageFromFileName(fileName));
  }, [fileName]);

  /* ------------------------ expose getter to ctx ------------------------ */
  useEffect(() => {
    if (editor) setGetCurrentContent(() => () => editor.getValue() || "");
  }, [editor, setGetCurrentContent]);

  /* ----------------------------- onMount -------------------------------- */
  const onMount: OnMount = (editorInstance, monacoInstance) => {
    setEditor(editorInstance);
    setMonaco(monacoInstance);

    /* set language immediately so Monaco has correct tokenisation */
    if (fileName) {
      const language = getLanguageFromFileName(fileName);
      const model = editorInstance.getModel();
      if (model) monacoInstance.editor.setModelLanguage(model, language);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  INLINE SUGGESTIONS: **fixed `text` key**                              */
  /* ---------------------------------------------------------------------- */
useEffect(() => {
  if (!editor || !monaco) return;

  console.log("[InlineSuggest] Registering inline completions...");

  const provider = monaco.languages.registerInlineCompletionsProvider(
    currentLanguage,
    {
      async provideInlineCompletions(model, position, context, token) {
        const codeContext = model.getValue();
        const currentLine = model.getLineContent(position.lineNumber);

        if (!currentLine.trim()) {
          return { items: [] };
        }

        try {
          console.log("[InlineSuggest] Fetching suggestion from Gemini...");

          const res = await fetch("/api/gemini-assist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              codeContext,
              language: currentLanguage,
              currentLine,
            }),
          });

          if (!res.ok) {
            console.error("[InlineSuggest] Request failed:", res.statusText);
            return { items: [] };
          }

          const { suggestion } = await res.json();

          if (suggestion && !token.isCancellationRequested) {
            const range = {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            };

            return {
              items: [
                {
                  insertText: suggestion.trim(),
                  range,
                  command: { id: "", title: "AI Suggestion" },
                },
              ],
            };
          }
        } catch (err) {
          console.error("[InlineSuggest] Error fetching:", err);
        }

        return { items: [] };
      },
      freeInlineCompletions() {},
    }
  );

  return () => {
    provider.dispose();
    console.log("[InlineSuggest] Provider disposed.");
  };
}, [editor, monaco, currentLanguage]);


  /* ---------------------------------------------------------------------- */
  /*  AI voice question / answer helpers                                    */
  /* ---------------------------------------------------------------------- */
  const handleStopAI = useCallback(() => {
    stopSpeaking();
    recognitionRef.current?.abort();
    apiAbortControllerRef.current?.abort();
    setAiActivityStatus("idle");
  }, []);

  const handleAskDoubt = useCallback(() => {
    if (aiActivityStatus !== "idle" || !editor) return;

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
      const codeContext = editor.getValue();

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
    editor,
    currentLanguage,
    aiActivityStatus,
    availableVoices,
    selectedVoiceURI,
  ]);

  /* ---------------------------------------------------------------------- */
  /*  Connection status & awareness                                         */
  /* ---------------------------------------------------------------------- */
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
    if (bindingRef.current?.awareness)
      setCollaborators(bindingRef.current.awareness.getStates().size - 1);
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Shared-doc / provider bootstrap                                       */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!fileId || !editor || !jwt) return;

    /* ensure model has correct language */
    const model = editor.getModel();
    if (!model) return;

    if (fileName) {
      const lang = getLanguageFromFileName(fileName);
      setCurrentLanguage(lang);
      monaco?.editor.setModelLanguage(model, lang);
    }

    /* obtain or create Y.Doc */
    const ydoc =
      docCache.get(fileId) ??
      (() => {
        const d = new Y.Doc();
        docCache.set(fileId, d);
        return d;
      })();

    /* cache provider per-user so multiple tabs re-use same socket */
    const cacheKey = `${fileId}:${jwt}`;
    let provider = providerCache.get(cacheKey);
    if (!provider) {
      provider = new HocuspocusProvider({
        url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ?? "ws://localhost:8081",
        name: fileId,
        token: jwt,
        useAuthenticationToken: true,
        document: ydoc,
      });
      providerCache.set(cacheKey, provider);
    }

    provider.on("status", handleStatus);

    /* bind Monaco ↔️ Yjs */
    bindingRef.current?.destroy(); // clean previous
    bindingRef.current = new MonacoBinding(
      ydoc.getText("monaco"),
      model,
      new Set([editor]),
      provider.awareness
    );
    bindingRef.current.awareness.on("change", handleAwarenessChange);

    /* cleanup */
    return () => {
      provider.off("status", handleStatus);
      bindingRef.current?.awareness.off("change", handleAwarenessChange);
      bindingRef.current?.destroy();
      bindingRef.current = undefined;
    };
  }, [
    fileId,
    editor,
    jwt,
    monaco,
    fileName,
    handleStatus,
    handleAwarenessChange,
  ]);

  /* ---------------------------------------------------------------------- */
  /*  Early-return UI states                                                */
  /* ---------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="h-full w-full relative bg-gray-900 overflow-hidden">
      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <StatusIndicator status={connStatus} />
            <CollaboratorCount count={collaborators} />
            {fileName && (
              <LanguageIndicator
                language={currentLanguage}
                fileName={fileName}
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            {aiActivityStatus === "idle" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAskDoubt}
                className="text-gray-300 hover:text-white"
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

      {/* editor */}
      <div className="pt-12 h-full w-full overflow-hidden">
        <Editor
          key={fileId}
          height="100%"
          language={currentLanguage}
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
            tabSize: currentLanguage === "python" ? 4 : 2,
            insertSpaces: true,
            detectIndentation: true,
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            quickSuggestions: true,
            parameterHints: { enabled: true },
            hover: { enabled: true },
            contextmenu: true,
            mouseWheelZoom: true,
            multiCursorModifier: "ctrlCmd",
            selectionHighlight: true,
            occurrencesHighlight: true,
            codeLens: true,
            folding: true,
            foldingStrategy: "auto",
            showFoldingControls: "mouseover",
            matchBrackets: "always",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoSurround: "languageDefined",
            inlineSuggest: { enabled: true },
          }}
        />
      </div>

      {/* settings pop-over */}
      {showSettings && (
        <div className="absolute top-12 right-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-20 min-w-64">
          <h3 className="text-white font-medium mb-3">Editor Settings</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center text-gray-300">
              <span>File:</span>
              <span className="font-mono text-xs">{fileName || "N/A"}</span>
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
/*  Helper components                                                         */
/* -------------------------------------------------------------------------- */
function LanguageIndicator({
  language,
  fileName,
}: {
  language: string;
  fileName: string;
}) {
  const getLanguageColor = (lang: string): string => {
    const colorMap: Record<string, string> = {
      javascript: "text-yellow-400",
      typescript: "text-blue-400",
      python: "text-green-400",
      html: "text-orange-400",
      css: "text-blue-300",
      json: "text-yellow-300",
      markdown: "text-gray-300",
    };
    return colorMap[lang] || "text-gray-400";
  };
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
