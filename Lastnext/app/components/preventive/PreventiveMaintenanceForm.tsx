'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
// Import all types from models file instead of service file
import { 
  Job, 
  JobImage, 
  PreventiveMaintenance,
  PreventiveMaintenanceRequest
} from '@/app/lib/preventiveMaintenanceModels';

interface FrequencyOption {
  value: string;
  label: string;
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom' }
];

interface PreventiveMaintenanceFormProps {
  jobId?: string | null;
  pmId?: string | null;
  onSuccessAction?: (data: PreventiveMaintenance) => void;
  apiBaseUrl?: string;
}

export default function PreventiveMaintenanceForm({ 
  jobId = null, 
  pmId = null, 
  onSuccessAction,
  apiBaseUrl = '/api/v1'
}: PreventiveMaintenanceFormProps): JSX.Element {
  const router = useRouter();
  const isEditMode = !!pmId;
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<PreventiveMaintenanceRequest>({
    job_id: jobId || '',
    scheduled_date: '',
    frequency: 'monthly',
    custom_days: null,
    notes: '',
    before_image_id: null,
    after_image_id: null
  });
  
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [availableImages, setAvailableImages] = useState<JobImage[]>([]);

  // Fetch data when component mounts
  useEffect(() => {
    // Fetch available jobs for dropdown
    const fetchJobs = async (): Promise<void> => {
      try {
        const response = await axios.get(`${apiBaseUrl}/maintenance/jobs/preventive-maintenance/`);
        const jobsData = response.data.jobs || response.data;
        setAvailableJobs(jobsData);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load available jobs');
      }
    };

    // If we're editing an existing PM record, fetch its data
    const fetchPMRecord = async (): Promise<void> => {
      if (!pmId) return;
      
      try {
        setIsLoading(true);
        const response = await axios.get(`${apiBaseUrl}/preventive-maintenance/${pmId}/`);
        
        // Format date for input field (YYYY-MM-DDThh:mm)
        const scheduledDate = new Date(response.data.scheduled_date);
        const formattedDate = scheduledDate.toISOString().slice(0, 16);
        
        setFormData({
          job_id: response.data.job?.job_id || '',
          scheduled_date: formattedDate,
          frequency: response.data.frequency || 'monthly',
          custom_days: response.data.custom_days || null,
          notes: response.data.notes || '',
          before_image_id: response.data.before_image?.id || null,
          after_image_id: response.data.after_image?.id || null
        });
        
        // If we have a job_id, fetch images for that job
        if (response.data.job?.job_id) {
          fetchJobImages(response.data.job.job_id);
        }
      } catch (err) {
        console.error('Error fetching PM record:', err);
        setError('Failed to load maintenance record data');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fetch all required data
    fetchJobs();
    if (isEditMode) {
      fetchPMRecord();
    } else if (jobId) {
      // If creating new PM for a specific job, fetch its images
      fetchJobImages(jobId);
    }
  }, [pmId, jobId, isEditMode, apiBaseUrl]);

  // Fetch job images when job is selected
  const fetchJobImages = async (selectedJobId: string): Promise<void> => {
    if (!selectedJobId) return;
    
    try {
      const response = await axios.get(`${apiBaseUrl}/maintenance/jobs/${selectedJobId}/`);
      if (response.data && response.data.images) {
        setAvailableImages(response.data.images);
      }
    } catch (err) {
      console.error('Error fetching job images:', err);
    }
  };

  // Handle input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    
    if (name === 'job_id' && value !== formData.job_id) {
      // When job changes, fetch its images
      fetchJobImages(value);
    }
    
    setFormData((prev: PreventiveMaintenanceRequest) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Prepare data for submission
      const submitData = {
        ...formData
      };
      
      // Remove empty values
      Object.keys(submitData).forEach(key => {
        if (submitData[key as keyof typeof submitData] === '') {
          (submitData[key as keyof typeof submitData] as any) = null;
        }
      });

      let response;
      
      if (isEditMode) {
        // Update existing record
        response = await axios.put(
          `${apiBaseUrl}/preventive-maintenance/${pmId}/`, 
          submitData
        );
        setSuccessMessage('Preventive maintenance record updated successfully');
      } else {
        // Create new record
        response = await axios.post(
          `${apiBaseUrl}/preventive-maintenance/`, 
          submitData
        );
        setSuccessMessage('Preventive maintenance record created successfully');
        
        // Reset form if not redirecting
        if (!onSuccessAction) {
          setFormData({
            job_id: jobId || '',
            scheduled_date: '',
            frequency: 'monthly',
            custom_days: null,
            notes: '',
            before_image_id: null,
            after_image_id: null
          });
        }
      }

      // Handle success callback or redirect
      if (onSuccessAction && typeof onSuccessAction === 'function') {
        onSuccessAction(response.data);
      }

    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.response?.data?.detail || 'An error occurred while saving the record');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PM completion
  const handleComplete = async (): Promise<void> => {
    if (!pmId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${apiBaseUrl}/preventive-maintenance/${pmId}/complete/`,
        {
          completed_date: new Date().toISOString(),
          notes: formData.notes,
          after_image_id: formData.after_image_id || null
        }
      );
      
      setSuccessMessage('Preventive maintenance task marked as completed');
      
      // Handle success callback
      if (onSuccessAction && typeof onSuccessAction === 'function') {
        onSuccessAction(response.data);
      }
    } catch (err: any) {
      console.error('Error marking task as complete:', err);
      setError(err.response?.data?.detail || 'An error occurred while completing the task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">
        {isEditMode ? 'Edit Preventive Maintenance' : 'Create Preventive Maintenance'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job Selection */}
        <div>
          <label htmlFor="job_id" className="block text-sm font-medium text-gray-700 mb-1">
            Maintenance Job
          </label>
          <select
            id="job_id"
            name="job_id"
            value={formData.job_id}
            onChange={handleChange}
            required
            disabled={isLoading || (!!jobId && !isEditMode)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a Job</option>
            {availableJobs.map(job => (
              <option key={job.job_id} value={job.job_id}>
                {job.job_id} - {job.description.substring(0, 50)}...
              </option>
            ))}
          </select>
        </div>
        
        {/* Scheduled Date */}
        <div>
          <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
            Scheduled Date
          </label>
          <input
            type="datetime-local"
            id="scheduled_date"
            name="scheduled_date"
            value={formData.scheduled_date}
            onChange={handleChange}
            required
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Frequency */}
        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
            Frequency
          </label>
          <select
            id="frequency"
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            required
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FREQUENCY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Custom Days (only visible when frequency is 'custom') */}
        {formData.frequency === 'custom' && (
          <div>
            <label htmlFor="custom_days" className="block text-sm font-medium text-gray-700 mb-1">
              Custom Days Between Maintenance
            </label>
            <input
              type="number"
              id="custom_days"
              name="custom_days"
              value={formData.custom_days || ''}
              onChange={handleChange}
              required
              disabled={isLoading}
              min="1"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        
        {/* Before Image (if any images available) */}
        {availableImages.length > 0 && (
          <div>
            <label htmlFor="before_image_id" className="block text-sm font-medium text-gray-700 mb-1">
              Before Image (Optional)
            </label>
            <select
              id="before_image_id"
              name="before_image_id"
              value={formData.before_image_id || ''}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {availableImages.map(img => (
                <option key={img.id} value={img.id}>
                  Image {img.id} - {new Date(img.uploaded_at).toLocaleString()}
                </option>
              ))}
            </select>
            
            {formData.before_image_id && (
              <div className="mt-2">
                <img 
                  src={availableImages.find(img => img.id === Number(formData.before_image_id))?.image_url} 
                  alt="Before" 
                  className="h-32 object-cover rounded"
                />
              </div>
            )}
          </div>
        )}
        
        {/* After Image (if any images available and in edit mode) */}
        {isEditMode && availableImages.length > 0 && (
          <div>
            <label htmlFor="after_image_id" className="block text-sm font-medium text-gray-700 mb-1">
              After Image (Optional)
            </label>
            <select
              id="after_image_id"
              name="after_image_id"
              value={formData.after_image_id || ''}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {availableImages.map(img => (
                <option key={img.id} value={img.id}>
                  Image {img.id} - {new Date(img.uploaded_at).toLocaleString()}
                </option>
              ))}
            </select>
            
            {formData.after_image_id && (
              <div className="mt-2">
                <img 
                  src={availableImages.find(img => img.id === Number(formData.after_image_id))?.image_url} 
                  alt="After" 
                  className="h-32 object-cover rounded"
                />
              </div>
            )}
          </div>
        )}
        
        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            disabled={isLoading}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update Record' : 'Create Record'}
          </button>
          
          {isEditMode && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isLoading}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Mark as Completed'}
            </button>
          )}
          
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isLoading}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}