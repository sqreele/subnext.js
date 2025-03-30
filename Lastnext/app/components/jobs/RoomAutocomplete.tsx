"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown, Building } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useProperty } from "@/app/lib/PropertyContext";
import { Room } from "@/app/lib/types";

interface RoomAutocompleteProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room | null) => void;
  debug?: boolean;
}

const RoomAutocomplete = ({
  rooms = [],
  selectedRoom,
  onSelect,
  debug = true, // Set to true by default for debugging
}: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedProperty, userProperties } = useProperty();

  const debugLog = (message: string, data?: any) => {
    if (debug) {
      console.log(`[RoomAutocomplete] ${message}`, data !== undefined ? data : "");
    }
  };

  // Safer room array handling
  const safeRooms = Array.isArray(rooms) ? rooms : [];

  // Enhanced debugging for property-room relationships
  useEffect(() => {
    if (debug) {
      debugLog("PROPERTY CONTEXT:", {
        selectedProperty,
        userProperties
      });
      
      if (safeRooms.length > 0) {
        debugLog("SAMPLE ROOMS DATA:", 
          safeRooms.slice(0, 3).map(room => ({
            name: room.name,
            room_id: room.room_id,
            properties: room.properties, 
            property_id: room.property_id,
            property: room.property
          }))
        );
      }
      
      if (selectedProperty) {
        const propertyInfo = userProperties.find(p => p.property_id === selectedProperty);
        debugLog(`SELECTED PROPERTY: ${selectedProperty}`, propertyInfo);
      }
    }
  }, [selectedProperty, safeRooms, userProperties, debug]);

  // Detailed room-to-property matching function with extensive logging
// Improved roomBelongsToProperty function with proper type handling
const roomBelongsToProperty = (room: Room, propertyId: string | null): boolean => {
  // If no property is selected, show all rooms
  if (!propertyId) return true;
  if (!room) return false;
  
  debugLog(`Checking if room ${room.name} belongs to property ${propertyId}`);
  
  // Special case mapping from property_id strings to numeric IDs used in room.properties
  // This mapping should match your actual data
  let internalNumericId: number | null = null;
  
  // Map property_id strings to the numeric IDs used in room.properties
  if (propertyId === "PB749146D") internalNumericId = 1;
  if (propertyId === "PE17D8D2C") internalNumericId = 2;
  
  // Check if properties array includes the numeric ID
  if (room.properties && Array.isArray(room.properties) && internalNumericId !== null) {
    if (room.properties.includes(internalNumericId)) {
      debugLog(`✓ MATCH: Room properties includes mapped ID ${internalNumericId} for ${propertyId}`);
      return true;
    }
  }
  
  // Check direct property_id match
  if (room.property_id && String(room.property_id) === propertyId) {
    debugLog(`✓ MATCH: Direct property_id match`);
    return true;
  }
  
  // Check property field
  if (room.property && String(room.property) === propertyId) {
    debugLog(`✓ MATCH: Room property field matches`);
    return true;
  }
  
  debugLog(`✗ NO MATCH: Room ${room.name} does not match property ${propertyId}`);
  return false;
};

  // Reset selected room when property changes if it doesn't belong to the new property
  useEffect(() => {
    if (selectedRoom && selectedProperty && 
        !roomBelongsToProperty(selectedRoom, selectedProperty)) {
      debugLog(`Selected room ${selectedRoom.name} doesn't belong to property ${selectedProperty}, resetting selection`);
      onSelect(null);
    }
  }, [selectedProperty, selectedRoom]);

  // Filter rooms based on property and search query
  const filteredRooms = useMemo(() => {
    if (safeRooms.length === 0) {
      debugLog("No rooms available");
      return [];
    }

    debugLog(`Filtering ${safeRooms.length} rooms for property ${selectedProperty || 'any'} and query "${searchQuery}"`);

    const results = safeRooms.filter((room) => {
      // Skip invalid rooms
      if (!room || !room.name) {
        return false;
      }

      // Filter by property
      const matchesProperty = roomBelongsToProperty(room, selectedProperty);
      if (!matchesProperty) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const nameMatch = room.name.toLowerCase().includes(search);
        const typeMatch = room.room_type?.toLowerCase().includes(search);
        return nameMatch || typeMatch;
      }

      return true;
    });

    debugLog(`Filtering result: ${results.length} rooms match from ${safeRooms.length} total`);
    
    // Additional debug info if no rooms match
    if (results.length === 0 && safeRooms.length > 0 && selectedProperty) {
      debugLog("WARNING: No rooms match selected property", {
        selectedProperty,
        propertyEntity: userProperties.find(p => p.property_id === selectedProperty),
        totalRooms: safeRooms.length
      });
    }
    
    // Sort rooms by name for better usability
    return results.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
  }, [safeRooms, searchQuery, selectedProperty]);

  // Get property name for display
  const getPropertyName = (): string => {
    if (!selectedProperty) return "All Properties";
    const property = userProperties?.find(p => p.property_id === selectedProperty);
    return property?.name || `Property ${selectedProperty}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Building className="h-3.5 w-3.5" />
        <span>
          Showing rooms for: <span className="font-medium text-gray-700">{getPropertyName()}</span>
          {filteredRooms.length > 0 && (
            <span className="ml-1">({filteredRooms.length} available)</span>
          )}
        </span>
      </div>
      
      {debug && (
        <div className="text-xs text-gray-500 bg-gray-100 p-1 rounded">
          Debug: Property: {selectedProperty || "none"} | 
          Rooms: {safeRooms.length} | 
          Filtered: {filteredRooms.length} | 
          Properties: {userProperties?.length || 0}
        </div>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-12 text-base bg-white border-gray-300 font-normal",
              !selectedRoom?.name && "text-gray-500"
            )}
          >
            {selectedRoom?.name
              ? `${selectedRoom.name} - ${selectedRoom.room_type || 'Unknown type'}`
              : "Select room..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border border-gray-200 shadow-md">
          <Command shouldFilter={false} className="border-0">
            <CommandInput
              placeholder="Search room..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-11 text-base border-b border-gray-200"
            />
            <CommandList>
              <CommandEmpty className="py-3 px-4 text-sm text-gray-500">
                {safeRooms.length === 0
                  ? "No rooms available in the system"
                  : filteredRooms.length === 0 && selectedProperty
                  ? `No rooms found for ${getPropertyName()}. Try selecting a different property.`
                  : filteredRooms.length === 0 && searchQuery
                  ? `No rooms match "${searchQuery}". Try a different search term.`
                  : "No rooms found"}
              </CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                {filteredRooms.map((room) => (
                  <CommandItem
                    key={`${room.room_id}-${room.name}`}
                    value={room.name}
                    onSelect={() => {
                      onSelect(room);
                      setSearchQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-4 py-3",
                      "text-gray-800 hover:bg-gray-100",
                      selectedRoom?.room_id === room.room_id && "bg-blue-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          selectedRoom?.room_id === room.room_id ? "opacity-100 text-blue-600" : "opacity-0"
                        )}
                      />
                      <span className="font-medium">{room.name}</span>
                      <span className="text-gray-500">- {room.room_type || 'Unknown type'}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default RoomAutocomplete;