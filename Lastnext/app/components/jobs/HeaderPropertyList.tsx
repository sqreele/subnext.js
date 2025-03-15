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

  // Find current property, with fallback to first property or null if none
  const currentProperty = useMemo(() => {
    return properties.find((p) => p.property_id === selectedProperty) || properties[0] || null;
  }, [properties, selectedProperty]);

  // Memoized handler to select property
  const handlePropertySelect = useCallback(
    (propertyId: string) => {
      console.log("Selected property:", propertyId);
      setSelectedProperty(propertyId);
      
      // Persist selection in localStorage
      localStorage.setItem("selectedPropertyId", propertyId);
    },
    [setSelectedProperty]
  );

  // Sync selectedProperty with localStorage or first property on mount
  useEffect(() => {
    if (!selectedProperty && properties.length > 0) {
      const storedPropertyId = localStorage.getItem("selectedPropertyId");
      const defaultPropertyId = storedPropertyId && properties.some(p => p.property_id === storedPropertyId)
        ? storedPropertyId
        : properties[0]?.property_id;
      
      if (defaultPropertyId) {
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
                selectedProperty === property.property_id
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