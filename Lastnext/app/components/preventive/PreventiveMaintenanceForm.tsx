'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  UploadImagesData,
} from '@/app/lib/PreventiveMaintenanceService';
import apiClient from '@/app/lib/api-client';
import FileUpload from "@/app/components/jobs/FileUpload";

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
  
  // Store the created maintenance record ID for the fallback image upload path
  const createdMaintenanceIdRef = useRef<string | null>(null);

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

    // Validate file sizes
    if (values.before_image_file && values.before_image_file.size > MAX_FILE_SIZE) {
      (errors as any).before_image_file = 'Before image must be less than 5MB';
    }

    if (values.after_image_file && values.after_image_file.size > MAX_FILE_SIZE) {
      (errors as any).after_image_file = 'After image must be less than 5MB';
    }

    return errors;
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

  // Special function to handle image uploads as a separate step - as a fallback
  const uploadImagesManually = async (id: string, beforeImage: File | null, afterImage: File | null) => {
    if (!id || (!beforeImage && !afterImage)) {
      console.log("No need for manual image upload");
      return;
    }
    
    setIsImageUploading(true);
    console.log(`Trying manual image upload for PM ID: ${id}`);
    
    try {
      const uploadData: UploadImagesData = {};
      if (beforeImage instanceof File) {
        uploadData.before_image = beforeImage;
      }
      if (afterImage instanceof File) {
        uploadData.after_image = afterImage;
      }
      
      // Using the dedicated image upload method
      await preventiveMaintenanceService.uploadMaintenanceImages(id, uploadData);
      console.log("Manual image upload successful");
      
      // Refresh the maintenance data to see if images were saved
      const refreshedData = await preventiveMaintenanceService.getPreventiveMaintenanceById(id);
      if (refreshedData.success && refreshedData.data) {
        // Update previews if needed
        if (refreshedData.data.before_image_url && beforeImage) {
          setBeforeImagePreview(refreshedData.data.before_image_url);
        }
        if (refreshedData.data.after_image_url && afterImage) {
          setAfterImagePreview(refreshedData.data.after_image_url);
        }
      }
    } catch (error) {
      console.error("Failed manual image upload:", error);
    } finally {
      setIsImageUploading(false);
    }
  };

  // Handle file selection with validation and preview
  const handleFileSelection = (files: File[], type: 'before' | 'after', setFieldValue: (field: string, value: any) => void) => {
    console.log(`Handling file selection for ${type} image`, files);
    
    if (files.length === 0) {
      console.log(`Clearing ${type} image`);
      if (type === 'before') {
        setBeforeImagePreview(null);
        setFieldValue('before_image_file', null);
      } else {
        setAfterImagePreview(null);
        setFieldValue('after_image_file', null);
      }
      return;
    }
    
    const file = files[0];
    console.log(`Selected ${type} image:`, file.name, file.size, file.type);
    
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`${type} image is too large:`, file.size);
      return;
    }
    
    // Set the file in form values
    setFieldValue(type === 'before' ? 'before_image_file' : 'after_image_file', file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log(`Created preview for ${type} image`);
      if (type === 'before') {
        setBeforeImagePreview(reader.result as string);
      } else {
        setAfterImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    // If we already have a created record ID, try to upload the image immediately
    const existingId = createdMaintenanceIdRef.current || pmId || (initialData?.pm_id);
    if (existingId) {
      console.log(`Immediate upload for ${type} image to existing record:`, existingId);
      const uploadData: UploadImagesData = {};
      
      if (type === 'before') {
        uploadData.before_image = file;
      } else {
        uploadData.after_image = file;
      }
      
      setIsImageUploading(true);
      preventiveMaintenanceService.uploadMaintenanceImages(existingId, uploadData)
        .then(() => {
          console.log(`Successfully uploaded ${type} image directly`);
        })
        .catch(err => {
          console.error(`Failed to upload ${type} image directly:`, err);
        })
        .finally(() => {
          setIsImageUploading(false);
        });
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
    setIsLoading(true); // Set loading state
    
    try {
      console.log('Starting form submission with values:', {
        ...values,
        before_image_file: values.before_image_file ? 
          `File: ${values.before_image_file.name} (${values.before_image_file.size} bytes)` : null,
        after_image_file: values.after_image_file ? 
          `File: ${values.after_image_file.name} (${values.after_image_file.size} bytes)` : null,
      });
      
      // Double-check the file objects are valid before submission
      if (values.before_image_file) {
        console.log('Before image validation:', {
          valid: values.before_image_file instanceof File,
          name: values.before_image_file.name,
          size: values.before_image_file.size,
          type: values.before_image_file.type
        });
      }
      
      if (values.after_image_file) {
        console.log('After image validation:', {
          valid: values.after_image_file instanceof File,
          name: values.after_image_file.name,
          size: values.after_image_file.size,
          type: values.after_image_file.type
        });
      }
      
      // Keep references to the image files
      const beforeImageFile = values.before_image_file;
      const afterImageFile = values.after_image_file;
      
      // Prepare the data with proper typing
      const submitData: CreatePreventiveMaintenanceData = {
        scheduled_date: values.scheduled_date,
        frequency: values.frequency,
        custom_days: values.frequency === 'custom' && values.custom_days && values.custom_days > 0 
          ? Number(values.custom_days) 
          : null,
        notes: values.notes && values.notes.trim() ? values.notes.trim() : undefined,
        pmtitle: values.pmtitle && values.pmtitle.trim() ? values.pmtitle.trim() : undefined,
        topic_ids: values.selected_topics.length > 0 ? values.selected_topics : undefined,
        // Only include files if they are actual File instances
        before_image: values.before_image_file instanceof File ? values.before_image_file : undefined,
        after_image: values.after_image_file instanceof File ? values.after_image_file : undefined,
      };
      
      // Set image uploading state if we have images
      if (submitData.before_image || submitData.after_image) {
        setIsImageUploading(true);
      }
      
      console.log('Submit data prepared for API:', {
        pmtitle: submitData.pmtitle,
        scheduled_date: submitData.scheduled_date,
        frequency: submitData.frequency,
        custom_days: submitData.custom_days,
        hasBeforeImage: !!submitData.before_image,
        hasAfterImage: !!submitData.after_image,
        topicIds: submitData.topic_ids
      });

      const maintenanceId = pmId || (initialData ? initialData.pm_id : null);
      
      let response: ServiceResponse<PreventiveMaintenance>;
      
      if (maintenanceId) {
        // Update existing maintenance
        console.log('Updating maintenance with ID:', maintenanceId);
        response = await preventiveMaintenanceService.updatePreventiveMaintenance(
          maintenanceId,
          submitData
        );
      } else {
        // Create new maintenance
        console.log('Creating new maintenance record');
        response = await preventiveMaintenanceService.createPreventiveMaintenance(
          submitData
        );
      }
      
      // Extract the data from the service response correctly
      if (response.success && response.data) {
        const maintenanceData = response.data;
        console.log('Successfully saved maintenance:', maintenanceData);
        
        // Store the ID in case we need it for manual image uploads
        if (maintenanceData.pm_id) {
          createdMaintenanceIdRef.current = maintenanceData.pm_id;
        }
        
        // Check if images were saved correctly
        if ((submitData.before_image && !maintenanceData.before_image_url) || 
            (submitData.after_image && !maintenanceData.after_image_url)) {
          console.warn('Images might not have been saved correctly, attempting manual upload');
          
          // Try manual upload as a fallback
          await uploadImagesManually(
            maintenanceData.pm_id, 
            beforeImageFile, 
            afterImageFile
          );
          
          // Get updated maintenance data after manual upload
          const updatedResponse = await preventiveMaintenanceService.getPreventiveMaintenanceById(maintenanceData.pm_id);
          if (updatedResponse.success && updatedResponse.data) {
            maintenanceData.before_image_url = updatedResponse.data.before_image_url;
            maintenanceData.after_image_url = updatedResponse.data.after_image_url;
          }
        }
        
        // Call success action
        onSuccessAction(maintenanceData);
        
        // Reset form if creating new
        if (!maintenanceId) {
          setFieldValue('pmtitle', '');
          setFieldValue('notes', '');
          setFieldValue('custom_days', '');
          setFieldValue('selected_topics', []);
          setFieldValue('before_image_file', null);
          setFieldValue('after_image_file', null);
          setBeforeImagePreview(null);
          setAfterImagePreview(null);
          
          // Reset the stored ID
          createdMaintenanceIdRef.current = null;
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
          // Handle field-specific errors including file validation errors
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
      setIsLoading(false);
      setIsImageUploading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {(error || submitError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between">
            <p className="whitespace-pre-wrap">{error || submitError}</p>
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
            {/* Rest of the form remains the same */}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
              {/* Topics section remains the same */}
              <div
                className="border border-gray-300 rounded-md p-4 max-h-48 overflow-y-auto bg-white"
                role="group"
                aria-label="Select maintenance topics"
              >
                {isLoading ? (
                  <p className="text-sm text-gray-500 italic">Loading topics...</p>
                ) : availableTopics.length > 0 ? (
                  <div className="space-y-3">
                    {availableTopics.map((topic) => (
                      <div key={topic.id} className="relative">
                        <label className="flex items-center cursor-pointer">
                          <Field name="selected_topics">
                            {({ field }: any) => (
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                id={`topic-${topic.id}`}
                                checked={field.value.includes(topic.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Add topic id to selected topics
                                    setFieldValue('selected_topics', [...field.value, topic.id]);
                                  } else {
                                    // Remove topic id from selected topics
                                    setFieldValue('selected_topics', field.value.filter((id: number) => id !== topic.id));
                                  }
                                }}
                              />
                            )}
                          </Field>
                          <span className="ml-3 text-sm text-gray-700 flex-1">{topic.title}</span>
                        </label>
                        {/* Visual indicator for selected state */}
                        {values.selected_topics.includes(topic.id) && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-3">No topics available.</p>
                    <button
                      type="button"
                      onClick={fetchAvailableTopics}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                      Refresh Topics
                    </button>
                  </div>
                )}
              </div>
              {/* Display selected topics count */}
              {values.selected_topics.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    {values.selected_topics.length} topic{values.selected_topics.length > 1 ? 's' : ''} selected:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {values.selected_topics.map((topicId) => {
                      const topic = availableTopics.find(t => t.id === topicId);
                      return topic ? (
                        <span
                          key={topic.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {topic.title}
                          <button
                            type="button"
                            onClick={() => {
                              setFieldValue('selected_topics', values.selected_topics.filter(id => id !== topic.id));
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                            aria-label={`Remove ${topic.title}`}
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Before Image with FileUpload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Before Image
                </label>
                <FileUpload
                  onFileSelect={(files: File[]) => handleFileSelection(files, 'before', setFieldValue)}
                  maxFiles={1}
                  maxSize={5} // 5MB
                  error={(errors as any).before_image_file}
                  touched={touched.before_image_file as boolean | undefined}
                  disabled={isSubmitting || isLoading}
                />
                {beforeImagePreview && (
                  <div className="mt-3 relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={beforeImagePreview}
                      alt="Before Maintenance Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBeforeImagePreview(null);
                        setFieldValue('before_image_file', null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center shadow-md"
                      aria-label="Remove before image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* After Image with FileUpload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  After Image
                </label>
                <FileUpload
                  onFileSelect={(files: File[]) => handleFileSelection(files, 'after', setFieldValue)}
                  maxFiles={1}
                  maxSize={5} // 5MB
                  error={(errors as any).after_image_file}
                  touched={touched.after_image_file as boolean | undefined}
                  disabled={isSubmitting || isLoading}
                />
                {afterImagePreview && (
                  <div className="mt-3 relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={afterImagePreview}
                      alt="After Maintenance Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAfterImagePreview(null);
                        setFieldValue('after_image_file', null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center shadow-md"
                      aria-label="Remove after image"
                    >×
                    </button>
                  </div>
                )}
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
                    {isImageUploading ? 'Uploading images...' : 'Processing...'}
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