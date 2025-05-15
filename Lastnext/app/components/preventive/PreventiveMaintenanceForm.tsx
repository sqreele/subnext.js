// @/app/[locale]/preventive-maintenance/PreventiveMaintenanceForm.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import FileUpload from '@/app/components/jobs/FileUpload';
import { toast } from 'react-hot-toast';
import { useProperty } from '@/app/lib/PropertyContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface Machine {
  id: number;
  machine_id: string;
  name: string;
}

interface Property {
  property_id: string;
  name: string;
}

interface PreventiveMaintenanceFormProps {
  pmId?: string | null;
  onSuccessAction: (data: PreventiveMaintenance) => void;
  initialData?: PreventiveMaintenance | null;
  onCancel?: () => void;
  machineId?: string;
}

interface FormValues {
  pmtitle: string;
  scheduled_date: string;
  completed_date: string | null;
  frequency: FrequencyType;
  custom_days: number | '';
  notes: string;
  before_image_file: File | null;
  after_image_file: File | null;
  selected_topics: number[];
  selected_machine_ids: string[];
  property_id: string | null;
}

const PreventiveMaintenanceForm: React.FC<PreventiveMaintenanceFormProps> = ({
  pmId,
  onSuccessAction,
  initialData,
  onCancel,
  machineId,
}) => {
  const { data: session } = useSession();
  const { userProperties } = useProperty();
  const createdMaintenanceIdRef = useRef<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [loadingTopics, setLoadingTopics] = useState<boolean>(true);
  const [loadingMachines, setLoadingMachines] = useState<boolean>(true);

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPropertyName = useCallback(
    (propertyId: string | null): string => {
      if (!propertyId) return 'No Property Selected';
      const foundProperty = userProperties?.find((p) => p.property_id === propertyId);
      return foundProperty?.name || `Property ${propertyId}`;
    },
    [userProperties]
  );

  const validate = (values: FormValues): FormikErrors<FormValues> => {
    const errors: FormikErrors<FormValues> = {};

    if (!values.pmtitle) {
      errors.pmtitle = 'Maintenance title is required';
    }

    if (!values.scheduled_date) {
      errors.scheduled_date = 'Scheduled date is required';
    }

    if (!values.frequency) {
      errors.frequency = 'Frequency is required';
    }

    if (values.frequency === 'custom' && (!values.custom_days || Number(values.custom_days) < 1)) {
      errors.custom_days = 'Custom days must be at least 1';
    }

    if (values.selected_topics.length === 0) {
      errors.selected_topics = 'At least one topic must be selected';
    }

    if (!values.property_id) {
      errors.property_id = 'Property selection is required';
    }

    if (values.before_image_file && values.before_image_file.size > MAX_FILE_SIZE) {
      errors.before_image_file = 'Before image must be less than 5MB';
    }

    if (values.after_image_file && values.after_image_file.size > MAX_FILE_SIZE) {
      errors.after_image_file = 'After image must be less than 5MB';
    }

    return errors;
  };

  const getInitialValues = (): FormValues => {
    if (initialData) {
      const topicIds: number[] = initialData.topics
        ?.map((topic) => (typeof topic === 'object' && 'id' in topic ? topic.id : typeof topic === 'number' ? topic : null))
        .filter((id): id is number => id !== null) || [];

      const machineIds: string[] = initialData.machines
        ?.map((machine) =>
          typeof machine === 'object' && 'machine_id' in machine
            ? machine.machine_id
            : typeof machine === 'string'
            ? machine
            : null
        )
        .filter((id): id is string => id !== null) || [];

      return {
        pmtitle: initialData.pmtitle || '',
        scheduled_date: initialData.scheduled_date
          ? formatDateForInput(new Date(initialData.scheduled_date))
          : formatDateForInput(new Date()),
        completed_date: initialData.completed_date
          ? formatDateForInput(new Date(initialData.completed_date))
          : null,
        frequency: validateFrequency(initialData.frequency || 'monthly'),
        custom_days: initialData.custom_days ?? '',
        notes: initialData.notes || '',
        before_image_file: null,
        after_image_file: null,
        selected_topics: topicIds,
        selected_machine_ids: machineId ? [machineId, ...machineIds.filter((id) => id !== machineId)] : machineIds,
        property_id: initialData.property_id || null,
      };
    }

    return {
      pmtitle: '',
      scheduled_date: formatDateForInput(new Date()),
      completed_date: null,
      frequency: 'monthly',
      custom_days: '',
      notes: '',
      before_image_file: null,
      after_image_file: null,
      selected_topics: [],
      selected_machine_ids: machineId ? [machineId] : [],
      property_id: null,
    };
  };

  const clearError = () => {
    setError(null);
    setSubmitError(null);
  };

  const fetchAvailableTopics = async () => {
    setLoadingTopics(true);
    try {
      const response = await apiClient.get<Topic[]>('/api/topics/');
      setAvailableTopics(response.data);
    } catch (err: any) {
      console.error('Error fetching available topics:', err);
      setError('Failed to load topics. Please try again.');
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchAvailableMachines = async (propertyId: string | null) => {
    setLoadingMachines(true);
    try {
      const params = propertyId ? { property_id: propertyId } : {};
      const response = await apiClient.get<Machine[]>('/api/machines/', { params });
      setAvailableMachines(response.data);
    } catch (err: any) {
      console.error('Error fetching available machines:', err);
      setError('Failed to load machines. Please try again.');
    } finally {
      setLoadingMachines(false);
    }
  };

  useEffect(() => {
    fetchAvailableTopics();
    if (initialData?.property_id) {
      setSelectedProperty(initialData.property_id);
      fetchAvailableMachines(initialData.property_id);
    } else {
      fetchAvailableMachines(null);
    }
  }, [initialData]);

  useEffect(() => {
    if (selectedProperty) {
      fetchAvailableMachines(selectedProperty);
    } else {
      setAvailableMachines([]);
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (pmId && !initialData) {
      setIsLoading(true);
      clearError();

      preventiveMaintenanceService
        .getPreventiveMaintenanceById(pmId)
        .then((response) => {
          if (response.success && response.data) {
            const data = response.data;
            if (data.before_image_url) setBeforeImagePreview(data.before_image_url);
            if (data.after_image_url) setAfterImagePreview(data.after_image_url);
            if (data.property_id) setSelectedProperty(data.property_id);
          } else {
            throw new Error(response.message || 'Failed to fetch maintenance data');
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

  const handleFileSelection = (
    files: File[],
    type: 'before' | 'after',
    setFieldValue: (field: string, value: any) => void
  ) => {
    if (files.length === 0) {
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

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validImageTypes.includes(file.type)) {
      toast.error(`Please upload an image file (JPEG, PNG, or GIF) for ${type === 'before' ? 'Before' : 'After'} image.`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${type === 'before' ? 'Before' : 'After'} image must be less than 5MB`);
      return;
    }

    setFieldValue(type === 'before' ? 'before_image_file' : 'after_image_file', file);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'before') {
        setBeforeImagePreview(reader.result as string);
      } else {
        setAfterImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting, setFieldValue }: { setSubmitting: (isSubmitting: boolean) => void; setFieldValue: (field: string, value: any) => void }
  ) => {
    clearError();
    setIsLoading(true);

    try {
      const submitData: CreatePreventiveMaintenanceData = {
        pmtitle: values.pmtitle.trim() || 'Untitled Maintenance',
        scheduled_date: values.scheduled_date,
        completed_date: values.completed_date || null,
        frequency: values.frequency,
        custom_days: values.frequency === 'custom' && values.custom_days ? Number(values.custom_days) : null,
        notes: values.notes?.trim(),
        topic_ids: values.selected_topics.length > 0 ? values.selected_topics : undefined,
        machine_ids: values.selected_machine_ids.length > 0 ? values.selected_machine_ids : undefined,
        before_image: values.before_image_file instanceof File ? values.before_image_file : undefined,
        after_image: values.after_image_file instanceof File ? values.after_image_file : undefined,
        property_id: values.property_id || undefined,
      };

      if (submitData.before_image || submitData.after_image) {
        setIsImageUploading(true);
      }

      const maintenanceId = pmId || (initialData?.pm_id ?? null);
      let response: ServiceResponse<PreventiveMaintenance>;

      if (maintenanceId) {
        console.log(`Updating maintenance record: ${maintenanceId}`);
        response = await preventiveMaintenanceService.updatePreventiveMaintenance(maintenanceId, submitData);
      } else {
        console.log('Creating new maintenance record');
        response = await preventiveMaintenanceService.createPreventiveMaintenance(submitData);
      }

      if (response.success && response.data) {
        toast.success(maintenanceId ? 'Maintenance record updated successfully' : 'Maintenance record created successfully');
        onSuccessAction(response.data);

        if (!maintenanceId) {
          setFieldValue('pmtitle', '');
          setFieldValue('notes', '');
          setFieldValue('custom_days', '');
          setFieldValue('completed_date', null);
          setFieldValue('selected_topics', []);
          setFieldValue('selected_machine_ids', machineId ? [machineId] : []);
          setFieldValue('property_id', null);
          setFieldValue('before_image_file', null);
          setFieldValue('after_image_file', null);
          setBeforeImagePreview(null);
          setAfterImagePreview(null);
          setSelectedProperty(null);
          createdMaintenanceIdRef.current = null;
        }
      } else {
        throw new Error(response.message || 'Failed to save maintenance record');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      let errorMessage = 'An unexpected error occurred while saving the maintenance record';

      if (error.response?.data) {
        console.error('Error response data:', error.response.data);
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
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
      toast.error(errorMessage);
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
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form aria-label="Preventive Maintenance Form">
            <div className="mb-6">
              <label htmlFor="property_id" className="block text-sm font-medium text-gray-700 mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <Field
                as="select"
                id="property_id"
                name="property_id"
                value={selectedProperty || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const value = e.target.value;
                  setSelectedProperty(value);
                  setFieldValue('property_id', value || null);
                  setFieldValue('selected_machine_ids', machineId ? [machineId] : []);
                }}
                className={`w-full p-2 border rounded-md ${
                  errors.property_id && touched.property_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a Property</option>
                {userProperties?.map((property) => (
                  <option key={property.property_id} value={property.property_id}>
                    {property.name}
                  </option>
                ))}
              </Field>
              {errors.property_id && touched.property_id && (
                <p className="mt-1 text-sm text-red-500">{errors.property_id}</p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="pmtitle" className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Title <span className="text-red-500">*</span>
              </label>
              <Field
                type="text"
                id="pmtitle"
                name="pmtitle"
                className={`w-full p-2 border rounded-md ${
                  errors.pmtitle && touched.pmtitle ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter maintenance title"
              />
              {errors.pmtitle && touched.pmtitle && (
                <p className="mt-1 text-sm text-red-500">{errors.pmtitle}</p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="completed_date" className="block text-sm font-medium text-gray-700 mb-1">
                Completed Date
              </label>
              <Field
                type="date"
                id="completed_date"
                name="completed_date"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
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
                <label htmlFor="custom_days" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Machines</label>
              <div
                className={`border rounded-md p-4 max-h-48 overflow-y-auto bg-white ${
                  errors.selected_machine_ids && touched.selected_machine_ids ? 'border-red-500' : 'border-gray-300'
                }`}
                role="group"
                aria-label="Select machines"
              >
                {loadingMachines ? (
                  <div className="flex justify-center items-center h-24">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="ml-2 text-sm text-gray-500">Loading machines...</p>
                  </div>
                ) : availableMachines.length > 0 ? (
                  <div className="space-y-3">
                    {availableMachines.map((machine) => (
                      <div key={machine.machine_id} className="relative">
                        <label className="flex items-center cursor-pointer">
                          <Field name="selected_machine_ids">
                            {({ field }: any) => (
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                id={`machine-${machine.machine_id}`}
                                checked={field.value.includes(machine.machine_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFieldValue('selected_machine_ids', [...field.value, machine.machine_id]);
                                  } else {
                                    setFieldValue('selected_machine_ids', field.value.filter((id: string) => id !== machine.machine_id));
                                  }
                                }}
                                disabled={machineId === machine.machine_id}
                              />
                            )}
                          </Field>
                          <span className="ml-3 text-sm text-gray-700 flex-1">
                            {machine.name} ({machine.machine_id})
                          </span>
                        </label>
                        {values.selected_machine_ids.includes(machine.machine_id) && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-3">
                      {selectedProperty ? 'No machines available for this property.' : 'Please select a property to load machines.'}
                    </p>
                    {selectedProperty && (
                      <button
                        type="button"
                        onClick={() => fetchAvailableMachines(selectedProperty)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                      >
                        Refresh Machines
                      </button>
                    )}
                  </div>
                )}
              </div>
              {values.selected_machine_ids.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    {values.selected_machine_ids.length} machine{values.selected_machine_ids.length > 1 ? 's' : ''} selected:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {values.selected_machine_ids.map((machineId) => {
                      const machine = availableMachines.find((m) => m.machine_id === machineId);
                      return machine ? (
                        <span
                          key={machine.machine_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {machine.name} ({machine.machine_id})
                          <button
                            type="button"
                            onClick={() => {
                              setFieldValue('selected_machine_ids', values.selected_machine_ids.filter((id) => id !== machine.machine_id));
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                            aria-label={`Remove ${machine.name}`}
                            disabled={machineId === machine.machine_id}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topics <span className="text-red-500">*</span>
              </label>
              {errors.selected_topics && touched.selected_topics && (
                <p className="mt-1 mb-2 text-sm text-red-500">{errors.selected_topics}</p>
              )}
              <div
                className={`border rounded-md p-4 max-h-48 overflow-y-auto bg-white ${
                  errors.selected_topics && touched.selected_topics ? 'border-red-500' : 'border-gray-300'
                }`}
                role="group"
                aria-label="Select maintenance topics"
              >
                {loadingTopics ? (
                  <div className="flex justify-center items-center h-24">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="ml-2 text-sm text-gray-500">Loading topics...</p>
                  </div>
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
                                    setFieldValue('selected_topics', [...field.value, topic.id]);
                                  } else {
                                    setFieldValue('selected_topics', field.value.filter((id: number) => id !== topic.id));
                                  }
                                }}
                              />
                            )}
                          </Field>
                          <span className="ml-3 text-sm text-gray-700 flex-1">{topic.title}</span>
                        </label>
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
              {values.selected_topics.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    {values.selected_topics.length} topic{values.selected_topics.length > 1 ? 's' : ''} selected:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {values.selected_topics.map((topicId) => {
                      const topic = availableTopics.find((t) => t.id === topicId);
                      return topic ? (
                        <span
                          key={topic.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {topic.title}
                          <button
                            type="button"
                            onClick={() => {
                              setFieldValue('selected_topics', values.selected_topics.filter((id) => id !== topic.id));
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Before Image</label>
                <FileUpload
                  onFileSelect={(files: File[]) => handleFileSelection(files, 'before', setFieldValue)}
                  maxFiles={1}
                  maxSize={5}
                  error={errors.before_image_file}
                  touched={touched.before_image_file}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">After Image</label>
                <FileUpload
                  onFileSelect={(files: File[]) => handleFileSelection(files, 'after', setFieldValue)}
                  maxFiles={1}
                  maxSize={5}
                  error={errors.after_image_file}
                  touched={touched.after_image_file}
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
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-between mt-8 gap-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors"
                  disabled={isSubmitting || isLoading}
                >
                  Cancel
                </button>
              )}

              <div className="flex space-x-4">
                {isImageUploading && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                    <span className="text-sm">Uploading images...</span>
                  </div>
                )}

                <button
                  type="submit"
                  className={`px-6 py-2.5 ${
                    isSubmitting || isLoading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <span>{pmId || initialData ? 'Updating...' : 'Creating...'}</span>
                    </div>
                  ) : (
                    <span>{pmId || initialData ? 'Update Maintenance' : 'Create Maintenance'}</span>
                  )}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default PreventiveMaintenanceForm;