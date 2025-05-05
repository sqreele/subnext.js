import { Metadata } from 'next';
import CompletePreventiveMaintenance from '@/app/components/preventive/CompletePreventiveMaintenance';

// Define the props interface for the page component
interface CompletePreventiveMaintenancePageProps {
  params: {
    id?: string;
  };
}

// Define the metadata for the page
export const metadata: Metadata = {
  title: 'Complete Preventive Maintenance',
  description: 'Mark preventive maintenance task as completed'
};

export default function CompletePreventiveMaintenancePage({ 
  params 
}: CompletePreventiveMaintenancePageProps) {
  return <CompletePreventiveMaintenance params={params} />;
}