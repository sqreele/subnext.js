import { Metadata } from 'next';
import EditPreventiveMaintenanceForm from '@/app/components/preventive/ EditPreventiveMaintenance';

// Define the props interface for the page component
interface EditPreventiveMaintenanceDetailPageProps {
  params: {
    id?: string;
  };
}

// Define the metadata for the page
export const metadata: Metadata = {
  title: 'Edit Preventive Maintenance',
  description: 'Edit preventive maintenance task details'
};

export default function EditPreventiveMaintenanceDetailPage({ 
  params 
}: EditPreventiveMaintenanceDetailPageProps) {
  return <EditPreventiveMaintenanceForm params={params} />;
}