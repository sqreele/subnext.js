// ./app/lib/data.ts
"use client";

import axios, { AxiosError } from 'axios';
import apiClient, { fetchData, postData, updateData, deleteData, patchData } from '@/app/lib/api-client';
import { 
  Job, 
  JobStatus, 
  Property, 
  Topic, 
  Room, 
  FilterState,
  TabValue,
  SearchCriteria,
  SearchResponse,
  DRFErrorResponse
} from './types';

interface ApiError extends Error {
  status?: number;
  details?: Record<string, string | string[]>;
}

/**
 * Fetch all jobs for a specific property
 * @param propertyId - The ID of the property to fetch jobs for
 * @returns Promise resolving to array of Jobs
 */
export const fetchJobsForProperty = async (propertyId: string): Promise<Job[]> => {
  try {
    if (!propertyId) throw new Error('Property ID is required');
    const response = await fetchData<Job[]>(`/api/jobs/?property=${propertyId}`);
    return response ?? [];
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
};

/**
 * Create a new job
 * @param jobData - Partial Job data to create
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to created Job
 */
export const createJob = async (jobData: Partial<Job>, accessToken?: string): Promise<Job> => {
  try {
    if (!jobData) throw new Error('Job data is required');
    return await postData<Job, Partial<Job>>('/api/jobs/', jobData);
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Update an existing job
 * @param jobId - ID of job to update
 * @param jobData - Partial Job data for update
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to updated Job
 */
export const updateJob = async (jobId: string, jobData: Partial<Job>, accessToken?: string): Promise<Job> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    return await updateData<Job, Partial<Job>>(`/api/jobs/${jobId}/`, jobData);
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Delete a job
 * @param jobId - ID of job to delete
 * @param accessToken - Optional authentication token
 * @returns Promise resolving when deletion is complete
 */
export const deleteJob = async (jobId: string, accessToken?: string): Promise<void> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    await deleteData(`/api/jobs/${jobId}/`);
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Fetch properties
 * @returns Promise resolving to array of Properties
 */
export const fetchProperties = async (): Promise<Property[]> => {
  try {
    const response = await fetchData<Property[]>('/api/properties/');
    return response ?? [];
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
};

/**
 * Fetch a specific property
 * @param propertyId - ID of property to fetch
 * @returns Promise resolving to Property or null if not found
 */
export const fetchProperty = async (propertyId: string): Promise<Property | null> => {
  try {
    if (!propertyId) throw new Error('Property ID is required');
    return await fetchData<Property>(`/api/properties/${propertyId}/`);
  } catch (error) {
    console.error(`Error fetching property ${propertyId}:`, error);
    return null;
  }
};

/**
 * Update job status
 * @param jobId - ID of job to update
 * @param status - New status to set
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to updated Job
 */
export const updateJobStatus = async (jobId: string, status: JobStatus, accessToken?: string): Promise<Job> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    return await patchData<Job, { status: JobStatus }>(`/api/jobs/${jobId}/`, { status });
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Upload job image
 * @param jobId - ID of job to associate image with
 * @param imageFile - File object to upload
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to object with image URL
 */
export const uploadJobImage = async (jobId: string, imageFile: File, accessToken?: string): Promise<{ image_url: string }> => {
  if (!jobId || !imageFile) throw new Error('Job ID and image file are required');
  
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('job_id', jobId);
  
  try {
    const response = await apiClient.post(`/api/jobs/${jobId}/images/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data ?? { image_url: '' };
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Search jobs with filters
 * @param filters - Filter criteria
 * @param tab - Tab value for filtering
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Promise resolving to search results with pagination info
 */
export const searchJobs = async (
  filters: Partial<FilterState>,
  tab: TabValue = 'all',
  page = 1,
  limit = 10
): Promise<{
  jobs: Job[];
  totalPages: number;
  currentPage: number;
  totalJobs: number;
}> => {
  try {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (tab !== 'all') {
      if (tab === 'defect') params.is_defective = 'true';
      else params.status = tab;
    }
    
    if (filters.user) params.user = filters.user;
    if (filters.priority) params.priority = filters.priority;
    if (filters.topic) params.topic = filters.topic;
    if (filters.room) params.room = filters.room;
    if (filters.dateRange?.from) params.date_from = filters.dateRange.from.toISOString().split('T')[0];
    if (filters.dateRange?.to) params.date_to = filters.dateRange.to.toISOString().split('T')[0];

    const queryString = new URLSearchParams(params).toString();
    const response = await fetchData<{
      results: Job[];
      count: number;
    }>(`/api/jobs/?${queryString}`);
    
    return {
      jobs: response?.results ?? [],
      totalJobs: response?.count ?? 0,
      totalPages: Math.ceil((response?.count ?? 0) / limit),
      currentPage: page
    };
  } catch (error) {
    console.error('Error searching jobs:', error);
    return { jobs: [], totalJobs: 0, totalPages: 0, currentPage: 1 };
  }
};

/**
 * Fetch all jobs
 * @returns Promise resolving to array of Jobs
 */
export const fetchJobs = async (): Promise<Job[]> => {
  try {
    const response = await fetchData<Job[]>("/api/jobs/");
    return response ?? [];
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    return [];
  }
};

/**
 * Fetch a single job by ID
 * @param jobId - ID of the job to fetch
 * @returns Promise resolving to Job or null if not found
 */
export const fetchJob = async (jobId: string): Promise<Job | null> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    const response = await fetchData<Job>(`/api/jobs/${jobId}/`);
    return response ?? null;
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    return null;
  }
};

/**
 * Fetch available topics
 * @returns Promise resolving to array of Topics
 */
export const fetchTopics = async (): Promise<Topic[]> => {
  try {
    const response = await fetchData<Topic[]>('/api/topics/');
    return response ?? [];
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
};

/**
 * Fetch rooms for a property
 * @param propertyId - ID of property to fetch rooms for
 * @returns Promise resolving to array of Rooms
 */
export const fetchRooms = async (propertyId: string): Promise<Room[]> => {
  try {
    if (!propertyId) throw new Error('Property ID is required');
    const response = await fetchData<Room[]>(`/api/rooms/?property=${propertyId}`);
    return response ?? [];
  } catch (error) {
    console.error(`Error fetching rooms for property ${propertyId}:`, error);
    return [];
  }
};

/**
 * Fetch a single room by ID
 * @param roomId - ID of room to fetch
 * @returns Promise resolving to Room or null if not found
 */
export const fetchRoom = async (roomId: string): Promise<Room | null> => {
  try {
    if (!roomId) throw new Error('Room ID is required');
    return await fetchData<Room>(`/api/rooms/${roomId}/`);
  } catch (error) {
    console.error(`Error fetching room ${roomId}:`, error);
    return null;
  }
};

/**
 * Search across all entities
 * @param criteria - Search criteria object
 * @returns Promise resolving to SearchResponse
 */
export const searchAll = async (criteria: SearchCriteria): Promise<SearchResponse> => {
  try {
    const params = new URLSearchParams();
    if (criteria.query) params.append('q', criteria.query);
    if (criteria.category && criteria.category !== 'All') params.append('category', criteria.category);
    if (criteria.status) params.append('status', criteria.status);
    if (criteria.dateRange?.start) params.append('date_from', criteria.dateRange.start);
    if (criteria.dateRange?.end) params.append('date_to', criteria.dateRange.end);
    if (criteria.page) params.append('page', String(criteria.page));
    if (criteria.pageSize) params.append('limit', String(criteria.pageSize));
    
    const response = await fetchData<SearchResponse>(`/api/search/?${params.toString()}`);
    return response ?? { jobs: [], properties: [], totalCount: 0 };
  } catch (error) {
    console.error('Error performing search:', error);
    return { 
      jobs: [], 
      properties: [], 
      totalCount: 0,
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
};

/**
 * Handle API errors consistently
 * @param error - Error object to process
 * @returns Never - always throws
 * @throws ApiError with detailed error information
 */
const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<DRFErrorResponse>;
    const apiError: ApiError = new Error('API request failed');
    apiError.status = axiosError.response?.status;

    if (axiosError.response?.data) {
      const errorData = axiosError.response.data;

      // Filter out undefined values
      const cleanedErrorData: Record<string, string | string[]> = {};
      Object.keys(errorData).forEach((key) => {
        const value = errorData[key];
        if (value !== undefined) {
          cleanedErrorData[key] = value;
        }
      });

      apiError.details = cleanedErrorData;

      if (errorData.detail) {
        apiError.message = errorData.detail as string;
      } else {
        const fieldErrors = Object.entries(errorData)
          .filter(([key]) => key !== 'detail')
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');
        apiError.message = fieldErrors ? `Validation errors: ${fieldErrors}` : axiosError.message;
      }
    }
    throw apiError;
  }
  throw error instanceof Error ? error : new Error('Unknown error occurred');
};
