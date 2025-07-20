// File: app/room/[id]/client.tsx

"use client";

import type { File as PrismaFile, Room as PrismaRoom } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Rnd } from "react-rnd";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Monitor,
  MonitorOff,
  Terminal as TerminalIcon,
  Users,
  FileText,
  Crown,
  Loader2,
  X,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
} from "lucide-react";

// --- CONTEXT AND SUB-COMPONENT IMPORTS ---
import { EditorProvider, useEditor } from "@/contexts/EditorContext";
import FileTree from "./FileTree";
import ManageMembers from "./ManageMembers";
import VideoConferenceComponent from "./VideoConference";
import Terminal from "./Terminal";

// --- DYNAMIC EDITOR IMPORT ---
const CollaborativeEditor = dynamic(() => import("./CollaborativeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-900 overflow-hidden">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading collaborative editor...</p>
      </div>
    </div>
  ),
});

// --- TYPE DEFINITIONS ---
type InitialData = {
  room: PrismaRoom & {
    files: PrismaFile[];
    memberships: Array<{
      role: string;
      userId: string;
      user: {
        id: string;
        name: string | null;
        image: string | null;
      };
    }>;
  };
};

// =================================================================================
// --- SUB-COMPONENTS ---
// These components are preserved as they are functionally correct.
// =================================================================================

function FloatingVideoWidget({
  roomId,
  isVisible,
  onClose,
  onMinimize,
  isMinimized,
}: {
  roomId: string;
  isVisible: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 400, height: 300 });

  if (!isVisible) return null;

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      setPosition({ x: 20, y: 20 });
      setSize({
        width: window.innerWidth - 40,
        height: window.innerHeight - 40,
      });
    } else {
      setPosition({ x: 50, y: 50 });
      setSize({ width: 400, height: 300 });
    }
  };
  const handleReset = () => {
    setPosition({ x: 50, y: 50 });
    setSize({ width: 400, height: 300 });
    setIsMaximized(false);
  };

  return (
    <Rnd
      size={isMinimized ? { width: 200, height: 40 } : size}
      position={position}
      onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        if (!isMinimized) {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPosition(position);
        }
      }}
      minWidth={isMinimized ? 200 : 300}
      minHeight={isMinimized ? 40 : 200}
      bounds="window"
      dragHandleClassName="video-widget-header"
      className="z-50"
      style={{ zIndex: 9999 }}
      enableResizing={!isMinimized}
    >
      <div className="h-full w-full bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl overflow-hidden">
        <div className="video-widget-header bg-gray-800 border-b border-gray-600 px-3 py-2 flex items-center justify-between cursor-move">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Video Call</span>
          </div>
          <div className="flex items-center space-x-1">
            {!isMinimized && (
              <>
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 w-6 p-0 text-gray-400 hover:text-white" title="Reset">
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleMaximize} className="h-6 w-6 p-0 text-gray-400 hover:text-white" title={isMaximized ? "Restore" : "Maximize"}>
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0 text-gray-400 hover:text-white" title={isMinimized ? "Expand" : "Minimize"}>
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 text-gray-400 hover:text-red-400" title="Close">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {!isMinimized && (
          <div className="flex-1 bg-black" style={{ height: "calc(100% - 40px)" }}>
            <VideoConferenceComponent roomId={roomId} />
          </div>
        )}
      </div>
    </Rnd>
  );
}

function MembersPopup({
  memberships,
  currentUserId,
  roomId,
  isAdmin,
}: {
  memberships: InitialData["room"]["memberships"];
  currentUserId: string;
  roomId: string;
  isAdmin: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <Users className="w-4 h-4" />
          <span className="ml-2 text-xs hidden sm:inline">
            Members ({memberships.length})
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Room Members
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {memberships.map(({ user, role }) => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50">
              <div className="relative">
                <img src={user.image || "/default-avatar.png"} alt={user.name || "User"} className="w-10 h-10 rounded-full" />
                {role === "ADMIN" && (
                  <Crown className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {user.name}
                  {user.id === currentUserId && (
                    <span className="text-xs text-gray-400 ml-1">(You)</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {role.toLowerCase()}
                </p>
              </div>
            </div>
          ))}
        </div>
        {isAdmin && (
          <div className="border-t border-gray-700 pt-4 mt-4">
            <ManageMembers
              roomId={roomId}
              members={memberships}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =================================================================================
// --- THE MAIN UI COMPONENT (CONTEXT CONSUMER) ---
// =================================================================================

function RoomPageContent({ initialData }: { initialData: InitialData }) {
  const { data: session } = useSession();
  const { room } = initialData;
  const currentUserMembership = room.memberships.find(
    (m) => m.userId === session?.user?.id
  );

  // State from the central context
  const { currentFile, isLoadingFiles } = useEditor();

  // Local UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoMinimized, setVideoMinimized] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);

  const handleVideoToggle = () => setVideoVisible(!videoVisible);
  const handleVideoMinimize = () => setVideoMinimized(!videoMinimized);
  const handleVideoClose = () => {
    setVideoVisible(false);
    setVideoMinimized(false);
  };

  if (!session?.user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden relative">
      <aside
        className={`${
          sidebarCollapsed ? "w-0" : "w-80"
        } transition-all duration-300 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden flex-shrink-0`}
      >
        {!sidebarCollapsed && (
          <>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold truncate">{room.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(true)}>
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto min-h-0">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                // FIX: Removed unnecessary props from FileTree.
                // It now correctly gets all its data and functions from the EditorContext.
                <FileTree />
              )}
            </div>
          </>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center space-x-4">
            {sidebarCollapsed && (
              <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(false)}>
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            )}
            {currentFile && (
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">{currentFile.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <MembersPopup
              memberships={room.memberships}
              currentUserId={session.user.id}
              roomId={room.id}
              isAdmin={currentUserMembership?.role === "ADMIN"}
            />
            <Button variant="ghost" size="sm" onClick={() => setTerminalCollapsed(!terminalCollapsed)}>
              <TerminalIcon className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleVideoToggle} className={videoVisible ? "text-blue-400" : ""}>
              {videoVisible ? (
                <MonitorOff className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex-1 relative min-h-0">
          <CollaborativeEditor />
        </div>
        <Terminal
          roomId={room.id}
          isCollapsed={terminalCollapsed}
          onToggleCollapse={() => setTerminalCollapsed(!terminalCollapsed)}
        />
      </main>

      <FloatingVideoWidget
        roomId={room.id}
        isVisible={videoVisible}
        onClose={handleVideoClose}
        onMinimize={handleVideoMinimize}
        isMinimized={videoMinimized}
      />
    </div>
  );
}

// =================================================================================
// --- THE MAIN EXPORTED COMPONENT (PROVIDER WRAPPER) ---
// =================================================================================
export default function RoomClientPage({
  initialData,
}: {
  initialData: InitialData;
}) {
  return (
    <EditorProvider roomId={initialData.room.id}>
      <RoomPageContent initialData={initialData} />
    </EditorProvider>
  );
}
