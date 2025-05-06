'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PreventiveMaintenanceForm from '@/app/components/preventive/PreventiveMaintenanceForm';
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

// For Next.js App Router page components
type PageProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function EditPreventiveMaintenancePage({ params, searchParams }: PageProps) {
  const router = useRouter();
  const pmId = params.id;
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!pmId) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: Missing preventive maintenance ID
        </div>
        <div className="mt-4">
          <Link 
            href="/preventive-maintenance" 
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  // Handle successful form submission
  const handleSuccess = (data: PreventiveMaintenance) => {
    setIsSubmitted(true);
    // Redirect after a short delay to show success message
    setTimeout(() => {
      router.push(`/preventive-maintenance/${data.pm_id}`);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Preventive Maintenance</h1>
        <div className="flex space-x-4">
          <Link 
            href={`/preventive-maintenance/${pmId}`} 
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            View Details
          </Link>
          <Link 
            href="/preventive-maintenance" 
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            Back to List
          </Link>
        </div>
      </div>

      {isSubmitted ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Preventive maintenance updated successfully! Redirecting...
        </div>
      ) : (
        <PreventiveMaintenanceForm
          pmId={pmId}
          onSuccessAction={handleSuccess}
          apiBaseUrl="/api/v1"
        />
      )}
    </div>
  );
}