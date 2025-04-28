import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/app/components/ui/use-toast";
import { Job } from "@/app/lib/types";
import { fetchJobs } from "@/app/lib/data";

export function useJobsData({
  propertyId = null,
  retryCount = 3,
  showToastErrors = true,
  timeoutMs = 30000, // Increased timeout (30 seconds)
  fetchFunction
}: {
  propertyId?: string | null;
  retryCount?: number;
  showToastErrors?: boolean;
  timeoutMs?: number;
  fetchFunction?: (propertyId: string) => Promise<Job[]>; // Optional custom fetch function
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const { toast } = useToast();
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Create a cache key based on propertyId
  const cacheKey = `jobs_cache_${propertyId || 'all'}`;
  
  // Load from localStorage cache initially if available
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Check if cache is valid (less than 1 hour old)
        const cacheAge = Date.now() - parsedData.timestamp;
        if (cacheAge < 60 * 60 * 1000) {
          setJobs(parsedData.jobs);
          console.log(`Loaded ${parsedData.jobs.length} jobs from cache`);
        }
      }
    } catch (e) {
      console.error("Error loading from cache:", e);
    }
  }, [cacheKey]);
  
  // Main fetch function with timeout handling
  const fetchDataJobs = useCallback(async (forceRefresh = false): Promise<boolean> => {
    // Don't refetch if already loading unless forced
    if (isLoading && !forceRefresh) return false;
    
    // Cancel any in-progress requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setIsLoading(true);
    if (forceRefresh) {
      setError(null);
    }
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      
      // Choose the appropriate fetch function
      let fetchPromise: Promise<Job[]>;
      
      if (propertyId && fetchFunction) {
        // Use the provided custom fetch function if available
        fetchPromise = fetchFunction(propertyId);
      } else if (propertyId) {
        // If propertyId is available but no custom function, use the regular fetch with query param
        fetchPromise = fetch(`/api/jobs/?property=${propertyId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal,
        }).then(resp => resp.json());
      } else {
        // Default fetch for all jobs
        fetchPromise = fetchJobs();
      }
      
      // Race the fetch against the timeout
      const newJobs = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!isMounted.current) return false;
      
      // Check if response is valid
      if (!Array.isArray(newJobs)) {
        throw new Error("Invalid data format received from server");
      }
      
      // Cache the results
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          jobs: newJobs,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error("Error caching jobs:", e);
      }
      
      setJobs(newJobs);
      setError(null);
      setIsLoading(false);
      console.log(`Fetched ${newJobs.length} jobs from API`);
      
      return true;
    } catch (err) {
      if (!isMounted.current) return false;
      
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('time out');
      
      const isAborted = err instanceof Error && err.name === 'AbortError';
      
      if (!isAborted) {
        console.error("Error fetching jobs:", err);
        
        // Keep cached data available even on error
        if (jobs.length > 0) {
          setIsLoading(false);
          setError(isTimeoutError ? 
            `Request timed out after ${timeoutMs/1000}s. Showing cached data.` : 
            `Error: ${errorMessage}`
          );
          
          if (showToastErrors && !isTimeoutError) {
            toast({
              title: "Error loading jobs",
              description: errorMessage,
              variant: "destructive"
            });
          }
          
          return false;
        }
        
        setError(errorMessage);
        
        if (showToastErrors) {
          toast({
            title: "Error loading jobs",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
      
      setIsLoading(false);
      return false;
    }
  }, [isLoading, jobs, propertyId, timeoutMs, cacheKey, toast, showToastErrors, fetchFunction]);
  
  // Implement retry logic
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;
    
    if (error && attemptCount < retryCount) {
      console.log(`Retrying job fetch (${attemptCount + 1}/${retryCount})...`);
      
      // Exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s, ...)
      const delay = Math.min(2 ** attemptCount * 1000, 10000);
      
      retryTimeout = setTimeout(() => {
        setAttemptCount(prev => prev + 1);
        fetchDataJobs(true).catch(console.error);
      }, delay);
    }
    
    return () => {
      clearTimeout(retryTimeout);
    };
  }, [error, attemptCount, retryCount, fetchDataJobs]);
  
  // Initial fetch
  useEffect(() => {
    setAttemptCount(0);
    fetchDataJobs().catch(console.error);
    
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDataJobs, propertyId]);

  // Functions to update local state
  const updateJob = useCallback((updatedJob: Job) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.job_id === updatedJob.job_id ? {...job, ...updatedJob} : job
      )
    );
    
    // Also update cache
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const updatedJobs = parsedData.jobs.map((job: Job) => 
          job.job_id === updatedJob.job_id ? {...job, ...updatedJob} : job
        );
        localStorage.setItem(cacheKey, JSON.stringify({
          jobs: updatedJobs,
          timestamp: parsedData.timestamp
        }));
      }
    } catch (e) {
      console.error("Error updating job in cache:", e);
    }
  }, [cacheKey]);

  const removeJob = useCallback((jobId: string | number) => {
    setJobs(prevJobs => 
      prevJobs.filter(job => String(job.job_id) !== String(jobId))
    );
    
    // Also update cache
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const updatedJobs = parsedData.jobs.filter((job: Job) => 
          String(job.job_id) !== String(jobId)
        );
        localStorage.setItem(cacheKey, JSON.stringify({
          jobs: updatedJobs,
          timestamp: parsedData.timestamp
        }));
      }
    } catch (e) {
      console.error("Error removing job from cache:", e);
    }
  }, [cacheKey]);

  return {
    jobs,
    isLoading,
    error,
    refreshJobs: fetchDataJobs,
    updateJob,
    removeJob,
    retryCount: attemptCount
  };
}