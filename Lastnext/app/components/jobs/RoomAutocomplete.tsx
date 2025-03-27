"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Room } from "@/app/lib/types";
import { useProperty } from "@/app/lib/PropertyContext";

interface RoomAutocompleteProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room) => void;
}

const RoomAutocomplete = ({ 
  rooms, 
  selectedRoom, 
  onSelect
}: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedProperty, userProperties } = useProperty();

  // Find the current property name for display purposes
  const currentPropertyName = userProperties.find(p => p.property_id === selectedProperty)?.name || "All Properties";

  // Filter rooms by property and search query
  const displayRooms = useMemo(() => {
    if (!Array.isArray(rooms)) return [];

    // For debugging
    console.log("Filtering rooms with these properties:");
    if (rooms.length > 0) {
      const sampleRoom = rooms[0];
      console.log("Sample room structure:", JSON.stringify(sampleRoom, null, 2));
      console.log("Property field:", sampleRoom.property);
      console.log("Properties field:", sampleRoom.properties);
    }

    return rooms.filter(room => {
      // Skip invalid rooms
      if (!room || !room.name) return false;
      
      // Apply property filter if a property is selected
      if (selectedProperty) {
        // The rooms in your data structure might not have direct property information
        // They might have been pre-filtered by the API based on the property
        // If we're in a component that already received rooms for a specific property,
        // we can skip property filtering
        
        // Check if user has only one property - if so, rooms are likely for that property
        if (userProperties.length === 1 && userProperties[0].property_id === selectedProperty) {
          // Skip property filtering - all rooms belong to this property
        }
        else {
          // Various ways a room might be associated with a property
          const belongsToProperty = 
            // Check property field directly 
            (room.property && String(room.property) === selectedProperty) ||
            // Check numeric property field (some APIs return numbers)
            (room.property && Number(room.property) === Number(selectedProperty)) ||
            // Check properties array with string comparison
            (room.properties && Array.isArray(room.properties) && 
              room.properties.some(prop => String(prop) === selectedProperty)) ||
            // Sometimes the property ID is in the room ID format
            (room.room_id && String(room.room_id).includes(selectedProperty)) ||
            // Check property_id field if it exists
            (room.property_id && String(room.property_id) === selectedProperty);
            
          // If none of the above checks passed, don't include this room
          if (!belongsToProperty) {
            // Log for debugging
            console.log(`Room ${room.name} (ID: ${room.room_id}) filtered out - not matching property ${selectedProperty}`);
            return false;
          }
        }
      }
      
      // Apply search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const roomName = (room.name || '').toLowerCase();
        const roomType = (room.room_type || '').toLowerCase();
        
        return roomName.includes(search) || roomType.includes(search);
      }
      
      return true;
    });
  }, [rooms, searchQuery, selectedProperty, userProperties]);

  // Debug logging
  useEffect(() => {
    console.log("Selected Property:", selectedProperty);
    console.log("Total Rooms:", rooms?.length || 0);
    console.log("Filtered Rooms:", displayRooms.length);
    
    if (rooms?.length > 0) {
      console.log("Sample Room:", rooms[0]);
      if (rooms[0].properties) {
        console.log("Sample Room Properties:", rooms[0].properties);
      }
    }
  }, [selectedProperty, rooms, displayRooms]);

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-500">
        Showing rooms for: <span className="font-medium text-gray-700">{currentPropertyName}</span>
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
              `${selectedRoom.name} - ${selectedRoom.room_type || 'No type'}` : 
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
                  "No rooms available for this property."
                ) : displayRooms.length === 0 ? (
                  "No matching rooms found. Try a different search term."
                ) : (
                  "No rooms found."
                )}
              </CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                {displayRooms.map((room) => (
                  <CommandItem
                    key={room.room_id}
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
                      <span className="text-gray-500">- {room.room_type || "No type"}</span>
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