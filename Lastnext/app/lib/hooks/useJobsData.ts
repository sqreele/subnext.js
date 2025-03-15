"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { fetchJobs } from "@/app/lib/data";
import { useUser } from "@/app/lib/user-context";
import { Job } from "@/app/lib/types";

interface UseJobsDataOptions {
  propertyId?: string | null;
}

export function useJobsData(options?: UseJobsDataOptions) {
  const { data: session } = useSession();
  const { userProfile } = useUser(); // No selectedProperty in UserContextType
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Use passed propertyId, no default from context
  const activePropertyId = options?.propertyId !== undefined ? options.propertyId : null;

  const refreshJobs = useCallback(async (showToast = false) => {
    if (!session?.user?.accessToken) {
      setJobs([]);
      setError("No authentication token available");
      setIsLoading(false);
      return false;
    }
    setIsLoading(true);
    setError(null);

    try {
      const allJobs = await fetchJobs();

      const filteredJobs = allJobs.filter((job: Job) => {
        // Safely filter by property_id
        const matchesProperty = !activePropertyId || 
          (job.property_id && String(job.property_id) === activePropertyId);

        // Filter by user
        const userId = session.user.id;
        const username = session.user.username;

        const matchesUser = 
          job.user === String(userId) || 
          job.user === username;

        return matchesProperty && matchesUser;
      });

      setJobs(filteredJobs);
      setLastRefreshed(new Date());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch jobs";
      console.error("Error fetching jobs:", err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.accessToken, session?.user?.id, session?.user?.username, activePropertyId]);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

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
    setJobs,
    addJob,
    updateJob,
    removeJob,
    isLoading,
    error,
    activePropertyId,
    refreshJobs,
    lastRefreshed
  };
}

export default useJobsData;