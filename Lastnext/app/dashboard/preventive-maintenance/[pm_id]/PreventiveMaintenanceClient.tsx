// app/dashboard/preventive-maintenance/[pm_id]/PreventiveMaintenanceClient.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { 
  PreventiveMaintenance, 
  getImageUrl 
} from '@/app/lib/preventiveMaintenanceModels';
import { AlertCircle, X, ZoomIn } from 'lucide-react';

interface PreventiveMaintenanceClientProps {
  maintenanceData: PreventiveMaintenance;
}

export default function PreventiveMaintenanceClient({ maintenanceData }: PreventiveMaintenanceClientProps) {
  const { data: session, status } = useSession();  
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentImageAlt, setCurrentImageAlt] = useState<string>('');

  // ฟังก์ชันสำหรับการยืนยันการลบ
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this maintenance record?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/preventive-maintenance/${maintenanceData.pm_id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to delete maintenance record');
      }

      router.push('/dashboard/preventive-maintenance');
      router.refresh(); // Refresh the Next.js cache
    } catch (err: any) {
      console.error('Error deleting maintenance:', err);
      setError(err.message || 'An error occurred while deleting');
    } finally {
      setIsLoading(false);
    }
  };

  // ใช้ฟังก์ชัน getImageUrl จาก models
  const getBeforeImageUrl = (): string | null => {
    // ถ้ามี URL โดยตรงให้ใช้ URL นั้น
    if (maintenanceData.before_image_url) {
      return maintenanceData.before_image_url;
    }
    
    // ถ้าไม่มี URL โดยตรงแต่มี object before_image ให้ใช้ฟังก์ชัน getImageUrl
    if (maintenanceData.before_image) {
      return getImageUrl(maintenanceData.before_image);
    }
    
    return null;
  };

  const getAfterImageUrl = (): string | null => {
    // ถ้ามี URL โดยตรงให้ใช้ URL นั้น
    if (maintenanceData.after_image_url) {
      return maintenanceData.after_image_url;
    }
    
    // ถ้าไม่มี URL โดยตรงแต่มี object after_image ให้ใช้ฟังก์ชัน getImageUrl
    if (maintenanceData.after_image) {
      return getImageUrl(maintenanceData.after_image);
    }
    
    return null;
  };

  // Open image in modal for better viewing
  const openImageModal = (imageUrl: string | null, altText: string) => {
    if (!imageUrl) return;
    setCurrentImage(imageUrl);
    setCurrentImageAlt(altText);
    setIsImageModalOpen(true);
  };

  // Close image modal
  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setCurrentImage(null);
  };

  // ตัวแปรสำหรับ URL รูปภาพ
  const beforeImageUrl = getBeforeImageUrl();
  const afterImageUrl = getAfterImageUrl();

  return (
    <>
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Images</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {beforeImageUrl ? (
            <div>
              <p className="text-gray-600 text-sm mb-2">Before Maintenance:</p>
              <div 
                className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden cursor-pointer group"
                onClick={() => openImageModal(beforeImageUrl, 'Before Maintenance')}
              >
                <img
                  src={beforeImageUrl}
                  alt="Before Maintenance"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all duration-200">
                  <div className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-75 rounded-full p-2 transition-opacity">
                    <ZoomIn className="h-6 w-6 text-gray-800" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-48 bg-gray-100 rounded-md">
              <p className="text-gray-500 italic">No before image</p>
            </div>
          )}

          {afterImageUrl ? (
            <div>
              <p className="text-gray-600 text-sm mb-2">After Maintenance:</p>
              <div 
                className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden cursor-pointer group"
                onClick={() => openImageModal(afterImageUrl, 'After Maintenance')}
              >
                <img
                  src={afterImageUrl}
                  alt="After Maintenance"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all duration-200">
                  <div className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-75 rounded-full p-2 transition-opacity">
                    <ZoomIn className="h-6 w-6 text-gray-800" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-48 bg-gray-100 rounded-md">
              <p className="text-gray-500 italic">No after image</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Link
            href="/dashboard/preventive-maintenance"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
          >
            Back to List
          </Link>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Link
              href={`/dashboard/preventive-maintenance/edit/${maintenanceData.pm_id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Image modal */}
      {isImageModalOpen && currentImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-screen w-full h-full flex items-center justify-center">
            <button 
              className="absolute top-4 right-4 bg-white rounded-full p-2 z-10 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                closeImageModal();
              }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img 
              src={currentImage} 
              alt={currentImageAlt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}