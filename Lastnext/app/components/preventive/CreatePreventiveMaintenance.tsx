'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PreventiveMaintenanceForm from '@/app/components/preventive/PreventiveMaintenanceForm';
// Import the type from your models
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

export default function CreatePreventiveMaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
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
        <h1 className="text-2xl font-bold text-gray-900">Create Preventive Maintenance</h1>
        <Link 
          href="/preventive-maintenance" 
          className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
        >
          Back to List
        </Link>
      </div>

      {isSubmitted ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Preventive maintenance created successfully! Redirecting...
        </div>
      ) : (
        <PreventiveMaintenanceForm
          jobId={jobId}
          onSuccessAction={handleSuccess} // Changed from onSuccess to onSuccessAction to match your updated form component
          apiBaseUrl="/api/v1"
        />
      )}
    </div>
  );
}
