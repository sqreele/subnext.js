"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Job } from '@/app/lib/types';
import { fetchData } from '@/app/lib/api-client';

interface UsePreventiveMaintenanceJobsOptions {
  propertyId?: string;
  limit?: number;
  autoLoad?: boolean;
  initialJobs?: Job[];
  isPM?: boolean;
  staleTimeMs?: number;
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

interface PropertyPMStatus {
  property_id: string;
  is_preventivemaintenance: boolean;
}

interface DebugInfo {
  endpoint?: string;
  params?: Record<string, string>;
  responseTime?: string;
  responseType?: string;
  responseStructure?: any;
  timestamp?: string;
  fallback?: boolean;
}

const debug = (message: string, data?: any) => {
  const isDebug = process.env.NODE_ENV === 'development' ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('debug_mode') === 'true');
  if (isDebug) {
    console.log(`[PM Debug] ${message}`, data ?? '');
  }
};

export function usePreventiveMaintenanceJobs({
  propertyId,
  limit = 10,
  autoLoad = true,
  initialJobs = [],
  isPM = true,
  staleTimeMs = 5 * 60 * 1000 // default to 5 minutes
}: UsePreventiveMaintenanceJobsOptions) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isLoading, setIsLoading] = useState(autoLoad && initialJobs.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPMProperty, setIsPMProperty] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const cacheKey = useMemo(() => `pm_jobs_${propertyId ?? 'all'}_${limit}_${isPM}`, [propertyId, limit, isPM]);

  const checkPropertyPMStatus = useCallback(async () => {
    if (!propertyId) return true;
    try {
      const url = `/api/properties/${propertyId}/is_preventivemaintenance/`;
      debug(`Checking PM status at: ${url}`);
      const res = await fetchData<PropertyPMStatus>(url);
      const hasPM = res?.is_preventivemaintenance ?? true;
      setIsPMProperty(hasPM);
      return hasPM;
    } catch (e) {
      debug('Error checking PM status, assuming true', e);
      return true;
    }
  }, [propertyId]);

  const loadJobs = useCallback(async (force = false) => {
    const now = new Date();

    if (!force && lastLoadTime && (now.getTime() - lastLoadTime.getTime()) < staleTimeMs) {
      debug('Using fresh existing data');
      return;
    }

    if (!force && !autoLoad && initialJobs.length > 0) {
      debug('Using initial jobs');
      setJobs(initialJobs);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let hasPM = true;
      if (propertyId) hasPM = await checkPropertyPMStatus();

      const cached = localStorage.getItem(cacheKey);
      if (!force && cached) {
        try {
          const parsed: CachedData = JSON.parse(cached);
          const cachedTime = new Date(parsed.timestamp);
          if (now.getTime() - cachedTime.getTime() < staleTimeMs) {
            debug('Using cached data');
            setJobs(parsed.data);
            setLastLoadTime(cachedTime);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          debug('Cache parse failed', e);
        }
      }

      const params: Record<string, string> = {};
      if (propertyId) params.property_id = propertyId;
      if (limit) params.limit = limit.toString();
      if (isPM) params.is_preventivemaintenance = 'true';

      const url = '/api/jobs/';
      const start = performance.now();
      let res;

      try {
        res = await fetchData<Job[]>(url, { params });
      } catch (e) {
        debug('Initial API call failed, retrying without isPM param', e);
        delete params.is_preventivemaintenance;
        res = await fetchData<Job[]>(url, { params });
      }

      const end = performance.now();
      const time = `${(end - start).toFixed(2)}ms`;

      const responseJobs = Array.isArray(res) ? res : [];
      const filtered = isPM && !params.is_preventivemaintenance
        ? responseJobs.filter(j => j.is_preventivemaintenance || j.description?.toLowerCase().includes('preventive'))
        : responseJobs;

      setJobs(filtered);
      setLastLoadTime(now);
      localStorage.setItem(cacheKey, JSON.stringify({ data: filtered, timestamp: now.toISOString() }));
      setRetryCount(0);
      setDebugInfo({ endpoint: url, params, responseTime: time, responseType: typeof res, responseStructure: Array.isArray(res) ? 'array' : typeof res, timestamp: now.toISOString(), fallback: !params.is_preventivemaintenance });
    } catch (e: any) {
      setRetryCount(c => c + 1);
      debug('Final API call failed', e);
      try {
        const fallback = localStorage.getItem(cacheKey);
        if (fallback) {
          const parsed = JSON.parse(fallback);
          setJobs(parsed.data);
          setError(`Used fallback cache. Error: ${e.message}`);
        } else {
          setError(e.message || 'Failed to load jobs.');
        }
      } catch {
        setError(e.message || 'Failed to load jobs.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, limit, autoLoad, initialJobs, isPM, staleTimeMs, cacheKey, lastLoadTime, checkPropertyPMStatus]);

  useEffect(() => {
    if (autoLoad) {
      if (initialJobs.length === 0) loadJobs();
      else {
        setJobs(initialJobs);
        setLastLoadTime(new Date());
      }
    }
  }, [loadJobs, autoLoad, initialJobs]);

  const updateJob = useCallback((updated: Job) => {
    setJobs(jobs => {
      const updatedList = jobs.map(j => j.job_id === updated.job_id ? updated : j);
      localStorage.setItem(cacheKey, JSON.stringify({ data: updatedList, timestamp: new Date().toISOString() }));
      return updatedList;
    });
  }, [cacheKey]);

  const getStats = useCallback((): PMJobsStats => {
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const active = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length;
    return {
      total,
      active,
      completed,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [jobs]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
    setLastLoadTime(null);
    debug('Cache cleared');
  }, [cacheKey]);

  const toggleDebugMode = useCallback(() => {
    const now = localStorage.getItem('debug_mode') !== 'true';
    localStorage.setItem('debug_mode', now.toString());
    debug(`Debug mode ${now ? 'enabled' : 'disabled'}`);
    return now;
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
    refresh: () => loadJobs(true)
  };
}
