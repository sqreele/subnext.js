'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Formik, Form, Field, FormikErrors, FormikTouched } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Plus, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { useSession, signIn } from 'next-auth/react';
import { Label } from '@/app/components/ui/label';
import RoomAutocomplete from '@/app/components/jobs/RoomAutocomplete';
import FileUpload from '@/app/components/jobs/FileUpload';
import { Room, TopicFromAPI } from '@/app/lib/types';
import { useRouter } from 'next/navigation';
import { useProperty } from '@/app/lib/PropertyContext'; // Added PropertyContext

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

interface FormValues {
  description: string;
  status: string;
  priority: string;
  remarks: string;
  topic: {
    title: string;
    description: string;
  };
  room: Room | null;
  files: File[];
  is_defective: boolean;
  is_preventivemaintenance: boolean;
}

const validationSchema = Yup.object().shape({
  description: Yup.string().required('Description is required'),
  status: Yup.string().required('Status is required'),
  priority: Yup.string().required('Priority is required'),
  // Make remarks optional by not providing a required() constraint
  remarks: Yup.string().nullable(),
  topic: Yup.object().shape({
    title: Yup.string().required('Topic is required'),
    description: Yup.string(),
  }).required(),
  room: Yup.object()
    .nullable()
    .required('Room selection is required')
    .shape({
      room_id: Yup.number().typeError('Invalid Room ID').required('Room ID missing').min(1, 'Room must be selected'),
      name: Yup.string().required('Room name missing'),
    }),
  files: Yup.array()
    .of(
      Yup.mixed<File>()
        .test('fileSize', 'File too large (max 5MB)', (value) => !value || !(value instanceof File) || value.size <= MAX_FILE_SIZE)
        .test('fileType', 'Only image files allowed', (value) => !value || !(value instanceof File) || value.type.startsWith('image/'))
    )
    .min(1, 'At least one image is required')
    .required('At least one image is required'),
  is_defective: Yup.boolean().default(false),
  is_preventivemaintenance: Yup.boolean().default(false),
});

const initialValues: FormValues = {
  description: '',
  status: 'pending',
  priority: 'medium',
  remarks: '',
  topic: { title: '', description: '' },
  room: null,
  files: [],
  is_defective: false,
  is_preventivemaintenance: false,
};

const CreateJobForm: React.FC<{ onJobCreated?: () => void }> = ({ onJobCreated }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [topics, setTopics] = useState<TopicFromAPI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRemarks, setShowRemarks] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Add PropertyContext integration
  const { selectedProperty, userProperties } = useProperty();
  
  // Get property name for display
  const getPropertyName = useCallback((propertyId: string | null): string => {
    if (!propertyId) return 'No Property Selected';
    const property = userProperties.find(p => p.property_id === propertyId);
    return property?.name || `Property ${propertyId}`;
  }, [userProperties]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.accessToken) {
      fetchData();
    }
  }, [status, session?.user?.accessToken]);

  const fetchData = useCallback(async () => {
    const headers = { Authorization: `Bearer ${session?.user?.accessToken}` };
    try {
      setError(null);
      
      // Make sure we have a selected property
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }
      
      // Get rooms and topics specific to the selected property
      const [roomsResponse, topicsResponse] = await Promise.all([
        axiosInstance.get(`/api/rooms/?property_id=${selectedProperty}`, { headers }),
        axiosInstance.get('/api/topics/', { headers }),
      ]);
      
      if (!Array.isArray(roomsResponse.data)) throw new Error('Invalid format for rooms');
      if (!Array.isArray(topicsResponse.data)) throw new Error('Invalid format for topics');
      
      setRooms(roomsResponse.data);
      setTopics(topicsResponse.data);
    } catch (fetchError) {
      console.error('Error fetching data:', fetchError);
      setError('Failed to load rooms and topics. Please check connection or try again.');
    }
  }, [session?.user?.accessToken, selectedProperty]);

  const handleSubmit = async (
    values: FormValues,
    { resetForm, setSubmitting }: { resetForm: () => void; setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    if (!session?.user) {
      setError('Please log in to create a job');
      await signIn();
      return;
    }
    if (!selectedProperty) {
      setError('Please select a property first');
      setSubmitting(false);
      return;
    }
    if (!values.room) {
      setError('Please select a room.');
      setSubmitting(false);
      return;
    }

    setError(null);

    try {
      const formData = new FormData();
      formData.append('description', values.description.trim());
      formData.append('status', values.status);
      formData.append('priority', values.priority);
      formData.append('room_id', String(values.room.room_id));
      formData.append('topic_title', values.topic.title.trim());
      
      // Remarks field is optional, only append if it has a value
      if (values.remarks?.trim()) {
        formData.append('remarks', values.remarks.trim());
      }
      
      formData.append('user_id', session.user.id);
      formData.append('is_defective', values.is_defective ? 'true' : 'false');
      formData.append('is_preventivemaintenance', values.is_preventivemaintenance ? 'true' : 'false');
      formData.append('property_id', selectedProperty);
      
      values.files.forEach((file) => {
        formData.append('images', file, file.name);
      });

      const response = await axiosInstance.post('/api/jobs/', formData, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });

      console.log('Job created:', response.data);
      resetForm();
      onJobCreated?.();
      router.push('/dashboard/myJobs');
    } catch (submitError) {
      console.error('Error creating job:', submitError);
      let message = 'An unexpected error occurred.';
      if (axios.isAxiosError(submitError)) {
        const responseData = submitError.response?.data as any;
        if (responseData && typeof responseData === 'object') {
          if (responseData.detail) {
            message = responseData.detail;
          } else {
            const fieldErrors = Object.entries(responseData)
              .map(([field, errors]) => `${field}: ${(Array.isArray(errors) ? errors.join(', ') : errors)}`)
              .join('; ');
            if (fieldErrors) message = `Validation Failed: ${fieldErrors}`;
          }
        } else if (submitError.message) {
          message = submitError.message;
        }
      } else if (submitError instanceof Error) {
        message = submitError.message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="text-center p-6">
        <Loader className="inline-block animate-spin mr-2 h-5 w-5" /> Loading session...
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return (
      <div className="text-center p-6 space-y-4">
        <p>Please log in to create a job.</p>
        <Button onClick={() => signIn()}>Log In</Button>
      </div>
    );
  }
  
  if (!selectedProperty) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
        <Alert className="mb-6">
          <AlertDescription>Please select a property first to create a maintenance job.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">Create New Maintenance Job</h2>
      <p className="text-sm text-gray-600 mb-6">
        For property: {getPropertyName(selectedProperty)}
      </p>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
        {({ values, errors, touched, setFieldValue, isSubmitting }) => (
          <Form className="space-y-6">
            <div className="space-y-1">
              <Label htmlFor="description" className="font-medium">
                Description *
              </Label>
              <Field
                as={Textarea}
                id="description"
                name="description"
                placeholder="Enter job description..."
                disabled={isSubmitting}
                className={`w-full min-h-[90px] ${touched.description && errors.description ? 'border-red-500' : 'border-gray-300'}`}
              />
              {touched.description && errors.description && (
                <p className="text-xs text-red-600 mt-1">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-medium">Status *</Label>
                <Select
                  value={values.status}
                  onValueChange={(value) => value && setFieldValue('status', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={touched.status && errors.status ? 'border-red-500' : 'border-gray-300'}>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_sparepart">Waiting Sparepart</SelectItem>
                  </SelectContent>
                </Select>
                {touched.status && errors.status && <p className="text-xs text-red-600 mt-1">{errors.status}</p>}
              </div>
              <div className="space-y-1">
                <Label className="font-medium">Priority *</Label>
                <Select
                  value={values.priority}
                  onValueChange={(value) => value && setFieldValue('priority', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={touched.priority && errors.priority ? 'border-red-500' : 'border-gray-300'}>
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                {touched.priority && errors.priority && <p className="text-xs text-red-600 mt-1">{errors.priority}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-medium">Room *</Label>
              <RoomAutocomplete
                rooms={rooms}
                selectedRoom={values.room}
                onSelect={(selectedRoom) => setFieldValue('room', selectedRoom)}
                disabled={isSubmitting}
              />
              {touched.room && errors.room && (
                <p className="text-xs text-red-600 mt-1">
                  {typeof errors.room === 'string' ? errors.room : (errors.room as FormikErrors<Room>).room_id}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="font-medium">Topic *</Label>
              <Select
                value={values.topic.title}
                onValueChange={(value) => {
                  const topic = topics.find((t) => t.title === value);
                  if (topic) setFieldValue('topic', { title: topic.title, description: topic.description || '' });
                }}
                disabled={isSubmitting || topics.length === 0}
              >
                <SelectTrigger
                  className={touched.topic?.title && errors.topic?.title ? 'border-red-500' : 'border-gray-300'}
                >
                  <SelectValue placeholder="Select Topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.length > 0 ? (
                    topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.title}>
                        {topic.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading topics...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {touched.topic?.title && errors.topic?.title && (
                <p className="text-xs text-red-600 mt-1">{errors.topic.title}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="font-medium">Images *</Label>
              <FileUpload
                onFileSelect={(selectedFiles) => setFieldValue('files', selectedFiles)}
                error={touched.files && typeof errors.files === 'string' ? errors.files : undefined}
                touched={!!touched.files}
                maxFiles={5}
                maxSize={MAX_FILE_SIZE / 1024 / 1024}
                disabled={isSubmitting}
              />
              {touched.files && typeof errors.files === 'string' && (
                <p className="text-xs text-red-600 mt-1">{errors.files}</p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-3">
                <Field
                  as={Checkbox}
                  name="is_defective"
                  id="is_defective"
                  disabled={isSubmitting}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="is_defective" className="text-sm font-medium">
                    Defective Item
                  </Label>
                  <p className="text-xs text-gray-500">Mark if defective or needs contractor repair.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Field
                  as={Checkbox}
                  name="is_preventivemaintenance"
                  id="is_preventivemaintenance"
                  disabled={isSubmitting}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="is_preventivemaintenance" className="text-sm font-medium">
                    Preventive Maintenance
                  </Label>
                  <p className="text-xs text-gray-500">Mark if this is a scheduled preventive job.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1 border-t pt-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowRemarks(!showRemarks)}
                role="button"
                aria-expanded={showRemarks}
                aria-controls="remarks-textarea"
              >
                <Label className="font-medium flex items-center gap-1 cursor-pointer">
                  Remarks <span className="text-xs text-gray-500">(Optional)</span>
                </Label>
                {showRemarks ? (
                  <ChevronUp size={16} className="text-gray-600" />
                ) : (
                  <ChevronDown size={16} className="text-gray-600" />
                )}
              </div>
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  showRemarks ? 'max-h-60 opacity-100 pt-2' : 'max-h-0 opacity-0'
                }`}
              >
                <Field
                  as={Textarea}
                  id="remarks-textarea"
                  name="remarks"
                  placeholder="Add any additional notes..."
                  disabled={isSubmitting}
                  className="w-full min-h-[70px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !session}>
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  'Create Job'
                )}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default CreateJobForm;