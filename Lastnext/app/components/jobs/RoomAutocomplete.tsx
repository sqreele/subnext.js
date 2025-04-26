// ./app/components/jobs/RoomAutocomplete.tsx
"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown, Building } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useProperty } from "@/app/lib/PropertyContext"; // Assuming this provides selectedProperty and userProperties
import { Room, Property } from "@/app/lib/types"; // Added Property import

// FIX 1: Add disabled prop
interface RoomAutocompleteProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room | null) => void;
  disabled?: boolean; // <<< ADDED disabled prop
  debug?: boolean;
}

const RoomAutocomplete = ({
  rooms = [],
  selectedRoom,
  onSelect,
  disabled = false, // <<< Added default value
  debug = true, // Defaulting debug to true for easier testing
}: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Ensure useProperty provides the correct types
  const { selectedProperty, userProperties = [] } = useProperty(); // Default userProperties to []

  const debugLog = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[RoomAutocomplete] ${message}`, data !== undefined ? data : "");
    }
  }, [debug]); // Depend on debug prop

  // Safer room array handling
  const safeRooms = useMemo(() => (Array.isArray(rooms) ? rooms : []), [rooms]);

  // Enhanced debugging for property-room relationships
  useEffect(() => {
    if (debug) {
      debugLog("CONTEXT/PROPS:", {
        selectedProperty,
        userPropertiesCount: userProperties?.length,
        totalRoomsProp: safeRooms.length,
        selectedRoom // Log current selected room
      });

      if (safeRooms.length > 0) {
        debugLog("SAMPLE ROOMS DATA RECEIVED:",
          safeRooms.slice(0, 3).map(room => ({ // Only log relevant fields based on expected Room type
            name: room.name,
            room_id: room.room_id,
            room_type: room.room_type,
            properties: room.properties, // Log the properties array associated with the room
            // property_id: room.property_id, // Removed as it likely doesn't exist on Room type
            // property: room.property      // Removed as it likely doesn't exist on Room type
          }))
        );
      }

      if (selectedProperty) {
        const propertyInfo = userProperties.find(p => p.property_id === selectedProperty);
        debugLog(`SELECTED PROPERTY ENTITY: ${selectedProperty}`, propertyInfo ?? 'Not found in userProperties');
      }
    }
  }, [selectedProperty, safeRooms, userProperties, debug, debugLog, selectedRoom]); // Added selectedRoom

  // FIX 2: Refined roomBelongsToProperty logic
  const roomBelongsToProperty = useCallback((room: Room, propertyId: string | null): boolean => {
      if (!propertyId) return true; // Show all if no property selected
      if (!room) return false;

      // Removed direct property_id access debug log to avoid confusion if field doesn't exist
      debugLog(`Checking if room ${room.name} (ID: ${room.room_id}) belongs to property ${propertyId}`);

      // Check the 'properties' array field on the room object FIRST
      // This assumes 'properties' contains IDs or objects linking the room to properties
      if (room.properties && Array.isArray(room.properties)) {
          const foundMatch = room.properties.some(propIdentifier => {
              let currentPropId: string | number | undefined | null = undefined;
              if (typeof propIdentifier === 'object' && propIdentifier !== null && 'property_id' in propIdentifier) {
                  // propIdentifier is a Property object
                  currentPropId = propIdentifier.property_id;
                  debugLog(` -> Checking property object in room.properties: ${currentPropId}`);
              } else if (propIdentifier !== null && propIdentifier !== undefined) {
                  // propIdentifier is a string or number ID
                  currentPropId = propIdentifier;
                  debugLog(` -> Checking property ID in room.properties: ${currentPropId}`);
              }
              // Compare the extracted/direct ID with the target propertyId (both as strings)
              return currentPropId !== undefined && currentPropId !== null && String(currentPropId) === propertyId;
          });

          if (foundMatch) {
               debugLog(`✓ MATCH: Found matching ID ${propertyId} in room.properties array for room ${room.name}`);
              return true;
          } else {
               debugLog(` -> No match found in room.properties array for room ${room.name}: ${JSON.stringify(room.properties)}`);
          }
      } else {
           debugLog(` -> room.properties array does not exist or is not an array for room ${room.name}.`);
      }

      // REMOVED check for direct property_id/property fields on Room object
      // as the type definition likely doesn't support them and caused errors.
      // Rely solely on the 'properties' array check above.

      debugLog(`✗ NO MATCH: Room ${room.name} does not match property ${propertyId} based on properties array.`);
      return false;
  }, [debugLog]); // Depend on debugLog


  // Reset selected room when property changes if it doesn't belong
  useEffect(() => {
    if (selectedRoom && selectedProperty &&
        !roomBelongsToProperty(selectedRoom, selectedProperty)) {
      debugLog(`Selected room ${selectedRoom.name} doesn't belong to property ${selectedProperty}, resetting selection`);
      onSelect(null);
    }
  }, [selectedProperty, selectedRoom, onSelect, roomBelongsToProperty, debugLog]); // Include all dependencies

  // Filter rooms based on property and search query
  const filteredRooms = useMemo(() => {
    if (safeRooms.length === 0) {
      debugLog("No rooms available to filter.");
      return [];
    }
    debugLog(`Filtering ${safeRooms.length} rooms for property: ${selectedProperty || 'any'}, query: "${searchQuery}"`);

    const results = safeRooms.filter((room) => {
      if (!room || typeof room.name !== 'string') { // Ensure room and name are valid
          debugLog(`Skipping invalid room object:`, room);
          return false;
      }
      // Filter by property first
      if (!roomBelongsToProperty(room, selectedProperty)) {
          // debugLog(`Room ${room.name} excluded by property filter.`); // Already logged in roomBelongsToProperty
          return false;
      }
      // Then filter by search query
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const nameMatch = room.name.toLowerCase().includes(search);
        // Ensure room_type exists and is a string before calling toLowerCase
        const typeMatch = typeof room.room_type === 'string' && room.room_type.toLowerCase().includes(search);
        const queryMatch = nameMatch || typeMatch;
        // if (!queryMatch) debugLog(`Room ${room.name} excluded by search query "${searchQuery}".`);
        return queryMatch;
      }
      // If no search query, and passed property filter, include it
      return true;
    });

    debugLog(`Filtering result: ${results.length} rooms match.`);
    if (results.length === 0 && safeRooms.length > 0 && (selectedProperty || searchQuery)) {
       debugLog("No rooms match current filters/search.", {selectedProperty, searchQuery});
    }

    // Sort rooms by name
    return results.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
  }, [safeRooms, searchQuery, selectedProperty, roomBelongsToProperty, debugLog]); // Include dependencies

  // Get property name logic
  const getPropertyName = useCallback((): string => {
    if (!selectedProperty) return "All Properties";
    // Ensure userProperties is an array before finding
    const property = Array.isArray(userProperties) ? userProperties.find(p => p.property_id === selectedProperty) : undefined;
    return property?.name || `Property ID ${selectedProperty}`;
  }, [selectedProperty, userProperties]);

  return (
    <div className="space-y-2">
      {/* Info text showing current property */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"> {/* Adjusted size/margin */}
        <Building className="h-3 w-3" /> {/* Adjusted size */}
        <span>Showing rooms for: <span className="font-medium text-gray-700">{getPropertyName()}</span>
         {/* Show count only if filtering is active */}
         {(selectedProperty || searchQuery) && (<span className="ml-1">({filteredRooms.length} found)</span>)}
        </span>
      </div>

      {/* Optional Debug Info */}
      {debug && ( <div className="text-xs text-gray-500 bg-gray-100 p-1 rounded mb-1"> Debug: Prop: {selectedProperty || "any"} | Rooms: {safeRooms.length} | Filtered: {filteredRooms.length} | UserProps: {userProperties?.length || 0} </div> )}

      {/* Popover and Command */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || safeRooms.length === 0} // <<< USE disabled prop, also disable if no rooms
            className={cn(
              "w-full justify-between h-11 text-sm bg-white border-gray-300 font-normal", // Adjusted size/font
              !selectedRoom?.name && "text-muted-foreground" // Use theme color for placeholder
            )}
          >
            {selectedRoom?.name
              ? `${selectedRoom.name}${selectedRoom.room_type ? ` (${selectedRoom.room_type})` : ''}` // Cleaner display
              : "Select room..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /> {/* Adjusted style */}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width)] p-0 bg-white border border-input shadow-md"> {/* Use theme variable */}
          <Command shouldFilter={false} className="border-0"> {/* Filtering done via useMemo */}
            <CommandInput
              placeholder="Search room name or type..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-10 text-sm" // Adjusted size/font
            />
            <CommandList>
               {/* Adjusted CommandEmpty messages */}
              <CommandEmpty className="py-4 px-4 text-sm text-center text-muted-foreground">
                 {safeRooms.length === 0 ? "No rooms available." :
                  filteredRooms.length === 0 && (selectedProperty || searchQuery) ? `No rooms match criteria.` :
                  "No rooms found." // Fallback shouldn't be hit if safeRooms=0 checked first
                 }
              </CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                {filteredRooms.map((room) => (
                  <CommandItem
                    key={`${room.room_id}`} // ID should be unique
                    value={String(room.room_id)} // Use ID string for value
                    onSelect={(currentValue) => {
                        const roomToSelect = filteredRooms.find(r => String(r.room_id) === currentValue);
                        onSelect(roomToSelect || null);
                        setSearchQuery(""); // Clear search on select
                        setOpen(false);
                    }}
                    className="text-sm" // Adjusted font size
                  >
                    <Check className={cn( "mr-2 h-4 w-4", selectedRoom?.room_id === room.room_id ? "opacity-100" : "opacity-0" )} />
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