'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
// Import types from models file
import { 
  Job, 
  JobImage, 
  PreventiveMaintenance,
  PreventiveMaintenanceRequest
} from '@/app/lib/preventiveMaintenanceModels';

// Define frequency options within the component
const FREQUENCY_OPTIONS = [
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
  const [manualJobIdEntry, setManualJobIdEntry] = useState<boolean>(false);
  const [correctEndpoints, setCorrectEndpoints] = useState<{
    jobs: string | null;
    jobDetails: string | null;
  }>({
    jobs: null,
    jobDetails: null
  });

  // Helper function to get auth token
  const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  // Find correct API endpoints
  const findCorrectEndpoints = async (): Promise<void> => {
    setIsLoading(true);
    
    // List of possible job list endpoints based on Django API patterns
    const jobsEndpoints = [
      `${apiBaseUrl}/jobs/`,
      `${apiBaseUrl}/preventive-maintenance/jobs/`,
      `${apiBaseUrl}/maintenance/jobs/`,
      `${apiBaseUrl}/jobs/preventive-maintenance/`,
      `${apiBaseUrl}/jobs/list/`,
      `${apiBaseUrl}/preventive-maintenance/jobs/list/`
    ];
    
    let jobsFound = false;
    const token = getAuthToken();
    
    console.log('Attempting to discover correct API endpoints...');
    
    // Try each endpoint pattern until we find one that works
    for (const endpoint of jobsEndpoints) {
      if (jobsFound) break;
      
      try {
        console.log(`Trying jobs endpoint: ${endpoint}`);
        const response = await axios.get(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          timeout: 5000 // 5 second timeout for each attempt
        });
        
        // Check if the response contains job data
        let jobsData = null;
        
        if (response.data && typeof response.data === 'object') {
          if (Array.isArray(response.data)) {
            // Response is directly an array of jobs
            jobsData = response.data;
          } else if ('jobs' in response.data && Array.isArray(response.data.jobs)) {
            // Response has a 'jobs' property with an array
            jobsData = response.data.jobs;
          } else if ('results' in response.data && Array.isArray(response.data.results)) {
            // Response is paginated with a 'results' property
            jobsData = response.data.results;
          }
        }
        
        if (jobsData && jobsData.length > 0) {
          console.log(`Found ${jobsData.length} jobs using endpoint: ${endpoint}`);
          setAvailableJobs(jobsData);
          setCorrectEndpoints(prev => ({ ...prev, jobs: endpoint }));
          jobsFound = true;
          setError(null);
          break;
        }
      } catch (err) {
        console.log(`Endpoint ${endpoint} failed:`, err);
        // Continue to the next endpoint pattern
      }
    }
    
    if (!jobsFound) {
      console.error('All API endpoints failed for job list');
      setError('Failed to load available jobs. You can proceed by entering a job ID manually.');
      setManualJobIdEntry(true);
      setAvailableJobs([]);
    }
    
    setIsLoading(false);
  };

  // Fetch data when component mounts
  useEffect(() => {
    // Find the correct API endpoints
    findCorrectEndpoints();
    
    // If we're editing an existing PM record, fetch its data
    const fetchPMRecord = async (): Promise<void> => {
      if (!pmId) return;
      
      try {
        setIsLoading(true);
        const response = await axios.get(`${apiBaseUrl}/preventive-maintenance/${pmId}/`, {
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
          }
        });
        
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
      } catch (err: any) {
        console.error('Error fetching PM record:', err);
        setError('Failed to load maintenance record data');
      } finally {
        setIsLoading(false);
      }
    };
    
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
    
    // Try different job detail endpoints
    const jobDetailEndpoints = [
      `${apiBaseUrl}/jobs/${selectedJobId}/`,
      `${apiBaseUrl}/maintenance/jobs/${selectedJobId}/`,
      `${apiBaseUrl}/preventive-maintenance/jobs/${selectedJobId}/`
    ];
    
    // If we previously found a working endpoint, try a pattern based on that first
    if (correctEndpoints.jobs) {
      const baseEndpoint = correctEndpoints.jobs.endsWith('/') 
        ? correctEndpoints.jobs.slice(0, -1) 
        : correctEndpoints.jobs;
        
      // Insert the specific job ID before the trailing slash
      const parts = baseEndpoint.split('/');
      if (parts.length > 2) {
        // Try both with and without the trailing "list" segment
        const withoutList = parts[parts.length - 1] === 'list' 
          ? parts.slice(0, -1).join('/') 
          : baseEndpoint;
          
        jobDetailEndpoints.unshift(`${withoutList}/${selectedJobId}/`);
      }
    }
    
    let imagesFound = false;
    const token = getAuthToken();
    
    for (const endpoint of jobDetailEndpoints) {
      if (imagesFound || correctEndpoints.jobDetails) break;
      
      try {
        console.log(`Trying job detail endpoint: ${endpoint}`);
        const response = await axios.get(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        
        // Check for images in the response
        if (response.data) {
          if (response.data.images && Array.isArray(response.data.images)) {
            setAvailableImages(response.data.images);
            setCorrectEndpoints(prev => ({ ...prev, jobDetails: endpoint.replace(selectedJobId, '{id}') }));
            imagesFound = true;
            break;
          }
        }
      } catch (err) {
        console.log(`Failed to get job details from ${endpoint}`);
        // Continue to next endpoint
      }
    }
    
    // If we already know the correct endpoint pattern, use it
    if (correctEndpoints.jobDetails && !imagesFound) {
      const endpoint = correctEndpoints.jobDetails.replace('{id}', selectedJobId);
      try {
        const response = await axios.get(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        
        if (response.data && response.data.images && Array.isArray(response.data.images)) {
          setAvailableImages(response.data.images);
          imagesFound = true;
        }
      } catch (err) {
        console.log(`Failed to get images using known endpoint: ${endpoint}`);
      }
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
          submitData,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
            }
          }
        );
        setSuccessMessage('Preventive maintenance record updated successfully');
      } else {
        // Create new record
        response = await axios.post(
          `${apiBaseUrl}/preventive-maintenance/`, 
          submitData,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
            }
          }
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
          }
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
  
  // Toggle between dropdown and manual entry
  const toggleManualEntry = () => {
    setManualJobIdEntry(!manualJobIdEntry);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">
        {isEditMode ? 'Edit Preventive Maintenance' : 'Create Preventive Maintenance'}
      </h2>
      
      {error && (
        <div className={`border px-4 py-3 rounded mb-4 ${
          error.includes('You can proceed') 
            ? 'bg-yellow-100 border-yellow-400 text-yellow-700' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
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
          
          {!manualJobIdEntry && availableJobs.length > 0 ? (
            <>
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
                    {job.job_id} - {job.description ? job.description.substring(0, 50) + '...' : 'No description'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={toggleManualEntry}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Enter job ID manually instead
              </button>
            </>
          ) : (
            <>
              <input 
                type="text"
                id="job_id"
                name="job_id"
                value={formData.job_id}
                onChange={handleChange}
                required
                disabled={isLoading || (!!jobId && !isEditMode)}
                placeholder="Enter job ID"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the job ID manually. For example: "JOB-2023-001"
              </p>
              {availableJobs.length > 0 && (
                <button
                  type="button"
                  onClick={toggleManualEntry}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Select from job list instead
                </button>
              )}
            </>
          )}
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
      
      {/* API Debug Info - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-3 border border-gray-300 rounded bg-gray-50 text-xs font-mono">
          <h3 className="font-medium mb-1">Debug Information</h3>
          <p>API Base URL: {apiBaseUrl}</p>
          <p>Discovered Jobs Endpoint: {correctEndpoints.jobs || 'None'}</p>
          <p>Discovered Job Details Endpoint: {correctEndpoints.jobDetails || 'None'}</p>
          <p>Jobs Found: {availableJobs.length}</p>
          <p>Images Found: {availableImages.length}</p>
          <p>Manual Entry Mode: {manualJobIdEntry ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
}
