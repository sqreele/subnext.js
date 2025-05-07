'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PreventiveMaintenance, 
  PreventiveMaintenanceRequest,
  FREQUENCY_OPTIONS,
  validateFrequency,
  Topic,
  MaintenanceJobData
} from '@/app/lib/preventiveMaintenanceModels';
import preventiveMaintenanceService from '@/app/lib/PreventiveMaintenanceService';
import api from '@/app/lib/api-client';

interface PreventiveMaintenanceFormProps {
  pmId?: string | null;
  onSuccessAction: (data: PreventiveMaintenance) => void;
  apiBaseUrl?: string;
  initialData?: PreventiveMaintenance | null;
}

const PreventiveMaintenanceForm: React.FC<PreventiveMaintenanceFormProps> = ({
  pmId,
  onSuccessAction,
  initialData,
}) => {
  const { data: session } = useSession();
  
  // State for available jobs and topics
  const [availableJobs, setAvailableJobs] = useState<MaintenanceJobData[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<{
    scheduled_date: string;
    frequency: string;
    custom_days: number | null;
    notes: string;
    before_image_id: number | null;
    after_image_id: number | null;
    before_image_file?: File | null;
    after_image_file?: File | null;
    selected_topics: number[];
  }>({
    scheduled_date: formatDateForInput(new Date()),
    frequency: 'monthly',
    custom_days: null,
    notes: '',
    before_image_id: null,
    after_image_id: null,
    before_image_file: null,
    after_image_file: null,
    selected_topics: []
  });

  // Validation state
  const [formErrors, setFormErrors] = useState<{
    scheduled_date?: string;
    frequency?: string;
    custom_days?: string;
  }>({});

  const [selectedFrequency, setSelectedFrequency] = useState<string>('monthly');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<MaintenanceJobData | null>(null);

  // Helper function to format date for input field
  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Fetch jobs from API
  const fetchAvailableJobs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await preventiveMaintenanceService.getPreventiveMaintenanceJobs();
      const jobs = Array.isArray(result) ? result : result.jobs || [];
      setAvailableJobs(jobs as MaintenanceJobData[]);
    } catch (err: any) {
      console.error('Error fetching available jobs:', err);
      setError(err.message || 'Failed to fetch available jobs');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch available topics
  const fetchAvailableTopics = async () => {
    try {
      // Make sure we have a valid session token
      if (session?.user?.accessToken) {
        // Store token in localStorage for API client to use
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', session.user.accessToken);
        }
        
        // Use the correct API endpoint with authentication
        const response = await api.get('/api/topics/');
        if (response.data) {
          setAvailableTopics(response.data);
        }
      }
    } catch (err: any) {
      console.error('Error fetching available topics:', err);
      // Not setting error here to avoid blocking the form
    }
  };

  // Handle topic selection
  const handleTopicChange = (topicId: number) => {
    setFormData(prevData => {
      const currentSelectedTopics = [...prevData.selected_topics];
      const index = currentSelectedTopics.indexOf(topicId);
      
      if (index === -1) {
        // Add topic if not already selected
        currentSelectedTopics.push(topicId);
      } else {
        // Remove topic if already selected
        currentSelectedTopics.splice(index, 1);
      }
      
      return {
        ...prevData,
        selected_topics: currentSelectedTopics
      };
    });
  };
  
  // Initialize data
  useEffect(() => {
    fetchAvailableJobs();
    fetchAvailableTopics();
    
    // Set initial data if provided
    if (initialData) {
      // Get topic IDs from the job
      const topicIds: number[] = [];
      if (initialData.job && typeof initialData.job === 'object' && 'topics' in initialData.job && Array.isArray(initialData.job.topics)) {
        initialData.job.topics.forEach(topic => {
          if (typeof topic === 'object' && 'id' in topic) {
            topicIds.push(topic.id);
          }
        });
      }
      
      setFormData({
        scheduled_date: initialData.scheduled_date ? formatDateForInput(new Date(initialData.scheduled_date)) : formatDateForInput(new Date()),
        frequency: initialData.frequency || 'monthly',
        custom_days: initialData.custom_days !== undefined ? initialData.custom_days : null,
        notes: initialData.notes || '',
        before_image_id: initialData.before_image?.id || null,
        after_image_id: initialData.after_image?.id || null,
        before_image_file: null,
        after_image_file: null,
        selected_topics: topicIds
      });
      
      setSelectedFrequency(initialData.frequency || 'monthly');
      
      if (initialData.before_image?.image_url) {
        setBeforeImagePreview(initialData.before_image.image_url);
      }
      if (initialData.after_image?.image_url) {
        setAfterImagePreview(initialData.after_image.image_url);
      }
      
      // If job is available, set the selected job
      if (initialData.job && typeof initialData.job === 'object') {
        setSelectedJob(initialData.job as MaintenanceJobData);
      }
    }
  }, [initialData]);
  
  // Fetch maintenance data if pmId is provided but no initialData
  useEffect(() => {
    if (pmId && !initialData) {
      setIsLoading(true);
      setError(null);
      
      preventiveMaintenanceService.getPreventiveMaintenanceById(pmId)
        .then(data => {
          // Get topic IDs from the job
          const topicIds: number[] = [];
          if (data.job && typeof data.job === 'object' && 'topics' in data.job && Array.isArray(data.job.topics)) {
            data.job.topics.forEach(topic => {
              if (typeof topic === 'object' && 'id' in topic) {
                topicIds.push(topic.id);
              }
            });
          }
          
          // Set form data
          setFormData({
            scheduled_date: data.scheduled_date ? formatDateForInput(new Date(data.scheduled_date)) : formatDateForInput(new Date()),
            frequency: data.frequency || 'monthly',
            custom_days: data.custom_days !== undefined ? data.custom_days : null,
            notes: data.notes || '',
            before_image_id: data.before_image?.id || null,
            after_image_id: data.after_image?.id || null,
            before_image_file: null,
            after_image_file: null,
            selected_topics: topicIds
          });
          
          setSelectedFrequency(data.frequency || 'monthly');
          
          // Set image previews
          if (data.before_image?.image_url) {
            setBeforeImagePreview(data.before_image.image_url);
          }
          if (data.after_image?.image_url) {
            setAfterImagePreview(data.after_image.image_url);
          }
          
          // If job is available, set the selected job
          if (data.job && typeof data.job === 'object') {
            setSelectedJob(data.job as MaintenanceJobData);
          }
        })
        .catch(err => {
          console.error('Error fetching maintenance data:', err);
          setError(err.message || 'Failed to fetch maintenance data');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [pmId, initialData]);

  // Update frequency state when form value changes
  useEffect(() => {
    setSelectedFrequency(formData.frequency);
  }, [formData.frequency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'custom_days') {
      const numValue = value ? parseInt(value, 10) : null;
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear validation errors when field is changed
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleJobSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedJobId = e.target.value;
    const job = availableJobs.find(j => j.id === selectedJobId);
    setSelectedJob(job || null);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = event.target.files?.[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'before') {
          setBeforeImagePreview(reader.result as string);
        } else {
          setAfterImagePreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
      
      // Set the file in the form
      if (type === 'before') {
        setFormData(prev => ({ ...prev, before_image_file: file }));
      } else {
        setFormData(prev => ({ ...prev, after_image_file: file }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: {
      scheduled_date?: string;
      frequency?: string;
      custom_days?: string;
    } = {};
    
    if (!selectedJob) {
      setError('Please select a job');
      return false;
    }
    
    if (!formData.scheduled_date) {
      errors.scheduled_date = 'Scheduled date is required';
    }
    
    if (!formData.frequency) {
      errors.frequency = 'Frequency is required';
    }
    
    if (formData.frequency === 'custom' && (!formData.custom_days || formData.custom_days < 1)) {
      errors.custom_days = 'Custom days must be at least 1';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedJob) {
      return;
    }
    
    setSubmitLoading(true);
    setSubmitError(null);
    
    try {
      // Check if we have a valid session
      if (!session?.user?.accessToken) {
        throw new Error("Authentication token is missing. Please log in again.");
      }
      
      // Configure service with session token
      const accessToken = session.user.accessToken;
      
      // Store token in localStorage to be used by the API client
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', accessToken);
      }
      
      // Build request data
      const requestData: PreventiveMaintenanceRequest = {
        job_id: selectedJob.id, // Use selectedJob.id instead of job_id
        scheduled_date: formData.scheduled_date,
        frequency: validateFrequency(formData.frequency),
        custom_days: formData.frequency === 'custom' ? formData.custom_days : null,
        notes: formData.notes || '',
        before_image_id: formData.before_image_id,
        after_image_id: formData.after_image_id,
      };

      // Add topics to request data
      if (formData.selected_topics.length > 0) {
        (requestData as any).topic_ids = formData.selected_topics;
      }

      let result: PreventiveMaintenance;

      // Use pmId over initialData if both are provided
      const maintenanceId = pmId || (initialData ? initialData.pm_id : null);

      if (maintenanceId) {
        // Update existing record
        result = await preventiveMaintenanceService.updatePreventiveMaintenance(
          maintenanceId,
          requestData
        );
      } else {
        // Create new record
        result = await preventiveMaintenanceService.createPreventiveMaintenance(requestData);
      }

      // Handle image uploads if needed
      if ((formData.before_image_file || formData.after_image_file) && result.job) {
        const jobId = typeof result.job === 'object' ? result.job.id : '';
        
        if (jobId) {
          const formDataForImages = new FormData();
          
          if (formData.before_image_file) {
            formDataForImages.append('images', formData.before_image_file);
            formDataForImages.append('image_types', 'before');
          }
          
          if (formData.after_image_file) {
            formDataForImages.append('images', formData.after_image_file);
            formDataForImages.append('image_types', 'after');
          }
          
          // Upload images
          const uploadResult = await preventiveMaintenanceService.uploadJobImages(
            jobId,
            formDataForImages
          );
          
          // If successful, refetch the PM to get updated image info
          if (uploadResult) {
            const updatedPM = await preventiveMaintenanceService.getPreventiveMaintenanceById(result.pm_id);
            result = updatedPM;
          }
        }
      }

      // Call the success action with the result
      onSuccessAction(result);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  const removeImage = (type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforeImagePreview(null);
      setFormData(prev => ({ ...prev, before_image_file: null }));
    } else {
      setAfterImagePreview(null);
      setFormData(prev => ({ ...prev, after_image_file: null }));
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {(error || submitError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between">
            <p>{error || submitError}</p>
            <button 
              onClick={() => {
                clearError();
                setSubmitError(null);
              }}
              className="text-red-700"
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="job_selection" className="block text-sm font-medium text-gray-700 mb-1">
            Maintenance Job <span className="text-red-500">*</span>
          </label>
          <select
            id="job_selection"
            value={selectedJob?.id || ''}
            onChange={handleJobSelection}
            className={`w-full p-2 border rounded-md ${!selectedJob ? 'border-red-500' : 'border-gray-300'}`}
            disabled={isLoading}
          >
            <option value="">Select a job</option>
            {availableJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.description} (#{job.id})
              </option>
            ))}
          </select>
          {!selectedJob && error && (
            <p className="mt-1 text-sm text-red-500">Please select a job</p>
          )}
        </div>

        {selectedJob && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium text-gray-700">Selected Job Details</h3>
            <p><span className="font-medium">ID:</span> {selectedJob.id}</p>
            <p><span className="font-medium">Description:</span> {selectedJob.description}</p>
            <p>
              <span className="font-medium">Priority:</span>{' '}
              <span className={`${
                selectedJob.priority === 'high' 
                  ? 'text-red-600' 
                  : selectedJob.priority === 'medium' 
                    ? 'text-yellow-600' 
                    : 'text-green-600'
              }`}>
                {selectedJob.priority.toUpperCase()}
              </span>
            </p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
            Scheduled Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="scheduled_date"
            name="scheduled_date"
            value={formData.scheduled_date}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md ${formErrors.scheduled_date ? 'border-red-500' : 'border-gray-300'}`}
          />
          {formErrors.scheduled_date && (
            <p className="mt-1 text-sm text-red-500">{formErrors.scheduled_date}</p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
            Maintenance Frequency <span className="text-red-500">*</span>
          </label>
          <select
            id="frequency"
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md ${formErrors.frequency ? 'border-red-500' : 'border-gray-300'}`}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formErrors.frequency && (
            <p className="mt-1 text-sm text-red-500">{formErrors.frequency}</p>
          )}
        </div>

        {selectedFrequency === 'custom' && (
          <div className="mb-6">
            <label htmlFor="custom_days" className="block text-sm font-medium text-gray-700 mb-1">
              Custom Days Interval <span className="text-red-500">*</span>
            </label>
            <input
              id="custom_days"
              name="custom_days"
              type="number"
              min="1"
              max="365"
              value={formData.custom_days || ''}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md ${formErrors.custom_days ? 'border-red-500' : 'border-gray-300'}`}
            />
            {formErrors.custom_days && (
              <p className="mt-1 text-sm text-red-500">{formErrors.custom_days}</p>
            )}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={formData.notes}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Add any additional notes here..."
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topics
          </label>
          <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
            {availableTopics.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {availableTopics.map((topic) => (
                  <div key={topic.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`topic-${topic.id}`}
                      checked={formData.selected_topics.includes(topic.id)}
                      onChange={() => handleTopicChange(topic.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`topic-${topic.id}`} className="ml-2 block text-sm text-gray-900">
                      {topic.title}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No topics available</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Before Image
            </label>
            <div className="flex flex-col items-center space-y-2">
              {beforeImagePreview ? (
                <div className="relative w-full h-40 bg-gray-100">
                  <img
                    src={beforeImagePreview}
                    alt="Before Maintenance Preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('before')}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <label className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <span className="mt-2 text-sm text-gray-500">Click to upload before image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'before')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              After Image
            </label>
            <div className="flex flex-col items-center space-y-2">
              {afterImagePreview ? (
                <div className="relative w-full h-40 bg-gray-100">
                  <img
                    src={afterImagePreview}
                    alt="After Maintenance Preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('after')}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <label className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <span className="mt-2 text-sm text-gray-500">Click to upload after image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'after')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitLoading || isLoading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              (submitLoading || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {submitLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : pmId || initialData ? 'Update Maintenance' : 'Create Maintenance'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreventiveMaintenanceForm;