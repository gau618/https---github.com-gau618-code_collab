// app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';
import CreateRoomForm from './CreateRoomForm';
import CopyInviteLink from './CopyInviteLink';
import { 
  Users, 
  Calendar, 
  Crown, 
  FileText, 
  Clock,
  Settings,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/');
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { 
      room: {
        include: {
          _count: {
            select: {
              files: true,
              memberships: true
            }
          }
        }
      }
    },
    orderBy: { room: { createdAt: 'desc' } },
  });

  const totalRooms = memberships.length;
  const adminRooms = memberships.filter(m => m.role === 'ADMIN').length;
  const memberRooms = memberships.filter(m => m.role === 'PARTICIPANT').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {session.user.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your collaborative workspaces
              </p>
            </div>
            <CreateRoomForm />
          </div>
        </div>
      </div>

      {/* Main Content - Updated container to match landing page */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Crown className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admin Rooms</p>
                <p className="text-2xl font-bold text-gray-900">{adminRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Member Rooms</p>
                <p className="text-2xl font-bold text-gray-900">{memberRooms}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Rooms</h2>
          </div>

          <div className="p-6">
            {memberships.length > 0 ? (
              <div className="grid gap-4">
                {memberships.map(({ room, role }) => (
                  <div 
                    key={room.id} 
                    className="group border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between">
                      <Link href={`/room/${room.id}`} className="flex-1">
                        <div className="cursor-pointer">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {room.name}
                            </h3>
                            <Badge 
                              variant={role === 'ADMIN' ? 'default' : 'secondary'}
                              className={role === 'ADMIN' ? 'bg-yellow-100 text-yellow-800' : ''}
                            >
                              {role === 'ADMIN' && <Crown className="w-3 h-3 mr-1" />}
                              {role}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              <span>{room._count.files} files</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{room._count.memberships} members</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 ml-4">
                        {role === 'ADMIN' && (
                          <CopyInviteLink inviteKey={room.inviteKey} />
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No rooms yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  Create your first collaborative workspace to start working with your team.
                </p>
                <CreateRoomForm />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
