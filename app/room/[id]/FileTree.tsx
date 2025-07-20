// File: FileTree.tsx

'use client';

import type { File as PrismaFile } from '@prisma/client';
import { useState, useTransition, useEffect, useRef } from 'react';
import { File as FileIcon, Folder as FolderIcon, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { createFile, createFolder } from '@/app/actions'; 
import { useEditor } from '@/contexts/EditorContext';

// --- TYPE DEFINITIONS ---
// This type is used to represent a file or folder in the tree structure.
// It includes an optional `children` property for nesting.
type TreeItem = PrismaFile & { children?: TreeItem[] };
type CreationState = { parentId: string | null; type: 'FILE' | 'FOLDER' };


// --- INLINE INPUT FOR CREATION ---
function CreationInput({ parentId, type, roomId, onCancel }: { parentId: string | null; type: 'FILE' | 'FOLDER'; roomId: string; onCancel: () => void; }) {
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();
  const { refreshFileList } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) { onCancel(); return; }
    const action = type === 'FILE' ? createFile : createFolder;
    startTransition(async () => {
      await action(name.trim(), roomId, parentId);
      await refreshFileList(); 
      onCancel();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="pl-6 pr-2 py-0.5">
      <div className="flex items-center">
        {type === 'FILE' ? <FileIcon size={16} className="mr-2 text-gray-400" /> : <FolderIcon size={16} className="mr-2 text-blue-400" />}
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => e.key === 'Escape' && onCancel()}
          className="w-full bg-gray-700 text-white text-sm rounded px-1 outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={type === 'FILE' ? 'New file...' : 'New folder...'}
          disabled={isPending}
        />
      </div>
    </form>
  );
}

// --- RECURSIVE NODE COMPONENT ---
function FileSystemNode({ node, onFileSelect, selectedFileId, isCreating, setCreating }: { node: TreeItem; onFileSelect: (file: TreeItem) => void; selectedFileId: string | null; isCreating: CreationState | null; setCreating: (state: CreationState | null) => void; }) {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = node.type === 'FILE' && selectedFileId === node.id;

  if (node.type === 'FOLDER') {
    return (
      <div className="select-none">
        <div 
          className="flex items-center group cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5" 
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <FolderIcon size={16} className={`mx-1 ${isOpen ? 'text-blue-400' : 'text-blue-500'}`} />
            <span className="font-medium text-gray-200 truncate">{node.name}</span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-2">
            <button 
              type="button" 
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsOpen(true); 
                setCreating({ parentId: node.id, type: 'FILE' });
              }} 
              title="New File" 
              className="p-0.5 rounded hover:bg-gray-600 pointer-events-auto"
            >
              <FileIcon size={14} />
            </button>
            <button 
              type="button" 
              onClick={(e) => { 
                e.stopPropagation();
                setIsOpen(true);
                setCreating({ parentId: node.id, type: 'FOLDER' }); 
              }} 
              title="New Folder" 
              className="p-0.5 rounded hover:bg-gray-600 pointer-events-auto"
            >
              <FolderIcon size={14} />
            </button>
          </div>
        </div>
        
        {isOpen && (
          <div className="ml-4 border-l border-gray-700 pl-2 space-y-0.5">
            {/* FIX: Check if node.children exists before mapping. */}
            {node.children?.map(child => (
              <FileSystemNode key={child.id} node={child} onFileSelect={onFileSelect} selectedFileId={selectedFileId} isCreating={isCreating} setCreating={setCreating} />
            ))}
            {isCreating?.parentId === node.id && (
              <CreationInput
                parentId={node.id}
                type={isCreating.type}
                roomId={node.roomId}
                onCancel={() => setCreating(null)}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // File node
  return (
    <div
      className={`flex items-center cursor-pointer rounded px-1 py-0.5 ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-700/50 text-gray-300'}`}
      onClick={() => onFileSelect(node)}
      title={node.name}
    >
      <FileIcon size={16} className="mr-2 text-gray-400" />
      <span className="truncate">{node.name}</span>
    </div>
  );
}

// --- MAIN FILE TREE COMPONENT ---
export default function FileTree() {
  const { files, currentFile, openFile, isLoadingFiles, roomId } = useEditor();
  const [creating, setCreating] = useState<CreationState | null>(null);
  
  // FIX: Removed the call to buildTree. The `files` from the context are already structured.
  // const fileTree = buildTree(files); // This line is removed.

  return (
    <div className="text-sm font-sans text-gray-300">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Explorer</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setCreating({ parentId: null, type: 'FILE' })} disabled={!!creating || !roomId} title="New Root File" className="disabled:opacity-50 hover:text-gray-200 p-1 rounded"><FileIcon size={16} /></button>
          <button type="button" onClick={() => setCreating({ parentId: null, type: 'FOLDER' })} disabled={!!creating || !roomId} title="New Root Folder" className="disabled:opacity-50 hover:text-gray-200 p-1 rounded"><FolderIcon size={16} /></button>
        </div>
      </div>
      <div className="space-y-0.5">
        {isLoadingFiles ? (
          <div className="text-gray-500 text-xs italic py-4 text-center"><Loader2 className="w-4 h-4 animate-spin inline-block" /></div>
        ) : files.length === 0 && !creating ? (
          <div className="text-gray-500 text-xs italic py-4 text-center">No files yet.</div>
        ) : (
          // FIX: Map directly over the `files` array from the context.
          files.map(node => (
            <FileSystemNode 
              key={node.id} 
              node={node} 
              onFileSelect={openFile as (file: TreeItem) => void}
              selectedFileId={currentFile?.id || null}
              isCreating={creating}
              setCreating={setCreating}
            />
          ))
        )}
        {creating?.parentId === null && (
          <CreationInput
            parentId={null}
            type={creating.type}
            roomId={roomId!}
            onCancel={() => setCreating(null)}
          />
        )}
      </div>
    </div>
  );
}
