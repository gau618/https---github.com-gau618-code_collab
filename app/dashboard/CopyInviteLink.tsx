// app/dashboard/CopyInviteLink.tsx
'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink,
  Users,
  Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function CopyInviteLink({ inviteKey }: { inviteKey: string }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteKey}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Join my collaborative workspace');
    const body = encodeURIComponent(
      `Hi!\n\nI'd like to invite you to join my collaborative workspace. Click the link below to get started:\n\n${inviteUrl}\n\nLooking forward to working together!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleOpenLink = () => {
    window.open(inviteUrl, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          <div className="flex items-center gap-2 w-full">
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy invite link</span>
              </>
            )}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleEmailShare} className="cursor-pointer">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Share via email</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleOpenLink} className="cursor-pointer">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            <span>Open invite page</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5">
          <p className="text-xs text-gray-500 break-all">
            {inviteUrl}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
