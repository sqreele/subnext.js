// ./app/components/RoomAutocomplete.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
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
  const { selectedProperty } = useProperty();

  const debugLog = (message: string, data?: any) => {
    if (debug) {
      console.log(`[RoomAutocomplete] ${message}`, data !== undefined ? data : "");
    }
  };

  const roomBelongsToProperty = (room: Room, propertyId: string | null): boolean => {
    if (!propertyId) {
      debugLog("No property ID provided, allowing room", room.name);
      return true;
    }

    // Handle multiple property ID formats
    const roomPropertyIds = [
      room.property_id,
      room.property,
      ...(room.properties || [])
    ].filter(Boolean).map(String);

    const matches = roomPropertyIds.includes(String(propertyId));

    debugLog(`Room ${room.name} property check`, {
      roomPropertyIds,
      selectedPropertyId: propertyId,
      matches,
    });

    return matches;
  };

  const filteredRooms = useMemo(() => {
    if (!Array.isArray(rooms) || rooms.length === 0) {
      debugLog("No valid rooms array provided");
      return [];
    }

    const results = rooms.filter((room) => {
      if (!room || !room.name) {
        debugLog("Skipping invalid room:", room);
        return false;
      }

      // Filter by selected property
      if (selectedProperty && !roomBelongsToProperty(room, selectedProperty)) {
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
    return results;
  }, [rooms, searchQuery, selectedProperty]);

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
                ? `No rooms found for this property`
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
  );
};

export default RoomAutocomplete;