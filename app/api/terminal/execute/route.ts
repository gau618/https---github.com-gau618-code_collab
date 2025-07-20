// File: app/api/terminal/execute/route.ts (CORRECTED)

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { yjsBytesToString } from '@/lib/yjs-helper';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();
const redisConnection = { host: 'localhost', port: 6379 }; // Use your Redis config from .env
const executionQueue = new Queue('execution-queue', { connection: redisConnection });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // The client now only sends the fileId.
  const { fileId } = await request.json();

  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
  }

  // 1. Fetch the authoritative file data from the database.
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { content: true, name: true },
  });

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // 2. Convert the Y.js Bytes content to a plain string.
  const code = yjsBytesToString(file.content);

  // 3. Determine the language from the file name.
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    py: 'python', js: 'node', ts: 'node', cpp: 'cpp', java: 'java',
  };
  const language = langMap[extension];
  
  if (!language) {
    return NextResponse.json({ error: `Unsupported file type: .${extension}` }, { status: 400 });
  }

  const jobId = randomUUID();

  // 4. Add the secure, server-verified data to the queue.
  await executionQueue.add('execute-code', {
    jobId,
    language,
    code,
  });

  // Return the Job ID so the client can poll for results.
  return NextResponse.json({ jobId });
}
