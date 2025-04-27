// app/lib/hooks/useJobsData.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { fetchJobs, ApiError } from "@/app/lib/data"; // Import ApiError from data.ts
import { Job } from "@/app/lib/types";
import { useToast } from "@/app/components/ui/use-toast"; // Import toast for user feedback

interface UseJobsDataOptions {
  propertyId?: string | null;
  enabled?: boolean;
  retryCount?: number;
  showToastErrors?: boolean;
}

// Default options
const defaultOptions: UseJobsDataOptions = {
  enabled: true,
  retryCount: 2,
  showToastErrors: true
};

export function useJobsData(options?: UseJobsDataOptions) {
  const mergedOptions = { ...defaultOptions, ...options };
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast(); // Get toast function

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(mergedOptions.enabled);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  // Use passed propertyId, default to null
  const activePropertyId = mergedOptions.propertyId !== undefined ? mergedOptions.propertyId : null;

  const refreshJobs = useCallback(async (showToast = false) => {
    // Ensure session is ready before trying to fetch
    if (sessionStatus !== 'authenticated' || !session?.user?.accessToken) {
      setJobs([]);
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useJobsData] Fetching all jobs (propertyId: ${activePropertyId}, userId: ${session.user.id})`);
      const allJobs = await fetchJobs();

      const userIdStr = String(session.user.id);
      const username = session.user.username;

      // Client-Side Filtering
      const filteredJobs = allJobs.filter((job: Job) => {
        // Filter by Property
        const matchesProperty = !activePropertyId ||
          (job.property_id && String(job.property_id) === activePropertyId);

        // Filter by User
        const matchesUser = job.user === userIdStr || (username && job.user === username);

        return matchesProperty && matchesUser;
      });

      setJobs(filteredJobs);
      setLastRefreshed(new Date());
      setRetryAttempt(0); // Reset retry counter on success
      
      if (showToast) {
        toast({
          title: "Jobs refreshed",
          description: `Successfully loaded ${filteredJobs.length} jobs.`,
          duration: 3000,
        });
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching jobs";
      console.error("[useJobsData] Error fetching or filtering jobs:", err);
      
      setError(errorMessage);
      
      // Retry logic for timeouts and network errors
      if (retryAttempt < mergedOptions.retryCount! && 
          (errorMessage.includes('timeout') || errorMessage.includes('network'))) {
        
        console.log(`[useJobsData] Retry attempt ${retryAttempt + 1}/${mergedOptions.retryCount}`);
        setRetryAttempt(prev => prev + 1);
        
        // Implement exponential backoff
        const backoffTime = 1000 * Math.pow(2, retryAttempt);
        setTimeout(() => refreshJobs(false), backoffTime);
        
        // Don't show the error toast for retry attempts
        if (mergedOptions.showToastErrors && retryAttempt === 0) {
          toast({
            title: "Connection issue",
            description: "Retrying to load your jobs...",
            variant: "default",
            duration: 4000,
          });
        }
      } else {
        // Only show error toast on final attempt
        if (mergedOptions.showToastErrors) {
          toast({
            title: "Error loading jobs",
            description: errorMessage.includes('timeout') 
              ? "Server is taking too long to respond. Please try again later." 
              : errorMessage,
            variant: "destructive",
            duration: 5000,
          });
        }
        
        // After all retries, clear jobs
        setJobs([]);
      }
      
      return false;
    } finally {
      // Set loading state to false only if all retries are exhausted or this isn't a retry situation
      if (retryAttempt >= mergedOptions.retryCount! || !(error?.includes('timeout') || error?.includes('network'))) {
        setIsLoading(false);
      }
    }
  }, [
    sessionStatus,
    session?.user?.accessToken,
    session?.user?.id,
    session?.user?.username,
    activePropertyId,
    retryAttempt,
    mergedOptions.retryCount,
    mergedOptions.showToastErrors,
    toast,
    error
  ]);

  useEffect(() => {
    if (mergedOptions.enabled && sessionStatus === 'authenticated') {
      console.log("[useJobsData] Effect triggered: Refreshing jobs...");
      refreshJobs();
    } else {
      console.log(`[useJobsData] Effect skipped: enabled=${mergedOptions.enabled}, sessionStatus=${sessionStatus}`);
      if (!mergedOptions.enabled || sessionStatus === 'unauthenticated') {
        setJobs([]);
        setError(null);
        setIsLoading(false);
      }
    }
  }, [refreshJobs, mergedOptions.enabled, sessionStatus]);

  // State modifier functions
  const addJob = useCallback((newJob: Job) => {
    setJobs(prevJobs => [newJob, ...prevJobs]);
  }, []);

  const updateJob = useCallback((updatedJob: Job) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        String(job.job_id) === String(updatedJob.job_id) ? updatedJob : job
      )
    );
  }, []);

  const removeJob = useCallback((jobId: string | number) => {
    setJobs(prevJobs =>
      prevJobs.filter(job => String(job.job_id) !== String(jobId))
    );
  }, []);

  return {
    jobs,
    addJob,
    updateJob,
    removeJob,
    isLoading,
    error,
    refreshJobs,
    lastRefreshed,
    retryCount: retryAttempt,
    maxRetries: mergedOptions.retryCount
  };
}