// PreventiveMaintenanceDetailPage.tsx (Server Component)

import { Suspense } from 'react';
import PreventiveMaintenanceClient from '@/app/dashboard/preventive-maintenance/[pm_id]/PreventiveMaintenanceClient'; // Ensure this path is correct
import { notFound } from 'next/navigation';
import { Topic } from '@/app/lib/types'; // Ensure this path is correct
import {
  PreventiveMaintenance,
  getMachineDetails
} from '@/app/lib/preventiveMaintenanceModels'; // Ensure this path is correct

// Import NextAuth.js utilities for server-side session
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth"

// Function to check if topics is a Topic[]
function isTopicArray(topics: Topic[] | number[]): topics is Topic[] {
  return topics.length === 0 || (topics.length > 0 && typeof topics[0] !== 'number');
}

// Helper function to handle machines array
function renderMachines(machines: any[] | null | undefined) {
  if (!machines || machines.length === 0) {
    return <p className="text-gray-500 italic">No machines assigned</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {machines.map((machine, index) => {
        const { id: machineId, name: machineName } = getMachineDetails(machine);
        return (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full"
          >
            {machineName ? `${machineName} (${machineId})` : machineId}
          </span>
        );
      })}
    </div>
  );
}

// MODIFIED Function to fetch Preventive Maintenance from API (Server Component)
async function getPreventiveMaintenance(pmId: string): Promise<PreventiveMaintenance | null> {
  console.log(`[SERVER_FETCH] Initiating fetch for PM ID: ${pmId}`);

  // 1. Get the server-side session
  const session = await getServerSession(authOptions);

  // 2. Extract the access token
  // Make sure your NextAuth callbacks populate session.user.accessToken
  const accessToken = session?.user?.accessToken as string | undefined;

  if (!accessToken) {
    console.error(`[SERVER_FETCH] No access token found in session for PM ID: ${pmId}. User might not be authenticated or token is missing in session.`);
    // For a protected route, typically you wouldn't proceed.
    // Throwing an error or returning null will lead to notFound() or an error boundary.
    return null; // Or throw new Error("Authentication required");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
                 (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site");
  const targetUrl = `${apiUrl}/api/preventive-maintenance/${pmId}/`;
  console.log(`[SERVER_FETCH] Fetching URL: ${targetUrl} with token.`);

  try {
    const response = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // 3. Include the Authorization header
      },
    });

    if (!response.ok) {
      console.error(`[SERVER_FETCH] API Error for PM ${pmId}: Status ${response.status} - ${response.statusText}`);
      if (response.status === 404) {
        return null;
      }
      // If it's 401, it means the token was rejected (e.g., expired and not refreshed server-side, or invalid)
      // A more advanced server-side flow might attempt a refresh here, but it's complex.
      // For now, a failed auth attempt will lead to an error.
      throw new Error(`Failed to fetch maintenance data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[SERVER_FETCH] Received maintenance data:", JSON.stringify(data, null, 2));
    return data as PreventiveMaintenance;
  } catch (error) {
    console.error(`[SERVER_FETCH] Exception while fetching maintenance data for ${pmId}:`, error);
    // Re-throw the error to be handled by Next.js (e.g., error page or notFound)
    throw error;
  }
}

// Define Params and SearchParams types
// Note: In Next.js App Router, props.params directly contains the route parameters.
// The Promise wrapping might be if you're using an older pattern or a specific library.
// For standard App Router, it's simpler:
// type PageProps = {
//   params: { pm_id: string };
//   searchParams?: { [key: string]: string | string[] | undefined };
// };
// For consistency with your provided code, I'll keep your types:
type Params = { pm_id: string }; // Simplified: `props.params` will be this type after awaiting.
type SearchParams = { [key: string]: string | string[] | undefined };

// Main Server Component
export default async function PreventiveMaintenanceDetailPage(props: {
  params: Promise<Params>; // If params is truly a promise
  searchParams: Promise<SearchParams>; // If searchParams is truly a promise
}) {
  // Await params if they are promises, otherwise access directly
  // Standard App Router: const pmId = props.params.pm_id;
  const awaitedParams = await props.params;
  // const awaitedSearchParams = await props.searchParams; // If you need them
  const pmId = awaitedParams.pm_id;

  let maintenanceData: PreventiveMaintenance | null = null;
  try {
    maintenanceData = await getPreventiveMaintenance(pmId);
  } catch (error: any) {
    console.error(`[PAGE_ERROR] Failed to load data for PM ${pmId}: ${error.message}`);
    // If getPreventiveMaintenance throws (e.g., for a 500 error or non-404/non-401 that we didn't handle as null),
    // this catch block will handle it. We can then decide to call notFound() or let Next.js show an error page.
    // If the error is critical and means data can't be shown, notFound() or a custom error display is appropriate.
  }

  if (!maintenanceData) {
    notFound(); // This will render the not-found.tsx file or a default 404 page
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        console.warn(`[formatDate] Invalid date string provided: ${dateString}`);
        return 'Invalid Date';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Preventive Maintenance Details</h1>

      {/* Basic info that doesn't need interactivity (Server Component) */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">{maintenanceData.pmtitle || 'N/A'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-600 text-sm">ID:</p>
            <p className="font-medium">{maintenanceData.pm_id}</p>
          </div>

          <div>
            <p className="text-gray-600 text-sm">Property ID:</p>
            <p className="font-medium">
              {maintenanceData.property_id ?
                (typeof maintenanceData.property_id === 'object' ?
                  JSON.stringify(maintenanceData.property_id) :
                  maintenanceData.property_id) :
                'Not assigned'}
            </p>
          </div>

          <div>
            <p className="text-gray-600 text-sm">Frequency:</p>
            <p className="font-medium">{maintenanceData.frequency || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Scheduled Date:</p>
            <p className="font-medium">
              {formatDate(maintenanceData.scheduled_date)}
            </p>
          </div>
          {maintenanceData.completed_date && (
            <div>
              <p className="text-gray-600 text-sm">Completed Date:</p>
              <p className="font-medium">
                {formatDate(maintenanceData.completed_date)}
              </p>
            </div>
          )}
          {maintenanceData.next_due_date && (
            <div>
              <p className="text-gray-600 text-sm">Next Due Date:</p>
              <p className="font-medium">
                {formatDate(maintenanceData.next_due_date)}
              </p>
            </div>
          )}

          <div>
            <p className="text-gray-600 text-sm">Status:</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              maintenanceData.completed_date
                ? 'bg-green-100 text-green-800'
                : new Date(maintenanceData.scheduled_date) < new Date() && !maintenanceData.completed_date // Ensure not completed if overdue
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}>
              {maintenanceData.completed_date
                ? 'Completed'
                : new Date(maintenanceData.scheduled_date) < new Date() && !maintenanceData.completed_date
                  ? 'Overdue'
                  : 'Scheduled'}
            </span>
          </div>
        </div>

        <div className="mt-6 mb-4">
          <h3 className="text-lg font-semibold mb-2">Associated Machines</h3>
          <div className="text-xs text-gray-400 mb-2">
            {maintenanceData.machines ?
              `Debug - Found ${maintenanceData.machines.length} machines` :
              'Debug - No machines data found'}
          </div>
          {renderMachines(maintenanceData.machines)}
        </div>

        {maintenanceData.notes && (
          <div className="mb-4">
            <p className="text-gray-600 text-sm">Notes:</p>
            <p className="whitespace-pre-wrap">{maintenanceData.notes}</p>
          </div>
        )}

        {maintenanceData.topics && maintenanceData.topics.length > 0 && (
          <div>
            <p className="text-gray-600 text-sm mb-1">Topics:</p>
            <div className="flex flex-wrap gap-2">
              {isTopicArray(maintenanceData.topics) ? (
                maintenanceData.topics.map((topic: Topic) => (
                  <span
                    key={topic.id}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {topic.title}
                  </span>
                ))
              ) : (
                (maintenanceData.topics as number[]).map((topicId: number) => (
                  <span
                    key={topicId}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    Topic ID: {topicId}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {(maintenanceData.before_image_url || maintenanceData.after_image_url) && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Maintenance Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {maintenanceData.before_image_url && (
                <div>
                  <p className="text-gray-600 text-sm mb-1">Before Image:</p>
                  <div className="h-48 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={maintenanceData.before_image_url}
                      alt="Before maintenance"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {maintenanceData.after_image_url && (
                <div>
                  <p className="text-gray-600 text-sm mb-1">After Image:</p>
                  <div className="h-48 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={maintenanceData.after_image_url}
                      alt="After maintenance"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Suspense fallback={<div className="text-center py-4">Loading interactive components...</div>}>
        <PreventiveMaintenanceClient maintenanceData={maintenanceData} />
      </Suspense>
    </div>
  );
}