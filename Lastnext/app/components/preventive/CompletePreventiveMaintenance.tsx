'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PreventiveMaintenance, 
  JobImage,
  CompletePMRequest
} from '@/app/lib/preventiveMaintenanceModels';
import preventiveMaintenanceService from '@/app/lib/PreventiveMaintenanceService';

interface CompletePreventiveMaintenanceProps {
  params: {
    id?: string;
  };
}

export default function CompletePreventiveMaintenance({ params }: CompletePreventiveMaintenanceProps): JSX.Element {
  const router = useRouter();
  const pmId = params?.id;
  
  const [maintenanceData, setMaintenanceData] = useState<PreventiveMaintenance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<CompletePMRequest>({
    completed_date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDThh:mm
    notes: '',
    after_image_id: null
  });
  const [availableImages, setAvailableImages] = useState<JobImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch maintenance record and available images
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (!pmId) return;
      
      setIsLoading(true);
      try {
        // Get maintenance record
        const data = await preventiveMaintenanceService.getPreventiveMaintenanceById(pmId);
        setMaintenanceData(data);
        
        // Pre-populate notes if any exist
        if (data.notes) {
          setCompletionData(prev => ({
            ...prev,
            notes: data.notes || ''
          }));
        }
        
        // If already completed, show message
        if (data.completed_date) {
          setSuccessMessage('This maintenance task has already been completed.');
          return;
        }
        
        // Fetch job images if we have a job ID
        const jobId = typeof data.job === 'object' && data.job ? 
        data.job.job_id : 
        (typeof data.job === 'string' ? data.job : null);
        if (jobId) {
          try {
            const jobResponse = await preventiveMaintenanceService.getPreventiveMaintenanceJobs({
              job_id: jobId
            });
            
            let jobData;
            if (Array.isArray(jobResponse)) {
              jobData = jobResponse.find(job => job.job_id === jobId);
            } else if (jobResponse.jobs && Array.isArray(jobResponse.jobs)) {
              jobData = jobResponse.jobs.find(job => job.job_id === jobId);
            }
            
            if (jobData && jobData.images) {
              setAvailableImages(jobData.images);
            }
          } catch (err) {
            console.error('Error fetching job images:', err);
          }
        }
      } catch (err: any) {
        console.error('Error fetching maintenance record:', err);
        setError(err.message || 'Failed to load the maintenance record');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [pmId]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setCompletionData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!pmId) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Convert the CompletePMRequest to the format expected by the service
      const requestData = {
        completed_date: completionData.completed_date,
        notes: completionData.notes || '',
        after_image_id: completionData.after_image_id || null
      };
      
      const response = await preventiveMaintenanceService.completePreventiveMaintenance(
        pmId, 
        requestData
      );
      
      setMaintenanceData(response);
      setSuccessMessage('Maintenance task completed successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/preventive-maintenance/${pmId}`);
      }, 2000);
    } catch (err: any) {
      console.error('Error completing maintenance task:', err);
      setError(err.message || 'Failed to complete the maintenance task');
      setIsSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <div className="mt-4">
          <Link 
            href={`/preventive-maintenance/${pmId}`} 
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            Back to Details
          </Link>
        </div>
      </div>
    );
  }

  if (!maintenanceData) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          No data found for this preventive maintenance record.
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

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Complete Preventive Maintenance
        </h1>
        <div className="flex space-x-3">
          <Link 
            href={`/preventive-maintenance/${pmId}`} 
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            Back to Details
          </Link>
        </div>
      </div>
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      {/* Job Details Summary */}
      {maintenanceData && !maintenanceData.completed_date && !successMessage && (
        <div className="bg-white shadow overflow-hidden rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              Task: {maintenanceData.pm_id}
            </h3>
            <p className="mt-1 text-md text-gray-700">
              <span className="font-medium">Job ID:</span> {typeof maintenanceData.job === 'object' ? maintenanceData.job?.job_id : maintenanceData.job}
            </p>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {maintenanceData.job_details?.description || 'No description provided'}
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Scheduled Date</dt>
                <dd className="mt-1 text-md text-gray-900">
                  {formatDate(maintenanceData.scheduled_date)}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Frequency</dt>
                <dd className="mt-1 text-md text-gray-900">
                  <span className="capitalize">{maintenanceData.frequency.replace('_', ' ')}</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
      
      {/* Completion Form */}
      {maintenanceData && !maintenanceData.completed_date && !successMessage && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Completion Details</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter details about the completed maintenance task.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {/* Completion Date */}
            <div className="mb-4">
              <label htmlFor="completed_date" className="block text-sm font-medium text-gray-700 mb-1">
                Completion Date and Time
              </label>
              <input
                type="datetime-local"
                id="completed_date"
                name="completed_date"
                value={completionData.completed_date}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Notes */}
            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Completion Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={completionData.notes || ''}
                onChange={handleInputChange}
               
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any notes about the completed maintenance task..."
              />
            </div>
            
            {/* After Image Selection */}
            {availableImages.length > 0 && (
              <div className="mb-4">
                <label htmlFor="after_image_id" className="block text-sm font-medium text-gray-700 mb-1">
                  After Image (Optional)
                </label>
                <select
                  id="after_image_id"
                  name="after_image_id"
                  value={completionData.after_image_id || ''}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {availableImages.map(img => (
                    <option key={img.id} value={img.id}>
                      Image {img.id} - {new Date(img.uploaded_at).toLocaleString()}
                    </option>
                  ))}
                </select>
                
                {completionData.after_image_id && (
                  <div className="mt-2">
                    <img 
                      src={availableImages.find(img => img.id === Number(completionData.after_image_id))?.image_url} 
                      alt="Selected after image" 
                      className="h-32 object-cover rounded"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Submit Button */}
            <div className="flex justify-end space-x-3 mt-6">
              <Link 
                href={`/preventive-maintenance/${pmId}`}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Mark as Completed'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Already Completed Message */}
      {maintenanceData && maintenanceData.completed_date && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-green-50">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">
                This maintenance task has already been completed
              </h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Completed on: {formatDate(maintenanceData.completed_date)}
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <p className="text-center py-4">
              <Link 
                href={`/preventive-maintenance/${pmId}`}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                View Details
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}