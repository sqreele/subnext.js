'use client';

import { useState, ReactNode, MouseEvent, useEffect } from 'react';
import { Job, JobStatus } from '@/app/lib/types';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Circle, Loader2, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// We'll create the axios instance inside the component to access the session
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface UpdateStatusModalProps {
  job: Job;
  onComplete?: () => void;
  children?: ReactNode;
}

export function UpdateStatusModal({ job, onComplete, children }: UpdateStatusModalProps) {
  const { data: session } = useSession();
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>(job.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create axios instance with authentication token
  const getAxiosInstance = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.user?.accessToken) {
      headers['Authorization'] = `Bearer ${session.user.accessToken}`;
    }

    return axios.create({
      baseURL: API_BASE_URL,
      headers
    });
  };

  const statuses = [
    { value: 'pending' as JobStatus, label: 'Pending' },
    { value: 'in_progress' as JobStatus, label: 'In Progress' },
    { value: 'completed' as JobStatus, label: 'Completed' },
    { value: 'cancelled' as JobStatus, label: 'Cancelled' },
    { value: 'waiting_sparepart' as JobStatus, label: 'Waiting for Sparepart' }
  ].filter(status => status.value !== job.status);

  const handleUpdate = async () => {
    if (selectedStatus === job.status) return;

    if (!session?.user?.accessToken) {
      setError('Authentication token is missing. Please sign in again.');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const axiosInstance = getAxiosInstance();
      
      // Log the request for debugging
      console.log(`Updating job ${job.job_id} status to ${selectedStatus}`);
      console.log('Using authorization header:', axiosInstance.defaults.headers.Authorization ? 'Yes' : 'No');
      
      // Make the API request
      const response = await axiosInstance.patch(`/api/jobs/${job.job_id}/`, {
        status: selectedStatus
      });
      
      console.log('Update successful:', response.data);
      
      // Short delay for better UX
      await delay(300);
      setOpen(false);
      
      // Call onComplete handler if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          
          if (error.response.status === 401 || error.response.status === 403) {
            setError('Authentication failed. Please sign in again.');
          } else {
            setError(error.response.data?.detail || `Server error: ${error.response.status}`);
          }
        } else if (error.request) {
          // The request was made but no response was received
          setError('No response from server. Check your connection.');
        } else {
          // Something happened in setting up the request that triggered an Error
          setError(`Request error: ${error.message}`);
        }
      } else {
        setError('Failed to update status');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = (value: JobStatus) => {
    setSelectedStatus(value);
    setError(null);
  };

  // Stop click event propagation to prevent navigation
  const handleButtonClick = (e: MouseEvent) => {
    // This prevents the click from bubbling up to parent elements
    e.stopPropagation();
  };

  if (job.status === 'completed') return null;

  const triggerButton = children || (
    <Button 
      variant="outline" 
      className="w-full text-sm h-9 bg-white"
      onClick={handleButtonClick}
    >
      Update Status
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={handleButtonClick}>
        {triggerButton}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[425px] max-w-[90vw] bg-white p-4 rounded-lg" 
        onClick={handleButtonClick}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">Update Job Status</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          {error && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <div className="font-medium text-sm text-gray-700">Current Status:</div>
            <div className="px-3 py-2 bg-gray-100 rounded-md text-sm capitalize text-gray-700">
              {job.status.replace('_', ' ')}
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-sm text-gray-700">New Status:</div>
            <div className="space-y-2 bg-gray-50 p-2 rounded-md">
              {statuses.map((status) => (
                <div key={status.value} className="flex items-center gap-3 py-2 px-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(status.value)}
                    className={`flex items-center justify-center w-5 h-5 rounded-full border ${
                      selectedStatus === status.value 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {selectedStatus === status.value && (
                      <Circle className="w-2.5 h-2.5 text-white fill-current" />
                    )}
                  </button>
                  <Label 
                    className="capitalize cursor-pointer text-gray-700" 
                    onClick={() => handleStatusChange(status.value)}
                  >
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isUpdating}
            className="w-full sm:w-auto bg-white text-gray-700 border-gray-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating || selectedStatus === job.status}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}