"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useUser } from "@/app/lib/user-context";
import { useProperty } from "@/app/lib/PropertyContext";
import { Room } from "@/app/lib/types";

interface RoomAutocompleteProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room) => void;
}

const RoomAutocomplete = ({ rooms, selectedRoom, onSelect }: RoomAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { userProfile } = useUser();
  const { selectedProperty } = useProperty();

  // Helper function to safely extract property IDs regardless of format
  const getPropertyId = useCallback((property: any): string => {
    if (!property) return "";
    if (typeof property === "string" || typeof property === "number") return String(property);
    if (typeof property.property_id === "string" || typeof property.property_id === "number") {
      return String(property.property_id);
    }
    if (typeof property.id === "string" || typeof property.id === "number") {
      return String(property.id);
    }
    return "";
  }, []);

  // Helper function to extract room property IDs
  const getRoomPropertyIds = useCallback((room: Room): string[] => {
    const result: string[] = [];
    
    // Check room.property (single property reference)
    if (room.property !== undefined) {
      result.push(String(room.property));
    }
    
    // Check room.properties (array of property references)
    if (room.properties && Array.isArray(room.properties)) {
      room.properties.forEach(prop => {
        if (typeof prop === "object") {
          const propId = getPropertyId(prop);
          if (propId) result.push(propId);
        } else {
          result.push(String(prop));
        }
      });
    }
    
    // If the room belongs to a property that has this room in its rooms array
    if (userProfile?.properties) {
      userProfile.properties.forEach(prop => {
        if (prop.rooms && Array.isArray(prop.rooms)) {
          const matchingRoom = prop.rooms.find(r => 
            String(r.room_id) === String(room.room_id)
          );
          if (matchingRoom) {
            result.push(getPropertyId(prop));
          }
        }
      });
    }
    
    return result;
  }, [getPropertyId, userProfile?.properties]);

  // Debug logging
  useEffect(() => {
    console.log("Rooms prop:", rooms);
    console.log("User Profile:", userProfile);
    console.log("Selected Property:", selectedProperty);
    console.log("Selected Room:", selectedRoom);
    
    if (rooms.length > 0) {
      console.log("Sample room structure:", rooms[0]);
      console.log("Room property IDs:", getRoomPropertyIds(rooms[0]));
    }
    
    if (userProfile?.properties?.length) {
      console.log("User property IDs:", userProfile.properties.map(p => getPropertyId(p)));
    }
  }, [rooms, userProfile, selectedProperty, selectedRoom, getRoomPropertyIds, getPropertyId]);

  const filteredRooms = rooms.filter((room) => {
    // No filtering if no user profile or properties
    if (!userProfile?.properties?.length) {
      return true;
    }
    
    // Get user property IDs
    const userPropertyIds = userProfile.properties.map(p => getPropertyId(p));
    
    // If a specific property is selected, only show rooms for that property
    if (selectedProperty) {
      const roomPropertyIds = getRoomPropertyIds(room);
      const matchesSelectedProperty = roomPropertyIds.includes(selectedProperty);
      
      // Skip rooms that don't match the selected property
      if (!matchesSelectedProperty) return false;
    } else {
      // If no property selected, show rooms for any user property
      const roomPropertyIds = getRoomPropertyIds(room);
      const matchesAnyUserProperty = roomPropertyIds.some(id => userPropertyIds.includes(id));
      
      // Skip rooms that don't match any user property
      if (!matchesAnyUserProperty) return false;
    }
    
    // Apply search filter if query exists
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    
    return (
      (room.name?.toLowerCase() || "").includes(search) || 
      (room.room_type?.toLowerCase() || "").includes(search)
    );
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
                `No rooms found for ${
                  selectedProperty ? 
                    userProfile?.properties?.find(p => getPropertyId(p) === selectedProperty)?.name || "selected property" : 
                    "any property"
                }`
              ) : (
                "No matching rooms found."
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {filteredRooms.map((room) => (
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
                    <span className="text-gray-500">- {room.room_type}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default RoomAutocomplete;