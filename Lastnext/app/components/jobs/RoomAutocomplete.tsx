"use client";

import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useUser } from "@/app/lib/user-context";
import { Room } from "@/app/lib/types";

interface RoomAutocompleteProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room) => void;
}

const RoomAutocomplete = ({ rooms, selectedRoom, onSelect }: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { userProfile, selectedProperty } = useUser();

  // Log debug information
  useEffect(() => {
    console.log("Rooms data:", rooms);
    console.log("Selected Property:", selectedProperty);
  }, [rooms, selectedProperty]);

  // Safe array check and filtering
  const filteredRooms = Array.isArray(rooms) ? rooms.filter((room) => {
    // Skip invalid rooms
    if (!room) return false;
    
    // First, apply search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const roomName = (room.name || '').toLowerCase();
      const roomType = (room.room_type || '').toLowerCase();
      
      if (!roomName.includes(search) && !roomType.includes(search)) {
        return false;
      }
    }

    // If we have a selected property, filter by it
    if (selectedProperty) {
      // The selectedProperty ID will be in format "PC106FD60" 
      // But room.properties will have numeric IDs like [1]
      
      // Method 1: Check room.properties array (handles numeric IDs)
      // Fix TypeScript error with proper undefined check
      if (room.properties && Array.isArray(room.properties) && room.properties.length > 0) {
        // Just check if ANY property in the array matches our selected property
        // For debugging, log the matching process
        const matchFound = room.properties.some(prop => {
          // The prop is likely a numeric ID (1, 2, etc.)
          console.log(`Comparing room property ${prop} with selected property ${selectedProperty}`);
          
          // For exact match (if we already normalized IDs elsewhere)
          if (String(prop) === selectedProperty) {
            return true;
          }
          
          // For numeric ID to PC-prefixed ID mapping
          // Check if your selectedProperty starts with P and has a numeric property in room.properties
          if (selectedProperty.startsWith('P') && 
             (typeof prop === 'number' || !isNaN(Number(prop)))) {
            // This is a more general check for numeric properties
            console.log("Found potential mapping between P-prefixed ID and numeric ID");
            return true;
          }
          
          return false;
        });
        
        if (matchFound) return true;
      }
      
      // Method 2: Check room.property field if it exists
      if (room.property !== undefined) {
        if (String(room.property) === selectedProperty) {
          return true;
        }
      }
      
      // If we get here, the room doesn't match the selected property
      return false;
    }
    
    // If no selected property, show all rooms
    return true;
  }) : [];

  return (
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
                "No rooms available. Check if rooms data is loaded."
              ) : filteredRooms.length === 0 && selectedProperty ? (
                `No rooms found for selected property`
              ) : (
                "No matching rooms found."
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {filteredRooms.map((room) => {
                // Skip rooms with empty names
                if (!room || !room.name) return null;
                
                return (
                <CommandItem
                  key={room.room_id}
                  value={room.name}
                  onSelect={() => {
                    console.log("Selected room:", room);
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
              )})}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default RoomAutocomplete;