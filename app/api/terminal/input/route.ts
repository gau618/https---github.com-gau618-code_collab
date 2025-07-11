// app/api/terminal/input/route.ts - Handle user input during execution
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// Import the activeProcesses map from the execute route
const activeProcesses = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { executionId, input, roomId } = await request.json();

    const process = activeProcesses.get(executionId);
    if (!process) {
      return NextResponse.json({ error: 'Process not found or already terminated' }, { status: 404 });
    }

    // Send input to the process
    process.stdin.write(input + '\n');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Input handling error:', error);
    return NextResponse.json({ 
      error: 'Failed to send input',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
