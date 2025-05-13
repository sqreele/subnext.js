// preventive-maintenance/[pm_id]/page.tsx

import { Suspense } from 'react';
import PreventiveMaintenanceClient from './PreventiveMaintenanceClient';
import { notFound } from 'next/navigation';
import { Topic } from '@/app/lib/types';
import { 
  PreventiveMaintenance, 
  determinePMStatus,
  getImageUrl
} from '@/app/lib/preventiveMaintenanceModels';

// ฟังก์ชันเพื่อดึงข้อมูล Preventive Maintenance จาก API (Server Component)
async function getPreventiveMaintenance(pmId: string): Promise<PreventiveMaintenance | null> {
  try {
    // เปลี่ยนเป็น URL ของ API ของคุณ
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pmcs.site';
    const response = await fetch(`${apiUrl}/api/preventive-maintenance/${pmId}/`, {
      cache: 'no-store', // หรือใช้ { next: { revalidate: 60 } } เพื่อ revalidate ทุก 60 วินาที
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // ถ้า response ไม่สำเร็จ (เช่น 404, 500)
      if (response.status === 404) {
        return null; // จะเรียกใช้ notFound() ในภายหลัง
      }
      throw new Error(`Failed to fetch maintenance data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    throw error;
  }
}

// ฟังก์ชันตรวจสอบว่า topics เป็น Topic[] หรือไม่
function isTopicArray(topics: Topic[] | number[]): topics is Topic[] {
  return topics.length === 0 || (topics.length > 0 && typeof topics[0] !== 'number');
}

// Server Component หลัก
export default async function PMDetailPage({ params }: { params: { pm_id: string } }) {
  // ดึงข้อมูลใน Server Component
  const pmId = params.pm_id;
  const maintenanceData = await getPreventiveMaintenance(pmId);

  // ถ้าไม่พบข้อมูล ให้แสดง 404 page
  if (!maintenanceData) {
    notFound();
  }

  // Format dates nicely with a utility function
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ใช้ฟังก์ชันจาก model เพื่อหาสถานะ
  const status = determinePMStatus(maintenanceData);

  // Map สถานะเป็นภาษาไทยและกำหนดสี
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Preventive Maintenance Details</h1>
      
      {/* ข้อมูลพื้นฐานที่ไม่ต้องการ interactivity (Server Component) */}
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
          
          {/* Add status indicator */}
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
              {/* ตรวจสอบประเภทของ topics และแสดงผลตามนั้น */}
              {isTopicArray(maintenanceData.topics) ? (
                // ถ้าเป็น Topic[]
                maintenanceData.topics.map((topic: Topic) => (
                  <span 
                    key={topic.id} 
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {topic.title}
                  </span>
                ))
              ) : (
                // ถ้าเป็น number[] (topic IDs)
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

      {/* Suspense สำหรับ loading state ของ Client Component */}
      <Suspense fallback={<div className="text-center py-4">Loading interactive components...</div>}>
        {/* Client Component สำหรับส่วนที่ต้องการ interactivity */}
        <PreventiveMaintenanceClient maintenanceData={maintenanceData} />
      </Suspense>
    </div>
  );
}

// Metadata generation
export async function generateMetadata({ params }: { params: { pm_id: string } }) {
  const pmId = params.pm_id;
  let maintenanceData;
  
  try {
    maintenanceData = await getPreventiveMaintenance(pmId);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      title: 'Maintenance Details - Error',
    };
  }
  
  if (!maintenanceData) {
    return {
      title: 'Maintenance Not Found',
    };
  }
  
  return {
    title: `${maintenanceData.pmtitle || 'Maintenance'} - Details`,
    description: `Details for preventive maintenance ${maintenanceData.pm_id}`,
  };
}