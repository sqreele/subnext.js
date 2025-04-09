'use client';

import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
  room: Room;
  files: File[];
  is_defective: boolean;
  is_preventivemaintenance: boolean;
}

const validationSchema = Yup.object().shape({
  description: Yup.string().required('Description is required'),
  status: Yup.string().required('Status is required'),
  priority: Yup.string().required('Priority is required'),
  remarks: Yup.string().nullable(),
  topic: Yup.object().shape({
    title: Yup.string().required('Topic is required'),
  }),
  room: Yup.object().shape({
    room_id: Yup.number().required('Room must be selected').min(1, 'Room must be selected'),
  }),
  files: Yup.array()
    .min(1, 'At least one image is required')
    .test('fileSize', 'One or more files are larger than 5MB', (files) => {
      if (!files) return true;
      return files.every((file) => file.size <= MAX_FILE_SIZE);
    })
    .test('fileType', 'Only image files are allowed', (files) => {
      if (!files) return true;
      return files.every((file) => file.type.startsWith('image/'));
    }),
  is_defective: Yup.boolean().default(false),
  is_preventivemaintenance: Yup.boolean().default(false),
});

const initialValues: FormValues = {
  description: '',
  status: 'pending',
  priority: 'medium',
  remarks: '',
  topic: { title: '', description: '' },
  room: { room_id: 0, name: '', room_type: '', is_active: true, created_at: new Date().toISOString(), property: 0, properties: [] },
  files: [],
  is_defective: false,
  is_preventivemaintenance: false,
};

const CreateJobForm: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [topics, setTopics] = useState<TopicFromAPI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.accessToken) {
      fetchData();
    }
  }, [status, session?.user?.accessToken]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${session?.user?.accessToken}` };
      const [roomsResponse, topicsResponse] = await Promise.all([
        axiosInstance.get('/api/rooms/', { headers }),
        axiosInstance.get('/api/topics/', { headers }),
      ]);
      setRooms(roomsResponse.data);
      setTopics(topicsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load rooms and topics.');
    }
  };

  const handleSubmit = async (values: FormValues, { resetForm }: { resetForm: () => void }) => {
    if (!session?.user) {
      setError('Please log in to create a job');
      await signIn();
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      const payload = {
        description: values.description.trim(),
        status: values.status,
        priority: values.priority,
        room_id: values.room.room_id,
        topic_data: JSON.stringify({
          title: values.topic.title.trim(),
          description: values.topic.description.trim(),
        }),
        remarks: values.remarks?.trim() || 'No remarks provided',
        username: session.user.username,
        user_id: session.user.id,
        is_defective: values.is_defective,
        is_preventivemaintenance: values.is_preventivemaintenance,
      };

      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      values.files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await axiosInstance.post('/api/jobs/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });

      console.log('Job created:', response.data);
      resetForm();
      router.push('/dashboard/myJobs');
    } catch (error) {
      console.error('Error creating job:', error);
      setError(axios.isAxiosError(error) ? error.response?.data?.detail || error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <div className="text-center text-base text-gray-500 py-4">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center space-y-4 py-4">
        <p className="text-base text-gray-700">Please log in to create a job.</p>
        <Button onClick={() => signIn()} variant="outline" className="w-full h-12 text-base bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-4 sm:p-6">
      {error && (
        <Alert variant="destructive" className="mb-6 bg-red-50 text-red-700 border border-red-200">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({ values, errors, touched, setFieldValue }) => (
          <Form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium text-gray-700">Description</Label>
              <Field
                as={Textarea}
                id="description"
                name="description"
                placeholder="Enter job description"
                className={`w-full min-h-24 text-base px-4 py-3 bg-white border ${touched.description && errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {touched.description && errors.description && (
                <span className="text-sm text-red-500">{errors.description}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-700">Status</Label>
              <Select value={values.status} onValueChange={(value) => setFieldValue('status', value)}>
                <SelectTrigger className="w-full h-12 text-base bg-white border-gray-300">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md">
                  <SelectItem value="pending" className="text-base py-2.5 hover:bg-gray-50">Pending</SelectItem>
                  <SelectItem value="in_progress" className="text-base py-2.5 hover:bg-gray-50">In Progress</SelectItem>
                  <SelectItem value="completed" className="text-base py-2.5 hover:bg-gray-50">Completed</SelectItem>
                  <SelectItem value="waiting_sparepart" className="text-base py-2.5 hover:bg-gray-50">Waiting Sparepart</SelectItem>
                  <SelectItem value="cancelled" className="text-base py-2.5 hover:bg-gray-50">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-700">Priority</Label>
              <Select value={values.priority} onValueChange={(value) => setFieldValue('priority', value)}>
                <SelectTrigger className="w-full h-12 text-base bg-white border-gray-300">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md">
                  <SelectItem value="low" className="text-base py-2.5 hover:bg-gray-50">Low</SelectItem>
                  <SelectItem value="medium" className="text-base py-2.5 hover:bg-gray-50">Medium</SelectItem>
                  <SelectItem value="high" className="text-base py-2.5 hover:bg-gray-50">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-700">Room</Label>
              {touched.room?.room_id && errors.room?.room_id && (
                <span className="text-sm text-red-500 block">{errors.room.room_id}</span>
              )}
              <RoomAutocomplete
                rooms={rooms}
                selectedRoom={values.room}
                onSelect={(selectedRoom) => setFieldValue('room', selectedRoom)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-700">Topic</Label>
              {touched.topic?.title && errors.topic?.title && (
                <span className="text-sm text-red-500 block">{errors.topic.title}</span>
              )}
              <Select
                value={values.topic.title}
                onValueChange={(value) => {
                  const selectedTopic = topics.find((t) => t.title === value);
                  if (selectedTopic) {
                    setFieldValue('topic', {
                      title: selectedTopic.title,
                      description: selectedTopic.description || '',
                    });
                  }
                }}
              >
                <SelectTrigger className="w-full h-12 text-base bg-white border-gray-300">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md">
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.title} className="text-base py-2.5 hover:bg-gray-50">
                      {topic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-700">Images</Label>
              {touched.files && errors.files && (
                <span className="text-sm text-red-500 block">
                  {typeof errors.files === 'string' ? errors.files : 'Invalid file input'}
                </span>
              )}
              <FileUpload
                onFileSelect={(selectedFiles) => setFieldValue('files', selectedFiles)}
                error={errors.files as string | undefined}
                touched={touched.files as boolean | undefined}
                maxFiles={5}
                maxSize={5}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <Checkbox
                  id="is_defective"
                  checked={values.is_defective}
                  onCheckedChange={(checked) => setFieldValue('is_defective', checked)}
                  className="mt-1 h-5 w-5 border-gray-300 bg-white"
                />
                <div className="space-y-1">
                  <label htmlFor="is_defective" className="text-base font-medium text-gray-700">
                    Defective Item
                  </label>
                  <p className="text-sm text-gray-500">Mark if defective or needs contractor repair</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <Checkbox
                  id="is_preventivemaintenance"
                  checked={values.is_preventivemaintenance}
                  onCheckedChange={(checked) => setFieldValue('is_preventivemaintenance', checked)}
                  className="mt-1 h-5 w-5 border-gray-300 bg-white"
                />
                <div className="space-y-1">
                  <label htmlFor="is_preventivemaintenance" className="text-base font-medium text-gray-700">
                    Preventive Maintenance
                  </label>
                  <p className="text-sm text-gray-500">Mark if this is a preventive maintenance job</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-200 pt-4">
              <div 
                className="flex items-center justify-between cursor-pointer py-2"
                onClick={() => setShowRemarks(!showRemarks)}
              >
                <Label className="text-base font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                  Remarks
                  {showRemarks ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </Label>
              </div>
              <div className={`transition-all duration-200 ${showRemarks ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <Field 
                  as={Textarea} 
                  id="remarks" 
                  name="remarks" 
                  placeholder="Add notes (optional)"
                  className="w-full min-h-24 text-base px-4 py-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isSubmitting ? 'Creating...' : 'Create Job'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/myJobs')}
                disabled={isSubmitting}
                className="w-full h-12 text-base bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default CreateJobForm;
