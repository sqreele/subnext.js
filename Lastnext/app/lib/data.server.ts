import { Job, Property, JobStatus, Room } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site");

async function fetchWithToken<T>(
  url: string,
  token?: string,
  method: string = "GET",
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

  if (method !== "GET" && body) {
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
      responseText.length > 200 ? responseText.substring(0, 200) + "..." : responseText
    );

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = `Request failed with status ${response.status}: ${responseText}`;
      if (contentType?.includes("application/json") && responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error JSON:", parseError);
        }
      }
      throw new Error(errorMessage);
    }

    if (!responseText.trim()) {
      // Handle empty response based on expected type
      if (method === "GET" && url.includes("/api/jobs") && !url.includes("/my-jobs/")) {
        return [] as unknown as T; // Reasonable for job lists
      }
      throw new Error("Received empty response from server");
    }

    try {
      return JSON.parse(responseText) as T;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new Error(`Failed to parse response as JSON: ${responseText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error(`Error during ${method} request to ${url}:`, error);
    throw error; // Let the caller decide how to handle it
  }
}

// API Functions
export async function fetchProperties(accessToken?: string): Promise<Property[]> {
  return fetchWithToken<Property[]>(`${API_BASE_URL}/api/properties/`, accessToken);
}

export async function fetchJobsForProperty(
  propertyId: string,
  accessToken?: string
): Promise<Job[]> {
  return fetchWithToken<Job[]>(`${API_BASE_URL}/api/jobs/?property=${propertyId}`, accessToken);
}

export async function fetchJobs(accessToken?: string): Promise<Job[]> {
  return fetchWithToken<Job[]>(`${API_BASE_URL}/api/jobs/`, accessToken);
}

export async function fetchJob(jobId: string, accessToken?: string): Promise<Job | null> {
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
  return fetchWithToken<Job>(`${API_BASE_URL}/api/jobs/${jobId}/`, accessToken, "PATCH", jobData);
}

export async function deleteJob(jobId: string, accessToken?: string): Promise<void> {
  await fetchWithToken<void>(`${API_BASE_URL}/api/jobs/${jobId}/`, accessToken, "DELETE");
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  accessToken?: string
): Promise<Job> {
  return fetchWithToken<Job>(`${API_BASE_URL}/api/jobs/${jobId}/`, accessToken, "PATCH", { status });
}

export async function fetchMyJobs(accessToken?: string): Promise<Job[]> {
  return fetchWithToken<Job[]>(`${API_BASE_URL}/api/jobs/my-jobs/`, accessToken);
}

export async function fetchRoom(roomId: string, accessToken?: string): Promise<Room | null> {
  try {
    return await fetchWithToken<Room>(`${API_BASE_URL}/api/rooms/${roomId}/`, accessToken);
  } catch (error) {
    console.error(`Error fetching room ${roomId}:`, error);
    return null;
  }
}

export async function fetchJobsForRoom(roomId: string, accessToken?: string): Promise<Job[]> {
  return fetchWithToken<Job[]>(`${API_BASE_URL}/api/jobs/?room=${roomId}`, accessToken);
}