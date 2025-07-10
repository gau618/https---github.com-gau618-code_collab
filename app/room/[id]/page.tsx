// app/room/[id]/page.tsx

import prisma from '@/app/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import RoomClientPage from './client'; // Ensure this points to the client component file
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Import
import { getServerSession } from 'next-auth'; // Import
type RoomPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { id: roomId } = await params;

  const session = await getServerSession(authOptions);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      files: {
        orderBy: [{ type: 'desc' }, { name: 'asc' }],
      },
      memberships: {
        include: { user: { select: { name: true, image: true, id: true } } },
      },
    },
  });

  if (!room) {
    notFound();
  }
 const isMember = room.memberships.some(m => m.userId === session.user.id);
  if (!isMember) {
    // If not a member, redirect to an "access denied" page or the dashboard
    redirect('/dashboard?error=access_denied');
  }
  // Pass the server-fetched data to the client component
  return <RoomClientPage initialData={{ room }} />;
}
