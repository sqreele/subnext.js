// ./app/lib/api-client.ts
"use client";

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";
import { jwtDecode } from "jwt-decode";

// Define token structure
interface JwtToken {
  exp?: number;
  user_id?: string;
  [key: string]: any;
}

// Define error interfaces
export interface ApiErrorDetails {
  detail?: string;
  [key: string]: any;
}

export class ApiError extends Error {
  status?: number;
  details?: ApiErrorDetails;
  
  constructor(message: string, status?: number, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Create API client
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 
    (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site"),
  timeout: 15000, // 15 second timeout
  headers: {
    "Content-Type": "application/json",
  }
});

// Token refresh state
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
const pendingRequests: Array<(token: string | null) => void> = [];

// Process all pending requests
const processPendingRequests = (token: string | null): void => {
  pendingRequests.forEach(callback => callback(token));
  pendingRequests.length = 0;
};

// Refresh token function
async function refreshToken(refreshToken: string): Promise<string | null> {
  try {
    console.log("Refreshing access token...");
    const response = await fetch(`${apiClient.defaults.baseURL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const refreshedTokens = await response.json();
    if (!refreshedTokens.access) {
      throw new Error('Refresh response did not contain access token');
    }

    console.log("Token refreshed successfully");
    return refreshedTokens.access;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const session = await getSession();
      const accessToken = session?.user?.accessToken;
      
      if (!accessToken) {
        return config;
      }
      
      // Skip token validation for refresh token requests
      if (config.url?.includes('/api/token/refresh/')) {
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      }
      
      // Check if token is expired
      try {
        const decoded = jwtDecode<JwtToken>(accessToken);
        const currentTime = Math.floor(Date.now() / 1000);
        
        // If token is expired and this isn't already a token refresh request
        if (decoded.exp && decoded.exp < currentTime) {
          
          // If a refresh is already in progress, wait for it
          if (isRefreshing) {
            return new Promise<InternalAxiosRequestConfig>((resolve) => {
              pendingRequests.push((newToken) => {
                if (newToken) {
                  config.headers.Authorization = `Bearer ${newToken}`;
                }
                resolve(config);
              });
            });
          }
          
          // Start token refresh process
          isRefreshing = true;
          refreshPromise = refreshToken(session.user.refreshToken);
          
          try {
            const newToken = await refreshPromise;
            isRefreshing = false;
            
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
              processPendingRequests(newToken);
            } else {
              processPendingRequests(null);
            }
          } catch (error) {
            isRefreshing = false;
            processPendingRequests(null);
            console.error("Token refresh error:", error);
          } finally {
            refreshPromise = null;
          }
          
          return config;
        }
      } catch (e) {
        // If we can't decode token, just use it anyway
        console.warn("Could not decode token, using as is:", e);
      }
      
      // Set Authorization header with the access token
      config.headers.Authorization = `Bearer ${accessToken}`;
      
      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Handle response errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    if (!originalRequest) {
      return Promise.reject(handleApiError(error));
    }
    
    // Check if error is due to expired token (401 Unauthorized)
    if (error.response?.status === 401 && 
        !originalRequest.headers?.['X-Retry-After-Refresh']) {
      
      const session = await getSession();
      if (!session?.user?.refreshToken) {
        return Promise.reject(new ApiError("No refresh token available", 401));
      }
      
      // If not already refreshing token, start refresh
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken(session.user.refreshToken);
      }
      
      try {
        // Wait for the refresh to complete
        const newToken = await refreshPromise;
        
        if (!newToken) {
          isRefreshing = false;
          refreshPromise = null;
          processPendingRequests(null);
          return Promise.reject(new ApiError("Failed to refresh token", 401));
        }
        
        // Create new request with refreshed token
        const newRequest = { ...originalRequest };
        if (newRequest.headers) {
          // Mark this request as retried to prevent infinite loops
          newRequest.headers['X-Retry-After-Refresh'] = 'true';
          newRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        
        isRefreshing = false;
        refreshPromise = null;
        processPendingRequests(newToken);
        
        // Retry the original request with new token
        return axios(newRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshPromise = null;
        processPendingRequests(null);
        return Promise.reject(refreshError instanceof Error ? refreshError : new Error('Unknown refresh error'));
      }
    }
    
    // For other errors, normalize and reject
    return Promise.reject(handleApiError(error));
  }
);

/**
 * Handles API errors by normalizing them into a consistent format
 */
export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status;
    const apiError = new ApiError(
      'API request failed',
      status
    );

    if (axiosError.response?.data) {
      const errorData = axiosError.response.data;
      
      // Build clean error details object
      const details: ApiErrorDetails = {};
      
      if (typeof errorData === 'object' && errorData !== null) {
        // Extract error details
        Object.entries(errorData).forEach(([key, value]) => {
          if (value !== undefined) {
            details[key] = value;
          }
        });
      }
      
      apiError.details = details;

      // Set appropriate error message
      if (errorData.detail) {
        apiError.message = String(errorData.detail);
      } else if (Object.keys(details).length > 0) {
        const fieldErrors = Object.entries(details)
          .filter(([key]) => key !== 'detail')
          .map(([field, errors]) => {
            const errorString = Array.isArray(errors) ? errors.join(', ') : String(errors);
            return `${field}: ${errorString}`;
          })
          .join('; ');
        
        apiError.message = fieldErrors || axiosError.message || 'API request failed';
      }
    }
    
    return apiError;
  }
  
  // Handle non-axios errors
  if (error instanceof ApiError) {
    return error;
  }
  
  return new ApiError(
    error instanceof Error ? error.message : 'Unknown error occurred'
  );
};

/**
 * Generic fetch function with error handling
 */
export async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await apiClient.get<T>(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw handleApiError(error);
  }
}

/**
 * Create resource
 */
export async function postData<T, U>(url: string, data: U): Promise<T> {
  try {
    const response = await apiClient.post<T>(url, data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Update resource with PUT
 */
export async function updateData<T, U>(url: string, data: U): Promise<T> {
  try {
    const response = await apiClient.put<T>(url, data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Partially update resource with PATCH
 */
export async function patchData<T, U>(url: string, data: U): Promise<T> {
  try {
    const response = await apiClient.patch<T>(url, data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Delete resource
 */
export async function deleteData(url: string): Promise<void> {
  try {
    await apiClient.delete(url);
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Upload file with multipart/form-data
 */
export async function uploadFile<T>(url: string, formData: FormData): Promise<T> {
  try {
    const response = await apiClient.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Download file from API
 */
export async function downloadFile(url: string, filename?: string): Promise<Blob> {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });
    
    // Handle file download
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] 
    });
    
    // If filename is provided, trigger browser download
    if (filename) {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    }
    
    return blob;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Create a request with custom configuration
 */
export async function customRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export default apiClient;