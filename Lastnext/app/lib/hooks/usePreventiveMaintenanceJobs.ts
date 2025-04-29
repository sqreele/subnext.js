"use client";

import { useState, useEffect, useCallback } from 'react';
import { Job, JobStatus } from '@/app/lib/types';
import { fetchData } from '@/app/lib/api-client';

interface UsePreventiveMaintenanceJobsOptions {
  propertyId?: string;
  limit?: number;
  autoLoad?: boolean;
  initialJobs?: Job[];
  isPM?: boolean; // New option to filter by is_preventivemaintenance
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
  initialJobs = [],
  isPM = true // Default to true since this is specifically for PM jobs
}: UsePreventiveMaintenanceJobsOptions) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isLoading, setIsLoading] = useState<boolean>(autoLoad && initialJobs.length === 0);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!autoLoad && initialJobs.length > 0) {
      setJobs(initialJobs);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add is_preventivemaintenance filter - this is the key change
      params.append('is_preventivemaintenance', isPM ? 'true' : 'false');
      
      // Add other filters if provided
      if (propertyId) {
        params.append('property', propertyId);
      }
      
      if (limit) {
        params.append('limit', limit.toString());
      }
      
      // Use the fetchData function from api-client
      const apiUrl = `/api/jobs/?${params.toString()}`;
      const fetchedJobs = await fetchData<Job[]>(apiUrl);
      
      // Extra safety check in case the API doesn't filter correctly
      const filteredJobs = fetchedJobs.filter(job => job.is_preventivemaintenance === true);
      
      setJobs(filteredJobs);
    } catch (err) {
      console.error('Error loading preventive maintenance jobs:', err);
      setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to load jobs. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, limit, autoLoad, initialJobs, isPM]);

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