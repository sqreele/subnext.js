// ./app/lib/PropertyContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface Property {
  property_id: string;
  name: string;
  // other property fields
}

interface PropertyContextType {
  selectedProperty: string | null;
  setSelectedProperty: (propertyId: string) => void;
  hasProperties: boolean; // Add this to track if user has properties
  userProperties: Property[]; // Add this to keep track of available properties
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [selectedProperty, setSelectedPropertyState] = useState<string | null>(null);
  const [userProperties, setUserProperties] = useState<Property[]>([]);
  
  // Determine if user has properties
  const hasProperties = userProperties.length > 0;

  // Update user properties when session changes
  useEffect(() => {
    if (session?.user?.properties) {
      setUserProperties(session.user.properties);
    } else {
      setUserProperties([]);
    }
  }, [session]);

  // Wrapped setter with debugging and validation
  const setSelectedProperty = (propertyId: string) => {
    console.log("[PropertyContext] Setting selectedProperty to:", propertyId);
    console.log("[PropertyContext] Type of propertyId:", typeof propertyId);
    
    // Empty string means "no selection"
    if (propertyId === '') {
      setSelectedPropertyState(null);
      localStorage.removeItem('selectedPropertyId');
      return;
    }
    
    if (typeof propertyId !== 'string') {
      console.error("[PropertyContext] Error: Non-string value passed to setSelectedProperty:", propertyId);
      
      // If it's an object with property_id, use that instead
      if (propertyId && typeof propertyId === 'object' && 'property_id' in propertyId) {
        const actualId = (propertyId as any).property_id;
        console.log("[PropertyContext] Extracting property_id from object:", actualId);
        setSelectedPropertyState(actualId);
        localStorage.setItem('selectedPropertyId', actualId);
        return;
      }
      
      // If string conversion makes sense, do that
      try {
        const stringValue = String(propertyId);
        console.log("[PropertyContext] Converting to string:", stringValue);
        setSelectedPropertyState(stringValue);
        localStorage.setItem('selectedPropertyId', stringValue);
      } catch (e) {
        console.error("[PropertyContext] Failed to convert to string:", e);
        // Keep current value
      }
      return;
    }
    
    setSelectedPropertyState(propertyId);
    localStorage.setItem('selectedPropertyId', propertyId);
  };

  // Initialize from localStorage on client-side mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedId = localStorage.getItem('selectedPropertyId');
        console.log("[PropertyContext] Initial load from localStorage:", storedId);
        
        if (storedId) {
          setSelectedPropertyState(storedId);
        }
      }
    } catch (e) {
      console.error("[PropertyContext] Error loading from localStorage:", e);
    }
  }, []);

  // When properties change, ensure selected property is valid
  useEffect(() => {
    if (userProperties.length > 0) {
      // If we have a selected property, check if it's still valid
      if (selectedProperty) {
        const isValid = userProperties.some(prop => 
          prop.property_id === selectedProperty
        );
        
        if (!isValid) {
          // If not valid, select the first available property
          const firstPropertyId = userProperties[0].property_id;
          console.log("[PropertyContext] Selected property not valid, switching to:", firstPropertyId);
          setSelectedProperty(firstPropertyId);
        }
      } else {
        // If no property selected but we have properties, select the first one
        const firstPropertyId = userProperties[0].property_id;
        console.log("[PropertyContext] No property selected, defaulting to:", firstPropertyId);
        setSelectedProperty(firstPropertyId);
      }
    } else if (selectedProperty) {
      // If no properties but we have a selected property, clear it
      console.log("[PropertyContext] No properties available, clearing selection");
      setSelectedPropertyState(null);
      localStorage.removeItem('selectedPropertyId');
    }
  }, [userProperties, selectedProperty]);

  return (
    <PropertyContext.Provider value={{ 
      selectedProperty, 
      setSelectedProperty, 
      hasProperties,
      userProperties
    }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
}