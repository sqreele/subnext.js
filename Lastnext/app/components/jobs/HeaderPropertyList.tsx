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
import { ChevronDown, Building2, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Property } from "@/app/lib/types"; // Ensure Property type is imported

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
    const result = userProps.length > 0 ? userProps : sessionProps;
    console.log("Properties array resolved to:", result);
    return result;
  }, [userProfile?.properties, session?.user?.properties]);

  // Get a safe string ID from a property
  const getPropertyStringId = useCallback((property: Property): string => {
    if (!property) {
      console.log("Property is null or undefined");
      return "";
    }
    if (typeof property.property_id === "string") {
      return property.property_id;
    }
    if (typeof property.property_id === "number") {
      return String(property.property_id);
    }
    if (property.id) {
      return typeof property.id === "string" ? property.id : String(property.id);
    }
    console.log("No valid ID found for property:", property);
    return "";
  }, []);

  // Find current property by matching ID strings
  const currentProperty = useMemo(() => {
    if (!selectedProperty || properties.length === 0) {
      console.log(
        "No selectedProperty or properties empty, returning:",
        properties[0] || null
      );
      return properties[0] || null;
    }

    console.log("Searching for property with ID:", selectedProperty);
    for (const prop of properties) {
      const propId = getPropertyStringId(prop);
      console.log("Checking property:", prop, "with ID:", propId);
      if (propId === selectedProperty) {
        console.log("Match found:", prop);
        return prop;
      }
    }

    console.log("No match found, falling back to:", properties[0] || null);
    return properties[0] || null;
  }, [properties, selectedProperty, getPropertyStringId]);

  // Get a display name for the property
  const getPropertyDisplayName = useCallback((property: Property | null): string => {
    if (!property) {
      console.log("No property provided for display name");
      return "Select Property";
    }
    const name = typeof property.name === "string" ? property.name : "Unnamed Property";
    console.log("Property display name resolved to:", name, "for property:", property);
    return name;
  }, []);

  // Handler to select property
  const handlePropertySelect = useCallback(
    (property: Property) => {
      const propId = getPropertyStringId(property);
      console.log("Selected property ID:", propId);
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
      console.log("Stored property ID from localStorage:", storedPropertyId);

      // Find property with matching ID in localStorage
      const storedProperty = storedPropertyId
        ? properties.find((p) => getPropertyStringId(p) === storedPropertyId)
        : null;

      // Use stored property if found, otherwise first property
      const defaultProperty = storedProperty || properties[0];
      if (defaultProperty) {
        console.log("Syncing to default property:", defaultProperty);
        handlePropertySelect(defaultProperty);
      }
    }
    console.log("Properties available:", properties.length, "Current selectedProperty:", selectedProperty);
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
          {properties.map((property) => {
            const propId = getPropertyStringId(property);
            return (
              <DropdownMenuItem
                key={propId || Math.random().toString()} // Fallback key if propId is empty
                onClick={() => handlePropertySelect(property)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 text-sm sm:text-base cursor-pointer min-h-[44px]",
                  selectedProperty === propId
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                )}
              >
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{getPropertyDisplayName(property)}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HeaderPropertyList;