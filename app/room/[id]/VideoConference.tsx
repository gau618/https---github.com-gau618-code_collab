'use client';

import '@livekit/components-styles';
import '@/styles/livekit-overrides.css'; // Custom CSS overrides
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  Loader2, 
  AlertCircle,
  Users,
  Settings,
  Share2,
  Download
} from 'lucide-react';

export default function VideoConferenceComponent({ roomId }: { roomId: string }) {
  const { data: session } = useSession();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.name) {
      return;
    }

    const fetchToken = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/livekit?room=${roomId}`);
        if (!resp.ok) {
          const errorData = await resp.json();
          throw new Error(errorData.error || `API Error: ${resp.status}`);
        }
        const data = await resp.json();
        if (!data.token) {
          throw new Error("API response is missing a token.");
        }
        setToken(data.token);
        setError(null);
      } catch (e: any) {
        console.error("Failed to fetch LiveKit token:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [roomId, session?.user?.name]);

  const handleJoinCall = () => {
    setIsInCall(true);
  };

  const handleDisconnect = () => {
    setIsInCall(false);
  };

  // Error state with improved styling
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 overflow-hidden">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Connection Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // In-call state with proper boundaries
  if (isInCall) {
    return (
      <div className="h-full w-full overflow-hidden bg-gray-900 relative">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          data-lk-theme="default"
          style={{ 
            height: '100%', 
            width: '100%',
            maxHeight: '100%',
            maxWidth: '100%'
          }}
          onDisconnected={handleDisconnect}
          className="h-full w-full overflow-hidden"
        >
          <div className="h-full w-full overflow-hidden">
            <VideoConference />
          </div>
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  // Pre-call state with contained dimensions
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-auto">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Video className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Video Conference
          </h2>
          <p className="text-gray-600 text-xs">
            Room: {roomId}
          </p>
          
          {loading ? (
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Preparing your session...</span>
            </div>
          ) : (
            <Button 
              onClick={handleJoinCall} 
              disabled={!token}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
            >
              {token ? (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Join Video Call
                </>
              ) : (
                'Getting ready...'
              )}
            </Button>
          )}
          
          {session?.user?.name && (
            <p className="text-xs text-gray-500">
              Joining as <span className="font-medium">{session.user.name}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
