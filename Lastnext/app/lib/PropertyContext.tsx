// ./app/lib/PropertyContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Property {
  property_id: string;
  name: string;
  // other property fields
}

interface PropertyContextType {
  selectedProperty: string | null;
  setSelectedProperty: (propertyId: string) => void;
  // Add other methods as needed
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [selectedProperty, setSelectedPropertyState] = useState<string | null>(null);

  // Wrapped setter with debugging
  const setSelectedProperty = (propertyId: string) => {
    console.log("[PropertyContext] Setting selectedProperty to:", propertyId);
    console.log("[PropertyContext] Type of propertyId:", typeof propertyId);
    
    if (typeof propertyId !== 'string') {
      console.error("[PropertyContext] Error: Non-string value passed to setSelectedProperty:", propertyId);
      
      // If it's an object with property_id, use that instead
      if (propertyId && typeof propertyId === 'object' && 'property_id' in propertyId) {
        const actualId = (propertyId as any).property_id;
        console.log("[PropertyContext] Extracting property_id from object:", actualId);
        setSelectedPropertyState(actualId);
        return;
      }
      
      // If string conversion makes sense, do that
      try {
        const stringValue = String(propertyId);
        console.log("[PropertyContext] Converting to string:", stringValue);
        setSelectedPropertyState(stringValue);
      } catch (e) {
        console.error("[PropertyContext] Failed to convert to string:", e);
        // Keep current value
      }
      return;
    }
    
    setSelectedPropertyState(propertyId);
  };

  // Initialize from localStorage on client-side mount
  useEffect(() => {
    try {
      const storedId = localStorage.getItem('selectedPropertyId');
      console.log("[PropertyContext] Initial load from localStorage:", storedId);
      if (storedId) {
        setSelectedPropertyState(storedId);
      }
    } catch (e) {
      console.error("[PropertyContext] Error loading from localStorage:", e);
    }
  }, []);

  return (
    <PropertyContext.Provider value={{ selectedProperty, setSelectedProperty }}>
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