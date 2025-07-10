// app/join/[inviteKey]/JoinRoomButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { joinRoom } from '@/app/actions';
import { Loader2, Users, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function JoinRoomButton({ inviteKey }: { inviteKey: string }) {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();

  const handleJoin = () => {
    if (status === 'loading') return;
    
    if (!session) {
      // Redirect to sign in with callback
      window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }

    startTransition(async () => {
      try {
        await joinRoom(inviteKey);
        toast.success('Successfully joined the room!');
      } catch (error) {
        console.error('Failed to join room:', error);
        toast.error('Failed to join room. Please try again.');
      }
    });
  };

  if (status === 'loading') {
    return (
      <Button disabled className="w-full sm:w-auto">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <Button
      onClick={handleJoin}
      disabled={isPending}
      size="lg"
      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Joining...
        </>
      ) : session ? (
        <>
          <Users className="w-4 h-4 mr-2" />
          Join Room
        </>
      ) : (
        <>
          <LogIn className="w-4 h-4 mr-2" />
          Sign In to Join
        </>
      )}
    </Button>
  );
}
