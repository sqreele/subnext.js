'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Formik, Form, Field, FormikErrors } from 'formik';
import {
  PreventiveMaintenance,
  FREQUENCY_OPTIONS,
  validateFrequency,
  FrequencyType,
  Topic,
  ServiceResponse,
} from '@/app/lib/preventiveMaintenanceModels';
import preventiveMaintenanceService, {
  CreatePreventiveMaintenanceData,
  UpdatePreventiveMaintenanceData,
} from '@/app/lib/PreventiveMaintenanceService';
import apiClient from '@/app/lib/api-client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface PreventiveMaintenanceFormProps {
  pmId?: string | null;
  onSuccessAction: (data: PreventiveMaintenance) => void;
  initialData?: PreventiveMaintenance | null;
}

interface FormValues {
  pmtitle: string;
  scheduled_date: string;
  frequency: FrequencyType;
  custom_days: number | '';
  notes: string;
  before_image_file: File | null;
  after_image_file: File | null;
  selected_topics: number[];
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);

  // Helper function to format date for input field
  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Validation function
  const validate = (values: FormValues): FormikErrors<FormValues> => {
    const errors: FormikErrors<FormValues> = {};

    if (!values.scheduled_date) {
      errors.scheduled_date = 'Scheduled date is required';
    }

    if (!values.frequency) {
      errors.frequency = 'Frequency is required';
    }

    if (values.frequency === 'custom' && (!values.custom_days || Number(values.custom_days) < 1)) {
      errors.custom_days = 'Custom days must be at least 1';
    }

    // Validate file sizes - cast to any to avoid TypeScript issues with file validation
    const errorsWithFiles = errors as any;
    if (values.before_image_file && values.before_image_file.size > MAX_FILE_SIZE) {
      errorsWithFiles.before_image_file = 'Before image must be less than 5MB';
    }

    if (values.after_image_file && values.after_image_file.size > MAX_FILE_SIZE) {
      errorsWithFiles.after_image_file = 'After image must be less than 5MB';
    }

    return errorsWithFiles;
  };

  // Initial values
  const getInitialValues = (): FormValues => {
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

      return {
        pmtitle: initialData.pmtitle || '',
        scheduled_date: initialData.scheduled_date
          ? formatDateForInput(new Date(initialData.scheduled_date))
          : formatDateForInput(new Date()),
        frequency: validateFrequency(initialData.frequency || 'monthly'),
        custom_days: initialData.custom_days !== undefined && initialData.custom_days !== null ? initialData.custom_days : '',
        notes: initialData.notes || '',
        before_image_file: null,
        after_image_file: null,
        selected_topics: topicIds,
      };
    }

    return {
      pmtitle: '',
      scheduled_date: formatDateForInput(new Date()),
      frequency: 'monthly',
      custom_days: '',
      notes: '',
      before_image_file: null,
      after_image_file: null,
      selected_topics: [],
    };
  };

  // Clear error
  const clearError = () => {
    setError(null);
    setSubmitError(null);
  };

  // Fetch available topics using API client
  const fetchAvailableTopics = async () => {
    try {
      const response = await apiClient.get('/api/topics/');
      if (response.data && response.data.topics) {
        setAvailableTopics(response.data.topics);
      } else if (response.data) {
        setAvailableTopics(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching available topics:', err);
      setError('Failed to load topics. Please try again.');
    }
  };

  // Initialize data
  useEffect(() => {
    fetchAvailableTopics();

    if (initialData) {
      // Set image previews
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
          // Extract PreventiveMaintenance from ServiceResponse properly
          const data = extractMaintenanceData(response);

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

  // Handle file change with size validation
  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>, 
    type: 'before' | 'after',
    setFieldValue: (field: string, value: any) => void,
    setFieldError: (field: string, message: string) => void
  ) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        const errorMsg = `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        setFieldError(type === 'before' ? 'before_image_file' : 'after_image_file', errorMsg);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'before') {
          setBeforeImagePreview(reader.result as string);
        } else {
          setAfterImagePreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);

      setFieldValue(type === 'before' ? 'before_image_file' : 'after_image_file', file);
    }
  };

  // Helper function to extract maintenance data
  const extractMaintenanceData = (response: ServiceResponse<PreventiveMaintenance> | PreventiveMaintenance): PreventiveMaintenance => {
    if ('success' in response && response.success && response.data) {
      return response.data;
    } else if ('pm_id' in response) {
      return response as PreventiveMaintenance;
    } else {
      throw new Error('Invalid response format');
    }
  };

  // Handle submit
  const handleSubmit = async (
    values: FormValues, 
    { setSubmitting, setFieldValue }: { 
      setSubmitting: (isSubmitting: boolean) => void;
      setFieldValue: (field: string, value: any) => void;
    }
  ) => {
    clearError();
    
    try {
      console.log('Starting form submission...');
      
      // Prepare the data with proper typing
      const submitData: CreatePreventiveMaintenanceData = {
        scheduled_date: values.scheduled_date,
        frequency: values.frequency,
        custom_days: values.frequency === 'custom' && values.custom_days && values.custom_days > 0 
          ? Number(values.custom_days) 
          : undefined,
        notes: values.notes && values.notes.trim() ? values.notes.trim() : undefined,
        pmtitle: values.pmtitle && values.pmtitle.trim() ? values.pmtitle.trim() : undefined,
        topic_ids: values.selected_topics.length > 0 ? values.selected_topics : undefined,
        // Only include files if they are actual File instances
        before_image: values.before_image_file instanceof File ? values.before_image_file : undefined,
        after_image: values.after_image_file instanceof File ? values.after_image_file : undefined,
      };
      
      console.log('Submit data prepared:', {
        ...submitData,
        before_image: submitData.before_image ? 'File object' : undefined,
        after_image: submitData.after_image ? 'File object' : undefined,
      });

      const maintenanceId = pmId || (initialData ? initialData.pm_id : null);
      
      let response: ServiceResponse<PreventiveMaintenance>;
      
      if (maintenanceId) {
        // Update existing maintenance
        response = await preventiveMaintenanceService.updatePreventiveMaintenance(
          maintenanceId,
          submitData
        );
      } else {
        // Create new maintenance
        response = await preventiveMaintenanceService.createPreventiveMaintenance(
          submitData
        );
      }
      
      // Extract the data from the service response correctly
      if (response.success && response.data) {
        const maintenanceData = response.data;
        onSuccessAction(maintenanceData);
        
        // Also reset form if creating new
        if (!maintenanceId) {
          // Reset form values
          setFieldValue('pmtitle', '');
          setFieldValue('notes', '');
          setFieldValue('custom_days', '');
          setFieldValue('selected_topics', []);
          setFieldValue('before_image_file', null);
          setFieldValue('after_image_file', null);
          setBeforeImagePreview(null);
          setAfterImagePreview(null);
        }
      } else {
        throw new Error(response.message || 'Failed to save maintenance record');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      
      // Parse the error to get more details
      let errorMessage = 'An unexpected error occurred while saving the maintenance record';
      
      if (error.response?.data) {
        console.error('Error response data:', error.response.data);
        
        // Handle different error formats
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          // Handle field-specific errors
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, errorList]) => {
              if (Array.isArray(errorList)) {
                return `${field}: ${errorList.join(', ')}`;
              }
              return `${field}: ${errorList}`;
            })
            .join('; ');
          
          if (fieldErrors) {
            errorMessage = `Validation errors: ${fieldErrors}`;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Remove image
  const removeImage = (type: 'before' | 'after', setFieldValue: (field: string, value: any) => void) => {
    if (type === 'before') {
      setBeforeImagePreview(null);
      setFieldValue('before_image_file', null);
    } else {
      setAfterImagePreview(null);
      setFieldValue('after_image_file', null);
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

      <Formik
        initialValues={getInitialValues()}
        validate={validate}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue, setFieldError }) => (
          <Form aria-label="Preventive Maintenance Form">
            <div className="mb-6">
              <label
                htmlFor="pmtitle"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Maintenance Title
              </label>
              <Field
                type="text"
                id="pmtitle"
                name="pmtitle"
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
              <Field
                type="date"
                id="scheduled_date"
                name="scheduled_date"
                className={`w-full p-2 border rounded-md ${
                  errors.scheduled_date && touched.scheduled_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scheduled_date && touched.scheduled_date && (
                <p className="mt-1 text-sm text-red-500">{errors.scheduled_date}</p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Frequency <span className="text-red-500">*</span>
              </label>
              <Field
                as="select"
                id="frequency"
                name="frequency"
                className={`w-full p-2 border rounded-md ${
                  errors.frequency && touched.frequency ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Field>
              {errors.frequency && touched.frequency && (
                <p className="mt-1 text-sm text-red-500">{errors.frequency}</p>
              )}
            </div>

            {values.frequency === 'custom' && (
              <div className="mb-6">
                <label
                  htmlFor="custom_days"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Custom Days Interval <span className="text-red-500">*</span>
                </label>
                <Field
                  type="number"
                  id="custom_days"
                  name="custom_days"
                  min="1"
                  max="365"
                  className={`w-full p-2 border rounded-md ${
                    errors.custom_days && touched.custom_days ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.custom_days && touched.custom_days && (
                  <p className="mt-1 text-sm text-red-500">{errors.custom_days}</p>
                )}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Field
                as="textarea"
                id="notes"
                name="notes"
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Add any additional notes here..."
              />
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
                        <Field
                          type="checkbox"
                          id={`topic-${topic.id}`}
                          name="selected_topics"
                          value={topic.id}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
              {/* Before Image */}
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
                        onClick={() => removeImage('before', setFieldValue)}
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
                        onChange={(e) => handleImageChange(e, 'before', setFieldValue, setFieldError)}
                        className="hidden"
                        aria-label="Upload before image"
                      />
                    </label>
                  )}
                  {(errors as any).before_image_file && touched.before_image_file && (
                    <p className="text-sm text-red-500">{(errors as any).before_image_file}</p>
                  )}
                </div>
              </div>

              {/* After Image */}
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
                        onClick={() => removeImage('after', setFieldValue)}
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
                        onChange={(e) => handleImageChange(e, 'after', setFieldValue, setFieldError)}
                        className="hidden"
                        aria-label="Upload after image"
                      />
                    </label>
                  )}
                  {(errors as any).after_image_file && touched.after_image_file && (
                    <p className="text-sm text-red-500">{(errors as any).after_image_file}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isLoading || isImageUploading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isSubmitting || isLoading || isImageUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label={pmId || initialData ? 'Update maintenance' : 'Create maintenance'}
              >
                {isSubmitting || isImageUploading ? (
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
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default PreventiveMaintenanceForm;