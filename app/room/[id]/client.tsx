'use client';

import type { File as PrismaFile, Room as PrismaRoom } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  RotateCcw
} from 'lucide-react';
import FileTree from './FileTree';
import ManageMembers from './ManageMembers';
import VideoConferenceComponent from './VideoConference';
import Terminal from './Terminal';
import { EditorProvider } from '@/contexts/EditorContext';

const CollaborativeEditor = dynamic(
  () => import('./CollaborativeEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-900 overflow-hidden">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading collaborative editor...</p>
        </div>
      </div>
    ),
  },
);

type InitialData = {
  room: PrismaRoom & { 
    files: PrismaFile[];
    memberships: Array<{
      role: string;
      userId: string;
      user: {
        id: string;
        name: string;
        image: string;
      };
    }>;
  };
};

// Floating Video Widget Component
function FloatingVideoWidget({ 
  roomId, 
  isVisible, 
  onClose, 
  onMinimize, 
  isMinimized 
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
      setSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
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
      maxWidth={window.innerWidth - 20}
      maxHeight={window.innerHeight - 20}
      bounds="window"
      dragHandleClassName="video-widget-header"
      className="z-50"
      style={{
        zIndex: 9999,
      }}
      enableResizing={!isMinimized}
      disableDragging={false}
    >
      <div className="h-full w-full bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl overflow-hidden">
        {/* Widget Header */}
        <div className="video-widget-header bg-gray-800 border-b border-gray-600 px-3 py-2 flex items-center justify-between cursor-move">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Video Call</span>
            <Move className="w-3 h-3 text-gray-400" />
          </div>
          
          <div className="flex items-center space-x-1">
            {!isMinimized && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                  title="Reset Position"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaximize}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                  title={isMaximized ? "Restore" : "Maximize"}
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMinimize}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-700"
              title="Close"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Widget Content */}
        {!isMinimized && (
          <div className="flex-1 bg-black relative overflow-hidden" style={{ height: 'calc(100% - 40px)' }}>
            <VideoConferenceComponent roomId={roomId} />
          </div>
        )}
      </div>
    </Rnd>
  );
}

function MembersPopup({ 
  members, 
  memberships, 
  currentUserId, 
  roomId, 
  isAdmin 
}: {
  members: Array<{ id: string; name: string; image: string }>;
  memberships: InitialData['room']['memberships'];
  currentUserId: string;
  roomId: string;
  isAdmin: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <Users className="w-4 h-4" />
          <span className="ml-2 text-xs hidden sm:inline">
            Members ({members.length})
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Room Members ({members.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {members.map(member => {
            const membership = memberships.find(m => m.userId === member.id);
            return (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50">
                <div className="relative flex-shrink-0">
                  <img 
                    src={member.image || '/default-avatar.png'} 
                    alt={member.name || 'User'} 
                    className="w-10 h-10 rounded-full border-2 border-gray-600" 
                  />
                  {membership?.role === 'ADMIN' && (
                    <Crown className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {member.name}
                    {member.id === currentUserId && (
                      <span className="text-xs text-gray-400 ml-1">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {membership?.role?.toLowerCase() === 'participant' ? 'member' : membership?.role?.toLowerCase() || 'member'}
                  </p>
                </div>
              </div>
            );
          })}
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

export default function RoomClientPage({ initialData }: { initialData: InitialData }) {
  const { data: session } = useSession();
  const { room } = initialData;
  const members = initialData.room.memberships.map(m => m.user);
  const currentUserMembership = initialData.room.memberships.find(
    m => m.userId === session?.user?.id
  );

  const [activeFileId, setActiveFileId] = useState<string | null>(
    room.files[0]?.id ?? null,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoMinimized, setVideoMinimized] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);

  const currentFile = room.files.find(f => f.id === activeFileId);
  const currentFileName = currentFile?.name;

  const handleVideoToggle = () => {
    if (videoVisible) {
      setVideoVisible(false);
      setVideoMinimized(false);
    } else {
      setVideoVisible(true);
    }
  };

  const handleVideoMinimize = () => {
    setVideoMinimized(!videoMinimized);
  };

  const handleVideoClose = () => {
    setVideoVisible(false);
    setVideoMinimized(false);
  };

  if (!session?.user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900 overflow-hidden">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <EditorProvider>
      <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden relative">
        {/* Sidebar - File Tree Only */}
        <aside 
          className={`${
            sidebarCollapsed ? 'w-0' : 'w-80'
          } transition-all duration-300 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden flex-shrink-0`}
        >
          {!sidebarCollapsed && (
            <>
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <h2 className="text-lg font-bold truncate">{room.name}</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(true)}
                    className="text-gray-400 hover:text-white flex-shrink-0"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* File Tree Section - Full Height */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                <FileTree
                  initialItems={room.files}
                  roomId={room.id}
                  onFileSelect={setActiveFileId}
                  activeFileId={activeFileId}
                />
              </div>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar with Members and Controls */}
          <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center space-x-4 min-w-0">
              {sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(false)}
                  className="text-gray-400 hover:text-white flex-shrink-0"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </Button>
              )}
              
              {activeFileId && (
                <div className="flex items-center space-x-2 min-w-0">
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {currentFileName || 'Untitled'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Members Popup */}
              <MembersPopup
                members={members}
                memberships={initialData.room.memberships}
                currentUserId={session.user.id}
                roomId={room.id}
                isAdmin={currentUserMembership?.role === 'ADMIN'}
              />

              {/* Terminal Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTerminalCollapsed(!terminalCollapsed)}
                className="text-gray-400 hover:text-white"
              >
                <TerminalIcon className="w-4 h-4" />
                <span className="ml-2 text-xs hidden sm:inline">
                  {terminalCollapsed ? 'Show Terminal' : 'Hide Terminal'}
                </span>
              </Button>

              {/* Video Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVideoToggle}
                className={`${
                  videoVisible 
                    ? 'text-blue-400 hover:text-blue-300 bg-blue-500/10' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {videoVisible ? (
                  <MonitorOff className="w-4 h-4" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
                <span className="ml-2 text-xs hidden sm:inline">
                  {videoVisible ? 'Close Video' : 'Open Video'}
                </span>
              </Button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 relative min-h-0 overflow-hidden">
            <CollaborativeEditor
              fileId={activeFileId}
              fileName={currentFileName}
              currentUser={{ 
                id: session.user.id, 
                name: session.user.name || 'Anonymous' 
              }}
            />
          </div>

          {/* Terminal Area */}
          <Terminal
            roomId={room.id}
            currentFile={currentFile ? {
              id: currentFile.id,
              name: currentFile.name,
              content: '' // Not used anymore since we get content from editor
            } : undefined}
            isCollapsed={terminalCollapsed}
            onToggleCollapse={() => setTerminalCollapsed(!terminalCollapsed)}
          />
        </main>

        {/* Floating Video Widget */}
        <FloatingVideoWidget
          roomId={room.id}
          isVisible={videoVisible}
          onClose={handleVideoClose}
          onMinimize={handleVideoMinimize}
          isMinimized={videoMinimized}
        />
      </div>
    </EditorProvider>
  );
}
