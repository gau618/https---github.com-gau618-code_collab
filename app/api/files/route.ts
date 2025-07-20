import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, File as PrismaFile } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

type FileWithChildren = PrismaFile & {
  children: FileWithChildren[];
  path?: string;
  depth?: number;
};

export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. GET roomId
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // 3. AUTHORIZATION
    const membership = await prisma.membership.findFirst({
      where: {
        roomId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this room.' }, { status: 403 });
    }

    // 4. FETCH FILES (flat)
    const flatFiles = await prisma.file.findMany({
      where: { roomId },
      orderBy: [{ parentId: 'asc' }, { type: 'desc' }, { name: 'asc' }],
    });

    // 5. BUILD TREE
    const fileMap = new Map<string, FileWithChildren>();
    const rootFiles: FileWithChildren[] = [];

    for (const file of flatFiles) {
      fileMap.set(file.id, {
        ...file,
        children: [],
      });
    }

    for (const file of fileMap.values()) {
      if (file.parentId && fileMap.has(file.parentId)) {
        fileMap.get(file.parentId)!.children.push(file);
      } else {
        rootFiles.push(file);
      }
    }

    // 6. OPTIONAL: Add path and depth for frontend display
    const enrichWithPath = (
      nodes: FileWithChildren[],
      parentPath: string = '',
      depth: number = 0
    ) => {
      for (const node of nodes) {
        node.path = `${parentPath}/${node.name}`.replace('//', '/');
        node.depth = depth;
        enrichWithPath(node.children, node.path, depth + 1);
      }
    };

    enrichWithPath(rootFiles);

    // 7. RETURN
    return NextResponse.json({ files: rootFiles });
  } catch (error) {
    console.error("Error fetching file list:", error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
