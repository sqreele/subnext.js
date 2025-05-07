'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

export default function CompletePreventiveMaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pmId = searchParams.get('id');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Add the proper type to the data parameter
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
        <h1 className="text-2xl font-bold text-gray-900">Complete Preventive Maintenance</h1>
        <Link 
          href="/preventive-maintenance" 
          className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
        >
          Back to List
        </Link>
      </div>

      {isSubmitted ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Preventive maintenance completed successfully! Redirecting...
        </div>
      ) : (
        pmId ? (
          <div className="bg-white shadow-md rounded-lg p-6">
            {/* The CompletePreventiveMaintenance component should be rendered by the route
                using the params from the dynamic route segment, not passed directly here */}
            <p className="text-center text-lg py-4">
              Loading maintenance completion form...
            </p>
            <div className="text-center py-2">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600"></div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            No maintenance ID provided. Please select a maintenance task to complete.
          </div>
        )
      )}
    </div>
  );
}