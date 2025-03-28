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
  onSelect: (room: Room) => void;
  debug?: boolean;
}

const RoomAutocomplete = ({
  rooms,
  selectedRoom,
  onSelect,
  debug = false,
}: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedProperty, userProperties } = useProperty();

  const debugLog = (message: string, data?: any) => {
    if (debug) {
      console.log(`[RoomAutocomplete] ${message}`, data !== undefined ? data : "");
    }
  };

  // Improved function to check if a room belongs to a property
  const roomBelongsToProperty = (room: Room, propertyId: string | null): boolean => {
    // If no property is selected, show all rooms
    if (!propertyId) {
      debugLog(`No property selected, showing room: ${room.name}`);
      return true;
    }
    
    // Check if room.properties includes the selected property (as either string or number)
    if (room.properties && Array.isArray(room.properties)) {
      const propertyIdNum = Number(propertyId);
      
      // Direct comparison: room.properties contains the selected property ID as a number
      if (!isNaN(propertyIdNum)) {
        if (room.properties.includes(propertyIdNum)) {
          debugLog(`Room ${room.name} properties includes ${propertyIdNum}`);
          return true;
        }
      }
      
      // Handle case where properties might be an array of objects
      for (const prop of room.properties) {
        if (typeof prop === 'object' && prop !== null) {
          // Safely check if property_id exists on the object
          const propObj = prop as any;
          if ('property_id' in propObj && String(propObj.property_id) === propertyId) {
            debugLog(`Room ${room.name} has property object with matching property_id`);
            return true;
          }
        } else if (String(prop) === propertyId) {
          debugLog(`Room ${room.name} has property string matching ${propertyId}`);
          return true;
        }
      }
    }
    
    // Check direct property_id field if it exists
    if (room.property_id && String(room.property_id) === propertyId) {
      debugLog(`Room ${room.name} property_id matches ${propertyId}`);
      return true;
    }
    
    // Check property field if it exists
    if (room.property && String(room.property) === propertyId) {
      debugLog(`Room ${room.name} property matches ${propertyId}`);
      return true;
    }

    // If none of the above conditions match, the room doesn't belong to the property
    debugLog(`Room ${room.name} does not match property: ${propertyId}`);
    return false;
  };

  // Log component state for debugging
  useEffect(() => {
    debugLog("Component Render State:", {
      selectedProperty,
      totalRooms: rooms?.length || 0,
      sampleRoom: rooms?.[0],
      userPropertiesCount: userProperties.length,
    });
  }, [rooms, selectedProperty, userProperties]);

  // Filter rooms based on property and search query
  const filteredRooms = useMemo(() => {
    if (!Array.isArray(rooms) || rooms.length === 0) {
      debugLog("No valid rooms array provided");
      return [];
    }

    const results = rooms.filter((room) => {
      // Skip invalid rooms
      if (!room || !room.name) {
        debugLog("Skipping invalid room:", room);
        return false;
      }

      // Filter by property
      const matchesProperty = !selectedProperty || roomBelongsToProperty(room, selectedProperty);
      if (!matchesProperty) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const nameMatch = room.name.toLowerCase().includes(search);
        const typeMatch = room.room_type?.toLowerCase().includes(search);
        if (!nameMatch && !typeMatch) {
          return false;
        }
      }

      return true;
    });

    debugLog(`Filtered ${results.length} rooms from ${rooms.length}`);
    
    // Additional debug info if no rooms match
    if (results.length === 0 && rooms.length > 0) {
      debugLog("WARNING: No rooms match criteria", {
        selectedProperty,
        sampleRooms: rooms.slice(0, 3).map(r => ({
          name: r.name,
          properties: r.properties,
          property: r.property,
          property_id: r.property_id
        })),
        propertiesAvailable: userProperties.length > 0,
      });
    }
    
    return results;
  }, [rooms, searchQuery, selectedProperty]);

  // Get property name for display
  const getPropertyName = (): string => {
    if (!selectedProperty) return "All Properties";
    const property = userProperties.find(p => p.property_id === selectedProperty);
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
          Rooms: {rooms?.length || 0} | 
          Filtered: {filteredRooms.length} | 
          Properties: {userProperties.length}
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
              ? `${selectedRoom.name} - ${selectedRoom.room_type}`
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
                {!Array.isArray(rooms) || rooms.length === 0
                  ? "No rooms available"
                  : filteredRooms.length === 0 && selectedProperty
                  ? `No rooms found for ${getPropertyName()}`
                  : filteredRooms.length === 0 && searchQuery
                  ? `No rooms match "${searchQuery}"`
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
                      <span className="text-gray-500">- {room.room_type}</span>
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