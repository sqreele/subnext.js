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

// Debug info interface
interface DebugInfo {
  endpoint?: string;
  params?: Record<string, string>;
  responseTime?: string;
  responseType?: string;
  responseStructure?: any;
  timestamp?: string;
  fallbackEndpoint?: string;
  fallbackParams?: Record<string, string>;
  fallbackResponseTime?: string;
  fallbackResponseType?: string;
  fallbackResponseStructure?: any;
}

// Debug logger function
const debug = (message: string, data?: any) => {
  const isDebugMode = process.env.NODE_ENV === 'development' || 
    (typeof localStorage !== 'undefined' && localStorage.getItem('debug_mode') === 'true');
  if (isDebugMode) {
    if (data) {
      console.log(`[PM Jobs Debug] ${message}`, data);
    } else {
      console.log(`[PM Jobs Debug] ${message}`);
    }
  }
};

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
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  
  // Create a cache key based on query parameters
  const cacheKey = useMemo(() => 
    `pm_jobs_${propertyId || 'all'}_${limit}_${isPM ? 'true' : 'false'}`,
    [propertyId, limit, isPM]
  );

  // New function to check if property has preventive maintenance
  const checkPropertyPMStatus = useCallback(async () => {
    if (!propertyId) return false;
    
    debug(`Checking PM status for property ${propertyId}`);
    
    try {
      // Use the new API endpoint
      const pmStatusUrl = `/api/properties/${propertyId}/is_preventivemaintenance/`;
      debug(`PM status API call to: ${pmStatusUrl}`);
      
      const response = await fetchData<PropertyPMStatus>(pmStatusUrl);
      debug(`PM status response:`, response);
      
      // Check if response has the expected structure
      if (response && 'is_preventivemaintenance' in response) {
        setIsPMProperty(response.is_preventivemaintenance);
        debug(`Property has PM: ${response.is_preventivemaintenance}`);
        return response.is_preventivemaintenance;
      }
      
      debug(`Unexpected PM status response format`);
      return false;
    } catch (error) {
      debug(`Error checking PM status:`, error);
      console.error('Error checking PM status:', error);
      return false;
    }
  }, [propertyId]);

  const loadJobs = useCallback(async (forceRefresh: boolean = false) => {
    // Use cached data if we loaded recently and not forcing refresh
    const now = new Date();
    if (!forceRefresh && lastLoadTime && 
        (now.getTime() - lastLoadTime.getTime()) < 2 * 60 * 1000) {
      debug(`Using recently loaded data (${(now.getTime() - lastLoadTime!.getTime()) / 1000}s ago)`);
      return; // Use existing data if loaded within last 2 minutes
    }

    if (!autoLoad && initialJobs.length > 0 && !forceRefresh) {
      debug(`Using initial jobs data (${initialJobs.length} jobs)`);
      setJobs(initialJobs);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      debug(`Loading jobs: propertyId=${propertyId}, limit=${limit}, isPM=${isPM}`);
      
      // Check if this property has PM enabled
      if (propertyId) {
        const hasPM = await checkPropertyPMStatus();
        debug(`Property ${propertyId} PM check result: ${hasPM}`);
        
        // If PM is required but property doesn't have it, return empty
        if (isPM && !hasPM) {
          debug(`Property doesn't have PM jobs, returning empty result`);
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
              debug(`Using cached data from ${(now.getTime() - cacheTime.getTime()) / 1000}s ago`);
              setJobs(cachedData.data);
              setLastLoadTime(cacheTime);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            debug(`Error parsing cached data:`, e);
            console.warn('Error parsing cached data:', e);
            // Continue to fetch fresh data
          }
        }
      }
      
      // Decide which endpoint to use based on availability
      let apiUrl = '/api/preventive-maintenance/jobs/';
      const params: Record<string, string> = {};
      
      if (propertyId) {
        // FIXED: Changed from property to property_id
        params.property_id = propertyId;
      }
      
      if (limit) {
        params.limit = limit.toString();
      }
      
      // Add debug logging
      debug(`API call details:`, {
        url: apiUrl,
        params: params,
        propertyId: propertyId,
        isPM: isPM
      });
      
      // New endpoint specific implementation
      try {
        debug(`Making API request to: ${apiUrl}`);
        const requestStartTime = performance.now();
        const response = await fetchData<PreventiveMaintenanceResponse>(apiUrl, { params });
        const requestEndTime = performance.now();
        
        debug(`API response received in ${(requestEndTime - requestStartTime).toFixed(2)}ms:`, response);
        
        // Store debug info
        setDebugInfo({
          endpoint: apiUrl,
          params: params,
          responseTime: `${(requestEndTime - requestStartTime).toFixed(2)}ms`,
          responseType: typeof response,
          responseStructure: response ? Object.keys(response) : null,
          timestamp: new Date().toISOString()
        });
        
        // Ensure we have a valid response with jobs property
        if (response && 'jobs' in response) {
          const fetchedJobs = response.jobs || [];
          debug(`Found ${fetchedJobs.length} jobs from API`);
          
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
          debug(`Unexpected response format:`, response);
          console.warn('[usePreventiveMaintenanceJobs] Unexpected response format:', response);
          throw new Error('Unexpected API response format');
        }
      } catch (newEndpointError) {
        debug(`New endpoint failed:`, newEndpointError);
        console.warn('[usePreventiveMaintenanceJobs] New endpoint failed, falling back to legacy endpoint:', newEndpointError);
        
        // Fallback to legacy endpoint if the new one fails
        apiUrl = '/api/jobs/';
        params.is_preventivemaintenance = isPM ? 'true' : 'false';
        
        // FIXED: Ensure property_id is also set correctly here
        if (propertyId) {
          params.property_id = propertyId;
        }
        
        // Add debug logging for fallback
        debug(`Fallback API call details:`, {
          url: apiUrl,
          params: params
        });
        
        const fallbackStartTime = performance.now();
        const legacyResponse = await fetchData<Job[]>(apiUrl, { params });
        const fallbackEndTime = performance.now();
        
        debug(`Fallback API response received in ${(fallbackEndTime - fallbackStartTime).toFixed(2)}ms:`, legacyResponse);
        
        // Update debug info with proper type
        setDebugInfo((prev: DebugInfo | null) => ({
          ...prev || {},
          fallbackEndpoint: apiUrl,
          fallbackParams: params,
          fallbackResponseTime: `${(fallbackEndTime - fallbackStartTime).toFixed(2)}ms`,
          fallbackResponseType: typeof legacyResponse,
          fallbackResponseStructure: Array.isArray(legacyResponse) ? 'array' : Object.keys(legacyResponse),
        }));
        
        const fetchedJobs = Array.isArray(legacyResponse) ? legacyResponse : [];
        debug(`Found ${fetchedJobs.length} jobs from fallback API`);
        
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
      debug(`Error loading jobs:`, err);
      console.error('Error loading preventive maintenance jobs:', err);
      setRetryCount(prev => prev + 1);
      
      // Try to use cached data as fallback
      const cachedDataString = localStorage.getItem(cacheKey);
      if (cachedDataString) {
        try {
          const cachedData: CachedData = JSON.parse(cachedDataString);
          setJobs(cachedData.data);
          debug(`Falling back to cached data with ${cachedData.data.length} jobs`);
          
          // Get a user-friendly error message
          let errorMessage = 'Failed to load jobs. Using cached data.';
          if (err instanceof Error) {
            errorMessage += ` Error: ${err.message}`;
          }
          
          setError(errorMessage);
        } catch (e) {
          debug(`Error using cached data as fallback:`, e);
          setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to load jobs. Please try again.'));
        }
      } else {
        debug(`No cached data available for fallback`);
        setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to load jobs. Please try again.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, limit, autoLoad, initialJobs, isPM, cacheKey, lastLoadTime, retryCount, checkPropertyPMStatus]);

  useEffect(() => {
    if (autoLoad) {
      debug(`Auto-loading jobs (initialJobs=${initialJobs.length})`);
      if (initialJobs.length === 0) {
        loadJobs();
      } else {
        setJobs(initialJobs);
        setLastLoadTime(new Date());
      }
    }
  }, [loadJobs, autoLoad, initialJobs]);

  const updateJob = useCallback((updatedJob: Job) => {
    debug(`Updating job ${updatedJob.job_id}`);
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
        debug(`Updated job in cache`);
      } catch (e) {
        debug(`Error updating job in cache:`, e);
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
    debug(`Clearing cache for ${cacheKey}`);
    localStorage.removeItem(cacheKey);
    setLastLoadTime(null);
  }, [cacheKey]);

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    const currentMode = localStorage.getItem('debug_mode') === 'true';
    localStorage.setItem('debug_mode', (!currentMode).toString());
    debug(`Debug mode ${!currentMode ? 'enabled' : 'disabled'}`);
    return !currentMode;
  }, []);

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
    clearCache,
    debugInfo,
    toggleDebugMode,
    isPM  // Fixed: Added the comma before this line
  };
}