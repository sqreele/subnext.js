'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Property } from '@/app/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const CACHE_DURATION = 5 * 60 * 1000;

export interface UserProfile {
  id: number;
  username: string;
  profile_image: string;
  positions: string;
  properties: Property[];
  email?: string | null;
  created_at: string;
}

export interface UserContextType {
  userProfile: UserProfile | null;
  selectedProperty: string;
  setSelectedProperty: (propertyId: string) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<UserProfile | null>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [lastFetched, setLastFetched] = useState(0);

  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.accessToken) return null;
    if (Date.now() - lastFetched < CACHE_DURATION && userProfile) {
      return userProfile;
    }

    try {
      // Fetch user profile
      const profileResponse = await fetch(`${API_URL}/api/user-profiles/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch profile: ${profileResponse.status}`);
      }

      const [profileData] = await profileResponse.json();
      if (!profileData) {
        throw new Error('No profile data found');
      }

      // Fetch properties to convert IDs to objects
      const propertiesResponse = await fetch(`${API_URL}/api/properties/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });

      if (!propertiesResponse.ok) {
        throw new Error(`Failed to fetch properties: ${propertiesResponse.status}`);
      }

      const propertiesData = await propertiesResponse.json();
      console.log('Fetched properties:', propertiesData);

      // Map numeric property IDs to full property objects
      const properties = profileData.properties.map((propId: number) => {
        const property = propertiesData.find((p: any) => String(p.id || p.property_id) === String(propId));
        return {
          property_id: String(propId),
          name: property?.name || `Property ${propId}`, // Fallback if name not found
        };
      });

      const profile: UserProfile = {
        ...profileData,
        properties,
      };

      setUserProfile(profile);
      setLastFetched(Date.now());
      setError(null);

      if (profile.properties?.[0]?.property_id && !selectedProperty) {
        setSelectedProperty(profile.properties[0].property_id);
      }

      return profile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(message);
      setUserProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session?.user?.accessToken, selectedProperty, lastFetched, userProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      if (status !== 'authenticated' || !mounted) return;
      
      setLoading(true);
      await fetchUserProfile();
      if (mounted) setLoading(false);
    };

    initializeData();

    return () => {
      mounted = false;
    };
  }, [fetchUserProfile, status]);

  return (
    <UserContext.Provider
      value={{
        userProfile,
        selectedProperty,
        setSelectedProperty,
        loading,
        error,
        refetch: fetchUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}