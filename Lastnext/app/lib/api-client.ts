// ./app/lib/api-client.ts
"use client";

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getSession, signOut } from "next-auth/react"; // Added signOut
import { jwtDecode } from "jwt-decode";

// Define token structure
interface JwtToken {
  exp?: number;
  user_id?: string;
  [key: string]: any;
}

// Define error interfaces for DRF style errors
export interface ApiErrorDetails {
  detail?: string; // General error message
  [key: string]: any; // Field-specific errors (e.g., "email": ["Enter a valid email."])
}

// Custom Error class
export class ApiError extends Error {
  status?: number;
  details?: ApiErrorDetails;

  constructor(message: string, status?: number, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    // Maintain prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Create API client instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site"), // Ensure your production URL is correct
  timeout: 15000, // 15 second timeout
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json", // Explicitly accept JSON
  }
});

// --- Token Refresh Logic ---
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
const pendingRequests: Array<(token: string | null) => void> = [];

// Function to process queued requests after token refresh attempt
const processPendingRequests = (token: string | null): void => {
  pendingRequests.forEach(callback => callback(token));
  pendingRequests.length = 0; // Clear the queue
};

// Function to attempt token refresh
async function refreshToken(refreshTokenValue: string): Promise<string | null> {
  try {
    console.log("[Auth] Attempting to refresh access token...");
    // Use standard fetch or a separate axios instance to avoid interceptor loops
    const response = await fetch(`${apiClient.defaults.baseURL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshTokenValue }),
    });

    if (!response.ok) {
       // If refresh fails (e.g., 401 Unauthorized), log out user
       if (response.status === 401) {
            console.error("[Auth] Refresh token failed or expired. Logging out.");
            await signOut({ redirect: false }); // Sign out without redirecting immediately
            // Optionally redirect after sign out: window.location.href = '/auth/signin';
       }
       throw new ApiError(`Token refresh failed with status: ${response.status}`, response.status);
    }

    const refreshedTokens = await response.json();
    if (!refreshedTokens.access) {
      throw new Error('Refresh response did not contain access token');
    }

    console.log("[Auth] Token refreshed successfully.");

    // **IMPORTANT:** Update the session or local storage with the new tokens if needed.
    // This part depends heavily on how your NextAuth session is managed and updated after a refresh.
    // You might need to trigger a session update via NextAuth's update method if available,
    // or handle this within the NextAuth adapter/callbacks.
    // Example (conceptual - needs integration with your NextAuth setup):
    // const session = await getSession();
    // if (session) {
    //    await update({ ...session, user: { ...session.user, accessToken: refreshedTokens.access } });
    // }

    return refreshedTokens.access; // Return only the new access token
  } catch (error) {
    console.error('[Auth] Error during token refresh:', error);
    // Ensure logout if refresh truly fails critically
     if (error instanceof ApiError && error.status === 401) {
          // Already handled above, but double-check logic
     } else {
        // For other errors during refresh, maybe don't log out immediately?
        // Depends on desired behavior.
     }
    return null; // Indicate refresh failure
  }
}

// --- Axios Interceptors ---

// Request Interceptor: Add token, handle expiry before sending
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip interceptor logic for token refresh endpoint itself
    if (config.url?.includes('/api/token/refresh/')) {
        console.log("[RequestInterceptor] Skipping token logic for refresh request.");
        return config;
    }

    const session = await getSession();
    const accessToken = session?.user?.accessToken;
    const refreshTokenValue = session?.user?.refreshToken;

    if (!accessToken) {
      console.log("[RequestInterceptor] No access token found in session.");
      // Depending on the endpoint, you might want to reject the request or let it proceed without auth
      return config; // Allow request without auth for now
    }

    try {
      const decoded = jwtDecode<JwtToken>(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);

      // Check if token is expired (add a small buffer, e.g., 60 seconds)
      const buffer = 60;
      if (decoded.exp && decoded.exp < currentTime + buffer) {
        console.log("[RequestInterceptor] Access token expired or needs refresh.");

        if (!refreshTokenValue) {
            console.error("[RequestInterceptor] Access token expired, but no refresh token available. Logging out.");
            await signOut({ redirect: false });
            throw new ApiError("Session expired, no refresh token.", 401);
        }

        // If a refresh is already happening, queue this request
        if (isRefreshing && refreshPromise) {
          console.log("[RequestInterceptor] Token refresh in progress, queueing request.");
          return new Promise<InternalAxiosRequestConfig>((resolve) => {
            pendingRequests.push((newToken) => {
              if (newToken) {
                console.log("[RequestInterceptor] Applying refreshed token to queued request.");
                config.headers.Authorization = `Bearer ${newToken}`;
              } else {
                console.warn("[RequestInterceptor] No new token after refresh for queued request.");
                // Decide how to handle - reject? proceed without token?
                // For now, we proceed but Authorization might be invalid or missing
                delete config.headers.Authorization;
              }
              resolve(config);
            });
          });
        }

        // Start the token refresh process
        console.log("[RequestInterceptor] Initiating token refresh.");
        isRefreshing = true;
        refreshPromise = refreshToken(refreshTokenValue); // Assign promise

        try {
            const newToken = await refreshPromise; // Wait for refresh result
            isRefreshing = false; // Reset flag
            refreshPromise = null; // Clear promise

            processPendingRequests(newToken); // Process queue with new token (or null)

            if (newToken) {
                console.log("[RequestInterceptor] Applying newly refreshed token to current request.");
                config.headers.Authorization = `Bearer ${newToken}`;
            } else {
                console.error("[RequestInterceptor] Token refresh failed, request might fail or proceed without auth.");
                // Decide how to handle - reject? proceed without token?
                 delete config.headers.Authorization; // Remove invalid token
                 // Consider throwing error here to stop the original request if refresh fails critically
                 // throw new ApiError("Session refresh failed.", 401);
            }
        } catch (refreshError) {
            console.error("[RequestInterceptor] Catch block for refreshPromise error:", refreshError);
            isRefreshing = false;
            refreshPromise = null;
            processPendingRequests(null); // Process queue signaling failure
             // Decide how to handle - reject? proceed without token?
             delete config.headers.Authorization; // Remove invalid token
             // Throw error to prevent original request from proceeding with expired token
             throw new ApiError("Session refresh failed.", 401);
        }

        return config; // Return config with potentially updated token
      }

      // Token is valid, just add it
      // console.log("[RequestInterceptor] Token valid, adding to header.");
      config.headers.Authorization = `Bearer ${accessToken}`;

    } catch (e) {
      console.error("[RequestInterceptor] Error decoding token or in interceptor logic:", e);
      // If decoding fails, maybe token is invalid? Handle accordingly.
      // await signOut({ redirect: false });
      // throw new ApiError("Invalid session token.", 401);
       // For now, let the request proceed without a valid token check or potentially with old token
       if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`; // Add potentially invalid token
       }
    }

    return config;
  },
  (error) => {
      console.error("[RequestInterceptor] Request setup error:", error);
      return Promise.reject(error); // Reject promise on request setup error
  }
);


// Response Interceptor: Handle specific errors like 401 for retries
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
      // Directly return successful responses
      return response;
  },
  async (error: AxiosError) => {
    // This interceptor primarily focuses on retrying after a 401 due to an expired token
    // that might have slipped past the request interceptor check (race condition, clock skew).
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }; // Add _retry flag

    // Check if it's a 401 error and not already a retry
    if (error.response?.status === 401 && !originalRequest?._retry) {
        console.log("[ResponseInterceptor] Received 401, attempting token refresh and retry.");
        originalRequest._retry = true; // Mark as retry

        const session = await getSession();
        if (!session?.user?.refreshToken) {
            console.error("[ResponseInterceptor] 401 received, but no refresh token available. Logging out.");
            await signOut({ redirect: false });
            // Reject with a specific error the caller can check
            return Promise.reject(new ApiError("Session expired or invalid.", 401));
        }

        // If not already refreshing, start the refresh
        if (!isRefreshing) {
            console.log("[ResponseInterceptor] Initiating token refresh on 401.");
            isRefreshing = true;
            refreshPromise = refreshToken(session.user.refreshToken);
        } else {
             console.log("[ResponseInterceptor] Token refresh already in progress, waiting...");
        }

        try {
            const newToken = await refreshPromise; // Wait for potentially ongoing refresh
            isRefreshing = false; // Reset state
            refreshPromise = null;
            processPendingRequests(newToken); // Process any queued requests

            if (!newToken) {
                console.error("[ResponseInterceptor] Token refresh failed after 401. Cannot retry request.");
                 await signOut({ redirect: false }); // Logout if refresh fails definitively
                 return Promise.reject(new ApiError("Session refresh failed.", 401));
            }

            // Update the header of the original request config for retry
            if (originalRequest.headers) {
                console.log("[ResponseInterceptor] Retrying original request with new token.");
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }

            // Retry the request using the modified original config
            return apiClient(originalRequest);

        } catch (refreshError) {
            console.error("[ResponseInterceptor] Error during token refresh attempt after 401:", refreshError);
            isRefreshing = false;
            refreshPromise = null;
            processPendingRequests(null);
            // Logout if refresh fails definitively
             await signOut({ redirect: false });
             return Promise.reject(new ApiError("Session refresh failed.", 401));
        }
    }

    // For all other errors (non-401, or already retried 401), normalize and reject
    console.error("[ResponseInterceptor] Unhandled error or retry failed:", error);
    // Use handleApiError to create a structured ApiError before rejecting
    return Promise.reject(handleApiError(error));
  }
);

/**
 * Handles API errors by normalizing them into a consistent ApiError format
 */
export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorDetails>; // Use ApiErrorDetails for response data type
    const status = axiosError.response?.status;
    const errorData = axiosError.response?.data;
    let message = axiosError.message; // Default message
    let details: ApiErrorDetails | undefined = undefined;

    if (errorData) {
        if (typeof errorData.detail === 'string') {
             message = errorData.detail; // Use DRF detail message
             // Keep other fields in details if they exist alongside detail
             details = { ...errorData };
        } else if (typeof errorData === 'object' && errorData !== null) {
             // Assume it's a DRF field error object
             details = { ...errorData };
             // Create a summary message from field errors if no detail message
             const fieldErrors = Object.entries(details)
                 // .filter(([key]) => key !== 'detail') // Keep detail if present
                 .map(([field, errors]) => {
                     const errorString = Array.isArray(errors) ? errors.join(', ') : String(errors);
                     return `${field}: ${errorString}`;
                 })
                 .join('; ');

             if (fieldErrors && message === axiosError.message) { // Only override default message if field errors exist
                 message = `Validation Failed: ${fieldErrors}`;
             }
        } else if (typeof errorData === 'string') {
           // Handle cases where error data is just a string
           message = errorData;
        }
    }

    console.error(`[handleApiError] Axios Error: Status=${status}, Message=${message}`, "Details:", details, "Original Error:", error);
    return new ApiError(message, status, details);

  } else if (error instanceof ApiError) {
     // If it's already an ApiError, just return it
     console.error(`[handleApiError] Caught ApiError: Status=${error.status}, Message=${error.message}`, "Details:", error.details);
     return error;
  } else if (error instanceof Error) {
     // Handle standard JavaScript errors
     console.error(`[handleApiError] Generic Error: Message=${error.message}`, error);
     return new ApiError(error.message); // Wrap in ApiError
  } else {
     // Handle other types of thrown values
     console.error('[handleApiError] Unknown error type:', error);
     return new ApiError('An unknown error occurred');
  }
};

/**
 * Generic fetch function using apiClient and consistent error handling
 */
export async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await apiClient.get<T>(url);
    // ** DEBUG LOG ADDED **
    console.log(`[fetchData] Response for ${url}: Status=${response.status}`, response.data); // <<< THIS LOG IS KEY
    // ...
    return response.data;
  } catch (error) {
    console.error(`[fetchData] Error caught for ${url}. Propagating processed error.`);
    throw handleApiError(error);
  }
}

/**
 * Generic POST function
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
 * Generic PUT function
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
 * Generic PATCH function
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
 * Generic DELETE function
 */
export async function deleteData(url: string): Promise<void> {
  try {
    await apiClient.delete(url);
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Upload file using multipart/form-data
 */
export async function uploadFile<T>(url: string, formData: FormData): Promise<T> {
  try {
    const response = await apiClient.post<T>(url, formData, {
      // Axios usually sets Content-Type correctly for FormData
      // headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Download file from API (returns Blob)
 */
export async function downloadFile(url: string, filename?: string): Promise<Blob> {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: response.headers['content-type']
    });

    // Trigger browser download if filename is provided
    if (filename && typeof window !== 'undefined') { // Check for window object
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link); // Required for Firefox
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    }

    return blob;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Make a request with custom Axios configuration
 */
export async function customRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Export the configured Axios instance
export default apiClient;