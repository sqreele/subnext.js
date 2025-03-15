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
import { Property } from "@/app/lib/types";

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

  // Helper function to safely get the string ID from any property object format
  const getPropertyId = useCallback((property: any): string => {
    if (!property) return "";
    if (typeof property === "string" || typeof property === "number") return String(property);
    if (typeof property.property_id === "string" || typeof property.property_id === "number") {
      return String(property.property_id);
    }
    if (typeof property.id === "string" || typeof property.id === "number") {
      return String(property.id);
    }
    return "";
  }, []);

  // Helper function to safely get the display name from any property object format
  const getPropertyName = useCallback((property: any): string => {
    if (!property) return "Select Property";
    if (typeof property === "string" || typeof property === "number") return `Property ${property}`;
    return property.name || `Property ${getPropertyId(property)}`;
  }, [getPropertyId]);

  // Determine properties from either source, preferring user context
  const properties = useMemo(() => {
    const userProps = userProfile?.properties || [];
    const sessionProps = session?.user?.properties || [];
    
    console.log("User properties:", userProps);
    console.log("Session properties:", sessionProps);
    
    // Use userProfile.properties if available and not empty, otherwise fall back to session
    return userProps.length > 0 ? userProps : sessionProps;
  }, [userProfile?.properties, session?.user?.properties]);

  // Find current property by selectedProperty ID
  const currentProperty = useMemo(() => {
    if (!properties.length) return null;
    
    console.log("Looking for property with ID:", selectedProperty);
    console.log("Available properties:", properties);
    
    if (selectedProperty) {
      // Try to find the property with matching ID
      for (const prop of properties) {
        const propId = getPropertyId(prop);
        if (propId === selectedProperty) {
          console.log("Found matching property:", prop);
          return prop;
        }
      }
    }
    
    // Fallback to first property if selected not found
    console.log("No matching property found, using first property:", properties[0]);
    return properties[0];
  }, [properties, selectedProperty, getPropertyId]);

  // Handle property selection
  const handlePropertySelect = useCallback(
    (property: any) => {
      const propId = getPropertyId(property);
      console.log("Selected property:", property);
      console.log("Property ID:", propId);
      setSelectedProperty(propId);
    },
    [setSelectedProperty, getPropertyId]
  );

  // Initialize selected property from localStorage or first property
  useEffect(() => {
    if (properties.length > 0 && !selectedProperty) {
      const storedPropertyId = localStorage.getItem("selectedPropertyId");
      
      // Find property with matching stored ID
      let defaultProperty = null;
      if (storedPropertyId) {
        defaultProperty = properties.find(p => getPropertyId(p) === storedPropertyId);
      }
      
      // Use found property or first property
      const propertyToSelect = defaultProperty || properties[0];
      console.log("Setting default property:", propertyToSelect);
      if (propertyToSelect) {
        handlePropertySelect(propertyToSelect);
      }
    }
  }, [properties, selectedProperty, handlePropertySelect, getPropertyId]);

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
                {getPropertyName(currentProperty)}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-full sm:w-[200px] bg-white border-gray-200 shadow-md rounded-md mt-1"
          align="start"
        >
          {properties.map((property, index) => (
            <DropdownMenuItem
              key={getPropertyId(property) || `property-${index}`}
              onClick={() => handlePropertySelect(property)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-sm sm:text-base cursor-pointer min-h-[44px]",
                selectedProperty === getPropertyId(property)
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100 text-gray-700"
              )}
            >
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{getPropertyName(property)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HeaderPropertyList;