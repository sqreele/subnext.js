"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { fetchJobs } from "@/app/lib/data"; // Assuming fetchJobs might be updated for server-side filtering
// import { useUser } from "@/app/lib/user-context"; // Only if userProfile is needed elsewhere in the hook
import { Job } from "@/app/lib/types";

interface UseJobsDataOptions {
  propertyId?: string | null;
  enabled?: boolean; // <-- Add enabled flag
}

// Default options
const defaultOptions: UseJobsDataOptions = {
  enabled: true, // Fetching is enabled by default
};

export function useJobsData(options?: UseJobsDataOptions) {
  const mergedOptions = { ...defaultOptions, ...options }; // Merge provided options with defaults
  const { data: session, status: sessionStatus } = useSession(); // Get session status too
  // const { userProfile } = useUser(); // Keep if needed

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(mergedOptions.enabled); // Start loading only if enabled
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Use passed propertyId, default to null
  const activePropertyId = mergedOptions.propertyId !== undefined ? mergedOptions.propertyId : null;

  const refreshJobs = useCallback(async (showToast = false /* Not used here, maybe in MyJobs */) => {
    // Ensure session is ready before trying to fetch
    if (sessionStatus !== 'authenticated' || !session?.user?.accessToken) {
      setJobs([]); // Clear jobs if not authenticated
      // Avoid setting error here unless explicitly desired when disabled/unauthenticated
      // setError("Authentication required to fetch jobs.");
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Ideally, pass filters to fetchJobs for server-side filtering
      // e.g., const allJobs = await fetchJobs({ propertyId: activePropertyId, userId: session.user.id });
      console.log(`Fetching all jobs (client-side filtering active for propertyId: ${activePropertyId}, userId: ${session.user.id})`);
      const allJobs = await fetchJobs(); // Current: Fetches all, filters below

      const userIdStr = String(session.user.id);
      const username = session.user.username; // Assuming username exists on session.user

      // --- Client-Side Filtering (Less efficient for large datasets) ---
      const filteredJobs = allJobs.filter((job: Job) => {
        // 1. Filter by Property (if activePropertyId is provided)
        const matchesProperty = !activePropertyId ||
          (job.property_id && String(job.property_id) === activePropertyId);

        // 2. Filter by User (match user ID string OR username)
        // Note: Relying on user ID (job.user === userIdStr) is generally more robust if backend is consistent.
        const matchesUser = job.user === userIdStr || (username && job.user === username);

        return matchesProperty && matchesUser;
      });
      // --- End Client-Side Filtering ---

      setJobs(filteredJobs);
      setLastRefreshed(new Date());
      return true; // Indicate success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching jobs";
      console.error("Error fetching or filtering jobs:", err);
      setError(errorMessage);
      setJobs([]); // Clear jobs on error
      return false; // Indicate failure
    } finally {
      setIsLoading(false);
    }
  }, [
      sessionStatus, // Add sessionStatus dependency
      session?.user?.accessToken,
      session?.user?.id,
      session?.user?.username,
      activePropertyId
  ]); // Dependencies for refreshJobs

  useEffect(() => {
    // Only run fetch if enabled and authenticated
    if (mergedOptions.enabled && sessionStatus === 'authenticated') {
      console.log("useJobsData effect triggered: Refreshing jobs...");
      refreshJobs();
    } else {
        console.log(`useJobsData effect skipped: enabled=${mergedOptions.enabled}, sessionStatus=${sessionStatus}`);
        // Optionally clear state if disabled or unauthenticated after being enabled
         if (!mergedOptions.enabled || sessionStatus === 'unauthenticated') {
             setJobs([]);
             setError(null);
             setIsLoading(false);
         }
    }
  }, [refreshJobs, mergedOptions.enabled, sessionStatus]); // Dependencies for the effect

  // State modifier functions (remain unchanged, good)
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
    // setJobs, // Consider removing for better encapsulation
    addJob,
    updateJob,
    removeJob,
    isLoading,
    error,
    // activePropertyId, // Consumer already knows this as they pass it in options
    refreshJobs,
    lastRefreshed
  };
}

// Default export remains the same
// export default useJobsData; // Keep if this is the standard export