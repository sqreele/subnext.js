// Fix for the Server Component (PreventiveMaintenanceDetailPage.tsx)

import { Suspense } from 'react';
import PreventiveMaintenanceClient from '@/app/dashboard/preventive-maintenance/[pm_id]/PreventiveMaintenanceClient';
import { notFound } from 'next/navigation';
import { Topic } from '@/app/lib/types';
import { 
  PreventiveMaintenance,
  getMachineDetails 
} from '@/app/lib/preventiveMaintenanceModels';

// Function to check if topics is a Topic[]
function isTopicArray(topics: Topic[] | number[]): topics is Topic[] {
  return topics.length === 0 || (topics.length > 0 && typeof topics[0] !== 'number');
}

// Helper function to handle machines array - FIXED
function renderMachines(machines: any[] | null | undefined) {
  if (!machines || machines.length === 0) {
    return <p className="text-gray-500 italic">No machines assigned</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {machines.map((machine, index) => {
        // Use helper function for consistent machine details
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

// Function to fetch Preventive Maintenance from API (Server Component)
async function getPreventiveMaintenance(pmId: string): Promise<PreventiveMaintenance | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pmcs.site';
    const response = await fetch(`${apiUrl}/api/preventive-maintenance/${pmId}/`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch maintenance data: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Received maintenance data:", JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    throw error;
  }
}

// Define Params and SearchParams types
type Params = Promise<{ pm_id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Main Server Component
export default async function PreventiveMaintenanceDetailPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const pmId = params.pm_id;
  const maintenanceData = await getPreventiveMaintenance(pmId);

  if (!maintenanceData) {
    notFound();
  }

  // Format dates nicely with a utility function
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Preventive Maintenance Details</h1>
      
      {/* Basic info that doesn't need interactivity (Server Component) */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">{maintenanceData.pmtitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-600 text-sm">ID:</p>
            <p className="font-medium">{maintenanceData.pm_id}</p>
          </div>
          
          {/* FIXED: Property ID display with more robust handling */}
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
          
          {/* Add status indicator */}
          <div>
            <p className="text-gray-600 text-sm">Status:</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              maintenanceData.completed_date 
                ? 'bg-green-100 text-green-800' 
                : new Date(maintenanceData.scheduled_date) < new Date() 
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}>
              {maintenanceData.completed_date 
                ? 'Completed' 
                : new Date(maintenanceData.scheduled_date) < new Date()
                  ? 'Overdue'
                  : 'Scheduled'}
            </span>
          </div>
        </div>
        
        {/* Add Associated Machines section - FIXED */}
        <div className="mt-6 mb-4">
          <h3 className="text-lg font-semibold mb-2">Associated Machines</h3>
          {/* Debug output to see what data is coming in */}
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
                maintenanceData.topics.map((topicId: number) => (
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
        
        {/* Display Before/After Images if available */}
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

      {/* Suspense for loading state of Client Component */}
      <Suspense fallback={<div className="text-center py-4">Loading interactive components...</div>}>
        {/* Client Component for parts that need interactivity */}
        <PreventiveMaintenanceClient maintenanceData={maintenanceData} />
      </Suspense>
    </div>
  );
}