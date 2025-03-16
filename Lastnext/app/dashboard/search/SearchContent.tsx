'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Package, Users2, Search, CalendarClock, Home, MapPin, AlertCircle } from 'lucide-react';
import {CardFooter, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Job, Property, JobStatus, STATUS_VARIANTS, Room } from '@/app/lib/types';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/lib/user-context';
import { useSession } from 'next-auth/react';
import { 
  fetchJobs, 
  fetchProperties, 
  fetchWithToken 
} from '@/app/lib/data.server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pmcs.site';

export default function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState('all');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { userProfile, selectedProperty } = useUser();
  const { data: session } = useSession();
  const accessToken = session?.user?.accessToken;

  // Add error boundary
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error('Caught runtime error:', event.error);
      setError('An unexpected error occurred. Please try again later.');
    };
    
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Use API helper functions with proper error handling
        const results = await Promise.allSettled([
          fetchJobs(accessToken)
            .catch(err => {
              console.error('Error fetching jobs:', err);
              return [] as Job[];
            }),
          fetchProperties(accessToken)
            .catch(err => {
              console.error('Error fetching properties:', err);
              return [] as Property[];
            }),
          fetchWithToken<Room[]>(`${API_BASE_URL}/api/rooms/`, accessToken)
            .catch(err => {
              console.error('Error fetching rooms:', err);
              return [] as Room[];
            })
        ]);
        
        // Process results safely
        setJobs(
          results[0].status === 'fulfilled' 
            ? (Array.isArray(results[0].value) ? results[0].value : []) 
            : []
        );
        
        setProperties(
          results[1].status === 'fulfilled' 
            ? (Array.isArray(results[1].value) ? results[1].value : []) 
            : []
        );
        
        setRooms(
          results[2].status === 'fulfilled' 
            ? (Array.isArray(results[2].value) ? results[2].value : []) 
            : []
        );
        
      } catch (error) {
        console.error('Error in search component:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSearchResults();
  }, [query, accessToken]);

  // Safe filtering functions
  const filteredJobs = React.useMemo(() => {
    if (!Array.isArray(jobs)) return [];
    
    return jobs.filter(job => 
      job && (
        (String(job.description || '').toLowerCase().includes(query.toLowerCase()) ||
        String(job.status || '').toLowerCase().includes(query.toLowerCase()) ||
        String(job.priority || '').toLowerCase().includes(query.toLowerCase()) ||
        String(job.remarks || '').toLowerCase().includes(query.toLowerCase()))
      )
    );
  }, [jobs, query]);

  const filteredProperties = React.useMemo(() => {
    if (!Array.isArray(properties)) return [];
    
    return properties.filter(property => 
      property && (
        String(property.name || '').toLowerCase().includes(query.toLowerCase()) || 
        String(property.description || '').toLowerCase().includes(query.toLowerCase()) ||
        String(property.property_id || '').toLowerCase().includes(query.toLowerCase())
      )
    );
  }, [properties, query]);

  const filteredRooms = React.useMemo(() => {
    if (!Array.isArray(rooms)) return [];
    
    return rooms.filter(room => 
      room && (
        String(room.name || '').toLowerCase().includes(query.toLowerCase()) ||
        String(room.room_type || '').toLowerCase().includes(query.toLowerCase()) ||
        String(room.room_id || '').toLowerCase().includes(query.toLowerCase()) ||
        (room.property ? String(room.property).toLowerCase().includes(query.toLowerCase()) : false) ||
        (Array.isArray(room.properties) && 
          room.properties.some(prop => String(prop || '').toLowerCase().includes(query.toLowerCase())))
      )
    );
  }, [rooms, query]);

  const totalResults = filteredJobs.length + filteredProperties.length + filteredRooms.length;
  
  const highlightMatch = (text: string | undefined | null, query: string) => {
    if (!query || !text) return text || '';
    try {
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? 
          <span key={i} className="bg-yellow-200 text-gray-900">{part}</span> : part
      );
    } catch (e) {
      // In case of regex errors
      return text;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-500">Searching...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="rounded-full bg-red-100 p-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700">Error</h2>
        <p className="text-center text-gray-500 max-w-md">
          {error}
        </p>
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="mt-2"
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="rounded-full bg-gray-100 p-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700">Enter a search term</h2>
        <p className="text-center text-gray-500 max-w-md">
          Use the search bar above to find jobs, properties, or rooms
        </p>
      </div>
    );
  }

  if (totalResults === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="rounded-full bg-gray-100 p-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700">No results found</h2>
        <p className="text-center text-gray-500 max-w-md">
          We couldn't find anything matching "{query}". Try using different keywords or filters.
        </p>
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="mt-2"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Search Results</h1>
          <p className="text-gray-500">
            Found {totalResults} {totalResults === 1 ? 'result' : 'results'} for "{query}"
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all">All Results ({totalResults})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({filteredJobs.length})</TabsTrigger>
          <TabsTrigger value="properties">Properties ({filteredProperties.length})</TabsTrigger>
          <TabsTrigger value="rooms">Rooms ({filteredRooms.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-6">
          {filteredJobs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Jobs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.slice(0, 3).map(job => (
                  <JobCard key={job.job_id} job={job} query={query} highlightMatch={highlightMatch} properties={properties} />
                ))}
              </div>
              {filteredJobs.length > 3 && (
                <Button variant="outline" onClick={() => setActiveTab('jobs')}>
                  View all {filteredJobs.length} jobs
                </Button>
              )}
            </div>
          )}
          {filteredProperties.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Properties</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProperties.slice(0, 3).map(property => (
                  <PropertyCard key={property.property_id} property={property} query={query} highlightMatch={highlightMatch} />
                ))}
              </div>
              {filteredProperties.length > 3 && (
                <Button variant="outline" onClick={() => setActiveTab('properties')}>
                  View all {filteredProperties.length} properties
                </Button>
              )}
            </div>
          )}
          {filteredRooms.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Rooms</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.slice(0, 3).map(room => {
                  const relatedJob = jobs.find(job => 
                    job.rooms?.some(r => String(r.room_id) === String(room.room_id))
                  );
                  return relatedJob ? (
                    <RoomOnlyJobCard key={String(room.room_id)} job={relatedJob} properties={properties} />
                  ) : (
                    <RoomCard key={String(room.room_id)} room={room} query={query} highlightMatch={highlightMatch} />
                  );
                })}
              </div>
              {filteredRooms.length > 3 && (
                <Button variant="outline" onClick={() => setActiveTab('rooms')}>
                  View all {filteredRooms.length} rooms
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="jobs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map(job => (
              <JobCard key={job.job_id} job={job} query={query} highlightMatch={highlightMatch} properties={properties} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="properties" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map(property => (
              <PropertyCard key={property.property_id} property={property} query={query} highlightMatch={highlightMatch} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="rooms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map(room => {
              const relatedJob = jobs.find(job => 
                job.rooms?.some(r => String(r.room_id) === String(room.room_id))
              );
              return relatedJob ? (
                <RoomOnlyJobCard key={String(room.room_id)} job={relatedJob} properties={properties} />
              ) : (
                <RoomCard key={String(room.room_id)} room={room} query={query} highlightMatch={highlightMatch} />
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Updated JobCard to use UserContext
interface JobCardProps {
  job: Job;
  query: string;
  highlightMatch: (text: string | undefined | null, query: string) => React.ReactNode;
  properties?: Property[];
}

function JobCard({ job, query, highlightMatch, properties }: JobCardProps) {
  const router = useRouter();
  const { selectedProperty } = useUser();
  const statusVariant = (job?.status && STATUS_VARIANTS[job.status as JobStatus]) || STATUS_VARIANTS.default;
  const displayId = typeof job?.job_id === 'number' ? `#${job.job_id}` : job?.job_id;

  const getPropertyName = () => {
    if (!job) return 'N/A';
    
    try {
      const jobProperties = [
        ...(job.profile_image?.properties || []),
        ...(job.properties || []),
        ...(job.rooms?.flatMap(room => room?.properties || []) || [])
      ];
      
      if (selectedProperty && jobProperties.length > 0) {
        const matchingProperty = jobProperties.find(
          prop => {
            if (!prop) return false;
            if (typeof prop === 'object') {
              return String(prop.property_id) === selectedProperty;
            }
            return String(prop) === selectedProperty;
          }
        );
        
        if (matchingProperty) {
          if (typeof matchingProperty === 'object' && matchingProperty?.name) {
            return matchingProperty.name;
          }
          
          const fullProperty = properties?.find(p => String(p?.property_id) === selectedProperty);
          return fullProperty?.name || 'N/A';
        }
      }
      
      const firstMatchingProperty = jobProperties.find(
        prop => typeof prop === 'object' && prop?.name
      );
      
      if (typeof firstMatchingProperty === 'object' && firstMatchingProperty?.name) {
        return firstMatchingProperty.name;
      }
      
      const propertyFromList = properties?.find(p => 
        jobProperties.some(jobProp => String(jobProp) === String(p?.property_id))
      );
      
      return propertyFromList?.name || 'N/A';
    } catch (error) {
      console.error('Error in getPropertyName:', error);
      return 'N/A';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            Job {highlightMatch(displayId, query)}
          </CardTitle>
          <Badge variant={statusVariant}>{highlightMatch(job?.status, query) || 'Unknown Status'}</Badge>
        </div>
        <CardDescription className="line-clamp-1">
          Priority: {highlightMatch(job?.priority, query)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-gray-600 line-clamp-2">{highlightMatch(job?.description, query)}</p>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>{job?.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t bg-gray-50 p-3">
        <Link href={`/dashboard/jobs/${job?.job_id}`} className="w-full">
          <Button variant="ghost" className="w-full text-sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Room-Only JobCard - simplified
interface RoomOnlyJobCardProps {
  job: Job;
  properties?: Property[];
}

function RoomOnlyJobCard({ job, properties }: RoomOnlyJobCardProps) {
  const router = useRouter();
  const { selectedProperty } = useUser();
  const room = job?.rooms?.[0] as Room | undefined;

  const getPropertyName = () => {
    if (!job) return 'N/A';
    
    try {
      // Same logic as in JobCard but with try/catch protection
      const jobProperties = [
        ...(job.profile_image?.properties || []),
        ...(job.properties || []),
        ...(job.rooms?.flatMap(room => room?.properties || []) || [])
      ];
      
      if (selectedProperty && jobProperties.length > 0) {
        const matchingProperty = jobProperties.find(
          prop => {
            if (!prop) return false;
            if (typeof prop === 'object') {
              return String(prop.property_id) === selectedProperty;
            }
            return String(prop) === selectedProperty;
          }
        );
        
        if (matchingProperty) {
          if (typeof matchingProperty === 'object' && matchingProperty?.name) {
            return matchingProperty.name;
          }
          
          const fullProperty = properties?.find(p => String(p?.property_id) === selectedProperty);
          return fullProperty?.name || 'N/A';
        }
      }
      
      const firstMatchingProperty = jobProperties.find(
        prop => typeof prop === 'object' && prop?.name
      );
      
      if (typeof firstMatchingProperty === 'object' && firstMatchingProperty?.name) {
        return firstMatchingProperty.name;
      }
      
      const propertyFromList = properties?.find(p => 
        jobProperties.some(jobProp => String(jobProp) === String(p?.property_id))
      );
      
      return propertyFromList?.name || 'N/A';
    } catch (error) {
      console.error('Error in getPropertyName:', error);
      return 'N/A';
    }
  };

  if (!room) return null;

  return (
    <Card className="flex flex-col h-full transition-all duration-200 bg-white shadow-sm hover:shadow-md">
      <CardHeader className="flex-shrink-0 pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold text-gray-800 line-clamp-1">
          Room {room?.name || 'N/A'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-3 px-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />
          <span className="font-medium line-clamp-1">
            {`${getPropertyName()} - Room ${room?.name || 'N/A'}`}
          </span>
        </div>
        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            className="w-full text-xs h-8 bg-white"
            onClick={(e) => {
              e.stopPropagation();
              if (room) router.push(`/dashboard/rooms/${room.room_id}`);
            }}
            disabled={!room?.room_id}
          >
            View Room Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// PropertyCard component
interface PropertyCardProps {
  property: Property;
  query: string;
  highlightMatch: (text: string | undefined | null, query: string) => React.ReactNode;
}

function PropertyCard({ property, query, highlightMatch }: PropertyCardProps) {
  if (!property) return null;
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold line-clamp-1">{highlightMatch(property.name, query)}</CardTitle>
        <CardDescription className="line-clamp-1">ID: {property.property_id}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-gray-600 line-clamp-2">{highlightMatch(property.description, query)}</p>
        <div className="flex items-center gap-2 mb-2 mt-3 text-sm text-gray-600">
          <Users2 className="h-4 w-4" />
          <span>{property.users?.length || 0} Users</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Package className="h-4 w-4" />
          <span>{property.rooms?.length || 0} Rooms</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t bg-gray-50 p-3">
        <Link href={`/dashboard/properties/${property.property_id}`} className="w-full">
          <Button variant="ghost" className="w-full text-sm">View Property</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// RoomCard component
interface RoomCardProps {
  room: Room;
  query: string;
  highlightMatch: (text: string | undefined | null, query: string) => React.ReactNode;
}

function RoomCard({ room, query, highlightMatch }: RoomCardProps) {
  if (!room) return null;
  
  const displayId = typeof room.room_id === 'number' ? `#${room.room_id}` : room.room_id;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-1">{highlightMatch(room.name, query)}</CardTitle>
          <Badge variant={room.is_active ? 'default' : 'secondary'}>{room.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
        <CardDescription className="line-clamp-1">Room ID: {displayId} | Type: {highlightMatch(room.room_type, query)}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
          <Home className="h-4 w-4" />
          <span>Property: {room.property || (Array.isArray(room.properties) ? room.properties.join(', ') : 'N/A')}</span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>{room.created_at ? new Date(room.created_at).toLocaleDateString() : 'N/A'}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t bg-gray-50 p-3">
        <Link href={`/dashboard/rooms/${room.room_id}`} className="w-full">
          <Button variant="ghost" className="w-full text-sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}