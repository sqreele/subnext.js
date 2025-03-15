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
import { Property } from "@/app/lib/types"; // Make sure to import Property type

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
  const properties = useMemo(() => {
    const userProps = userProfile?.properties || [];
    const sessionProps = session?.user?.properties || [];
    
    // Use userProfile.properties if available and not empty, otherwise fall back to session
    return userProps.length > 0 ? userProps : sessionProps;
  }, [userProfile?.properties, session?.user?.properties]);

  // Get a safe string ID from a property
  const getPropertyStringId = useCallback((property: Property): string => {
    if (typeof property.property_id === 'string') {
      return property.property_id;
    }
    if (typeof property.property_id === 'number') {
      return String(property.property_id);
    }
    // Fallback to id if available
    if (property.id) {
      return typeof property.id === 'string' ? property.id : String(property.id);
    }
    return "";
  }, []);

  // Find current property by matching ID strings
  const currentProperty = useMemo(() => {
    if (!selectedProperty || properties.length === 0) {
      return properties[0] || null;
    }
    
    // Try to find the property with matching string ID
    for (const prop of properties) {
      const propId = getPropertyStringId(prop);
      if (propId === selectedProperty) {
        return prop;
      }
    }
    
    // Fallback to first property if not found
    return properties[0] || null;
  }, [properties, selectedProperty, getPropertyStringId]);

  // Get a display name for the property
  const getPropertyDisplayName = useCallback((property: Property | null): string => {
    if (!property) return "Select Property";
    return property.name || "Unnamed Property";
  }, []);

  // Handler to select property
  const handlePropertySelect = useCallback(
    (property: Property) => {
      const propId = getPropertyStringId(property);
      console.log("Selected property:", propId);
      setSelectedProperty(propId);
      
      // Persist selection in localStorage
      localStorage.setItem("selectedPropertyId", propId);
    },
    [getPropertyStringId, setSelectedProperty]
  );

  // Sync selectedProperty with localStorage or first property on mount
  useEffect(() => {
    if (!selectedProperty && properties.length > 0) {
      const storedPropertyId = localStorage.getItem("selectedPropertyId");
      
      // Find property with matching ID in localStorage
      const storedProperty = storedPropertyId 
        ? properties.find(p => getPropertyStringId(p) === storedPropertyId)
        : null;
      
      // Use stored property if found, otherwise first property
      const defaultProperty = storedProperty || properties[0];
      if (defaultProperty) {
        handlePropertySelect(defaultProperty);
      }
    }
  }, [properties, selectedProperty, handlePropertySelect, getPropertyStringId]);

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
                {getPropertyDisplayName(currentProperty)}
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
              key={getPropertyStringId(property) || Math.random().toString()}
              onClick={() => handlePropertySelect(property)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-sm sm:text-base cursor-pointer min-h-[44px]",
                selectedProperty === getPropertyStringId(property)
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100 text-gray-700"
              )}
            >
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{getPropertyDisplayName(property)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HeaderPropertyList;