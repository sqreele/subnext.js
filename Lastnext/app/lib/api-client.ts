// ./app/lib/api-client.ts
"use client";

import axios from "axios";
import { getSession } from "next-auth/react";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://pmcs.site",
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.user?.accessToken) {
    config.headers.Authorization = `Bearer ${session.user.accessToken}`;
  }
  return config;
});

// Generic fetch function
export async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await apiClient.get(url);
    return response.data as T; // Return parsed data directly
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error; // Let caller handle the error
  }
}

// Other CRUD functions (unchanged for brevity)
export async function postData<T, U>(url: string, data: U): Promise<T> {
  const response = await apiClient.post(url, data);
  return response.data as T;
}

export async function updateData<T, U>(url: string, data: U): Promise<T> {
  const response = await apiClient.put(url, data);
  return response.data as T;
}

export async function deleteData(url: string): Promise<void> {
  await apiClient.delete(url);
}

export async function patchData<T, U>(url: string, data: U): Promise<T> {
  const response = await apiClient.patch(url, data);
  return response.data as T;
}

export default apiClient;
