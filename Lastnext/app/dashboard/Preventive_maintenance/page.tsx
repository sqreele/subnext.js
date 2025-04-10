// ./app/dashboard/Preventive_maintenance/page.tsx
import { Suspense } from 'react';
import { fetchJobs } from '@/app/lib/data.server'; // Import from server file
import PreventiveMaintenanceList from '@/app/components/jobs/PreventiveMaintenanceList';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export default async function PreventivePage() {
  // Fetch session on the server
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.accessToken;

  // Fetch data using server-side function
  const jobs = await fetchJobs(accessToken);

  return (
    <div className="space-y-4">
      <Suspense fallback={<div>Loading...</div>}>
        <PreventiveMaintenanceList initialJobs={jobs || []} />
      </Suspense>
    </div>
  );
}