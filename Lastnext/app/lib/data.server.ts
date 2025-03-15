// app/lib/data.server.ts
import { Job, Property, JobStatus, Room } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site");

async function fetchWithToken<T>(
  url: string,
  token?: string,
  method: string = 'GET',
  body?: any
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
  };
  
  if (method !== 'GET' && body) {
    options.body = JSON.stringify(body);
  }

  console.log(`${method} ${url}`, options);
  
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(
      "Response Status:",
      response.status,
      "Preview:",
      responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText
    );
    
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json") && responseText) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.detail || `Request failed with status ${response.status}`);
        } catch (parseError) {
          // If parsing fails, use the raw response text
        }
      }
      throw new Error(`Request failed with status ${response.status}: ${responseText}`);
    }
    
    if (!responseText.trim()) {
      return ([] as unknown) as T;
    }
    
    try {
      return JSON.parse(responseText) as T;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new Error(`Failed to parse response as JSON: ${responseText.substring(0, 200)}...`);
    }
  } catch (networkError) {
    console.error(`Error during ${method} request to ${url}:`, networkError);
    throw networkError;
  }
}

// Existing functions (unchanged for brevity)
export async function fetchProperties(accessToken?: string): Promise<Property[]> {
  try {
    return await fetchWithToken<Property[]>(`${API_BASE_URL}/api/properties/`, accessToken);
  } catch (error) {
    console.error("Error fetching properties:", error);
    return [];
  }
}

export async function fetchJobsForProperty(
  propertyId: string,
  accessToken?: string
): Promise<Job[]> {
  try {
    return await fetchWithToken<Job[]>(`${API_BASE_URL}/api/jobs/?property=${propertyId}`, accessToken);
  } catch (error) {
    console.error(`Error fetching jobs for property ${propertyId}:`, error);
    return [];
  }
}

export async function fetchJobs(accessToken?: string): Promise<Job[]> {
  try {
    return await fetchWithToken<Job[]>(`${API_BASE_URL}/api/jobs/`, accessToken);
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    return [];
  }
}

export async function fetchJob(
  jobId: string,
  accessToken?: string
): Promise<Job | null> {
  try {
    return await fetchWithToken<Job>(`${API_BASE_URL}/api/jobs/${jobId}/`, accessToken);
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    return null;
  }
}

export async function updateJob(
  jobId: string,
  jobData: Partial<Job>,
  accessToken?: string
): Promise<Job> {
  try {
    return await fetchWithToken<Job>(`${API_BASE_URL}/api/jobs/${jobId}/`, accessToken, 'PATCH', jobData);
  } catch (error) {
    console.error(`Error updating job ${jobId}:`, error);
    throw error;
  }
}

export async function deleteJob(
  jobId: string,
  accessToken?: string
): Promise<void> {
  try {
    await fetchWithToken<void>(`${API_BASE_URL}/api/jobs/${jobId}/`, accessToken, 'DELETE');
  } catch (error) {
    console.error(`Error deleting job ${jobId}:`, error);
    throw error;
  }
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  accessToken?: string
): Promise<Job> {
  try {
    return await fetchWithToken<Job>(`${API_BASE_URL}/api/jobs/${jobId}/`, accessToken, 'PATCH', { status });
  } catch (error) {
    console.error(`Error updating status for job ${jobId}:`, error);
    throw error;
  }
}

export async function fetchMyJobs(accessToken?: string): Promise<Job[]> {
  try {
    return await fetchWithToken<Job[]>(`${API_BASE_URL}/api/jobs/my-jobs/`, accessToken);
  } catch (error) {
    console.error("Error fetching my jobs:", error);
    return [];
  }
}

export async function fetchRoom(
  roomId: string,
  accessToken?: string
): Promise<Room | null> {
  try {
    return await fetchWithToken<Room>(`${API_BASE_URL}/api/rooms/${roomId}/`, accessToken);
  } catch (error) {
    console.error(`Error fetching room ${roomId}:`, error);
    return null;
  }
}

// New function to fetch jobs for a room
export async function fetchJobsForRoom(
  roomId: string,
  accessToken?: string
): Promise<Job[]> {
  try {
    return await fetchWithToken<Job[]>(`${API_BASE_URL}/api/jobs/?room=${roomId}`, accessToken);
  } catch (error) {
    console.error(`Error fetching jobs for room ${roomId}:`, error);
    return [];
  }
}
