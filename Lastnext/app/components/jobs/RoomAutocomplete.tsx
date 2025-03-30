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

  // Safer room array handling
  const safeRooms = Array.isArray(rooms) ? rooms : [];

  // Simplified function to check if a room belongs to a property
 // Simplified function to check if a room belongs to a property
const roomBelongsToProperty = (room: Room, propertyId: string | null): boolean => {
  // If no property is selected, show all rooms
  if (!propertyId) return true;
  if (!room) return false;
  
  // Convert propertyId to number for comparison
  const propertyIdNum = Number(propertyId);
  
  // Check if room.properties includes the propertyId (as number or string)
  if (room.properties && Array.isArray(room.properties)) {
    return room.properties.some(prop => {
      if (typeof prop === 'object' && prop !== null) {
        const propObj = prop as any;
        return Boolean(propObj.property_id && String(propObj.property_id) === propertyId);
      }
      return Boolean(prop === propertyIdNum || String(prop) === propertyId);
    });
  }
  
  // Check direct property_id or property field
  return Boolean(
    (room.property_id && String(room.property_id) === propertyId) ||
    (room.property && String(room.property) === propertyId)
  );
};

  // Reset selected room when property changes if it doesn't belong to the new property
  useEffect(() => {
    if (selectedRoom && selectedProperty && 
        !roomBelongsToProperty(selectedRoom, selectedProperty)) {
      debugLog(`Selected room ${selectedRoom.name} doesn't belong to property ${selectedProperty}, resetting selection`);
      onSelect(null);
    }
  }, [selectedProperty, selectedRoom]);

  // Log component state for debugging
  useEffect(() => {
    debugLog("Component Render State:", {
      selectedProperty,
      totalRooms: safeRooms.length,
      sampleRoom: safeRooms[0],
      userPropertiesCount: userProperties?.length || 0,
    });
  }, [safeRooms, selectedProperty, userProperties]);

  // Filter rooms based on property and search query
  const filteredRooms = useMemo(() => {
    if (safeRooms.length === 0) {
      debugLog("No rooms available");
      return [];
    }

    const results = safeRooms.filter((room) => {
      // Skip invalid rooms
      if (!room || !room.name) {
        debugLog("Skipping invalid room:", room);
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

    debugLog(`Filtered ${results.length} rooms from ${safeRooms.length}`);
    
    // Additional debug info if no rooms match
    if (results.length === 0 && safeRooms.length > 0) {
      debugLog("WARNING: No rooms match criteria", {
        selectedProperty,
        sampleRooms: safeRooms.slice(0, 3).map(r => ({
          name: r.name,
          properties: r.properties,
          property: r.property,
          property_id: r.property_id
        })),
        propertiesAvailable: (userProperties?.length || 0) > 0,
      });
    }
    
    // Sort rooms by name for better usability
    return results.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
  }, [safeRooms, searchQuery, selectedProperty, userProperties]);

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