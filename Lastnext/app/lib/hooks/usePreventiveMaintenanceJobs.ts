// app/lib/hooks/usePreventiveMaintenanceJobs.ts
import { useState, useEffect, useCallback } from 'react';
import { Job, JobStatus } from '@/app/lib/types';
import { fetchJobsForProperty, fetchPreventiveMaintenanceJobs } from '@/app/lib/data';

interface UsePreventiveMaintenanceJobsOptions {
  propertyId?: string;
  limit?: number;
  autoLoad?: boolean;
  initialJobs?: Job[];
}

interface PMJobsStats {
  total: number;
  active: number;
  completed: number;
  completionRate: number;
}

export function usePreventiveMaintenanceJobs({
  propertyId,
  limit = 10,
  autoLoad = true,
  initialJobs = []
}: UsePreventiveMaintenanceJobsOptions) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isLoading, setIsLoading] = useState<boolean>(autoLoad && initialJobs.length === 0);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    // If we have initial jobs and don't need to auto-load, just use those
    if (!autoLoad && initialJobs.length > 0) {
      // Apply filtering to these initial jobs as well
      const filteredJobs = initialJobs.filter(job => job.is_preventivemaintenance === true);
      setJobs(filteredJobs);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch jobs using the API function
      let fetchedJobs: Job[] = await fetchPreventiveMaintenanceJobs({
        propertyId,
        limit
      });
      
      // Ensure we're filtering for preventive maintenance jobs regardless
      // of what the API returns
      fetchedJobs = fetchedJobs.filter(job => job.is_preventivemaintenance === true);
      
      setJobs(fetchedJobs);
    } catch (err) {
      console.error('Error loading preventive maintenance jobs:', err);
      setError('Failed to load preventive maintenance jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, limit, autoLoad, initialJobs]);

  useEffect(() => {
    if (autoLoad && initialJobs.length === 0) {
      loadJobs();
    } else if (initialJobs.length > 0) {
      // Filter initial jobs for preventive maintenance
      setJobs(initialJobs.filter(job => job.is_preventivemaintenance === true));
    }
  }, [loadJobs, autoLoad, initialJobs]);

  const updateJob = useCallback((updatedJob: Job) => {
    setJobs(prev => prev.map(job => 
      job.job_id === updatedJob.job_id ? updatedJob : job
    ));
  }, []);

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

  return {
    jobs,
    isLoading,
    error,
    loadJobs,
    updateJob,
    getStats
  };
}