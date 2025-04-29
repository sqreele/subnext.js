"use client";

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
      setJobs(initialJobs);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      let fetchedJobs: Job[] = [];
      
      if (propertyId) {
        try {
          // Use the fetchPreventiveMaintenanceJobs function from data.ts
          fetchedJobs = await fetchPreventiveMaintenanceJobs({
            propertyId,
            limit
          });
        } catch (fetchError) {
          console.error('Error with preventive maintenance fetch, falling back to standard fetch:', fetchError);
          // Fall back to general job fetching
          fetchedJobs = await fetchJobsForProperty(propertyId);
        }
      } else {
        console.warn('No propertyId provided for fetching preventive maintenance jobs');
      }
      
      setJobs(fetchedJobs);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Failed to load jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, limit, autoLoad, initialJobs]);

  useEffect(() => {
    if (autoLoad) {
      if (initialJobs.length === 0) {
        loadJobs();
      } else {
        setJobs(initialJobs);
      }
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
