// app/lib/hooks/usePreventiveMaintenanceJobs.ts
import { useState, useEffect, useCallback } from 'react';
import { Job, JobStatus } from '@/app/lib/types';
import { fetchJobs } from '@/app/lib/data';

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(autoLoad && initialJobs.length === 0);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!autoLoad && initialJobs.length > 0) {
      // Filter initial jobs to only include preventive maintenance jobs
      const pmJobs = initialJobs.filter(job => job.is_preventivemaintenance === true);
      setJobs(pmJobs);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch all jobs and filter locally
      const allJobs = await fetchJobs();
      
      // Only keep jobs with is_preventivemaintenance === true
      const pmJobs = allJobs.filter(job => job.is_preventivemaintenance === true);
      
      setJobs(pmJobs);
    } catch (err) {
      console.error('Error loading preventive maintenance jobs:', err);
      setError('Failed to load preventive maintenance jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [autoLoad, initialJobs]);

  useEffect(() => {
    if (autoLoad) {
      loadJobs();
    } else if (initialJobs.length > 0) {
      // Filter initial jobs to only include preventive maintenance jobs
      const pmJobs = initialJobs.filter(job => job.is_preventivemaintenance === true);
      setJobs(pmJobs);
    }
  }, [loadJobs, autoLoad, initialJobs]);

  const updateJob = useCallback((updatedJob: Job) => {
    // Only include job if it has is_preventivemaintenance === true
    if (updatedJob.is_preventivemaintenance === true) {
      setJobs(prev => {
        const exists = prev.some(job => job.job_id === updatedJob.job_id);
        if (exists) {
          return prev.map(job => job.job_id === updatedJob.job_id ? updatedJob : job);
        } else {
          return [...prev, updatedJob];
        }
      });
    } else {
      // Remove job if it's no longer a preventive maintenance job
      setJobs(prev => prev.filter(job => job.job_id !== updatedJob.job_id));
    }
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