// File: lib/yjs-helper.ts

import * as Y from 'yjs';

/**
 * Converts Y.js binary update data (from the database) into a plain string.
 * @param content The 'Bytes?' content field from your Prisma 'File' model.
 * @returns The string representation of the document's content.
 */
export function yjsBytesToString(content: Buffer | null): string {
  if (!content || content.length === 0) {
    return '';
  }
  const ydoc = new Y.Doc();
  try {
    Y.applyUpdate(ydoc, new Uint8Array(content));
  } catch (error) {
    console.error("Fatal: Could not apply Y.js update from database.", error);
    return `// ERROR: UNABLE TO DECODE FILE CONTENT`;
  }
  // The shared text type must match what your editor binding uses, typically 'monaco'.
  return ydoc.getText('monaco').toString();
}
