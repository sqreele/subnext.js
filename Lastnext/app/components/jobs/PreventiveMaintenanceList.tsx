import React from 'react';
import { usePreventiveMaintenanceJobs } from '@/app/lib/hooks/usePreventiveMaintenanceJobs';
import { Job } from '@/app/lib/types';

interface PreventiveMaintenanceListProps {
  propertyId: string;
  limit?: number;
}

export default function PreventiveMaintenanceList({ 
  propertyId,
  limit = 10
}: PreventiveMaintenanceListProps) {
  const { 
    jobs, 
    isLoading, 
    error, 
    loadJobs, 
    getStats 
  } = usePreventiveMaintenanceJobs({
    propertyId,
    limit,
    autoLoad: true
  });

  const stats = getStats();

  if (isLoading) {
    return <div className="p-4">Loading preventive maintenance jobs...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{error}</p>
        <button 
          onClick={() => loadJobs()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return <div className="p-4">No preventive maintenance jobs found for this property.</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Preventive Maintenance Summary</h2>
        <div className="grid grid-cols-4 gap-4 mt-2">
          <div className="p-3 bg-gray-100 rounded">
            <div className="text-sm text-gray-500">Total Jobs</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </div>
          <div className="p-3 bg-blue-100 rounded">
            <div className="text-sm text-blue-500">Active</div>
            <div className="text-xl font-bold">{stats.active}</div>
          </div>
          <div className="p-3 bg-green-100 rounded">
            <div className="text-sm text-green-500">Completed</div>
            <div className="text-xl font-bold">{stats.completed}</div>
          </div>
          <div className="p-3 bg-purple-100 rounded">
            <div className="text-sm text-purple-500">Completion Rate</div>
            <div className="text-xl font-bold">{stats.completionRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Preventive Maintenance Jobs</h2>
      <div className="space-y-3">
        {jobs.map((job: Job) => (
          <div key={job.job_id} className="border p-4 rounded shadow-sm">
            <div className="flex justify-between">
              <h3 className="font-medium">{job.title}</h3>
              <span className={`px-2 py-1 rounded text-xs ${
                job.status === 'completed' ? 'bg-green-100 text-green-800' :
                job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {job.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{job.description}</p>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Scheduled: {new Date(job.scheduled_date).toLocaleDateString()}</span>
              {job.assigned_to && <span>Assigned to: {job.assigned_to}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
