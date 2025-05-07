'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PreventiveMaintenanceForm from '@/app/components/preventive/PreventiveMaintenanceForm';
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';
import preventiveMaintenanceService from '@/app/lib/PreventiveMaintenanceService';

interface EditPreventiveMaintenanceProps {
  params: {
    id: string;
  };
  searchParams: {
    complete?: string;
  };
}

export default function EditPreventiveMaintenancePage({ 
  params, 
  searchParams 
}: EditPreventiveMaintenanceProps) {
  const router = useRouter();
  const pmId = params?.id;
  const isCompletionMode = searchParams?.complete === 'true';
  
  const [initialData, setInitialData] = useState<PreventiveMaintenance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Fetch maintenance data
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      if (!pmId) return;

      setIsLoading(true);
      try {
        const data = await preventiveMaintenanceService.getPreventiveMaintenanceById(pmId);
        setInitialData(data);
        
        // If completion mode is enabled but task is already completed, redirect
        if (isCompletionMode && data.completed_date) {
          router.push(`/preventive-maintenance/${pmId}`);
        }
      } catch (err: any) {
        console.error('Error fetching maintenance data:', err);
        setError(err.message || 'Failed to load maintenance data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceData();
  }, [pmId, isCompletionMode, router]);

  // Handle successful form submission
  const handleSuccess = (data: PreventiveMaintenance) => {
    setIsSubmitted(true);
    // Redirect after a short delay to show success message
    setTimeout(() => {
      router.push(`/preventive-maintenance/${data.pm_id}`);
    }, 1500);
  };

  // Determine page title based on mode
  const pageTitle = isCompletionMode 
    ? 'Complete Preventive Maintenance'
    : 'Edit Preventive Maintenance';

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <Link 
            href={`/preventive-maintenance/${pmId}`}
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            Back to Details
          </Link>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading maintenance data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <Link 
            href="/preventive-maintenance"
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            Back to List
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        <Link 
          href={`/preventive-maintenance/${pmId}`}
          className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
        >
          Back to Details
        </Link>
      </div>

      {isSubmitted ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {isCompletionMode 
            ? 'Maintenance task completed successfully! Redirecting...'
            : 'Maintenance task updated successfully! Redirecting...'
          }
        </div>
      ) : isCompletionMode ? (
        // If in completion mode, render the completion form
        <div className="bg-white shadow-md rounded-lg p-6">
          {/* Note: You would replace this with your CompletePreventiveMaintenance component */}
          <p className="text-center text-gray-700">
            The completion form would be shown here.
            <br />
            To complete this implementation, replace this with your CompletePreventiveMaintenance component
            and pass the necessary props.
          </p>
        </div>
      ) : (
        // If in edit mode, render the maintenance form with initial data
        <PreventiveMaintenanceForm
          pmId={pmId}
          initialData={initialData}
          onSuccessAction={handleSuccess}
        />
      )}
    </div>
  );
}