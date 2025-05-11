'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  PreventiveMaintenance,
  FREQUENCY_OPTIONS,
  validateFrequency,
  FrequencyType,
  Topic,
  PMFormErrors,
  ServiceResponse,
} from '@/app/lib/preventiveMaintenanceModels';
import preventiveMaintenanceService from '@/app/lib/PreventiveMaintenanceService';
import api from '@/app/lib/api-client';

interface PreventiveMaintenanceFormProps {
  pmId?: string | null;
  onSuccessAction: (data: PreventiveMaintenance) => void;
  initialData?: PreventiveMaintenance | null;
}

const PreventiveMaintenanceForm: React.FC<PreventiveMaintenanceFormProps> = ({
  pmId,
  onSuccessAction,
  initialData,
}) => {
  const { data: session } = useSession();

  // State for available topics
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formState, setFormState] = useState<{
    pmtitle: string;
    scheduled_date: string;
    frequency: FrequencyType;
    custom_days: number | null;
    notes: string;
    before_image_id: number | null;
    after_image_id: number | null;
    before_image_file?: File | null;
    after_image_file?: File | null;
    selected_topics: number[];
  }>({
    pmtitle: '',
    scheduled_date: formatDateForInput(new Date()),
    frequency: 'monthly',
    custom_days: null,
    notes: '',
    before_image_id: null,
    after_image_id: null,
    before_image_file: null,
    after_image_file: null,
    selected_topics: [],
  });

  // Validation state
  const [formErrors, setFormErrors] = useState<PMFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);

  // Helper function to format date for input field
  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper function to extract PreventiveMaintenance from ServiceResponse
  function extractPreventiveMaintenanceData(
    response: ServiceResponse<PreventiveMaintenance> | PreventiveMaintenance
  ): PreventiveMaintenance {
    if ('success' in response && response.success && response.data) {
      return response.data;
    } else {
      return response as PreventiveMaintenance;
    }
  }

  // Clear error
  const clearError = () => {
    setError(null);
    setSubmitError(null);
  };

  // Reset form after successful creation
  const resetForm = () => {
    setFormState({
      pmtitle: '',
      scheduled_date: formatDateForInput(new Date()),
      frequency: 'monthly',
      custom_days: null,
      notes: '',
      before_image_id: null,
      after_image_id: null,
      before_image_file: null,
      after_image_file: null,
      selected_topics: [],
    });
    setBeforeImagePreview(null);
    setAfterImagePreview(null);
    setFormErrors({});
  };

  // Fetch available topics
  const fetchAvailableTopics = async () => {
    try {
      if (session?.user?.accessToken) {
        const response = await api.get('/api/topics/', {
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        });
        if (response.data && response.data.topics) {
          setAvailableTopics(response.data.topics);
        } else if (response.data) {
          setAvailableTopics(response.data);
        }
      }
    } catch (err: any) {
      console.error('Error fetching available topics:', err);
      setError('Failed to load topics. Please try again.');
    }
  };

  // Handle topic selection
  const handleTopicChange = (topicId: number) => {
    setFormState((prevData) => {
      const currentSelectedTopics = [...prevData.selected_topics];
      const index = currentSelectedTopics.indexOf(topicId);

      if (index === -1) {
        currentSelectedTopics.push(topicId);
      } else {
        currentSelectedTopics.splice(index, 1);
      }

      return {
        ...prevData,
        selected_topics: currentSelectedTopics,
      };
    });
  };

  // Initialize data
  useEffect(() => {
    fetchAvailableTopics();

    if (initialData) {
      const topicIds: number[] = [];

      if ('topics' in initialData && initialData.topics && Array.isArray(initialData.topics)) {
        initialData.topics.forEach((topic) => {
          if (typeof topic === 'object' && 'id' in topic) {
            topicIds.push(topic.id);
          } else if (typeof topic === 'number') {
            topicIds.push(topic);
          }
        });
      }

      setFormState({
        pmtitle: initialData.pmtitle || '',
        scheduled_date: initialData.scheduled_date
          ? formatDateForInput(new Date(initialData.scheduled_date))
          : formatDateForInput(new Date()),
        frequency: validateFrequency(initialData.frequency || 'monthly'),
        custom_days: initialData.custom_days !== undefined ? initialData.custom_days : null,
        notes: initialData.notes || '',
        before_image_id: initialData.before_image?.id ? Number(initialData.before_image.id) : null,
        after_image_id: initialData.after_image?.id ? Number(initialData.after_image.id) : null,
        before_image_file: null,
        after_image_file: null,
        selected_topics: topicIds,
      });

      if (initialData.before_image_url) {
        setBeforeImagePreview(initialData.before_image_url);
      }
      if (initialData.after_image_url) {
        setAfterImagePreview(initialData.after_image_url);
      }
    }
  }, [initialData]);

  // Fetch maintenance data if pmId is provided but no initialData
  useEffect(() => {
    if (pmId && !initialData) {
      setIsLoading(true);
      clearError();

      preventiveMaintenanceService
        .getPreventiveMaintenanceById(pmId)
        .then((response) => {
          const data = extractPreventiveMaintenanceData(response);

          const topicIds: number[] = [];

          if ('topics' in data && data.topics && Array.isArray(data.topics)) {
            data.topics.forEach((topic) => {
              if (typeof topic === 'object' && 'id' in topic) {
                topicIds.push(topic.id);
              } else if (typeof topic === 'number') {
                topicIds.push(topic);
              }
            });
          }

          setFormState({
            pmtitle: data.pmtitle || '',
            scheduled_date: data.scheduled_date
              ? formatDateForInput(new Date(data.scheduled_date))
              : formatDateForInput(new Date()),
            frequency: validateFrequency(data.frequency || 'monthly'),
            custom_days: data.custom_days !== undefined ? data.custom_days : null,
            notes: data.notes || '',
            before_image_id: data.before_image?.id ? Number(data.before_image.id) : null,
            after_image_id: data.after_image?.id ? Number(data.after_image.id) : null,
            before_image_file: null,
            after_image_file: null,
            selected_topics: topicIds,
          });

          if (data.before_image_url) {
            setBeforeImagePreview(data.before_image_url);
          }
          if (data.after_image_url) {
            setAfterImagePreview(data.after_image_url);
          }
        })
        .catch((err) => {
          console.error('Error fetching maintenance data:', err);
          setError(err.message || 'Failed to fetch maintenance data');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [pmId, initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name === 'custom_days') {
      const numValue = value ? parseInt(value, 10) : null;
      setFormState((prev) => ({ ...prev, [name]: numValue }));
    } else if (name === 'frequency') {
      setFormState((prev) => ({ ...prev, [name]: validateFrequency(value) }));
    } else {
      setFormState((prev) => ({ ...prev, [name]: value }));
    }

    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
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

      if (type === 'before') {
        setFormState((prev) => ({ ...prev, before_image_file: file }));
      } else {
        setFormState((prev) => ({ ...prev, after_image_file: file }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: PMFormErrors = {};

    if (!formState.scheduled_date) {
      errors.scheduled_date = 'Scheduled date is required';
    }

    if (!formState.frequency) {
      errors.frequency = 'Frequency is required';
    }

    if (formState.frequency === 'custom' && (!formState.custom_days || formState.custom_days < 1)) {
      errors.custom_days = 'Custom days must be at least 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!validateForm()) {
      return;
    }
  
    setSubmitLoading(true);
    clearError();
  
    try {
      if (!session?.user?.accessToken) {
        throw new Error('Authentication required. Please log in.');
      }
  
      // Create FormData for multipart/form-data request
      const submitData = new FormData();
      
      // Add non-file fields
      submitData.append('scheduled_date', formState.scheduled_date);
      submitData.append('frequency', formState.frequency);
      if (formState.frequency === 'custom' && formState.custom_days) {
        submitData.append('custom_days', formState.custom_days.toString());
      }
      if (formState.notes) {
        submitData.append('notes', formState.notes);
      }
      if (formState.pmtitle) {
        submitData.append('pmtitle', formState.pmtitle);
      }
      
      // Add topic_ids if they exist
      if (formState.selected_topics.length > 0) {
        formState.selected_topics.forEach(topicId => {
          submitData.append('topic_ids', topicId.toString());
        });
      }
      
      // Add image files if they exist
      if (formState.before_image_file) {
        submitData.append('before_image', formState.before_image_file);
      }
      if (formState.after_image_file) {
        submitData.append('after_image', formState.after_image_file);
      }
  
      const maintenanceId = pmId || (initialData ? initialData.pm_id : null);
      let response;
  
      // Prepare headers
      const headers = {
        'Authorization': `Bearer ${session.user.accessToken}`,
        // Don't set Content-Type - let browser set it with boundary for multipart
      };
  
      // Use fetch instead of the service method to properly handle FormData
      const url = maintenanceId 
        ? `${process.env.NEXT_PUBLIC_API_URL || ''}/api/preventive-maintenance/${maintenanceId}/`
        : `${process.env.NEXT_PUBLIC_API_URL || ''}/api/preventive-maintenance/`;
      
      const fetchOptions = {
        method: maintenanceId ? 'PATCH' : 'POST',
        headers,
        body: submitData,
      };
  
      response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save maintenance record');
      }
      
      const maintenanceData = await response.json();
  
      // Handle the response based on its structure
      let finalData;
      if ('success' in maintenanceData && maintenanceData.success && maintenanceData.data) {
        finalData = maintenanceData.data;
      } else if ('pm_id' in maintenanceData) {
        finalData = maintenanceData;
      } else {
        throw new Error('Invalid response format');
      }
  
      onSuccessAction(finalData);
  
      if (!maintenanceId) {
        resetForm();
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred while saving the maintenance record';
      setSubmitError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const removeImage = (type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforeImagePreview(null);
      setFormState((prev) => ({ ...prev, before_image_file: null, before_image_id: null }));
    } else {
      setAfterImagePreview(null);
      setFormState((prev) => ({ ...prev, after_image_file: null, after_image_id: null }));
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {(error || submitError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between">
            <p>{error || submitError}</p>
            <button
              onClick={clearError}
              className="text-red-700"
              type="button"
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label="Preventive Maintenance Form">
        <div className="mb-6">
          <label
            htmlFor="pmtitle"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Maintenance Title
          </label>
          <input
            type="text"
            id="pmtitle"
            name="pmtitle"
            value={formState.pmtitle}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter maintenance title (optional)"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="scheduled_date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Scheduled Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="scheduled_date"
            name="scheduled_date"
            value={formState.scheduled_date}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md ${
              formErrors.scheduled_date ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-required="true"
            aria-invalid={!!formErrors.scheduled_date}
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
            value={formState.frequency}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md ${
              formErrors.frequency ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-required="true"
            aria-invalid={!!formErrors.frequency}
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

        {formState.frequency === 'custom' && (
          <div className="mb-6">
            <label
              htmlFor="custom_days"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Custom Days Interval <span className="text-red-500">*</span>
            </label>
            <input
              id="custom_days"
              name="custom_days"
              type="number"
              min="1"
              max="365"
              value={formState.custom_days || ''}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md ${
                formErrors.custom_days ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-required="true"
              aria-invalid={!!formErrors.custom_days}
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
            value={formState.notes}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Add any additional notes here..."
            aria-describedby="notes-description"
          />
          <p id="notes-description" className="sr-only">
            Optional field for additional notes about the maintenance task
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Topics</label>
          <div
            className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto"
            role="group"
            aria-label="Select maintenance topics"
          >
            {isLoading ? (
              <p className="text-sm text-gray-500 italic">Loading topics...</p>
            ) : availableTopics.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {availableTopics.map((topic) => (
                  <div key={topic.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`topic-${topic.id}`}
                      checked={formState.selected_topics.includes(topic.id)}
                      onChange={() => handleTopicChange(topic.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      aria-checked={formState.selected_topics.includes(topic.id)}
                    />
                    <label
                      htmlFor={`topic-${topic.id}`}
                      className="ml-2 block text-sm text-gray-900"
                    >
                      {topic.title}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No topics available.{' '}
                <button
                  type="button"
                  onClick={fetchAvailableTopics}
                  className="text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </p>
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
                    aria-label="Remove before image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    ></path>
                  </svg>
                  <span className="mt-2 text-sm text-gray-500">Click to upload before image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'before')}
                    className="hidden"
                    aria-label="Upload before image"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">After Image</label>
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
                    aria-label="Remove after image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="w-full h-40 flex flex-col items-center justify-center bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    ></path>
                  </svg>
                  <span className="mt-2 text-sm text-gray-500">Click to upload after image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'after')}
                    className="hidden"
                    aria-label="Upload after image"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitLoading || isLoading || isImageUploading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              submitLoading || isLoading || isImageUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label={pmId || initialData ? 'Update maintenance' : 'Create maintenance'}
          >
            {submitLoading || isImageUploading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : pmId || initialData ? (
              'Update Maintenance'
            ) : (
              'Create Maintenance'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreventiveMaintenanceForm;