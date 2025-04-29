// app/dashboard/Preventive_maintenance/PreventiveMaintenanceDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { usePreventiveMaintenanceJobs } from '@/app/lib/hooks/usePreventiveMaintenanceJobs';
import { Job } from '@/app/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Calendar, CheckCircle2, Clock, AlertTriangle, BarChart, Wrench, FileText, ArrowUpRight } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import Link from 'next/link';

interface PreventiveMaintenanceDashboardProps {
  propertyId: string;
  limit?: number;
}

export default function PreventiveMaintenanceDashboard({ 
  propertyId,
  limit = 10
}: PreventiveMaintenanceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { 
    jobs, 
    isLoading, 
    error, 
    loadJobs, 
    getStats 
  } = usePreventiveMaintenanceJobs({
    propertyId,
    limit,
    autoLoad: true,
    isPM: true // Filter for preventive maintenance jobs
  });

  const stats = getStats();

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  // Group jobs by status for easier filtering
  const jobsByStatus = {
    pending: jobs.filter(job => job.status === 'pending'),
    in_progress: jobs.filter(job => job.status === 'in_progress'),
    completed: jobs.filter(job => job.status === 'completed'),
    waiting_sparepart: jobs.filter(job => job.status === 'waiting_sparepart'),
    cancelled: jobs.filter(job => job.status === 'cancelled')
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <p className="text-gray-500">Loading preventive maintenance data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => loadJobs()}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="w-full border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-700">No Preventive Maintenance Jobs</CardTitle>
          <CardDescription className="text-blue-600">
            No preventive maintenance jobs found for this property.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Wrench className="h-16 w-16 text-blue-300" />
          </div>
          <p className="text-center text-blue-600">
            Preventive maintenance helps keep your property in good condition and prevents costly repairs.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/dashboard/createJob">
              Create Preventive Maintenance Job
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Preventive Maintenance Dashboard</CardTitle>
          <CardDescription>
            Maintenance overview for {currentMonth} {currentYear}
          </CardDescription>
          <p className="text-sm text-gray-500 mt-2">
            Preventive maintenance tasks are scheduled activities performed to prevent equipment failures 
            and extend the lifespan of property assets. Only jobs with <code>is_preventivemaintenance=true</code> are shown here.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gray-50 border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Jobs</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Wrench className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-500">Active</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.active}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-500">Completed</p>
                    <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-500">Completion Rate</p>
                    <p className="text-2xl font-bold text-purple-700">{stats.completionRate.toFixed(1)}%</p>
                  </div>
                  <BarChart className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">{`Pending (${jobsByStatus.pending.length})`}</TabsTrigger>
              <TabsTrigger value="completed">{`Completed (${jobsByStatus.completed.length})`}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <h3 className="text-lg font-medium mb-2">All Preventive Maintenance Jobs</h3>
              {jobs.map((job) => (
                <JobCard key={job.job_id} job={job} />
              ))}
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4">
              <h3 className="text-lg font-medium mb-2">Pending Maintenance Tasks</h3>
              {jobsByStatus.pending.length > 0 ? (
                jobsByStatus.pending.map((job) => (
                  <JobCard key={job.job_id} job={job} />
                ))
              ) : (
                <p className="text-center py-4 text-gray-500">No pending maintenance tasks</p>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              <h3 className="text-lg font-medium mb-2">Completed Maintenance Tasks</h3>
              {jobsByStatus.completed.length > 0 ? (
                jobsByStatus.completed.map((job) => (
                  <JobCard key={job.job_id} job={job} />
                ))
              ) : (
                <p className="text-center py-4 text-gray-500">No completed maintenance tasks</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button variant="outline" className="mr-2" onClick={() => loadJobs()}>
            Refresh Data
          </Button>
          <Button asChild>
            <Link href="/dashboard/createJob">
              Create Maintenance Job
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Job Card Component for displaying individual maintenance jobs
function JobCard({ job }: { job: Job }) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'waiting_sparepart': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  return (
    <Card className="mb-3 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">Job #{job.job_id}</h4>
              <Badge className={cn("capitalize", getStatusColor(job.status))}>
                {job.status.replace('_', ' ')}
              </Badge>
              {job.priority && (
                <Badge variant="outline" className={cn(
                  job.priority === 'high' ? 'text-red-600' : 
                  job.priority === 'medium' ? 'text-amber-600' : 'text-green-600'
                )}>
                  {job.priority}
                </Badge>
              )}
              {job.is_preventivemaintenance && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  PM
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-700">{job.description}</p>
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              <span>Created: {new Date(job.created_at).toLocaleDateString()}</span>
              {job.completed_at && (
                <>
                  <span className="mx-2">•</span>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-500" />
                  <span>Completed: {new Date(job.completed_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="sm:self-start mt-2 sm:mt-0 shrink-0">
            <Link href={`/dashboard/jobs/${job.job_id}`}>
              <FileText className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}