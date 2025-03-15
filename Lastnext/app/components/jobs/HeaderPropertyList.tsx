// ./app/components/jobs/HeaderPropertyList.tsx
"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import { useUser } from "@/app/lib/user-context";
import { useProperty } from "@/app/lib/PropertyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Button } from "@/app/components/ui/button";
import { ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Property {
  property_id: string;
  name: string;
  // Add other property fields if needed
}

const HeaderPropertyList = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { userProfile } = useUser();
  const { selectedProperty, setSelectedProperty } = useProperty();

  // Redirect to login if session error
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Determine properties from either source, preferring user context
  const properties: Property[] = useMemo(() => {
    const userProps = userProfile?.properties || [];
    const sessionProps = session?.user?.properties || [];
    
    // Use userProfile.properties if available and not empty, otherwise fall back to session
    return userProps.length > 0 ? userProps : sessionProps;
  }, [userProfile?.properties, session?.user?.properties]);

  // Find current property, with fallback to first property or null if none
  const currentProperty = useMemo(() => {
    // Debug current selectedProperty value
    console.log("In currentProperty memo - selectedProperty type:", typeof selectedProperty);
    console.log("In currentProperty memo - selectedProperty value:", 
      typeof selectedProperty === 'object' 
        ? JSON.stringify(selectedProperty, null, 2) 
        : selectedProperty);
    
    // Make sure we're working with property IDs consistently
    const propertyId = typeof selectedProperty === 'string' ? selectedProperty : 
                      (selectedProperty as any)?.property_id || null;
    
    console.log("Extracted property ID:", propertyId);
    
    const found = properties.find((p) => p.property_id === propertyId);
    const result = found || properties[0] || null;
    
    console.log("Current property resolved to:", 
      result ? JSON.stringify(result, null, 2) : "null");
    
    return result;
  }, [properties, selectedProperty]);

  // Memoized handler to select property
  const handlePropertySelect = useCallback(
    (propertyId: string) => {
      // Log the property object for debugging (properly formatted)
      const selectedProp = properties.find(p => p.property_id === propertyId);
      console.log("Selected property ID:", propertyId);
      console.log("Property details:", JSON.stringify(selectedProp, null, 2));
      console.log("All properties:", JSON.stringify(properties, null, 2));
      
      // Debug logging for setSelectedProperty
      console.log("Before setSelectedProperty - Current value:", 
        typeof selectedProperty === 'object' 
          ? JSON.stringify(selectedProperty, null, 2) 
          : selectedProperty);
      
      setSelectedProperty(propertyId);
      
      // Log after state update is queued (won't show new value yet due to React's batching)
      console.log("After setSelectedProperty call");
      
      // Persist selection in localStorage
      localStorage.setItem("selectedPropertyId", propertyId);
      console.log("Saved to localStorage:", propertyId);
      
      // Add console trace to see call stack
      console.trace("Property selection call stack");
    },
    [properties, setSelectedProperty, selectedProperty]
  );

  // Sync selectedProperty with localStorage or first property on mount
  useEffect(() => {
    console.log("useEffect for property sync triggered");
    console.log("Current selectedProperty:", 
      typeof selectedProperty === 'object' 
        ? JSON.stringify(selectedProperty, null, 2) 
        : selectedProperty);
    console.log("Properties available:", properties.length);
    
    if ((!selectedProperty || 
         selectedProperty === '[object Object]' || 
         typeof selectedProperty === 'object') && 
        properties.length > 0) {
      
      const storedPropertyId = localStorage.getItem("selectedPropertyId");
      console.log("Stored property ID from localStorage:", storedPropertyId);
      
      // Check if stored ID exists in available properties
      const storedPropertyExists = storedPropertyId && 
        properties.some(p => p.property_id === storedPropertyId);
      console.log("Stored property exists in available properties:", storedPropertyExists);
      
      const defaultPropertyId = storedPropertyExists
        ? storedPropertyId
        : properties[0]?.property_id;
      
      console.log("Using default property ID:", defaultPropertyId);
      
      if (defaultPropertyId) {
        console.log("Setting selected property to:", defaultPropertyId);
        setSelectedProperty(defaultPropertyId);
      }
    }
  }, [properties, selectedProperty, setSelectedProperty]);

  // Loading state if session or user data is not yet available
  if (status === "loading" || !userProfile) {
    return (
      <Button
        variant="outline"
        disabled
        className="flex items-center gap-2 w-full sm:w-auto h-10 text-sm sm:text-base px-3 sm:px-4 bg-white border-gray-300 text-gray-500"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // If no properties available, show disabled button
  if (properties.length === 0) {
    return (
      <Button
        variant="outline"
        disabled
        className="flex items-center gap-2 w-full sm:w-auto h-10 text-sm sm:text-base px-3 sm:px-4 bg-white border-gray-300 text-gray-500"
      >
        <Building2 className="h-4 w-4" />
        No Properties
      </Button>
    );
  }

  return (
    <div className="relative w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between gap-2 w-full sm:w-auto h-10 text-sm sm:text-base px-3 sm:px-4 bg-white border-gray-300 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0 text-gray-600" />
              <span className="truncate text-gray-700">
                {currentProperty?.name || "Select Property"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-full sm:w-[200px] bg-white border-gray-200 shadow-md rounded-md mt-1"
          align="start"
        >
          {properties.map((property) => (
            <DropdownMenuItem
              key={property.property_id}
              onClick={() => handlePropertySelect(property.property_id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-sm sm:text-base cursor-pointer min-h-[44px]",
                (selectedProperty === property.property_id || 
                 (typeof selectedProperty === 'object' && (selectedProperty as any)?.property_id === property.property_id))
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100 text-gray-700"
              )}
            >
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{property.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HeaderPropertyList;