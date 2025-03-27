// File: ./app/lib/PropertyContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface Property {
  property_id: string; // e.g., "PAA1A6A0E"
  name: string;
  description?: string;
  users?: number[];
  created_at?: string;
  id: number; // Django PK, e.g., 1
}

interface PropertyContextType {
  selectedProperty: string | null;
  setSelectedProperty: (propertyId: string) => void;
  hasProperties: boolean;
  userProperties: Property[];
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [selectedProperty, setSelectedPropertyState] = useState<string | null>(null);
  const [userProperties, setUserProperties] = useState<Property[]>([]);
  const hasProperties = userProperties.length > 0;

  useEffect(() => {
    if (session?.user?.properties) {
      setUserProperties(session.user.properties as Property[]);
    } else {
      setUserProperties([]);
    }
  }, [session]);

  const setSelectedProperty = (propertyId: string) => {
    console.log("[PropertyContext] Setting selectedProperty to:", propertyId);
    console.log("[PropertyContext] Type of propertyId:", typeof propertyId);

    if (propertyId === "") {
      setSelectedPropertyState(null);
      localStorage.removeItem("selectedPropertyId");
      return;
    }

    if (typeof propertyId !== "string") {
      console.error("[PropertyContext] Error: Non-string value passed to setSelectedProperty:", propertyId);
      if (propertyId && typeof propertyId === "object" && "property_id" in propertyId) {
        const actualId = (propertyId as any).property_id;
        console.log("[PropertyContext] Extracting property_id from object:", actualId);
        setSelectedPropertyState(actualId);
        localStorage.setItem("selectedPropertyId", actualId);
        return;
      }
      try {
        const stringValue = String(propertyId);
        console.log("[PropertyContext] Converting to string:", stringValue);
        setSelectedPropertyState(stringValue);
        localStorage.setItem("selectedPropertyId", stringValue);
      } catch (e) {
        console.error("[PropertyContext] Failed to convert to string:", e);
      }
      return;
    }

    setSelectedPropertyState(propertyId);
    localStorage.setItem("selectedPropertyId", propertyId);
  };

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const storedId = localStorage.getItem("selectedPropertyId");
        console.log("[PropertyContext] Initial load from localStorage:", storedId);
        if (storedId) {
          setSelectedPropertyState(storedId);
        }
      }
    } catch (e) {
      console.error("[PropertyContext] Error loading from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    if (userProperties.length > 0) {
      if (selectedProperty) {
        const isValid = userProperties.some(prop => prop.property_id === selectedProperty);
        if (!isValid) {
          const firstPropertyId = userProperties[0].property_id;
          console.log("[PropertyContext] Selected property not valid, switching to:", firstPropertyId);
          setSelectedProperty(firstPropertyId);
        }
      } else {
        const firstPropertyId = userProperties[0].property_id;
        console.log("[PropertyContext] No property selected, defaulting to:", firstPropertyId);
        setSelectedProperty(firstPropertyId);
      }
    } else if (selectedProperty) {
      console.log("[PropertyContext] No properties available, clearing selection");
      setSelectedPropertyState(null);
      localStorage.removeItem("selectedPropertyId");
    }
  }, [userProperties, selectedProperty]);

  return (
    <PropertyContext.Provider
      value={{
        selectedProperty,
        setSelectedProperty,
        hasProperties,
        userProperties,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error("useProperty must be used within a PropertyProvider");
  }
  return context;
}