// app/api/livekit/route.ts

import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma'; // Assuming prisma client is at this path

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  console.log("Room:", room);
  // --- Validation: Ensure room parameter is present ---
  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  // --- Validation: Ensure user is logged in ---
  if (!session?.user?.id || !session.user.name) {
    return NextResponse.json({ error: 'User is not authenticated' }, { status: 401 });
  }

  // --- Security Check: Ensure the authenticated user is a member of the room ---
  const membership = await prisma.membership.findFirst({
    where: {
      roomId: room,
      userId: session.user.id,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  // --- Validation: Ensure server is configured correctly ---
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit server configuration error' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: session.user.id,
    name: session.user.name,
  });

  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

  // Return the generated token
  let token =  await at.toJwt();

 
  return NextResponse.json({ token: token }, { status: 200 });
}
