'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PreventiveMaintenanceForm from '@/app/components/preventive/PreventiveMaintenanceForm'; // Assuming this path is correct
import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels'; // Assuming this path is correct
import preventiveMaintenanceService from '@/app/lib/PreventiveMaintenanceService'; // Assuming this path is correct

// This interface correctly defines the props for a Next.js app router page
// The error "Type 'EditPreventiveMaintenanceProps' does not satisfy the constraint 'PageProps'"
// means there's an external type 'PageProps' with an incompatible 'params' definition (expecting Promise<any>).
// The fix is to find and correct that external 'PageProps' definition, not to change this interface
// to match an incorrect expectation.
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
  const pmId = params?.id; // Correctly accessing id from params
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
          router.push(`/dashboard/preventive-maintenance/${pmId}`); // Adjusted redirect path assuming it's within dashboard
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
      router.push(`/dashboard/preventive-maintenance/${data.pm_id}`); // Adjusted redirect path
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
            href={`/dashboard/preventive-maintenance/${pmId}`} // Adjusted link path
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
            href="/dashboard/preventive-maintenance" // Adjusted link path
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
          href={`/dashboard/preventive-maintenance/${pmId}`} // Adjusted link path
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
          {/* Placeholder for completion UI.
            You would typically have a dedicated component or form fields here
            for completing the maintenance task.
            For example, you might use a simplified version of PreventiveMaintenanceForm
            or a new component like 'CompletePreventiveMaintenanceForm'.
          */}
        
          <p className="mb-6">Please confirm completion details and submit.</p>
          {/* Example: If PreventiveMaintenanceForm can handle completion, you might reuse it:
            <PreventiveMaintenanceForm
              pmId={pmId!}
              initialData={initialData}
              onSuccessAction={handleSuccess}
              isCompletionMode={true} // Add a prop to handle completion logic in the form
            />
            Otherwise, implement specific completion UI here.
          */}
           <div className="text-center text-gray-700 border-2 border-dashed border-gray-300 p-4">
             <p className="font-bold">Completion Form Area</p>
             <p>Replace this with your actual completion form or fields.</p>
             <p>You might need to call a service like `preventiveMaintenanceService.completeTask(pmId, completionData)`.</p>
             <button 
                onClick={() => {
                    // Dummy completion logic for example
                    console.log("Attempting to complete task:", pmId);
                    // Replace with actual API call and success handling
                    // For example:
                    // preventiveMaintenanceService.completeTask(pmId, { completed_date: new Date(), notes: "Completed" })
                    //  .then(updatedData => handleSuccess(updatedData))
                    //  .catch(err => setError("Failed to complete task."));
                    alert("Completion logic to be implemented. This would typically submit data and then call handleSuccess.");
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
                Confirm Completion (Example)
            </button>
           </div>
        </div>
      ) : (
        // If in edit mode, render the maintenance form with initial data
        <PreventiveMaintenanceForm
          pmId={pmId!} // pmId should be defined if not loading and no error
          initialData={initialData} // initialData could be null if fetch failed, though error state handles that
          onSuccessAction={handleSuccess}
        />
      )}
    </div>
  );
}