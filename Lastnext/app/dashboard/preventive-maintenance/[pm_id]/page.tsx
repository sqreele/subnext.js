import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import PreventiveMaintenanceClient from './PreventiveMaintenanceClient';
import { notFound } from 'next/navigation';
import { Topic } from '@/app/lib/types';
import { 
  PreventiveMaintenance, 
  determinePMStatus,
  getImageUrl
} from '@/app/lib/preventiveMaintenanceModels';

// Create a reusable function for generating mock data
const createMockData = (pmId: string): PreventiveMaintenance => ({
    pm_id: `mock-${pmId}`,
    pmtitle: `Mock Maintenance ${pmId}`,
    scheduled_date: new Date().toISOString(),
    frequency: 'monthly',
    property_id: '1',
    topics: [],
    completed_date: null,
    next_due_date: null,
    notes: 'This is mock data due to API connectivity issues.',
    before_image: null,
    after_image: null,
    before_image_url: null,
    after_image_url: null,
    custom_days: null
});

// Function to fetch Preventive Maintenance data from API (Server Component)
async function getPreventiveMaintenance(pmId: string): Promise<PreventiveMaintenance | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pmcs.site';
    console.log(`Fetching data from: ${apiUrl}/api/preventive-maintenance/${pmId}/`);
    
    const MAX_RETRIES = 1;
    let retries = 0;
    let response;
    
    while (retries <= MAX_RETRIES) {
      try {
        response = await fetch(`${apiUrl}/api/preventive-maintenance/${pmId}/`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        break;
      } catch (err) {
        retries++;
        if (retries > MAX_RETRIES) throw err;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    if (!response || !response.ok) {
      if (response && response.status === 404) {
        return null;
      }
      
      console.error(`API Error: Status ${response?.status}`);
      
      if (response && (response.status === 500 || response.status === 401 || response.status === 403)) {
        console.warn('Using mock data due to server error or authentication issue');
        return createMockData(pmId);
      }
      
      const errorText = response ? await response.text() : 'No response';
      throw new Error(`Failed to fetch maintenance data: ${response?.statusText || 'No response'}. Details: ${errorText}`);
    }

    const data = await response.json();
    console.log('API data received');
    return data;
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    console.warn('Using mock data due to fetch error');
    return createMockData(pmId);
  }
}

// Function to check if topics is Topic[]
function isTopicArray(topics: Topic[] | number[]): topics is Topic[] {
  return topics.length === 0 || (topics.length > 0 && typeof topics[0] !== 'number');
}

// Reusable warning component for mock data
const MockDataWarning = () => (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-yellow-800">Warning: Using Fallback Data</h3>
        <div className="mt-2 text-sm text-yellow-700">
          <p>There was an error connecting to the server. The data shown is placeholder data. Some functionality may be limited.</p>
          <p className="mt-2"><Link href="/dashboard/preventive-maintenance" className="font-medium underline">Return to maintenance list</Link></p>
        </div>
      </div>
    </div>
  </div>
);

// Error display component
const ErrorDisplay = () => (
  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">ไม่สามารถโหลดข้อมูลได้</h3>
        <div className="mt-2 text-sm text-red-700">
          <p>เกิดข้อผิดพลาดในการดึงข้อมูลการบำรุงรักษา กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ</p>
          <p className="mt-2"><Link href="/dashboard/preventive-maintenance" className="font-medium underline">กลับไปยังรายการทั้งหมด</Link></p>
        </div>
      </div>
    </div>
  </div>
);

// Define Props type manually to handle Promise params
type Props = {
  params: Promise<{ pm_id: string }>;
  searchParams: { [key: string]: string | string[] | undefined };
};

// Page function with Next.js 14 App Router pattern
export default async function Page({ params, searchParams }: Props) {
  try {
    // Await params since it is a Promise
    const pmId = (await params).pm_id;
    
    console.log('Fetching maintenance data for PM ID:', pmId);
    const maintenanceData = await getPreventiveMaintenance(pmId);

    if (!maintenanceData) {
      console.log('Maintenance data not found, showing 404 page');
      notFound();
    }

    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
        return new Date(dateString).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (err) {
        return dateString || 'N/A';
      }
    };

    const status = determinePMStatus(maintenanceData);

    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'completed':
          return { text: 'เสร็จสิ้น', className: 'bg-green-100 text-green-800' };
        case 'overdue':
          return { text: 'เลยกำหนด', className: 'bg-red-100 text-red-800' };
        case 'pending':
          return { text: 'รอดำเนินการ', className: 'bg-yellow-100 text-yellow-800' };
        default:
          return { text: status, className: 'bg-gray-100 text-gray-800' };
      }
    };

    const statusConfig = getStatusConfig(status);
    const isMockData = maintenanceData.pm_id.toString().startsWith('mock');

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Preventive Maintenance Details</h1>
        
        {isMockData && <MockDataWarning />}
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">{maintenanceData.pmtitle || 'Untitled Maintenance'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-600 text-sm">ID:</p>
              <p className="font-medium">{maintenanceData.pm_id}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Frequency:</p>
              <p className="font-medium">{maintenanceData.frequency}
                {maintenanceData.custom_days ? ` (${maintenanceData.custom_days} days)` : ''}
              </p>
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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                {statusConfig.text}
              </span>
            </div>
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
        </div>

        <PreventiveMaintenanceClient maintenanceData={maintenanceData} />
      </div>
    );
  } catch (error) {
    console.error('Error in Page function:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorDisplay />
      </div>
    );
  }
}

// Metadata generation with proper typing for Next.js 14
export async function generateMetadata(
  { params }: { params: Promise<{ pm_id: string }> }
): Promise<Metadata> {
  try {
    const pmId = (await params).pm_id;
    const maintenanceData = await getPreventiveMaintenance(pmId);
    
    if (!maintenanceData) {
      return {
        title: 'Maintenance Not Found',
      };
    }
    
    return {
      title: `${maintenanceData.pmtitle || 'Maintenance'} - Details`,
      description: `Details for preventive maintenance ${maintenanceData.pm_id}`,
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      title: 'Maintenance Details - Error',
    };
  }
}