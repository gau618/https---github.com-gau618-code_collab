'use client';

import type { File as PrismaFile } from '@prisma/client';
import { useState, useTransition } from 'react';
import { File as FileIcon, Folder as FolderIcon, ChevronRight, ChevronDown, PlusCircle } from 'lucide-react';
import { createFile, createFolder } from '@/app/actions';

type TreeItem = PrismaFile & { children: TreeItem[] };

function buildTree(items: PrismaFile[]): TreeItem[] {
  const itemMap = new Map<string, TreeItem>();
  items.forEach(item => itemMap.set(item.id, { ...item, children: [] }));
  const tree: TreeItem[] = [];
  items.forEach(item => {
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(itemMap.get(item.id)!)
    } else {
      tree.push(itemMap.get(item.id)!);
    }
  });
  return tree;
}

function FileSystemNode({ 
  node, 
  roomId, 
  onFileSelect, 
  selectedFileId 
}: { 
  node: TreeItem; 
  roomId: string; 
  onFileSelect: (fileId: string) => void; 
  selectedFileId: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCreateFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fileName = prompt('Enter new file name:');
    if (fileName) startTransition(() => createFile(fileName, roomId, node.id));
  };

  const handleCreateFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const folderName = prompt('Enter new folder name:');
    if (folderName) startTransition(() => createFolder(folderName, roomId, node.id));
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Only files can be selected, not folders
  const isSelected = node.type !== 'FOLDER' && selectedFileId === node.id;

  if (node.type === 'FOLDER') {
    return (
      <div className="select-none">
        <div 
          className="flex items-center group cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5 transition-colors" 
          onClick={toggleOpen}
        >
          <div className="flex items-center min-w-0 flex-1">
            {isOpen ? (
              <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
            )}
            <FolderIcon 
              size={16} 
              className={`mx-1 flex-shrink-0 ${isOpen ? 'text-blue-400' : 'text-blue-500'}`} 
            />
            <span className="font-medium text-gray-200 truncate">{node.name}</span>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
            <button
              onClick={handleCreateFile}
              title="New File"
              className="text-gray-400 hover:text-gray-200 p-0.5 rounded hover:bg-gray-600"
            >
              <PlusCircle size={14} />
            </button>
            <button
              onClick={handleCreateFolder}
              title="New Folder"
              className="text-gray-400 hover:text-gray-200 p-0.5 rounded hover:bg-gray-600"
            >
              <FolderIcon size={14} />
            </button>
          </div>
        </div>
        
        {isOpen && (
          <div className="ml-4 border-l border-gray-700 pl-2">
            {node.children.map(child => (
              <FileSystemNode 
                key={child.id} 
                node={child} 
                roomId={roomId} 
                onFileSelect={onFileSelect} 
                selectedFileId={selectedFileId} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node - only files can be selected
  return (
    <div
      className={`flex items-center cursor-pointer rounded px-1 py-0.5 transition-colors select-none ${
        isSelected 
          ? 'bg-blue-600 text-white' 
          : 'hover:bg-gray-700/50 text-gray-300'
      }`}
      onClick={() => onFileSelect(node.id)}
      title={node.name}
    >
      <FileIcon size={16} className="mr-2 flex-shrink-0 text-gray-400" />
      <span className="truncate">{node.name}</span>
    </div>
  );
}

export default function FileTree({ 
  initialItems, 
  roomId, 
  onFileSelect,
  activeFileId 
}: { 
  initialItems: PrismaFile[]; 
  roomId: string; 
  onFileSelect: (fileId: string) => void;
  activeFileId?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(activeFileId || null);
  const fileTree = buildTree(initialItems);

  const handleCreateRootFile = () => {
    const fileName = prompt('Enter new file name:');
    if (fileName) startTransition(() => createFile(fileName, roomId, null));
  };

  const handleCreateRootFolder = () => {
    const folderName = prompt('Enter new folder name:');
    if (folderName) startTransition(() => createFolder(folderName, roomId, null));
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    onFileSelect(fileId);
  };

  return (
    <div className="text-sm font-sans text-gray-300">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Explorer
        </span>
        <div className="flex gap-1">
          <button 
            onClick={handleCreateRootFile} 
            disabled={isPending} 
            title="New File" 
            className="disabled:opacity-50 hover:text-gray-200 p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <FileIcon size={16} />
          </button>
          <button 
            onClick={handleCreateRootFolder} 
            disabled={isPending} 
            title="New Folder" 
            className="disabled:opacity-50 hover:text-gray-200 p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <FolderIcon size={16} />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="space-y-0.5">
        {fileTree.length === 0 ? (
          <div className="text-gray-500 text-xs italic py-4 text-center">
            No files or folders yet
          </div>
        ) : (
          fileTree.map(node => (
            <FileSystemNode 
              key={node.id} 
              node={node} 
              roomId={roomId} 
              onFileSelect={handleFileSelect} 
              selectedFileId={selectedFileId} 
            />
          ))
        )}
      </div>
    </div>
  );
}
