// ./app/components/jobs/RoomAutocomplete.tsx
"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown, Building } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useProperty } from "@/app/lib/PropertyContext";
import { Room, Property } from "@/app/lib/types";

interface RoomAutocompleteProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room | null) => void;
  disabled?: boolean;
  debug?: boolean;
}

const RoomAutocomplete = ({
  rooms = [],
  selectedRoom,
  onSelect,
  disabled = false,
  debug = false, // Set default to false in production
}: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedProperty, userProperties = [] } = useProperty();

  // Safer debug logging
  const debugLog = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[RoomAutocomplete] ${message}`, data !== undefined ? data : "");
    }
  }, [debug]);

  // Safer room array handling
  const safeRooms = useMemo(() => (Array.isArray(rooms) ? rooms : []), [rooms]);

  // Log properties data for debugging
  useEffect(() => {
    if (debug) {
      debugLog("CONTEXT/PROPS:", {
        selectedProperty,
        userPropertiesCount: userProperties?.length,
        totalRoomsProp: safeRooms.length,
        selectedRoom
      });

      if (selectedProperty) {
        const propertyInfo = userProperties.find(p => {
          // Check both id and property_id fields for match
          return (p.property_id && p.property_id === selectedProperty) || 
                 (p.id && p.id === selectedProperty);
        });
        debugLog(`SELECTED PROPERTY ENTITY: ${selectedProperty}`, propertyInfo ?? 'Not found in userProperties');
      }
    }
  }, [selectedProperty, safeRooms, userProperties, debug, debugLog, selectedRoom]);

  // Enhanced roomBelongsToProperty with better property ID handling
  const roomBelongsToProperty = useCallback((room: Room, propertyId: string | null): boolean => {
    // Early returns
    if (!propertyId) return true; // Show all if no property selected
    if (!room) return false;
    
    // Special case for property ID "1" - often used as a global property
    if (propertyId === "1") return true;

    debugLog(`Checking if room ${room.name} (ID: ${room.room_id}) belongs to property ${propertyId}`);

    // Check the 'properties' array field on the room object
    if (room.properties && Array.isArray(room.properties)) {
      for (const propIdentifier of room.properties) {
        // Handle null/undefined
        if (propIdentifier === null || propIdentifier === undefined) continue;
        
        // Handle property object with property_id field
        if (typeof propIdentifier === 'object' && 'property_id' in propIdentifier) {
          const propId = propIdentifier.property_id;
          debugLog(` -> Checking property object: property_id=${propId}`);
          if (String(propId) === propertyId) {
            debugLog(`✓ MATCH: property_id in object matches ${propertyId}`);
            return true;
          }
        }
        
        // Handle property object with id field
        if (typeof propIdentifier === 'object' && 'id' in propIdentifier) {
          const propId = propIdentifier.id;
          debugLog(` -> Checking property object: id=${propId}`);
          if (String(propId) === propertyId) {
            debugLog(`✓ MATCH: id in object matches ${propertyId}`);
            return true;
          }
        }
        
        // Handle direct string/number property ID
        if (typeof propIdentifier === 'string' || typeof propIdentifier === 'number') {
          debugLog(` -> Checking direct property ID: ${propIdentifier}`);
          if (String(propIdentifier) === propertyId) {
            debugLog(`✓ MATCH: Direct property ID matches ${propertyId}`);
            return true;
          }
        }
      }
      
      debugLog(` -> No match found in room.properties array for room ${room.name}`);
    } else {
      debugLog(` -> room.properties array does not exist or is not an array for room ${room.name}`);
    }

    // Special case for property_id PB749146D - if you have a specific rule
    if (propertyId === 'PB749146D' && room.room_type === 'Hotel') {
      debugLog(`✓ MATCH: Special case for PB749146D and Hotel rooms`);
      return true;
    }

    debugLog(`✗ NO MATCH: Room ${room.name} does not match property ${propertyId}`);
    return false;
  }, [debugLog]);

  // Reset selected room when property changes if it doesn't belong
  useEffect(() => {
    if (selectedRoom && selectedProperty &&
        !roomBelongsToProperty(selectedRoom, selectedProperty)) {
      debugLog(`Selected room ${selectedRoom.name} doesn't belong to property ${selectedProperty}, resetting selection`);
      onSelect(null);
    }
  }, [selectedProperty, selectedRoom, onSelect, roomBelongsToProperty, debugLog]);

  // Filter rooms based on property and search query
  const filteredRooms = useMemo(() => {
    if (safeRooms.length === 0) {
      debugLog("No rooms available to filter.");
      return [];
    }
    
    debugLog(`Filtering ${safeRooms.length} rooms for property: ${selectedProperty || 'any'}, query: "${searchQuery}"`);

    const results = safeRooms.filter((room) => {
      // Skip invalid rooms
      if (!room || typeof room.name !== 'string') {
        return false;
      }
      
      // Filter by property first
      if (!roomBelongsToProperty(room, selectedProperty)) {
        return false;
      }
      
      // Then filter by search query
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const nameMatch = room.name.toLowerCase().includes(search);
        const typeMatch = typeof room.room_type === 'string' && 
                         room.room_type.toLowerCase().includes(search);
        return nameMatch || typeMatch;
      }
      
      // If no search query, include all rooms that passed property filter
      return true;
    });

    debugLog(`Filtering result: ${results.length} rooms match.`);
    
    // Sort rooms by name for better usability
    return results.sort((a, b) => 
      a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'})
    );
  }, [safeRooms, searchQuery, selectedProperty, roomBelongsToProperty, debugLog]);

  // Get property name with better error handling
  const getPropertyName = useCallback((): string => {
    if (!selectedProperty) return "All Properties";
    
    // Check userProperties array for matching property
    if (Array.isArray(userProperties) && userProperties.length > 0) {
      // Try to find by property_id first
      const propertyById = userProperties.find(p => p.property_id === selectedProperty);
      if (propertyById?.name) return propertyById.name;
      
      // Try to find by id if property_id didn't match
      const propertyByAltId = userProperties.find(p => p.id === selectedProperty);
      if (propertyByAltId?.name) return propertyByAltId.name;
    }
    
    // Fallback to showing the ID
    return `Property ID ${selectedProperty}`;
  }, [selectedProperty, userProperties]);

  return (
    <div className="space-y-2">
      {/* Info text showing current property */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <Building className="h-3 w-3" />
        <span>Showing rooms for: <span className="font-medium text-gray-700">{getPropertyName()}</span>
         {(selectedProperty || searchQuery) && (<span className="ml-1">({filteredRooms.length} found)</span>)}
        </span>
      </div>

      {/* Optional Debug Info */}
      {debug && (
        <div className="text-xs text-gray-500 bg-gray-100 p-1 rounded mb-1">
          Debug: Prop: {selectedProperty || "any"} | Rooms: {safeRooms.length} | 
          Filtered: {filteredRooms.length} | UserProps: {userProperties?.length || 0}
        </div>
      )}

      {/* Popover and Command */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || safeRooms.length === 0}
            className={cn(
              "w-full justify-between h-11 text-sm bg-white border-gray-300 font-normal",
              !selectedRoom?.name && "text-muted-foreground"
            )}
          >
            {selectedRoom?.name
              ? `${selectedRoom.name}${selectedRoom.room_type ? ` (${selectedRoom.room_type})` : ''}`
              : "Select room..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width)] p-0 bg-white border border-input shadow-md">
          <Command shouldFilter={false} className="border-0">
            <CommandInput
              placeholder="Search room name or type..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-10 text-sm"
            />
            <CommandList>
              <CommandEmpty className="py-4 px-4 text-sm text-center text-muted-foreground">
                {safeRooms.length === 0 ? "No rooms available." :
                 filteredRooms.length === 0 && (selectedProperty || searchQuery) ? `No rooms match criteria.` :
                 "No rooms found."}
              </CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                {filteredRooms.map((room) => (
                  <CommandItem
                    key={`room-${room.room_id}`}
                    value={String(room.room_id)}
                    onSelect={(currentValue) => {
                        const roomToSelect = filteredRooms.find(r => String(r.room_id) === currentValue);
                        onSelect(roomToSelect || null);
                        setSearchQuery("");
                        setOpen(false);
                    }}
                    className="text-sm"
                  >
                    <Check 
                      className={cn(
                        "mr-2 h-4 w-4", 
                        selectedRoom?.room_id === room.room_id ? "opacity-100" : "opacity-0"
                      )} 
                    />
                    <span>{room.name}</span>
                    {room.room_type && <span className="ml-2 text-xs text-muted-foreground">({room.room_type})</span>}
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