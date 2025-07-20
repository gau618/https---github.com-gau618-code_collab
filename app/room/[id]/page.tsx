// File: app/room/[id]/page.tsx

import prisma from '@/app/lib/prisma'; // Ensure your prisma client path is correct
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import RoomClientPage from './client';

type RoomPageProps = {
  params: { id: string };
};

/**
 * This is the server component for the room page. Its primary responsibilities are:
 * 1. Security: Authenticating and authorizing the user on the server.
 * 2. Data Fetching: Loading the initial data for the room from the database.
 * 3. Rendering: Passing the fetched data to the client component for interactive rendering.
 */
export default async function RoomPage({ params }: RoomPageProps) {
  const { id: roomId } = params;

  // 1. Authenticate: Get the user's session from the server.
  const session = await getServerSession(authOptions);

  // Ensure user is logged in before proceeding.
  if (!session?.user?.id) {
    // If no user is logged in, redirect them to the sign-in page,
    // preserving the original room URL to return to after login.
    const callbackUrl = encodeURIComponent(`/room/${roomId}`);
    redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
  }

  // 2. Fetch Data: Get all necessary room data in a single, efficient query.
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      files: {
        // Order files to show folders first, then sort alphabetically.
        orderBy: [{ type: 'asc' }, { name: 'asc' }], 
      },
      memberships: {
        // Include user details for each membership.
        include: { user: { select: { name: true, image: true, id: true } } },
      },
    },
  });

  // 3. Validate: If the room doesn't exist, show a 404 page.
  if (!room) {
    notFound();
  }

  // 4. Authorize: Check if the logged-in user is a member of this room.
  const isMember = room.memberships.some(m => m.userId === session.user.id);
  if (!isMember) {
    // If they aren't a member, deny access by redirecting them to the dashboard.
    redirect('/dashboard?error=access_denied');
  }

  // 5. Render: Pass the securely fetched data to the client component.
  // The client component will then handle all interactive state and UI.
  return <RoomClientPage initialData={{ room }} />;
}
