// ./app/lib/data.ts
"use client";

import axios, { AxiosError } from 'axios';
// Assuming apiClient and helpers are defined correctly in api-client
import apiClient, { fetchData, postData, updateData, deleteData, patchData } from '@/app/lib/api-client';
import {
  Job,
  JobStatus,
  Property,
  Topic,
  Room,
  FilterState, // Assuming FilterState is used by searchJobs, verify type usage
  TabValue,    // Assuming TabValue is used by searchJobs, verify type usage
  SearchCriteria,
  SearchResponse,
  DRFErrorResponse
} from './types'; // Verify path

// Define a custom ApiError that extends Error
// (You might already have this defined elsewhere, ensure consistency)
class ApiError extends Error {
  status?: number;
  details?: Record<string, string | string[]>; // For DRF field errors

  constructor(message: string, status?: number, details?: Record<string, string | string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    // Ensure the prototype chain is correct
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// --- Helper Function to Extract Error Message (Defined Here) ---
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) { // Covers ApiError too if it extends Error
        return error.message;
    }
    if (typeof error === 'string' && error.trim() !== '') {
        return error;
    }
    // Basic check for plain objects with a message property
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }
    return "An unknown error occurred";
};


/**
 * Handle API errors consistently, throwing a structured ApiError
 * @param error - Error object to process (typically from Axios)
 * @returns Never - always throws
 * @throws ApiError with detailed error information
 */
const handleApiError = (error: unknown): never => {
  // Default error details
  let errorMessage = 'An unknown error occurred';
  let errorStatus: number | undefined = undefined;
  let errorDetails: Record<string, string | string[]> | undefined = undefined;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<DRFErrorResponse>; // Type assertion for response data
    errorMessage = axiosError.message || 'API request failed'; // Fallback message
    errorStatus = axiosError.response?.status;

    if (axiosError.response?.data) {
      const errorData = axiosError.response.data;
      // Try to get DRF 'detail' first
      if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
      }
      // Otherwise, parse field errors
      else if (typeof errorData === 'object' && errorData !== null) {
        const cleanedErrorData: Record<string, string | string[]> = {};
        let fieldErrorsString = '';
        Object.entries(errorData).forEach(([key, value]) => {
           if (value !== undefined && key !== 'detail') {
             const errorMessages = Array.isArray(value) ? value : [String(value)];
             cleanedErrorData[key] = errorMessages;
             fieldErrorsString += `${key}: ${errorMessages.join(', ')}; `;
           }
        });
        if (Object.keys(cleanedErrorData).length > 0) {
           errorDetails = cleanedErrorData;
           // Use combined field errors as the main message if no 'detail'
           if (!errorMessage || errorMessage === axiosError.message || errorMessage === 'API request failed') {
             errorMessage = `Validation errors: ${fieldErrorsString.trim()}`;
           }
        }
      }
    }
    console.error(`API Error (${errorStatus}): ${errorMessage}`, errorDetails || axiosError.response?.data);
    throw new ApiError(errorMessage, errorStatus, errorDetails);

  } else if (error instanceof ApiError) {
    // If it's already the type we want to throw, re-throw it
     console.error(`Propagating ApiError: Status=${error.status}, Message=${error.message}`, "Details:", error.details);
    throw error;
  }
  else if (error instanceof Error) {
    // Handle standard JavaScript errors
    errorMessage = error.message;
    console.error(`Error: ${errorMessage}`, error);
    throw new ApiError(errorMessage); // Throw as ApiError

  } else {
    // Handle other types of thrown values
    console.error('Unknown error:', error);
    throw new ApiError(errorMessage); // Throw generic ApiError
  }
};


// --- Read Functions (Allow errors to propagate) ---

/**
 * Fetch all jobs
 * @returns Promise resolving to array of Jobs
 * @throws ApiError if the underlying fetch fails
 */
export const fetchJobs = async (): Promise<Job[]> => {
  const response = await fetchData<Job[]>("/api/jobs/");
  return response ?? [];
};

/**
 * Fetch jobs for a specific property
 * @param propertyId - The ID of the property to fetch jobs for
 * @returns Promise resolving to array of Jobs
 * @throws ApiError if the underlying fetch fails or propertyId is missing
 */
export const fetchJobsForProperty = async (propertyId: string): Promise<Job[]> => {
  if (!propertyId) throw new ApiError('Property ID is required', 400);
  const response = await fetchData<Job[]>(`/api/jobs/?property=${propertyId}`);
  return response ?? [];
};

/**
 * Fetch preventive maintenance jobs
 * @param options - Additional filter options
 * @returns Promise resolving to array of preventive maintenance Jobs
 * @throws ApiError if the underlying fetch fails
 */
export const fetchPreventiveMaintenanceJobs = async (options?: {
  propertyId?: string;
  status?: JobStatus;
  limit?: number;
}): Promise<Job[]> => {
  const params = new URLSearchParams();
  params.append('is_preventivemaintenance', 'true');
  if (options?.propertyId) params.append('property', options.propertyId);
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', options.limit.toString());
  const queryString = params.toString();
  const response = await fetchData<Job[]>(`/api/jobs/?${queryString}`);
  return response ?? [];
};

/**
 * Fetch properties
 * @returns Promise resolving to array of Properties
 * @throws ApiError if the underlying fetch fails
 */
export const fetchProperties = async (): Promise<Property[]> => {
  const response = await fetchData<Property[]>('/api/properties/');
  return response ?? [];
};

/**
 * Fetch a specific property
 * @param propertyId - ID of property to fetch
 * @returns Promise resolving to Property or null
 * @throws ApiError if the underlying fetch fails or propertyId is missing
 */
export const fetchProperty = async (propertyId: string): Promise<Property | null> => {
  if (!propertyId) throw new ApiError('Property ID is required', 400);
  const response = await fetchData<Property>(`/api/properties/${propertyId}/`);
  return response ?? null;
};

/**
 * Fetch a single job by ID
 * @param jobId - ID of the job to fetch
 * @returns Promise resolving to Job or null
 * @throws ApiError if the underlying fetch fails or jobId is missing
 */
export const fetchJob = async (jobId: string): Promise<Job | null> => {
  if (!jobId) throw new ApiError('Job ID is required', 400);
  const response = await fetchData<Job>(`/api/jobs/${jobId}/`);
  return response ?? null;
};

/**
 * Fetch available topics
 * @returns Promise resolving to array of Topics
 * @throws ApiError if the underlying fetch fails
 */
export const fetchTopics = async (): Promise<Topic[]> => {
  const response = await fetchData<Topic[]>('/api/topics/');
  return response ?? [];
};

/**
 * Fetch rooms (optionally for a property)
 * @param propertyId - Optional ID of property to fetch rooms for
 * @returns Promise resolving to array of Rooms
 * @throws ApiError if the underlying fetch fails
 */
export const fetchRooms = async (propertyId?: string): Promise<Room[]> => {
  const url = propertyId ? `/api/rooms/?property=${propertyId}` : '/api/rooms/';
  const response = await fetchData<Room[]>(url);
  return response ?? [];
};

/**
 * Fetch a single room by ID
 * @param roomId - ID of room to fetch
 * @returns Promise resolving to Room or null
 * @throws ApiError if the underlying fetch fails or roomId is missing
 */
export const fetchRoom = async (roomId: string): Promise<Room | null> => {
  if (!roomId) throw new ApiError('Room ID is required', 400);
  const response = await fetchData<Room>(`/api/rooms/${roomId}/`);
  return response ?? null;
};


// --- Search Functions (Keep try...catch for default return structure) ---

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
  error?: string; // Include optional error field in return type
}> => {
  try {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    // Handle tab-specific filters
    if (tab !== 'all') {
      if (tab === 'defect') params.is_defective = 'true';
      else if (tab === 'preventive_maintenance') params.is_preventivemaintenance = 'true';
      else params.status = tab;
    }
    // Apply additional filters from FilterState object
    if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.dateRange?.from) params.date_from = filters.dateRange.from.toISOString().split('T')[0];
    if (filters.dateRange?.to) params.date_to = filters.dateRange.to.toISOString().split('T')[0];
    if (filters.is_preventivemaintenance !== undefined && filters.is_preventivemaintenance !== null) {
      params.is_preventivemaintenance = filters.is_preventivemaintenance ? 'true' : 'false';
    }
    // Add other potential filters if needed
    // if (filters.topic) params.topic = String(filters.topic); // Convert to string if ID
    // if (filters.room) params.room = String(filters.room);   // Convert to string if ID
    // if (filters.user) params.user = filters.user;

    const queryString = new URLSearchParams(params).toString();
    const response = await fetchData<{ results: Job[]; count: number; }>(`/api/jobs/?${queryString}`);

    const totalJobs = response?.count ?? 0;
    return {
      jobs: response?.results ?? [],
      totalJobs: totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page
    };
  } catch (error) {
    console.error('Error searching jobs:', error);
    // Return default structure with an error message using the helper
    return {
        jobs: [], totalJobs: 0, totalPages: 0, currentPage: 1,
        error: getErrorMessage(error) // <<< FIXED: Use local helper
    };
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
      jobs: [], properties: [], totalCount: 0,
      error: getErrorMessage(error) // <<< FIXED: Use local helper
    };
  }
};


// --- Mutating Functions (Keep using handleApiError) ---

/**
 * Create a new job
 * @param jobData - FormData containing job details and optional images
 * @returns Promise resolving to created Job
 * @throws ApiError on failure
 */
export const createJob = async (jobData: FormData): Promise<Job> => {
  try {
    if (!(jobData instanceof FormData)) throw new Error('Job data must be FormData for file uploads');
    const response = await apiClient.post<Job>('/api/jobs/', jobData); // Let interceptor handle Content-Type for FormData
    if (!response.data || typeof response.data !== 'object') {
         throw new ApiError('Invalid response received after creating job');
    }
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};


/**
 * Update an existing job
 * @param jobData - Full Job object representing the desired updated state
 * @returns Promise resolving to void (or Job if API returns it)
 * @throws ApiError on failure
 */
export const updateJob = async (jobData: Job): Promise<void> => { // Assuming returns void
  try {
    if (!jobData || !jobData.job_id) throw new Error('Job data with job_id is required for update');
    const jobId = jobData.job_id;
    // Using PUT via updateData helper, assuming API expects full object
    await updateData<void, Job>(`/api/jobs/${jobId}/`, jobData);
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Delete a job
 * @param jobId - ID (string or number) of job to delete
 * @param accessToken - Optional token (likely handled by interceptor)
 * @returns Promise resolving when deletion is complete
 * @throws ApiError on failure
 */
export const deleteJob = async (jobId: string | number, accessToken?: string): Promise<void> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    // Convert jobId to string if it's a number for URL
    await deleteData(`/api/jobs/${String(jobId)}/`);
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Update job status using PATCH
 * @param jobId - ID (string or number) of job to update
 * @param status - New status to set
 * @returns Promise resolving to updated Job object returned by API
 * @throws ApiError on failure
 */
export const updateJobStatus = async (jobId: string | number, status: JobStatus): Promise<Job> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    return await patchData<Job, { status: JobStatus }>(`/api/jobs/${String(jobId)}/`, { status });
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Toggle preventive maintenance status using PATCH
 * @param jobId - ID (string or number) of job to update
 * @param isPreventiveMaintenance - Whether the job is preventive maintenance
 * @returns Promise resolving to updated Job object returned by API
 * @throws ApiError on failure
 */
export const togglePreventiveMaintenance = async (
  jobId: string | number,
  isPreventiveMaintenance: boolean
): Promise<Job> => {
  try {
    if (!jobId) throw new Error('Job ID is required');
    return await patchData<Job, { is_preventivemaintenance: boolean }>(
      `/api/jobs/${String(jobId)}/`,
      { is_preventivemaintenance: isPreventiveMaintenance }
    );
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Upload job image
 * @param jobId - ID (string or number) of job to associate image with
 * @param imageFile - File object to upload
 * @returns Promise resolving to object with image URL
 * @throws ApiError on failure
 */
export const uploadJobImage = async (jobId: string | number, imageFile: File): Promise<{ image_url: string }> => {
  if (!jobId || !imageFile) throw new Error('Job ID and image file are required');
  const formData = new FormData();
  formData.append('image', imageFile);
  try {
    const response = await apiClient.post<{ image_url: string }>(`/api/jobs/${String(jobId)}/images/`, formData);
    return response.data ?? { image_url: '' }; // Provide default
  } catch (error) {
    throw handleApiError(error);
  }
};
/**
 * Fetch jobs for the current authenticated user for a specific property
 * @param propertyId - The ID of the property to fetch jobs for
 * @returns Promise resolving to array of Jobs
 * @throws ApiError if the underlying fetch fails or propertyId is missing
 */
export const fetchMyJobsForProperty = async (propertyId: string): Promise<Job[]> => {
  if (!propertyId) throw new ApiError('Property ID is required', 400);
  // Adjust the URL based on your actual backend endpoint
  const response = await fetchData<Job[]>(`/api/jobs/my-jobs/?property=${propertyId}`);
  return response ?? [];
};
// Export ApiError class if needed by other modules
export { ApiError }; // Optional export if needed elsewhere