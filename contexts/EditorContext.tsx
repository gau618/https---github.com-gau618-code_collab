// File: contexts/EditorContext.tsx

"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { useSession } from "next-auth/react";

// --- TYPE DEFINITIONS ---
// FIX: Added the 'content' property to match the Prisma model.
interface File {
  id: string;
  name: string;
  type: "FILE" | "FOLDER";
  content: string; // This property was missing.
  roomId: string;
  parentId: string | null;
  children?: File[];
}

interface EditorContextType {
  files: File[];
  currentFile: File | null;
  provider: HocuspocusProvider | null;
  yDoc: Y.Doc | null;
  isLoadingFiles: boolean;
  roomId: string; // FIX: Added roomId to the context for reliable global access.
  openFile: (file: File) => void;
  runCode: () => Promise<{ jobId: string }>;
  refreshFileList: () => void;
  openFileByPath: (path: string) => void;
  getCurrentCode: () => string;
}

// --- CONTEXT CREATION ---
const EditorContext = createContext<EditorContextType | null>(null);

// --- PROVIDER COMPONENT ---
export const EditorProvider = ({
  children,
  roomId,
}: {
  children: ReactNode;
  roomId: string;
}) => {
  const { data: session } = useSession();

  // --- STATE MANAGEMENT ---
  const [files, setFiles] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);

  const providerRef = useRef<HocuspocusProvider | null>(null);

  // --- CORE FUNCTIONS ---
  const openFile = useCallback(
    (file: File) => {
      if (file.type !== "FILE" || file.id === currentFile?.id) return;

      providerRef.current?.destroy();

      setCurrentFile(file);

      if (!session?.accessToken) {
        console.error(
          "Authentication token not available for Hocuspocus connection."
        );
        return;
      }
      console.log(session.accessToken);
      const newYDoc = new Y.Doc();
      const newProvider = new HocuspocusProvider({
        url: "ws://localhost:8081",
        name: file.id,
        document: newYDoc,
        token: session.accessToken,
        onConnect: () => console.log("✅ Connected to Hocuspocus"),
        onDisconnect: () => console.log("❌ Disconnected from Hocuspocus"),
        onStatus: ({ status }) => console.log("🔄 Status:", status),
        onAuthenticationFailed: ({ reason }) =>
          console.error("🚨 Auth failed:", reason),
      });

      providerRef.current = newProvider;
      setProvider(newProvider);
      setYDoc(newYDoc);
    },
    [currentFile?.id, session?.accessToken]
  );

  const refreshFileList = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch(`/api/files?roomId=${roomId}`);
      if (!res.ok) throw new Error("Failed to fetch file list");
      const data = await res.json();
      const fetchedFiles = data.files || [];
      setFiles(fetchedFiles);

      if (!currentFile) {
        const findFirstFile = (items: File[]): File | null => {
          for (const item of items) {
            if (item.type === "FILE") return item;
            if (item.children) {
              const childFile = findFirstFile(item.children);
              if (childFile) return childFile;
            }
          }
          return null;
        };
        const firstFile = findFirstFile(fetchedFiles);
        if (firstFile) {
          openFile(firstFile);
        }
      }
    } catch (error) {
      console.error(error);
      setFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [roomId, currentFile, openFile]);

  const runCode = async (): Promise<{ jobId: string }> => {
    if (!currentFile)
      throw new Error("Cannot run code: No file is currently selected.");

    const res = await fetch("/api/terminal/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: currentFile.id }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to start code execution.");
    }
    return res.json();
  };

  const getCurrentCode = (): string => {
    if (!yDoc) return "";
    return yDoc.getText("monaco").toString();
  };

  const openFileByPath = (path: string) => {
    const segments = path.split("/").filter((p) => p);
    let currentItems: File[] = files;
    let foundFile: File | null = null;
    for (const segment of segments) {
      const item = currentItems.find((f) => f.name === segment);
      if (!item) {
        console.error(`Path not found: ${path}`);
        return;
      }
      if (item.type === "FOLDER" && item.children) {
        currentItems = item.children;
      } else if (item.type === "FILE") {
        foundFile = item;
        break;
      } else {
        console.error(`Invalid path: ${path}`);
        return;
      }
    }
    if (foundFile) openFile(foundFile);
  };

  // --- LIFECYCLE HOOKS ---
  useEffect(() => {
    if (session) {
      refreshFileList();
    }
  }, [session, refreshFileList]);

  useEffect(() => {
    return () => providerRef.current?.destroy();
  }, []);

  // --- CONTEXT VALUE AND RETURN ---
  // FIX: Added `roomId` to the context value to make it available to all consumers.
  const value: EditorContextType = {
    files,
    currentFile,
    provider,
    yDoc,
    isLoadingFiles,
    roomId,
    openFile,
    runCode,
    refreshFileList,
    openFileByPath,
    getCurrentCode,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};

// --- CUSTOM HOOK ---
export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};
