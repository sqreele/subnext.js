'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Property } from '@/app/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const CACHE_DURATION = 5 * 60 * 1000;

export interface UserProfile {
  id: number | string;
  username: string;
  profile_image: string | null;
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
      console.log('Fetching user profile and properties...');
      
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

      const profileDataArray = await profileResponse.json();
      console.log('Profile data array:', profileDataArray);
      
      // Get the first profile or handle empty array
      const profileData = Array.isArray(profileDataArray) && profileDataArray.length > 0 
        ? profileDataArray[0] 
        : profileDataArray;
        
      if (!profileData) {
        throw new Error('No profile data found');
      }
      
      console.log('Selected profile data:', profileData);

      // Fetch properties
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

      // Prepare properties for user profile
      let userProperties: Property[] = [];
      
      // If profile has properties property that is an array of IDs
      if (profileData.properties && Array.isArray(profileData.properties)) {
        // If properties are IDs, map them to full property objects
        if (profileData.properties.length > 0 && (typeof profileData.properties[0] === 'number' || typeof profileData.properties[0] === 'string')) {
          userProperties = profileData.properties
            .map((propId: number | string) => {
              const foundProperty = propertiesData.find((p: any) => 
                String(p.id) === String(propId) || String(p.property_id) === String(propId)
              );
              
              if (foundProperty) {
                return {
                  ...foundProperty,
                  property_id: foundProperty.property_id || String(foundProperty.id),
                  name: foundProperty.name || `Property ${propId}`
                };
              }
              return null;
            })
            .filter(Boolean) as Property[];
        } 
        // If properties are already objects, use them directly
        else if (profileData.properties.length > 0 && typeof profileData.properties[0] === 'object') {
          userProperties = profileData.properties;
        }
      } 
      // If no properties in profile, get all accessible properties
      else {
        userProperties = propertiesData.map((p: any) => ({
          ...p,
          property_id: p.property_id || String(p.id),
          name: p.name || `Property ${p.id || p.property_id}`
        }));
      }
      
      console.log('Processed user properties:', userProperties);

      const profile: UserProfile = {
        id: profileData.id,
        username: profileData.username,
        profile_image: profileData.profile_image,
        positions: profileData.positions,
        email: profileData.email,
        created_at: profileData.created_at,
        properties: userProperties
      };
      
      console.log('Final user profile:', profile);

      setUserProfile(profile);
      setLastFetched(Date.now());
      setError(null);

      // Set selected property if not already set
      if (userProperties.length > 0 && !selectedProperty) {
        const storedPropertyId = localStorage.getItem('selectedPropertyId');
        const defaultPropertyId = storedPropertyId && userProperties.some(p => 
          p.property_id === storedPropertyId || String(p.id) === storedPropertyId
        ) 
          ? storedPropertyId 
          : userProperties[0].property_id || String(userProperties[0].id);
          
        console.log('Setting selected property to:', defaultPropertyId);
        setSelectedProperty(defaultPropertyId);
      }

      return profile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      console.error('Error fetching user data:', message);
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