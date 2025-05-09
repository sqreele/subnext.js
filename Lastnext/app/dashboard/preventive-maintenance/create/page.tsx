'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PreventiveMaintenanceProvider } from '@/app/lib/PreventiveContext';
import PreventiveMaintenanceForm from '@/app/components/preventive/PreventiveMaintenanceForm';
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

// Create page content component that doesn't require context
function CreatePageContent() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Handle successful form submission
  const handleSuccess = (data: PreventiveMaintenance) => {
    setIsSubmitted(true);
    // Redirect after a short delay to show success message
    setTimeout(() => {
      router.push(`/dashboard/preventive-maintenance/${data.pm_id}`);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Preventive Maintenance</h1>
        <Link 
          href="/dashboard/preventive-maintenance" 
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
          onSuccessAction={handleSuccess}
        />
      )}
    </div>
  );
}

// Main page component that provides the context
// We're providing the context for future compatibility
// even though the current form doesn't use it yet
export default function CreatePreventiveMaintenancePage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <PreventiveMaintenanceProvider>
        <CreatePageContent />
      </PreventiveMaintenanceProvider>
    </div>
  );
}