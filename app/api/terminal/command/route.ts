// File: app/api/terminal/command/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react'; // Or your preferred session management

const prisma = new PrismaClient();

/**
 * Helper function to find a file/folder record by its name and parent.
 * This is crucial for resolving paths and finding targets for commands.
 */
async function findItem(name: string, roomId: string, parentId: string | null) {
  return await prisma.file.findFirst({
    where: {
      name,
      roomId,
      parentId,
    },
  });
}

export async function POST(req: NextRequest) {
  // In a production app, you MUST validate the user's session and membership to the room.
  // This is a placeholder for your actual authentication/authorization logic.
  // const session = await getSession({ req });
  // if (!session?.user) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  // You would also check if session.user is a member of the roomId.

  try {
    const { command, cwdId, cwdPath, roomId } = await req.json();

    if (!command || !roomId || typeof cwdId === 'undefined' || typeof cwdPath !== 'string') {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const [cmd, ...args] = command.trim().split(/\s+/);
    const targetName = args[0];

    // The root of the file system is where parentId is null
    const currentParentId = cwdId === '/' ? null : cwdId;

    switch (cmd.toLowerCase()) {
      case 'ls': {
        const items = await prisma.file.findMany({
          where: { roomId, parentId: currentParentId },
          orderBy: [{ type: 'asc' }, { name: 'asc' }], // Folders first, then by name
        });
        const output = items.map(item => (item.type === 'FOLDER' ? `${item.name}/` : item.name)).join('\n');
        return NextResponse.json({ output: output || '' });
      }

      case 'mkdir': {
        if (!targetName) return NextResponse.json({ error: 'Usage: mkdir <directory_name>' }, { status: 400 });
        if (await findItem(targetName, roomId, currentParentId)) {
          return NextResponse.json({ error: `Directory already exists: ${targetName}` }, { status: 409 });
        }
        await prisma.file.create({
          data: { name: targetName, type: 'FOLDER', roomId, parentId: currentParentId },
        });
        return NextResponse.json({ output: `Created directory: ${targetName}` });
      }

      case 'touch': {
        if (!targetName) return NextResponse.json({ error: 'Usage: touch <file_name>' }, { status: 400 });
        if (await findItem(targetName, roomId, currentParentId)) {
          return NextResponse.json({ error: `File already exists: ${targetName}` }, { status: 409 });
        }
        await prisma.file.create({
          data: { name: targetName, type: 'FILE', content: Buffer.from(''), roomId, parentId: currentParentId },
        });
        return NextResponse.json({ output: `Created file: ${targetName}` });
      }
      
      case 'cat': {
        if (!targetName) return NextResponse.json({ error: 'Usage: cat <file_name>' }, { status: 400 });
        const file = await findItem(targetName, roomId, currentParentId);
        if (!file || file.type !== 'FILE') {
          return NextResponse.json({ error: `File not found: ${targetName}` }, { status: 404 });
        }
        const content = file.content ? Buffer.from(file.content).toString('utf-8') : '';
        return NextResponse.json({ output: content });
      }

      case 'rm': {
        if (!targetName) return NextResponse.json({ error: 'Usage: rm <item_name>' }, { status: 400 });
        const item = await findItem(targetName, roomId, currentParentId);
        if (!item) {
          return NextResponse.json({ error: `Cannot remove '${targetName}': No such file or directory` }, { status: 404 });
        }
        // Thanks to `onDelete: Cascade` in your schema, deleting a folder will delete all its children.
        await prisma.file.delete({ where: { id: item.id } });
        return NextResponse.json({ output: `Removed: ${targetName}` });
      }

      default:
        return NextResponse.json({ error: `Command not found: ${cmd}` }, { status: 404 });
    }
  } catch (e: any) {
    console.error(`[Terminal Command Error]:`, e);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
