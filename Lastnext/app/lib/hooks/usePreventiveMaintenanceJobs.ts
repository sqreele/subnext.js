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
  
  // Create a cache key based on query parameters
  const cacheKey = useMemo(() => 
    `pm_jobs_${propertyId || 'all'}_${limit}_${isPM ? 'true' : 'false'}`,
    [propertyId, limit, isPM]
  );

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
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add is_preventivemaintenance filter
      params.append('is_preventivemaintenance', isPM ? 'true' : 'false');
      
      // Add other filters if provided
      if (propertyId) {
        params.append('property', propertyId);
      }
      
      if (limit) {
        params.append('limit', limit.toString());
      }
      
      // Use the fetchData function with timeout and retry logic
      const apiUrl = `/api/jobs/?${params.toString()}`;
      let fetchedJobs: Job[] = [];
      
      // Add retry logic with exponential backoff
      let retries = 0;
      const MAX_RETRIES = 2;
      
      while (retries <= MAX_RETRIES) {
        try {
          fetchedJobs = await fetchData<Job[]>(apiUrl);
          break; // Success, exit retry loop
        } catch (err) {
          retries++;
          console.warn(`API request failed (attempt ${retries}/${MAX_RETRIES + 1}):`, err);
          
          if (retries > MAX_RETRIES) {
            throw err; // Re-throw if we've exhausted retries
          }
          
          // Exponential backoff with jitter
          const delay = Math.min(1000 * Math.pow(2, retries) + Math.random() * 1000, 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Extra safety check in case the API doesn't filter correctly
      const filteredJobs = isPM 
        ? fetchedJobs.filter(job => job.is_preventivemaintenance === true)
        : fetchedJobs;
      
      // Cache the successful result
      localStorage.setItem(cacheKey, JSON.stringify({
        data: filteredJobs,
        timestamp: now.toISOString()
      }));
      
      setJobs(filteredJobs);
      setLastLoadTime(now);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error loading preventive maintenance jobs:', err);
      setRetryCount(prev => prev + 1);
      
      // Try to use cached data as fallback
      const cachedDataString = localStorage.getItem(cacheKey);
      if (cachedDataString) {
        try {
          const cachedData: CachedData = JSON.parse(cachedDataString);
          setJobs(cachedData.data);
          setError(`Using cached data. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } catch (e) {
          setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to load jobs. Please try again.'));
        }
      } else {
        setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to load jobs. Please try again.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, limit, autoLoad, initialJobs, isPM, cacheKey, lastLoadTime, retryCount]);

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
    clearCache  // Expose this for debugging/testing
  };
}