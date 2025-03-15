// ./app/dashboard/page.tsx
import { Suspense } from 'react';
import { fetchJobsForProperty, fetchProperties } from '@/app/lib/data.server';
import JobsContent from '@/app/dashboard/JobsContent';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export const dynamic = 'force-dynamic'; // Ensure dynamic rendering

export default async function DashboardPage() {
  // Fetch session on the server
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.accessToken;

  // Fetch data using server-side functions
  const properties = await fetchProperties(accessToken);
  const firstPropertyId = properties[0]?.property_id;
  const jobs = firstPropertyId ? await fetchJobsForProperty(firstPropertyId, accessToken) : [];

  return (
    <div className="space-y-4 p-4 sm:p-8 w-full">
   
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-4 text-sm sm:text-base text-gray-500">
            Loading jobs and properties...
          </div>
        }
      >
        <JobsContent jobs={jobs} properties={properties} />
      </Suspense>
    </div>
  );
}