"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { CalendarClock, Home, MapPin } from 'lucide-react';
import { Room, Property, Job } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';
type RoomDetailContentProps = {
  room: Room;
  properties: Property[];
  jobs: Job[];
};

export default function RoomDetailContent({ room, properties, jobs }: RoomDetailContentProps) {
  const getPropertyName = () => {
    if (room.property) {
      const property = properties.find(p => p.property_id === String(room.property));
      return property?.name || 'N/A';
    }
    if (room.properties && room.properties.length > 0) {
      const firstProperty = properties.find(p => room.properties!.map(String).includes(p.property_id));
      return firstProperty?.name || 'N/A';
    }
    return 'N/A';
  };

  // Status color mapping based on JobStatus
  const statusColors: Record<Job['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    waiting_sparepart: 'bg-purple-100 text-purple-800',
  };

  // Priority color mapping based on JobPriority
  const priorityColors: Record<Job['priority'], string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-orange-100 text-orange-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl font-bold">Room {room.name || 'N/A'}</CardTitle>
            <Badge variant={room.is_active ? 'default' : 'secondary'}>
              {room.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <CardDescription>
            Room ID: {typeof room.room_id === 'number' ? `#${room.room_id}` : room.room_id} | Type: {room.room_type || 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{`${getPropertyName()} - Room ${room.name || 'N/A'}`}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Home className="w-4 h-4" />
            <span>Property: {room.property || (room.properties?.join(', ') || 'N/A')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <CalendarClock className="w-4 h-4" />
            <span>Created: {new Date(room.created_at).toLocaleString()}</span>
          </div>

          {/* Jobs Section */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Jobs in this Room</h2>
            {jobs.length > 0 ? (
              <ul className="space-y-2">
                {jobs.map((job) => (
                  <li key={job.job_id} className="border p-3 rounded-md bg-gray-50">
                    <p><strong>Job ID:</strong> {job.job_id}</p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <Badge className={cn("px-2 py-1 text-xs", statusColors[job.status])}>
                        {job.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </p>
                    <p><strong>Description:</strong> {job.description || 'N/A'}</p>
                    <p>
                      <strong>Priority:</strong>{' '}
                      <Badge className={cn("px-2 py-1 text-xs", priorityColors[job.priority])}>
                        {job.priority.toUpperCase()}
                      </Badge>
                    </p>
                    <p><strong>Created:</strong> {new Date(job.created_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No jobs found for this room.</p>
            )}
          </div>

          <Button variant="outline" onClick={() => window.history.back()}>
            Back to Search
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
