// app/actions.ts
'use server';
import * as Y from 'yjs';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Action to create a new collaborative room
export async function createRoom(roomName: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const newRoom = await prisma.room.create({
    data: {
      name: roomName,
      memberships: {
        create: {
          userId: session.user.id,
          role: 'ADMIN',
        },
      },
    },
  });

  revalidatePath('/dashboard');
  redirect(`/room/${newRoom.id}`);
}

// Action to create a new folder
export async function createFolder(name: string, roomId: string, parentId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not authenticated');

  const newFolder = await prisma.file.create({
    data: {
      name,
      roomId,
      parentId: parentId || undefined,
      type: 'FOLDER',
      content: null,
    },
  });
  
  revalidatePath(`/room/${roomId}`);
  return newFolder;
}
const emptyYDoc = new Y.Doc();
const emptyUpdate = Y.encodeStateAsUpdate(emptyYDoc);

// Action to create a new file
export async function createFile(name: string, roomId: string, parentId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not authenticated');

  const newFile = await prisma.file.create({
    data: {
      name,
      roomId,
      parentId: parentId || undefined,
      type: 'FILE',
      content: Buffer.from(emptyUpdate),
    },
  });

  revalidatePath(`/room/${roomId}`);
  return newFile;
}

// Action to get the content of a specific file
export async function getFileContent(fileId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not authenticated');

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  return file;
}

// --- NEWLY ADDED ACTION ---
// Action to update the content of a specific file
export async function updateFileContent(fileId: string, newContent: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const file = await prisma.file.update({
    where: {
      id: fileId,
    },
    data: {
      content: newContent,
    },
  });

  // Revalidating the path is not strictly necessary here, but good practice
  // if other parts of the UI depend on the fresh content.
  // revalidatePath(`/room/${file.roomId}`);

  return file;
}

export async function joinRoom(inviteKey: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('You must be logged in to join a room.');
  }

  // Find the room with the given invite key
  const roomToJoin = await prisma.room.findUnique({
    where: { inviteKey },
  });

  if (!roomToJoin) {
    throw new Error('Invalid invite link. Room not found.');
  }

  // Check if the user is already a member
  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_roomId: {
        userId: session.user.id,
        roomId: roomToJoin.id,
      },
    },
  });

  if (existingMembership) {
    // User is already a member, just redirect them.
    redirect(`/room/${roomToJoin.id}`);
  }

  // Create a new membership for the user
  await prisma.membership.create({
    data: {
      userId: session.user.id,
      roomId: roomToJoin.id,
      role: 'PARTICIPANT', // New members join as participants
    },
  });

  revalidatePath('/dashboard'); // Refresh the dashboard list
  redirect(`/room/${roomToJoin.id}`); // Redirect to the room
}

export async function updateMemberRole(roomId: string, targetUserId: string, newRole: 'ADMIN' | 'PARTICIPANT') {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not authenticated');

  // Security Check: Verify the current user is an ADMIN of this room
  const currentUserMembership = await prisma.membership.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });

  if (currentUserMembership?.role !== 'ADMIN') {
    throw new Error('Permission denied: You are not an admin of this room.');
  }

  // Prevent admin from changing their own role (they should remain admin)
  if (session.user.id === targetUserId) {
    throw new Error('Admins cannot change their own role.');
  }

  // Perform the update
  await prisma.membership.update({
    where: { userId_roomId: { userId: targetUserId, roomId } },
    data: { role: newRole },
  });

  revalidatePath(`/room/${roomId}`);
}

// --- ADMIN ACTION: Remove a member from a room ---
export async function removeMember(roomId: string, targetUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not authenticated');

  // Security Check: Verify the current user is an ADMIN
  const currentUserMembership = await prisma.membership.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });

  if (currentUserMembership?.role !== 'ADMIN') {
    throw new Error('Permission denied: You are not an admin of this room.');
  }

  // Prevent admin from removing themselves
  if (session.user.id === targetUserId) {
    throw new Error('Admins cannot remove themselves from the room.');
  }

  // Perform the deletion
  await prisma.membership.delete({
    where: { userId_roomId: { userId: targetUserId, roomId } },
  });

  revalidatePath(`/room/${roomId}`);
}




export async function updateUserProfile(data: {
  name: string;
  bio: string;
  location: string;
  website: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  console.log('Updating user profile:', data);
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name.trim() || null,
        bio: data.bio.trim() || null,
        location: data.location.trim() || null,
        website: data.website.trim() || null,
      },
    });

    revalidatePath('/profile');
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw new Error('Failed to update profile');
  }
}
