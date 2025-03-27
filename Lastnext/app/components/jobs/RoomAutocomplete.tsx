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

  // Get the numeric ID of the selected property (important for filtering)
  const selectedPropertyObj = userProperties.find(p => p.property_id === selectedProperty);
  
  // Use a type assertion to access id, since it exists at runtime but TypeScript doesn't recognize it
  const selectedPropertyNumericId = selectedPropertyObj ? Number((selectedPropertyObj as any).id) : null;

  // Filter rooms by property ID and search query
  const displayRooms = useMemo(() => {
    if (!Array.isArray(rooms)) return [];

    return rooms.filter(room => {
      // Skip invalid rooms
      if (!room || !room.name) return false;

      // Filter by property if one is selected and we have its numeric ID
      if (selectedProperty && selectedProperty !== "all" && selectedPropertyNumericId) {
        // Check if room.properties array contains the numeric ID of the selected property
        if (!Array.isArray(room.properties) || !room.properties.includes(selectedPropertyNumericId)) {
          return false;
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
  }, [rooms, selectedProperty, selectedPropertyNumericId, searchQuery]);

  // Debug logging
  useEffect(() => {
    console.log("Selected Property ID (string):", selectedProperty);
    console.log("Selected Property Numeric ID:", selectedPropertyNumericId);
    console.log("Total Rooms:", rooms?.length || 0);
    console.log("Filtered Rooms:", displayRooms.length);
    
    if (rooms?.length > 0 && displayRooms.length === 0) {
      console.log("Sample Room (not matched):", rooms[0]);
      console.log("  - Properties array:", rooms[0].properties);
    }
  }, [selectedProperty, selectedPropertyNumericId, rooms, displayRooms]);

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
                  "No matching rooms found for this property."
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