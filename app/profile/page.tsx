// app/profile/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';
import UserProfileForm from './UserProfileForm';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Github, 
  Globe,
  Shield,
  Settings,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/');
  }

  // Get user data with memberships
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        include: {
          room: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              _count: {
                select: {
                  files: true,
                  memberships: true
                }
              }
            }
          }
        },
        orderBy: { room: { createdAt: 'desc' } }
      }
    }
  });

  if (!user) {
    redirect('/');
  }

  const adminRooms = user.memberships.filter(m => m.role === 'ADMIN');
  const memberRooms = user.memberships.filter(m => m.role === 'PARTICIPANT');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-lg font-semibold text-gray-900">Profile Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Updated container to match landing page */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Profile Picture */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <img
                    src={user.image || '/default-avatar.png'}
                    alt={user.name || 'User'}
                    className="w-24 h-24 rounded-full border-4 border-gray-200"
                  />
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-4">
                  {user.name || 'Anonymous User'}
                </h2>
                <p className="text-gray-600">{user.email}</p>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Rooms</span>
                  <Badge variant="secondary">{user.memberships.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Admin Rooms</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{adminRooms.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Member Since</span>
                  <span className="text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Account Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button variant="outline" className="w-full mb-3">
                  <Shield className="w-4 h-4 mr-2" />
                  Security Settings
                </Button>
                <Button variant="outline" className="w-full">
                  <Activity className="w-4 h-4 mr-2" />
                  Activity Log
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Form */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                <p className="text-gray-600 text-sm">Update your profile information and preferences.</p>
              </div>
              <div className="p-6">
                <UserProfileForm user={user} />
              </div>
            </div>

            {/* Room Memberships */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Your Rooms</h3>
                <p className="text-gray-600 text-sm">Rooms you're currently participating in.</p>
              </div>
              <div className="p-6">
                {user.memberships.length > 0 ? (
                  <div className="space-y-4">
                    {user.memberships.map((membership) => (
                      <div key={membership.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-gray-900">
                              {membership.room.name}
                            </h4>
                            <Badge 
                              variant={membership.role === 'ADMIN' ? 'default' : 'secondary'}
                              className={membership.role === 'ADMIN' ? 'bg-yellow-100 text-yellow-800' : ''}
                            >
                              {membership.role === 'ADMIN' ? 'Admin' : 'Member'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>{membership.room._count.files} files</span>
                            <span>{membership.room._count.memberships} members</span>
                            <span>Created {new Date(membership.room.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Link href={`/room/${membership.room.id}`}>
                          <Button variant="outline" size="sm">
                            Open Room
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You haven't joined any rooms yet.</p>
                    <Link href="/dashboard">
                      <Button className="mt-4">
                        Browse Rooms
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
