'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User2, Mail, Calendar, Shield, Pencil, Building2, Users, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { ProfileImage } from '@/app/components/profile/ProfileImage';
import { UserProfile, Property } from '@/app/lib/types';
import { useProperty } from '@/app/lib/PropertyContext';

interface ProfileFieldProps {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}

interface PropertyCardProps {
  property: Property;
}

type ProfileFieldDefinition = {
  icon: React.ElementType;
  label: string;
  key: keyof UserProfile;
  format?: (value: string) => string;
};

const PROFILE_FIELDS: ProfileFieldDefinition[] = [
  { icon: User2, label: 'Username', key: 'username' },
  { icon: Mail, label: 'Email', key: 'email' },
  { icon: Shield, label: 'Position', key: 'positions' },
  {
    icon: Calendar,
    label: 'Member Since',
    key: 'created_at',
    format: (date: string) =>
      new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
  },
];

function ProfileField({ icon: Icon, label, value }: ProfileFieldProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-sm text-muted-foreground">{value ?? 'N/A'}</p>
      </div>
    </div>
  );
}

function PropertyCard({ property }: PropertyCardProps) {
  const { setSelectedProperty } = useProperty();
  
  const handleSelectProperty = () => {
    // Ensure we're setting the ID, not the whole object
    setSelectedProperty(property.property_id);
  };
  
  return (
    <div className="rounded-lg border p-4 space-y-3 hover:border-blue-200 hover:bg-blue-50 transition-colors duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{property.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{property.property_id}</Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSelectProperty} 
            className="text-xs hover:bg-blue-100 hover:text-blue-700"
          >
            Select
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{property.description}</p>
      <div className="space-y-2">
        {property.rooms?.map((room) => (
          <div key={room.room_id} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{room.name} - {room.room_type}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{property.users?.length || 0} users assigned</span>
        </div>
        <span className="text-muted-foreground">
          {property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
        </span>
      </div>
    </div>
  );
}

function NoPropertiesCard() {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-blue-800">Property Access</CardTitle>
        <CardDescription className="text-blue-700">
          You don't have any properties assigned to your account yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
          <Building2 className="h-16 w-16 text-blue-300" />
          <div className="space-y-2">
            <p className="text-blue-800 font-medium">
              Properties are required to fully use the maintenance dashboard
            </p>
            <p className="text-blue-700 text-sm">
              Properties are typically assigned by administrators. You can request access or contact your system administrator for assistance.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center border-t border-blue-200 px-6 py-4 bg-blue-100/50">
        <Button 
          asChild
          variant="outline" 
          className="border-blue-300 hover:border-blue-400 hover:bg-blue-100 text-blue-700"
        >
          <Link href="/dashboard/properties/request">
            <Building2 className="mr-2 h-4 w-4" />
            Request Property Access
          </Link>
        </Button>
        <Button 
          asChild
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Link href="/dashboard/createJob">
            <Plus className="mr-2 h-4 w-4" />
            Create Job Anyway
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Card>
        <CardContent className="flex justify-center py-20">
          <div className="animate-pulse space-y-8 w-full max-w-md">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-muted rounded-full" />
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
              <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfileDisplay() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <LoadingSkeleton />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (!session?.user) {
    return null;
  }

  // Create a properly typed user profile from session data
  const userProfile = {
    ...session.user,
    // Ensure properties is at least an empty array
    properties: session.user.properties || [],
  } as UserProfile;

  const hasProperties = userProfile.properties && userProfile.properties.length > 0;

  // Debug logging - Use format that properly stringifies objects
  console.log('Session User:', JSON.stringify(session.user, null, 2));
  console.log('User Profile:', JSON.stringify(userProfile, null, 2));
  console.log('Properties:', JSON.stringify(userProfile.properties, null, 2));

  // Check if properties have the expected format
  if (hasProperties) {
    console.log('First property ID type:', typeof userProfile.properties[0].property_id);
    console.log('First property ID:', userProfile.properties[0].property_id);
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Profile</CardTitle>
            <CardDescription>Manage your personal information and preferences</CardDescription>
          </div>
          <Link href="/dashboard/profile/edit">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Profile
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <ProfileImage
              src={userProfile.profile_image}
              alt={`${userProfile.username}'s profile`}
              size="md"
            />
            <div className="text-center">
              <h3 className="text-xl font-semibold">{userProfile.username}</h3>
              <Badge variant="secondary" className="mt-2">
                {userProfile.positions}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6">
            {PROFILE_FIELDS.map(({ icon, label, key, format }) => (
              <ProfileField
                key={key}
                icon={icon}
                label={label}
                value={
                  key in userProfile && userProfile[key]
                    ? format
                      ? format(userProfile[key] as string)
                      : (userProfile[key] as string)
                    : null
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {hasProperties ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Managed Properties</CardTitle>
            <CardDescription>Properties under your supervision</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userProfile.properties.map((property) => (
              <PropertyCard key={property.property_id} property={property} />
            ))}
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {userProfile.properties.length} {userProfile.properties.length === 1 ? 'property' : 'properties'} assigned
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <Building2 className="mr-2 h-4 w-4" />
                View Dashboard
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <NoPropertiesCard />
      )}
    </div>
  );
}