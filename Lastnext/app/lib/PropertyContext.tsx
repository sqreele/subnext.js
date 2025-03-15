
'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the type for the context
interface PropertyContextType {
  selectedProperty: string | null;
  setSelectedProperty: (propertyId: string | null) => void;
}

// Create the context
const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

// Provider component
export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  return (
    <PropertyContext.Provider value={{ selectedProperty, setSelectedProperty }}>
      {children}
    </PropertyContext.Provider>
  );
};

// Custom hook for using the context
export const useProperty = (): PropertyContextType => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};
