"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown, Building } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Room } from "@/app/lib/types";
import { useProperty } from "@/app/lib/PropertyContext";
import { useSession } from "next-auth/react";

interface RoomAutocompleteProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room) => void;
  propertyIdField?: keyof Room;
  debug?: boolean;
}

// Define Room interface based on your data structure


const RoomAutocomplete = ({
  rooms,
  selectedRoom,
  onSelect,
  propertyIdField = "property",
  debug = true,
}: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedProperty } = useProperty();
  const { data: session } = useSession();

  // Check if room belongs to selected property
  const roomBelongsToProperty = (room: Room, propertyId: string | null): boolean => {
    if (!propertyId) {
      debugLog('No property ID provided, allowing room', room.name);
      return true;
    }

    const propertyFields: (keyof Room)[] = ['property_id', 'property', 'properties'];

    for (const field of propertyFields) {
      const fieldValue = room[field];
      if (fieldValue !== undefined) {
        // Handle array of properties
        if (field === 'properties' && Array.isArray(fieldValue)) {
          const matches = fieldValue.some(prop => {
            const propStr = String(prop);
            return propStr === propertyId || propStr === `P${propertyId}`;
          });
          if (matches) {
            debugLog(`Room ${room.name} matches property ${propertyId} via properties array`);
            return true;
          }
        }
        // Handle single value
        else if (String(fieldValue) === propertyId || String(fieldValue) === `P${propertyId}`) {
          debugLog(`Room ${room.name} matches property ${propertyId} via ${field}`);
          return true;
        }
      }
    }

    debugLog(`Room ${room.name} does NOT match property ${propertyId}`, {
      roomPropertyId: room.property_id,
      roomProperty: room.property,
      roomProperties: room.properties
    });
    return false;
  };

  // Debug logger
  const debugLog = (message: string, data?: any) => {
    if (debug) {
      console.log(`[RoomAutocomplete] ${message}`, data !== undefined ? data : '');
    }
  };

  // Log initial state
  useEffect(() => {
    debugLog('Component Render State:');
    debugLog('Selected Property:', selectedProperty);
    debugLog('Total Rooms Received:', rooms?.length || 0);
    debugLog('Room Structure Sample:', rooms?.[0] || 'No rooms');
  }, [rooms, selectedProperty]);

  // Detect nested room structure
  const areRoomsNestedInProperty = useMemo(() => {
    if (Array.isArray(rooms) && rooms.length > 0) {
      const sampleRoom = rooms[0];
      const isNested = !sampleRoom.property_id && !sampleRoom.property && !sampleRoom.properties;
      
      debugLog('Room Nesting Detection:', {
        isNested,
        sampleRoom,
        hasPropertyId: !!sampleRoom.property_id,
        hasProperty: !!sampleRoom.property,
        hasProperties: !!sampleRoom.properties
      });
      
      return isNested;
    }
    debugLog('Not enough rooms to determine nesting');
    return false;
  }, [rooms]);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    if (!Array.isArray(rooms) || rooms.length === 0) {
      debugLog('No valid rooms array provided');
      return [];
    }

    debugLog(`Starting room filtering with ${rooms.length} rooms`);
    debugLog('Filtering parameters:', {
      selectedProperty,
      searchQuery,
      areRoomsNestedInProperty
    });

    const results = rooms.filter((room) => {
      if (!room || !room.name) {
        debugLog('Skipping invalid room:', room);
        return false;
      }

      if (selectedProperty && !areRoomsNestedInProperty) {
        if (!roomBelongsToProperty(room, selectedProperty)) {
          return false;
        }
      }

      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const nameMatch = room.name.toLowerCase().includes(search);
        const typeMatch = room.room_type?.toLowerCase().includes(search) || false;
        
        if (!nameMatch && !typeMatch) {
          debugLog(`Room ${room.name} doesn't match search query "${searchQuery}"`);
          return false;
        }
      }

      return true;
    });

    debugLog(`Filtering complete: ${results.length} rooms match the criteria`);
    return results;
  }, [rooms, searchQuery, selectedProperty, areRoomsNestedInProperty]);

  // Debug filtered rooms changes
  useEffect(() => {
    debugLog(`Filtered Rooms Changed: ${filteredRooms.length} rooms after filtering`);
    if (filteredRooms.length === 0 && rooms && rooms.length > 0) {
      debugLog('WARNING: No rooms match the criteria after filtering');
      debugLog('Current filtering parameters:', {
        areRoomsNestedInProperty,
        selectedProperty,
        searchQuery,
        totalRooms: rooms.length
      });
    }
  }, [filteredRooms, rooms, areRoomsNestedInProperty, selectedProperty, searchQuery]);

  // Get property name
  const getPropertyName = (): string => {
    if (!selectedProperty) {
      debugLog('No property selected, using default name');
      return "All Properties";
    }

    if (session?.user?.properties && Array.isArray(session.user.properties)) {
      debugLog('Looking for property name in session properties:', session.user.properties);
      const property = session.user.properties.find(
        p => p && typeof p === 'object' && 'property_id' in p && p.property_id === selectedProperty
      );
      if (property && typeof property === 'object' && 'name' in property && property.name) {
        debugLog(`Found property name: ${property.name}`);
        return property.name;
      }
    }

    debugLog(`Using fallback property name for ID: ${selectedProperty}`);
    return `Property ${selectedProperty}`;
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
      {areRoomsNestedInProperty && (
        <div className="text-xs text-blue-600">
          Using rooms from property structure
        </div>
      )}
      {debug && (
        <div className="text-xs text-gray-500 bg-gray-100 p-1 rounded">
          Debug: Selected Property: {selectedProperty || 'none'} | 
          Nested Structure: {areRoomsNestedInProperty ? 'Yes' : 'No'} | 
          Rooms: {rooms?.length || 0} | 
          Filtered: {filteredRooms.length}
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
              ? `${selectedRoom.name}${selectedRoom.room_type ? ` - ${selectedRoom.room_type}` : ''}`
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
                {!Array.isArray(rooms) || rooms.length === 0 ? (
                  "No rooms available. Please check API data."
                ) : filteredRooms.length === 0 && selectedProperty ? (
                  `No rooms found for property ${getPropertyName()}`
                ) : filteredRooms.length === 0 && searchQuery ? (
                  `No rooms match "${searchQuery}"`
                ) : (
                  "No rooms found"
                )}
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
                      selectedRoom?.room_id === room.room_id ? "bg-blue-50" : ""
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
                      {room.room_type && (
                        <span className="text-gray-500">- {room.room_type}</span>
                      )}
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