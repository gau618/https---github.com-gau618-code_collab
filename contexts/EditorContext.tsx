// contexts/EditorContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface EditorContextType {
  getCurrentContent: () => string;
  setGetCurrentContent: (fn: () => string) => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [getCurrentContent, setGetCurrentContent] = useState<() => string>(() => () => '');

  return (
    <EditorContext.Provider value={{ getCurrentContent, setGetCurrentContent }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within EditorProvider');
  return context;
};
