// app/api/terminal/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const redisConnection = { host: 'localhost', port: 6379 };
const executionQueue = new Queue('execution-queue', { connection: redisConnection });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { language, code, input } = await request.json();

  const supportedLanguages = ['python', 'node', 'cpp', 'java'];
  if (!supportedLanguages.includes(language) || typeof code !== 'string') {
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  }

  const jobId = randomUUID();

  // Add the job to the queue
  await executionQueue.add('execute-code', {
    jobId,
    language,
    code,
    input: input || '',
  });

  // Immediately return the Job ID to the client
  return NextResponse.json({ jobId });
}
