import { Metadata } from 'next';
import CompletePreventiveMaintenance from '@/app/components/preventive/CompletePreventiveMaintenance';

interface CompletePreventiveMaintenancePageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: 'Complete Preventive Maintenance',
  description: 'Mark preventive maintenance task as completed',
};

export default function CompletePreventiveMaintenancePage({
  params,
}: CompletePreventiveMaintenancePageProps) {
  return <CompletePreventiveMaintenance params={params} />;
}
