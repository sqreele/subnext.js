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
  propertyIdField?: keyof Room; // Optional prop to specify which field to use for property ID matching
}

const RoomAutocomplete = ({ 
  rooms, 
  selectedRoom, 
  onSelect,
  propertyIdField = 'property' // Default to 'property' for backward compatibility
}: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedProperty } = useProperty();
  const { data: session } = useSession();

  // Safely check if a room belongs to the selected property
  const roomBelongsToProperty = (room: Room, propertyId: string | null): boolean => {
    if (!propertyId) return true;
    
    // Check all possible property reference fields
    const propertyFields: (keyof Room)[] = ['property_id', 'property'];
    
    for (const field of propertyFields) {
      if (room[field] !== undefined && String(room[field]) === propertyId) {
        return true;
      }
    }
    
    // Check properties array if it exists
    if (room.properties && Array.isArray(room.properties)) {
      return room.properties.some(prop => String(prop) === propertyId);
    }
    
    return false;
  };

  // Filter rooms by property and search query
  const filteredRooms = useMemo(() => {
    // Validate input rooms array
    if (!Array.isArray(rooms) || rooms.length === 0) {
      return [];
    }

    return rooms.filter((room) => {
      // Skip invalid rooms
      if (!room || !room.name) return false;
      
      // Property filtering
      if (selectedProperty && !roomBelongsToProperty(room, selectedProperty)) {
        return false;
      }
      
      // Search filtering
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const nameMatch = room.name.toLowerCase().includes(search);
        const typeMatch = room.room_type?.toLowerCase().includes(search) || false;
        
        return nameMatch || typeMatch;
      }
      
      return true;
    });
  }, [rooms, searchQuery, selectedProperty, roomBelongsToProperty]);

  // Get property name for display
  const getPropertyName = (): string => {
    if (!selectedProperty) return "All Properties";
    
    // Check session user properties
    if (session?.user?.properties && Array.isArray(session.user.properties)) {
      const property = session.user.properties.find(
        p => p && typeof p === 'object' && 'property_id' in p && p.property_id === selectedProperty
      );
      
      if (property && typeof property === 'object' && 'name' in property && property.name) {
        return property.name;
      }
    }
    
    return `Property ${selectedProperty}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Building className="h-3.5 w-3.5" />
        <span>
          Showing rooms for: <span className="font-medium text-gray-700">{getPropertyName()}</span>
          {filteredRooms.length > 0 && 
            <span className="ml-1">({filteredRooms.length} available)</span>
          }
        </span>
      </div>
      
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
            {selectedRoom?.name ? 
              `${selectedRoom.name}${selectedRoom.room_type ? ` - ${selectedRoom.room_type}` : ''}` : 
              "Select room..."
            }
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