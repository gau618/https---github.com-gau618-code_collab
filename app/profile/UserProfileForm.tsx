// app/profile/UserProfileForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save, User, Mail, MapPin, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateUserProfile } from '@/app/actions';

type UserProfileFormProps = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
  };
};

export default function UserProfileForm({ user }: UserProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: user.name || '',
    bio: user.bio || '',
    location: user.location || '',
    website: user.website || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      try {
        await updateUserProfile(formData);
        toast.success('Profile updated successfully!');
      } catch (error) {
        console.error('Failed to update profile:', error);
        toast.error('Failed to update profile. Please try again.');
      }
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
          Display Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Your display name"
            className="pl-10"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Email (Read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            value={user.email || ''}
            placeholder="No email provided"
            className="pl-10 bg-gray-50"
            disabled
          />
        </div>
        <p className="text-xs text-gray-500">
          Email is managed by your authentication provider and cannot be changed here.
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm font-medium text-gray-700">
          Bio
        </Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="Tell us about yourself..."
          className="resize-none"
          rows={4}
          disabled={isPending}
          maxLength={500}
        />
        <p className="text-xs text-gray-500">
          {formData.bio.length}/500 characters
        </p>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-sm font-medium text-gray-700">
          Location
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="City, Country"
            className="pl-10"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website" className="text-sm font-medium text-gray-700">
          Website
        </Label>
        <div className="relative">
          <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://yourwebsite.com"
            className="pl-10"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
