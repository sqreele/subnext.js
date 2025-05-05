import { Metadata } from 'next';
import CreatePreventiveMaintenance from '@/app/components/preventive/CreatePreventiveMaintenance';

// Define the metadata for the page
export const metadata: Metadata = {
  title: 'Create Preventive Maintenance',
  description: 'Create a new preventive maintenance task'
};

export default function CreatePreventiveMaintenancePage() {
  return <CreatePreventiveMaintenance />;
}