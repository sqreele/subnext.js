'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  PMStatistics, 
  PreventiveMaintenance,
  FrequencyDistribution,
  JobImage,
  getImageUrl as getImageUrlHelper,
  determinePMStatus
} from '@/app/lib/preventiveMaintenanceModels';
import preventiveMaintenanceService from '@/app/lib/PreventiveMaintenanceService';

// Define types for the component state
interface PMDashboardState {
  counts: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  frequency_distribution: FrequencyDistribution[];
  upcoming: PreventiveMaintenance[];
}

export default function PreventiveMaintenanceDashboard() {
  // Initialize state with properly typed initial values
  const [stats, setStats] = useState<PMDashboardState>({
    counts: { total: 0, completed: 0, pending: 0, overdue: 0 },
    frequency_distribution: [],
    upcoming: []
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const data = await preventiveMaintenanceService.getPreventiveMaintenanceStats();
        
        // Type guard to ensure data has the expected shape
        const processedData: PMDashboardState = {
          counts: data.counts || { total: 0, completed: 0, pending: 0, overdue: 0 },
          frequency_distribution: Array.isArray(data.frequency_distribution) ? 
            data.frequency_distribution : [],
          upcoming: Array.isArray(data.upcoming) ? data.upcoming : []
        };
        
        setStats(processedData);
      } catch (err: any) {
        console.error('Error fetching statistics:', err);
        setError(err.message || 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Format date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get completion rate percentage
  const getCompletionRate = (): number => {
    if (!stats.counts.total) return 0;
    return Math.round((stats.counts.completed / stats.counts.total) * 100);
  };

  // Status badge styling
  const getStatusBadge = (status: string): string => {
    if (status === 'completed') {
      return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium";
    } else if (status === 'overdue') {
      return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium";
    } else {
      return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium";
    }
  };

  // Extract job ID from PM item
  const getJobId = (item: PreventiveMaintenance): string | null => {
    if (item.job_details?.job_id) {
      return item.job_details.job_id;
    }
    
    if (typeof item.job === 'object' && item.job) {
      return item.job.job_id;
    }
    
    return (item as any).job_id || null;
  };
  
  // Extract job description from PM item
  const getJobDescription = (item: PreventiveMaintenance): string => {
    // First try to get it from job_details
    if (item.job_details?.description) {
      return item.job_details.description;
    }
    
    // Then try from job object
    if (typeof item.job === 'object' && item.job) {
      if ('description' in item.job) {
        return (item.job as any).description;
      }
    }
    
    // Return a default if nothing found
    return 'No description';
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link 
          href="/preventive-maintenance" 
          className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
        >
          View All Maintenance Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Preventive Maintenance Dashboard</h1>
        <div className="flex space-x-3">
          <Link 
            href="/preventive-maintenance" 
            className="bg-gray-100 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-200"
          >
            View All Tasks
          </Link>
          <Link 
            href="/preventive-maintenance/create" 
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Create New
          </Link>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{stats.counts.total}</p>
            </div>
          </div>
        </div>
        
        {/* Pending */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{stats.counts.pending}</p>
            </div>
          </div>
        </div>
        
        {/* Overdue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-3xl font-bold text-red-600">{stats.counts.overdue}</p>
            </div>
          </div>
        </div>
        
        {/* Completed */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.counts.completed}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Completion Progress */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Completion Rate</h2>
        <div className="flex items-center mb-2">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-green-600 h-4 rounded-full" 
              style={{ width: `${getCompletionRate()}%` }}
            ></div>
          </div>
          <span className="ml-4 text-xl font-bold">{getCompletionRate()}%</span>
        </div>
        <p className="text-sm text-gray-500">
          {stats.counts.completed} of {stats.counts.total} maintenance tasks completed
        </p>
      </div>
      
      {/* Frequency Distribution */}
      {stats.frequency_distribution && stats.frequency_distribution.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Maintenance Frequency Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.frequency_distribution.map((item) => (
              <div key={item.frequency} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-gray-900">{item.count}</p>
                <p className="text-sm font-medium text-gray-500 capitalize">
                  {item.frequency.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upcoming Maintenance */}
      {stats.upcoming && stats.upcoming.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-700">Upcoming Maintenance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Images
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.upcoming.map((item) => {
                  // Get job info
                  const jobId = getJobId(item);
                  const jobDescription = getJobDescription(item);
                  
                  // Determine PM status
                  const status = item.status || determinePMStatus(item);
                  
                  // Get image URLs
                  const beforeImageUrl = item.before_image ? getImageUrlHelper(item.before_image) : null;
                  const afterImageUrl = item.after_image ? getImageUrlHelper(item.after_image) : null;
                  
                  return (
                    <tr key={item.pm_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-blue-600">{item.pm_id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {jobId ? (
                          <Link 
                            href={`/maintenance/jobs/${jobId}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {jobId}
                          </Link>
                        ) : (
                          <span>Unknown Job</span>
                        )}
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">
                          {jobDescription}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(item.scheduled_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {beforeImageUrl && (
                            <div className="h-10 w-10 rounded overflow-hidden border">
                              <img 
                                src={beforeImageUrl} 
                                alt="Before" 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          {afterImageUrl && (
                            <div className="h-10 w-10 rounded overflow-hidden border">
                              <img 
                                src={afterImageUrl} 
                                alt="After" 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          {!beforeImageUrl && !afterImageUrl && (
                            <span className="text-xs text-gray-500">No images</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link 
                            href={`/preventive-maintenance/${item.pm_id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          {status !== 'completed' && (
                            <Link 
                              href={`/preventive-maintenance/${item.pm_id}/edit?complete=true`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Complete
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Quick Access */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/preventive-maintenance/create"
            className="flex items-center p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300"
          >
            <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span>Create New Task</span>
          </Link>
          
          <Link 
            href="/preventive-maintenance?status=overdue"
            className="flex items-center p-4 border rounded-lg hover:bg-red-50 hover:border-red-300"
          >
            <div className="p-2 rounded-full bg-red-100 text-red-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>View Overdue Tasks</span>
          </Link>
          
          <Link 
            href="/preventive-maintenance?status=pending"
            className="flex items-center p-4 border rounded-lg hover:bg-yellow-50 hover:border-yellow-300"
          >
            <div className="p-2 rounded-full bg-yellow-100 text-yellow-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>View Pending Tasks</span>
          </Link>
        </div>
      </div>
    </div>
  );
}