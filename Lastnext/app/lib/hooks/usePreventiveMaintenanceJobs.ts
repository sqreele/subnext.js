"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Job, JobStatus } from '@/app/lib/types';
import { fetchData } from '@/app/lib/api-client';

interface UsePreventiveMaintenanceJobsOptions {
  propertyId?: string;
  limit?: number;
  autoLoad?: boolean;
  initialJobs?: Job[];
  isPM?: boolean; // Option to filter by is_preventivemaintenance
}

interface PMJobsStats {
  total: number;
  active: number;
  completed: number;
  completionRate: number;
}

interface CachedData {
  data: Job[];
  timestamp: string;
}

// Define the expected response type from the preventive maintenance API
interface PreventiveMaintenanceResponse {
  jobs: Job[];
  count: number;
}

// New interface for the property PM status
interface PropertyPMStatus {
  property_id: string;
  is_preventivemaintenance: boolean;
}

export function usePreventiveMaintenanceJobs({
  propertyId,
  limit = 10,
  autoLoad = true,
  initialJobs = [],
  isPM = true // Default to true since this is specifically for PM jobs
}: UsePreventiveMaintenanceJobsOptions) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isLoading, setIsLoading] = useState<boolean>(autoLoad && initialJobs.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isPMProperty, setIsPMProperty] = useState<boolean | null>(null);
  
  // Create a cache key based on query parameters
  const cacheKey = useMemo(() => 
    `pm_jobs_${propertyId || 'all'}_${limit}_${isPM ? 'true' : 'false'}`,
    [propertyId, limit, isPM]
  );

  // New function to check if property has preventive maintenance
  const checkPropertyPMStatus = useCallback(async () => {
    if (!propertyId) return false;
    
    try {
      // Use the new API endpoint
      const pmStatusUrl = `/api/properties/${propertyId}/is_preventivemaintenance/`;
      const response = await fetchData<PropertyPMStatus>(pmStatusUrl);
      
      // Check if response has the expected structure
      if (response && 'is_preventivemaintenance' in response) {
        setIsPMProperty(response.is_preventivemaintenance);
        return response.is_preventivemaintenance;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking PM status:', error);
      return false;
    }
  }, [propertyId]);

  const loadJobs = useCallback(async (forceRefresh: boolean = false) => {
    // Use cached data if we loaded recently and not forcing refresh
    const now = new Date();
    if (!forceRefresh && lastLoadTime && 
        (now.getTime() - lastLoadTime.getTime()) < 2 * 60 * 1000) {
      return; // Use existing data if loaded within last 2 minutes
    }

    if (!autoLoad && initialJobs.length > 0 && !forceRefresh) {
      setJobs(initialJobs);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Check if this property has PM enabled
      if (propertyId) {
        const hasPM = await checkPropertyPMStatus();
        
        // If PM is required but property doesn't have it, return empty
        if (isPM && !hasPM) {
          setJobs([]);
          setLastLoadTime(now);
          setIsLoading(false);
          return;
        }
      }
      
      // Try to use cached data if not forcing refresh
      if (!forceRefresh) {
        const cachedDataString = localStorage.getItem(cacheKey);
        if (cachedDataString) {
          try {
            const cachedData: CachedData = JSON.parse(cachedDataString);
            const cacheTime = new Date(cachedData.timestamp);
            
            // Use cache if it's less than 5 minutes old
            if ((now.getTime() - cacheTime.getTime()) < 5 * 60 * 1000) {
              setJobs(cachedData.data);
              setLastLoadTime(cacheTime);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Error parsing cached data:', e);
            // Continue to fetch fresh data
          }
        }
      }
      
      // Decide which endpoint to use based on availability
      let apiUrl = '/api/preventive-maintenance/jobs/';
      const params: Record<string, string> = {};
      
      if (propertyId) {
        params.property = propertyId;
      }
      
      if (limit) {
        params.limit = limit.toString();
      }
      
      // New endpoint specific implementation
      try {
        const response = await fetchData<PreventiveMaintenanceResponse>(apiUrl, { params });
        
        // Ensure we have a valid response with jobs property
        if (response && 'jobs' in response) {
          const fetchedJobs = response.jobs || [];
          
          // Cache the successful result
          localStorage.setItem(cacheKey, JSON.stringify({
            data: fetchedJobs,
            timestamp: now.toISOString()
          }));
          
          setJobs(fetchedJobs);
          setLastLoadTime(now);
          setRetryCount(0);
          return;
        } else {
          console.warn('[usePreventiveMaintenanceJobs] Unexpected response format:', response);
          throw new Error('Unexpected API response format');
        }
      } catch (newEndpointError) {
        console.warn('[usePreventiveMaintenanceJobs] New endpoint failed, falling back to legacy endpoint:', newEndpointError);
        
        // Fallback to legacy endpoint if the new one fails
        apiUrl = '/api/jobs/';
        params.is_preventivemaintenance = isPM ? 'true' : 'false';
        
        const legacyResponse = await fetchData<Job[]>(apiUrl, { params });
        const fetchedJobs = Array.isArray(legacyResponse) ? legacyResponse : [];
        
        // Cache the successful result
        localStorage.setItem(cacheKey, JSON.stringify({
          data: fetchedJobs,
          timestamp: now.toISOString()
        }));
        
        setJobs(fetchedJobs);
        setLastLoadTime(now);
        setRetryCount(0);
      }
      
    } catch (err) {
      console.error('Error loading preventive maintenance jobs:', err);
      setRetryCount(prev => prev + 1);
      
      // Try to use cached data as fallback
      const cachedDataString = localStorage.getItem(cacheKey);
      if (cachedDataString) {
        try {
          const cachedData: CachedData = JSON.parse(cachedDataString);
          setJobs(cachedData.data);
          
          // Get a user-friendly error message
          let errorMessage = 'Failed to load jobs. Using cached data.';
          if (err instanceof Error) {
            errorMessage += ` Error: ${err.message}`;
          }
          
          setError(errorMessage);
        } catch (e) {
          setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to load jobs. Please try again.'));
        }
      } else {
        setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to load jobs. Please try again.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, limit, autoLoad, initialJobs, isPM, cacheKey, lastLoadTime, retryCount, checkPropertyPMStatus]);

  useEffect(() => {
    if (autoLoad) {
      if (initialJobs.length === 0) {
        loadJobs();
      } else {
        setJobs(initialJobs);
        setLastLoadTime(new Date());
      }
    }
  }, [loadJobs, autoLoad, initialJobs]);

  const updateJob = useCallback((updatedJob: Job) => {
    setJobs(prev => prev.map(job => 
      job.job_id === updatedJob.job_id ? updatedJob : job
    ));
    
    // Update the cache with the modified job list
    const cachedDataString = localStorage.getItem(cacheKey);
    if (cachedDataString) {
      try {
        const cachedData: CachedData = JSON.parse(cachedDataString);
        const updatedJobs = cachedData.data.map(job => 
          job.job_id === updatedJob.job_id ? updatedJob : job
        );
        
        localStorage.setItem(cacheKey, JSON.stringify({
          data: updatedJobs,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('Error updating job in cache:', e);
      }
    }
  }, [cacheKey]);

  const getStats = useCallback((): PMJobsStats => {
    const total = jobs.length;
    const completed = jobs.filter(job => job.status === 'completed').length;
    const active = jobs.filter(job => job.status !== 'completed' && job.status !== 'cancelled').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      total,
      active,
      completed,
      completionRate
    };
  }, [jobs]);

  // Clear cache function for testing
  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
    setLastLoadTime(null);
  }, [cacheKey]);

  return {
    jobs,
    isLoading,
    error,
    loadJobs,
    updateJob,
    getStats,
    retryCount,
    lastLoadTime,
    isPMProperty,
    clearCache  // Expose this for debugging/testing
  };
}