"use client";

import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { useSession, signIn } from 'next-auth/react';
import { Label } from "@/app/components/ui/label";
import RoomAutocomplete from './RoomAutocomplete';
import FileUpload from './FileUpload';
import { Room, TopicFromAPI } from '@/app/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface CreateJobButtonProps {
  onJobCreated?: () => void;
}

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
});

const initialValues: FormValues = {
  description: '',
  status: 'pending',
  priority: 'medium',
  remarks: '',
  topic: {
    title: '',
    description: '',
  },
  room: {
    room_id: 0,
    name: '',
    room_type: '',
    is_active: true,
    created_at: new Date().toISOString(),
    properties: [] 
  
  },
  files: [],
  is_defective: false,
};

const CreateJobButton: React.FC<CreateJobButtonProps> = ({ onJobCreated }) => {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [topics, setTopics] = useState<TopicFromAPI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') setOpen(false);
  }, [status]);

  useEffect(() => {
    if (open && status === 'authenticated' && session?.user?.accessToken) {
      fetchData();
    }
  }, [open, status, session?.user?.accessToken]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${session?.user?.accessToken}` };
      const [roomsResponse, topicsResponse] = await Promise.all([
        axiosInstance.get('/api/rooms/', { headers }),
        axiosInstance.get('/api/topics/', { headers })
      ]);
      console.log('Fetched rooms:', roomsResponse.data);
      console.log('Fetched topics:', topicsResponse.data);
      setRooms(roomsResponse.data);
      setTopics(topicsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch necessary data. Please try again.');
    }
  };

  const handleSubmit = async (values: FormValues, { resetForm }: { resetForm: () => void }) => {
    if (!session?.user) {
      setError('Please log in to create a job');
      setOpen(false);
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
      setOpen(false);
      resetForm();
      onJobCreated?.();
    } catch (error) {
      console.error('Error creating job:', error);
      setError(axios.isAxiosError(error) ? error.response?.data?.detail || error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthClick = async () => {
    if (status === 'unauthenticated') {
      await signIn();
      return;
    }
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-11 px-6 flex items-center gap-2"
          onClick={handleAuthClick}
        >
          <Plus className="h-4 w-4" />
          Create Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === 'authenticated' ? (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, setFieldValue }) => (
              <Form className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Field
                    as={Textarea}
                    id="description"
                    name="description"
                    placeholder="Job Description"
                    className={`mb-4 ${
                      touched.description && errors.description ? 'border-red-500' : ''
                    }`}
                  />
                  {touched.description && errors.description && (
                    <span className="text-sm text-red-500">{errors.description}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={values.status}
                      onValueChange={(value) => setFieldValue('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="waiting_sparepart">Waiting Sparepart</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={values.priority}
                      onValueChange={(value) => setFieldValue('priority', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Room</Label>
                  {touched.room?.room_id && errors.room?.room_id && (
                    <span className="text-sm text-red-500 block mb-2">{errors.room.room_id}</span>
                  )}
                  <RoomAutocomplete
                    rooms={rooms}
                    selectedRoom={values.room}
                    onSelect={(selectedRoom) => setFieldValue('room', selectedRoom)}
                  />
                </div>

                <div>
                  <Label>Topic</Label>
                  {touched.topic?.title && errors.topic?.title && (
                    <span className="text-sm text-red-500 block mb-2">{errors.topic.title}</span>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select Topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.title}>
                          {topic.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Images</Label>
                  {touched.files && errors.files && (
                    <span className="text-sm text-red-500 block mb-2">
                      {Array.isArray(errors.files)
                        ? errors.files.map((err, index) => <div key={index}>{JSON.stringify(err)}</div>)
                        : typeof errors.files === "string"
                        ? errors.files
                        : JSON.stringify(errors.files)}
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

                <div className="items-top flex space-x-2">
                  <Checkbox
                    id="is_defective"
                    checked={values.is_defective}
                    onCheckedChange={(checked) => {
                      setFieldValue('is_defective', checked);
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="is_defective"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Defect List
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Check this if the item is defective or needs repair by contractors
                    </p>
                  </div>
                </div>

                <div>
                  <div 
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => setShowRemarks(!showRemarks)}
                  >
                    <Label htmlFor="remarks" className="cursor-pointer flex items-center gap-2">
                      Remarks
                      {showRemarks ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </Label>
                  </div>
                  
                  <div className={`transition-all duration-200 ${showRemarks ? 'max-h-40' : 'max-h-0'} overflow-hidden`}>
                    <Field 
                      as={Textarea} 
                      id="remarks" 
                      name="remarks" 
                      placeholder="Additional notes or remarks"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="py-4 text-center">
            <Button onClick={() => signIn()}>Sign in to create a job</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobButton;