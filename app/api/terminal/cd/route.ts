// File: app/api/terminal/cd/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, File as DbFile } from '@prisma/client';
import path from 'path-browserify'; // Use browser-compatible path for consistency

const prisma = new PrismaClient();

/**
 * Traverses the database to find a directory entity based on a path.
 * Starts from the root (parentId: null) for absolute paths, or from
 * a given directory for relative paths.
 */
async function findDirectoryByPath(
  roomId: string,
  startDirId: string | null,
  targetPath: string
): Promise<DbFile | null> {
  const parts = targetPath.split('/').filter(p => p && p !== '.');
  let currentDirId: string | null = startDirId;

  for (const part of parts) {
    if (part === '..') {
      if (currentDirId) {
        const parentDir = await prisma.file.findUnique({
          where: { id: currentDirId },
          select: { parentId: true },
        });
        currentDirId = parentDir?.parentId ?? null; // Move to parent or root
      }
      continue;
    }

    const nextDir = await prisma.file.findFirst({
      where: {
        name: part,
        roomId,
        parentId: currentDirId,
        type: 'FOLDER',
      },
    });

    if (!nextDir) return null; // Path segment not found
    currentDirId = nextDir.id;
  }

  // If after all parts, currentDirId is null, it's the root.
  // We need a dummy object for root as it doesn't exist as a DB record.
  if (currentDirId === null) {
      return { id: '/', name: '/', parentId: null, type: 'FOLDER' } as any; // Represent root
  }

  return await prisma.file.findUnique({ where: { id: currentDirId }});
}

export async function POST(req: NextRequest) {
  try {
    const { targetPath, currentCwdId, currentCwdPath, roomId } = await req.json();

    if (targetPath.startsWith('/')) {
      // Absolute path: Resolve from the root
      const targetDir = await findDirectoryByPath(roomId, null, targetPath);
      if (!targetDir) {
        return NextResponse.json({ error: `cd: no such file or directory: ${targetPath}` }, { status: 404 });
      }
      return NextResponse.json({
          newCwdId: targetDir.id === '/' ? null : targetDir.id,
          newCwdPath: path.resolve(targetPath)
      });
    } else {
      // Relative path: Resolve from the current directory
      const targetDir = await findDirectoryByPath(roomId, currentCwdId, targetPath);
       if (!targetDir) {
        return NextResponse.json({ error: `cd: no such file or directory: ${targetPath}` }, { status: 404 });
      }
      const newPath = path.resolve(currentCwdPath, targetPath);
      return NextResponse.json({
          newCwdId: targetDir.id === '/' ? null : targetDir.id,
          newCwdPath: newPath
      });
    }
  } catch (e: any) {
    console.error(`[CD Command Error]:`, e);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
