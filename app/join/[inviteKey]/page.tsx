// app/join/[inviteKey]/page.tsx

import prisma from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import JoinRoomButton from './JoinRoomButton';
import { 
  Users, 
  Calendar, 
  FileText, 
  Crown,
  Clock,
  Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type JoinPageProps = {
  params: Promise<{ inviteKey: string }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { inviteKey } = await params;
  const session = await getServerSession(authOptions);

  const room = await prisma.room.findUnique({
    where: { inviteKey: inviteKey },
    include: {
      memberships: {
        include: {
          user: {
            select: { 
              id: true,
              name: true, 
              image: true 
            },
          },
        },
        // Remove createdAt ordering since Membership model doesn't have it
        orderBy: { role: 'desc' } // Only order by role (ADMIN first)
      },
      _count: {
        select: {
          files: true,
          memberships: true
        }
      }
    },
  });

  if (!room) {
    notFound();
  }

  // Check if user is already a member
  const isAlreadyMember = session?.user?.id && 
    room.memberships.some(m => m.userId === session.user.id);

  // Update role filtering to match your schema (ADMIN/PARTICIPANT)
  const admins = room.memberships.filter(m => m.role === 'ADMIN');
  const participants = room.memberships.filter(m => m.role === 'PARTICIPANT');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                You're invited to join
              </h1>
              <h2 className="text-3xl font-bold">{room.name}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Room Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {room._count.memberships}
                </div>
                <div className="text-sm text-gray-600">
                  {room._count.memberships === 1 ? 'Member' : 'Members'}
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {room._count.files}
                </div>
                <div className="text-sm text-gray-600">
                  {room._count.files === 1 ? 'File' : 'Files'}
                </div>
              </div>
            </div>

            {/* Current Members */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Current Members
              </h3>
              
              <div className="space-y-3">
                {/* Admins */}
                {admins.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      Administrators
                    </h4>
                    <div className="space-y-2">
                      {admins.map((membership) => (
                        <div key={membership.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={membership.user.image || ''} />
                            <AvatarFallback>
                              {membership.user.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {membership.user.name}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Crown className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants */}
                {participants.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Participants
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {participants.slice(0, 6).map((membership) => (
                        <div key={membership.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={membership.user.image || ''} />
                            <AvatarFallback className="text-xs">
                              {membership.user.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-700 truncate">
                            {membership.user.name}
                          </span>
                        </div>
                      ))}
                      {participants.length > 6 && (
                        <div className="flex items-center justify-center p-2 bg-gray-100 rounded-lg">
                          <span className="text-sm text-gray-500">
                            +{participants.length - 6} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Room Info - Remove updatedAt since Room model doesn't have it */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Join Button or Already Member Message */}
            <div className="text-center">
              {isAlreadyMember ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">You're already a member of this room</span>
                  </div>
                  <a
                    href={`/room/${room.id}`}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Go to Room
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Join this collaborative workspace to start working together
                  </p>
                  <JoinRoomButton inviteKey={inviteKey} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>
            By joining, you agree to collaborate respectfully and follow the room guidelines.
          </p>
        </div>
      </div>
    </div>
  );
}
