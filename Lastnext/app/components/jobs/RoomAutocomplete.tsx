"use client";

import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useUser } from "@/app/lib/user-context";
import { Room, Property } from "@/app/lib/types";

interface RoomAutocompleteProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room) => void;
}

const RoomAutocomplete = ({ rooms, selectedRoom, onSelect }: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { userProfile, selectedProperty } = useUser();

  useEffect(() => {
    console.log("Rooms prop:", rooms);
    console.log("User Profile:", userProfile);
    console.log("Selected Room:", selectedRoom);
    console.log("Selected Property:", selectedProperty);
  }, [rooms, userProfile, selectedRoom, selectedProperty]);

  const filteredRooms = rooms.filter((room) => {
    // First, apply search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const roomName = room.name || '';
      const roomType = room.room_type || '';
      
      if (!roomName.toLowerCase().includes(search) && 
          !roomType.toLowerCase().includes(search)) {
        return false;
      }
    }

    // If we have a selected property, filter by it
    if (selectedProperty) {
      // Check room.properties array if it exists
      if (Array.isArray(room.properties) && room.properties.length > 0) {
        // Check if any property ID matches selectedProperty
        if (room.properties.some(prop => String(prop) === selectedProperty)) {
          return true;
        }
      }
      
      // Check room.property field if it exists
      if (room.property !== undefined && String(room.property) === selectedProperty) {
        return true;
      }
      
      // If we get here, the room doesn't match the selected property
      return false;
    }
    
    // If no selected property or user hasn't set it up yet, show all rooms
    return true;
  });

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
            `${selectedRoom.name} - ${selectedRoom.room_type}` : 
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
              {rooms.length === 0 ? (
                "No rooms available. Check if rooms data is loaded."
              ) : filteredRooms.length === 0 ? (
                `No rooms found matching "${searchQuery}"`
              ) : (
                "No matching rooms found."
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {filteredRooms.map((room) => {
                // Skip rooms with empty names
                if (!room.name) return null;
                
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