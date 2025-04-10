// ./app/dashboard/Preventive_maintenance/page.tsx
import { Suspense } from 'react';
import { fetchJobs } from '@/app/lib/data.server'; // Import from server file
import PreventiveJobsDashboard from '@/app/components/jobs/PreventiveMaintenanceList';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export default async function PreventivePage() {
  // Fetch session on the server
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.accessToken;

  // Fetch data using server-side function
  const jobs = await fetchJobs(accessToken);
  
  // Debug: Log jobs on the server
  console.log(`Server: Fetched ${jobs?.length || 0} jobs`);
  
  // Add a simple filter to check for preventive maintenance jobs
  // In case the API doesn't filter them for us
  const pmJobs = jobs?.filter(job => job.is_preventivemaintenance === true) || [];
  
  // Debug: Log filtered PM jobs
  console.log(`Server: Found ${pmJobs.length} preventive maintenance jobs`);
  
  // Use initialJobs for passing both sets of jobs to give the component more options
  return (
    <div className="space-y-4">
      <Suspense fallback={<div>Loading...</div>}>
        <PreventiveJobsDashboard 
          initialJobs={jobs || []} 
        />
      </Suspense>
    </div>
  );
}