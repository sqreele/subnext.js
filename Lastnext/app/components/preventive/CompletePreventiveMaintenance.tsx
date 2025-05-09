'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePreventiveMaintenance } from '@/app/lib/PreventiveContext';
import { PreventiveMaintenance, MaintenanceImage } from '@/app/lib/preventiveMaintenanceModels';
import { PreventiveMaintenanceCompleteRequest } from '@/app/lib/PreventiveMaintenanceService';

interface CompletePreventiveMaintenanceProps {
  params: {
    id?: string;
  };
}

export default function CompletePreventiveMaintenance({ params }: CompletePreventiveMaintenanceProps): JSX.Element {
  const router = useRouter();
  const pmId = params?.id;
  
  // Use context for state management and actions
  const { 
    selectedMaintenance,
    isLoading,
    error,
    fetchMaintenanceById,
    completeMaintenance,
    clearError
  } = usePreventiveMaintenance();

  // Local state
  const [completionData, setCompletionData] = useState<PreventiveMaintenanceCompleteRequest>({
    completed_date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDThh:mm
    notes: '',
    after_image_id: null,
    before_image_id: null
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch maintenance record
  useEffect(() => {
    if (pmId) {
      fetchMaintenanceById(pmId);
    }
  }, [pmId, fetchMaintenanceById]);

  // Pre-populate form when data is loaded
  useEffect(() => {
    if (selectedMaintenance) {
      // Pre-populate notes if any exist
      if (selectedMaintenance.notes) {
        setCompletionData(prev => ({
          ...prev,
          notes: selectedMaintenance.notes || ''
        }));
      }
      
      // If already completed, show message
      if (selectedMaintenance.completed_date) {
        setSuccessMessage('This maintenance task has already been completed.');
      }
      
      // Pre-populate image IDs if available
      if (selectedMaintenance.before_image?.id) {
        setCompletionData(prev => ({
          ...prev,
          before_image_id: selectedMaintenance.before_image?.id || null
        }));
      }
      if (selectedMaintenance.after_image?.id) {
        setCompletionData(prev => ({
          ...prev,
          after_image_id: selectedMaintenance.after_image?.id || null
        }));
      }
    }
  }, [selectedMaintenance]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    
    // Handle special case for image selection
    if (name === 'after_image_id' || name === 'before_image_id') {
      setCompletionData(prev => ({
        ...prev,
        [name]: value ? Number(value) : null
      }));
    } else {
      setCompletionData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!pmId) return;
    
    setIsSubmitting(true);
    clearError();
    
    try {
      const result = await completeMaintenance(pmId, completionData);
      
      if (result) {
        setSuccessMessage('Maintenance task completed successfully!');
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/preventive-maintenance/${pmId}`);
        }, 2000);
      } else {
        throw new Error('Failed to complete maintenance task');
      }
    } catch (err: any) {
      console.error('Error completing maintenance task:', err);
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

  // Helper function to get image URL
  const getImageUrl = (image: MaintenanceImage | string | null | undefined): string | null => {
    if (!image) return null;
    
    // First try to get direct URL property
    if (typeof image === 'object' && 'image_url' in image && image.image_url) {
      return image.image_url;
    }
    
    // If no direct URL but we have an ID, construct URL
    if (typeof image === 'object' && 'id' in image && image.id) {
      return `/api/images/${image.id}`;
    }
    
    // If image is just a string URL
    if (typeof image === 'string') {
      return image;
    }
    
    return null;
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

  if (!selectedMaintenance) {
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
      
      {/* Maintenance Details Summary */}
      {selectedMaintenance && !selectedMaintenance.completed_date && !successMessage && (
        <div className="bg-white shadow overflow-hidden rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              Task: {selectedMaintenance.pm_id}
            </h3>
            <p className="mt-1 text-md text-gray-700">
              <span className="font-medium">Title:</span> {selectedMaintenance.pmtitle || 'No title provided'}
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Scheduled Date</dt>
                <dd className="mt-1 text-md text-gray-900">
                  {formatDate(selectedMaintenance.scheduled_date)}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Frequency</dt>
                <dd className="mt-1 text-md text-gray-900">
                  <span className="capitalize">{selectedMaintenance.frequency.replace('_', ' ')}</span>
                </dd>
              </div>
              
              {selectedMaintenance.next_due_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Next Due Date</dt>
                  <dd className="mt-1 text-md text-gray-900">
                    {formatDate(selectedMaintenance.next_due_date)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
      
      {/* Completion Form */}
      {selectedMaintenance && !selectedMaintenance.completed_date && !successMessage && (
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
            
            {/* Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Before Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Before Image
                </label>
                <div className="mt-1 h-40 border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  {selectedMaintenance.before_image || selectedMaintenance.before_image_url ? (
                    <img 
                      src={selectedMaintenance.before_image_url || getImageUrl(selectedMaintenance.before_image) || ''}
                      alt="Before maintenance" 
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm text-gray-500">No before image available</span>
                  )}
                </div>
              </div>
              
              {/* After Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  After Image
                </label>
                <div className="mt-1 h-40 border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  {selectedMaintenance.after_image || selectedMaintenance.after_image_url ? (
                    <img 
                      src={selectedMaintenance.after_image_url || getImageUrl(selectedMaintenance.after_image) || ''}
                      alt="After maintenance" 
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm text-gray-500">No after image uploaded yet</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  To add an after image, first upload it on the details page, then come back to complete the task.
                </p>
              </div>
            </div>
            
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
      {selectedMaintenance && selectedMaintenance.completed_date && (
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
              Completed on: {formatDate(selectedMaintenance.completed_date)}
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {selectedMaintenance.notes && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700">Completion Notes:</h4>
                <p className="mt-1 text-sm text-gray-600">{selectedMaintenance.notes}</p>
              </div>
            )}
            
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