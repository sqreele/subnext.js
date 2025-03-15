'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { type UserProfile, type UserContextType } from '@/app/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const CACHE_DURATION = 5 * 60 * 1000;

const UserContext = createContext<UserContextType | undefined>(undefined);

interface FetchError extends Error {
  status?: number;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [lastFetched, setLastFetched] = useState(0);

  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.accessToken) return null;
    if (Date.now() - lastFetched < CACHE_DURATION && userProfile) {
      return userProfile;
    }

    try {
      const response = await fetch(`${API_URL}/api/user-profiles/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });

      if (!response.ok) {
        const error = new Error('Failed to fetch profile') as FetchError;
        error.status = response.status;
        throw error;
      }

      const [profile] = await response.json();
      
      if (!profile) {
        throw new Error('No profile data found');
      }

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

  const value = {
    userProfile,
    selectedProperty,
    setSelectedProperty,
    loading,
    error,
    refetch: fetchUserProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};