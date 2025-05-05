import { Metadata } from 'next';
import PreventiveMaintenanceDashboard from '@/app/components/preventive/PreventiveMaintenanceDashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Preventive maintenance dashboard with statistics and overview'
};

export default function PreventiveMaintenanceDashboardPage() {
  return <PreventiveMaintenanceDashboard />;
}