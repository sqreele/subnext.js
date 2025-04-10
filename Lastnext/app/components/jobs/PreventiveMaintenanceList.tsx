// app/components/jobs/PreventiveMaintenanceList.tsx with debugging additions
"use client";

import React, { useState, useEffect } from 'react';
import { usePreventiveMaintenanceJobs } from '@/app/lib/hooks/usePreventiveMaintenanceJobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  CheckCircle2, 
  Clock, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  ArrowUpDown,
  Home,
  User,
  Wrench
} from 'lucide-react';
import { Job, JobStatus } from '@/app/lib/types';
import Link from 'next/link';
import { updateJobStatus, fetchJobs } from '@/app/lib/data';
import { cn } from '@/app/lib/utils';

// Extend the Job type to include is_preventivemaintenance
interface ExtendedJob extends Job {
  is_preventivemaintenance?: boolean;
}

interface PreventiveJobsDashboardProps {
  initialJobs?: Job[];
  propertyId?: string;
  limit?: number;
}

export default function PreventiveJobsDashboard({ initialJobs = [], propertyId, limit = 10 }: PreventiveJobsDashboardProps) {
  // Debug: Log initialJobs passed to component
  console.log('Initial jobs passed to PreventiveJobsDashboard:', initialJobs);
  
  const { 
    jobs, 
    isLoading, 
    error, 
    loadJobs, 
    updateJob,
    getStats 
  } = usePreventiveMaintenanceJobs({ 
    propertyId, 
    limit,
    autoLoad: initialJobs.length === 0,
    initialJobs
  });

  // Debug: Log jobs after hook processing
  console.log('Jobs from usePreventiveMaintenanceJobs hook:', jobs);
  console.log('Loading state:', isLoading);
  console.log('Error state:', error);

  // Fallback: If hook doesn't work, directly fetch jobs
  const [fallbackJobs, setFallbackJobs] = useState<Job[]>([]);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);

  useEffect(() => {
    // Only run fallback if hook fails and we have no jobs
    if (!isLoading && jobs.length === 0 && !error) {
      console.log('Attempting fallback direct job fetch');
      const loadFallbackJobs = async () => {
        setIsFallbackLoading(true);
        try {
          const allJobs = await fetchJobs();
          console.log('Fallback fetch returned:', allJobs);
          // Filter for preventive maintenance jobs
          const pmJobs = allJobs.filter(job => 
            job.is_preventivemaintenance === true || 
            // Also check initialJobs filtering as fallback
            initialJobs.some(ij => ij.job_id === job.job_id)
          );
          console.log('Filtered PM jobs:', pmJobs);
          setFallbackJobs(pmJobs);
        } catch (err) {
          console.error('Fallback fetch error:', err);
        } finally {
          setIsFallbackLoading(false);
        }
      };
      loadFallbackJobs();
    }
  }, [isLoading, jobs.length, error, initialJobs]);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortField, setSortField] = useState<'created_at' | 'priority'>('created_at');
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  
  // Use either hook jobs or fallback jobs
  const effectiveJobs = jobs.length > 0 ? jobs : fallbackJobs;
  
  // Debug: Log effective jobs
  console.log('Effective jobs after fallback check:', effectiveJobs);
  
  // IMPORTANT: Don't force is_preventivemaintenance flag if it causes filtering issues
  // Instead, accept jobs that might not have the flag explicitly set
  const enhancedJobs = effectiveJobs.map(job => ({
    ...job,
    // Keep existing value if present, otherwise set to true
    is_preventivemaintenance: job.is_preventivemaintenance !== undefined ? 
      job.is_preventivemaintenance : true
  })) as ExtendedJob[];
  
  // Debug: Log enhanced jobs
  console.log('Enhanced jobs with is_preventivemaintenance:', enhancedJobs);
  
  // Sort jobs
  const sortedJobs = [...enhancedJobs].sort((a, b) => {
    if (sortField === 'created_at') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      // For priority sorting
      const priorityValues = { 'high': 3, 'medium': 2, 'low': 1 };
      const valueA = priorityValues[a.priority as keyof typeof priorityValues] || 0;
      const valueB = priorityValues[b.priority as keyof typeof priorityValues] || 0;
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    }
  });

  // Toggle sort order
  const toggleSort = (field: 'created_at' | 'priority') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle updating job status
  const handleStatusChange = async (jobId: string | number, newStatus: JobStatus) => {
    try {
      setUpdatingJobId(jobId.toString());
      const updatedJob = await updateJobStatus(jobId.toString(), newStatus);
      updateJob(updatedJob);
    } catch (error) {
      console.error('Error updating job status:', error);
    } finally {
      setUpdatingJobId(null);
    }
  };

  // Get status badge color
  const getStatusColor = (status: JobStatus): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'waiting_sparepart':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get statistics about PM jobs (with fallback for when no jobs are present)
  const stats = effectiveJobs.length > 0 
    ? getStats() 
    : {
        total: 0,
        active: 0,
        completed: 0,
        completionRate: 0
      };

  // Debug: Show loading state
  console.log('Final isLoading state:', isLoading || isFallbackLoading);
  
  if (isLoading || isFallbackLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading preventive maintenance jobs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center">
          <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (sortedJobs.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="pt-6 text-center py-12">
          <div className="flex flex-col items-center">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No preventive maintenance jobs found</p>
            <div className="space-y-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/createJob?type=preventive_maintenance">Create Preventive Maintenance Job</Link>
              </Button>
              
              {/* Debug button to show current state */}
              <div className="text-sm text-gray-500 mt-4">
                <p>Debug info: Initial jobs: {initialJobs.length}, Hook jobs: {jobs.length}, Fallback jobs: {fallbackJobs.length}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.alert(JSON.stringify({
                    initialJobsLength: initialJobs.length,
                    hooksJobsLength: jobs.length,
                    fallbackJobsLength: fallbackJobs.length,
                    error: error
                  }, null, 2))}
                  className="mt-2"
                >
                  Show Debug Info
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600 font-medium">Active PM Tasks</p>
              <p className="text-3xl font-bold text-blue-700">{stats.active}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed PM Tasks</p>
              <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-purple-600 font-medium">Completion Rate</p>
              <p className="text-3xl font-bold text-purple-700">{stats.completionRate.toFixed(0)}%</p>
            </div>
            <ArrowUpDown className="h-8 w-8 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Sorting controls */}
      <div className="flex justify-end mb-4 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => toggleSort('created_at')}
          className={cn(
            "flex items-center gap-1",
            sortField === 'created_at' && "border-blue-500 text-blue-600"
          )}
        >
          <Calendar className="h-4 w-4" />
          Date {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => toggleSort('priority')}
          className={cn(
            "flex items-center gap-1",
            sortField === 'priority' && "border-blue-500 text-blue-600"
          )}
        >
          <AlertCircle className="h-4 w-4" />
          Priority {sortField === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
      </div>

      {/* Debug panel - showing how many jobs we have */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded text-sm mb-2">
        <span>Showing {sortedJobs.length} preventive maintenance jobs</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => console.log('Sorted jobs:', sortedJobs)}
          className="text-gray-500"
        >
          Log Data
        </Button>
      </div>

      {/* Job list */}
      <div className="space-y-4">
        {sortedJobs.map(job => (
          <Card key={job.job_id.toString()} className="border hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-teal-600" />
                  {job.topics?.[0]?.title || 'Preventive Maintenance'}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {formatDate(job.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Home className="h-4 w-4" />
                  <span>
                    {job.rooms && job.rooms.length > 0 
                      ? job.rooms[0].name 
                      : 'No room assigned'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  <span>Assigned to: {job.user || 'Unassigned'}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(job.priority)}>
                    {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
                  </Badge>
                  <Badge className={getStatusColor(job.status)}>
                    {job.status.replace('_', ' ').charAt(0).toUpperCase() + job.status.replace('_', ' ').slice(1)}
                  </Badge>
                </div>
                
                <Badge className="bg-teal-100 text-teal-800 border-teal-200 mt-1">
                  <Wrench className="h-3 w-3 mr-1" />
                  Preventive Maintenance
                </Badge>
                
                {job.status !== 'completed' && job.status !== 'cancelled' && (
                  <div className="mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      disabled={!!updatingJobId}
                      onClick={() => handleStatusChange(job.job_id, 'completed')}
                    >
                      {updatingJobId === job.job_id.toString() ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Mark Complete
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-4 pt-2">
              <p className="text-sm text-gray-600 mt-2">
                {job.description || 'Regular preventive maintenance task to ensure optimal equipment performance.'}
              </p>
              
              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/jobs/${job.job_id.toString()}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}