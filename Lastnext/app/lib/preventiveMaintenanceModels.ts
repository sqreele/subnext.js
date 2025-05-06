// TypeScript models for Preventive Maintenance module
// @path: @/app/lib/preventiveMaintenanceModels.ts

// Base model with common properties
export interface BaseModel {
  id?: number;
  created_at?: string;
  updated_at?: string;
}

// User model (simplified)
export interface User {
  id?: number;
  username: string;
  email?: string;
  profile_image?: string | null;
}

// Property model
export interface Property extends BaseModel {
  property_id: string;
  name: string;
  description?: string | null;
  users?: User[];
  is_preventivemaintenance?: boolean;
}

// Room model
export interface Room extends BaseModel {
  room_id: number;
  name: string;
  room_type: string;
  is_active: boolean;
  properties?: Property[];
}

// Topic model
export interface Topic extends BaseModel {
  id: number;
  title: string;
  description?: string | null;
}

// Job Image model
export interface JobImage extends BaseModel {
  id: number;
  job_id?: string;
  image: string;
  image_url: string;
  uploaded_by: string | User;
  uploaded_at: string;
}

// Maintenance Job model
export interface Job extends BaseModel {
  job_id: string;
  user?: User;
  updated_by?: User | null;
  description: string;
  status: 'pending' | 'in_progress' | 'waiting_sparepart' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  remarks?: string;
  completed_at?: string | null;
  is_defective: boolean;
  rooms?: Room[];
  topics?: Topic[];
  images?: JobImage[];
  is_preventivemaintenance: boolean;
}

// Frequency type definition
export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom';

// Preventive Maintenance model
export interface PreventiveMaintenance extends BaseModel {
  pm_id: string;
  job: Job | { job_id: string };
  job_details?: {
    job_id: string;
    description: string;
    status: string;
    priority: string;
  };
  scheduled_date: string;
  completed_date?: string | null;
  frequency: FrequencyType;
  custom_days?: number | null;
  next_due_date?: string | null;
  before_image?: JobImage | null;
  after_image?: JobImage | null;
  before_image_url?: string | null;
  after_image_url?: string | null;
  notes?: string | null;
  created_by: string | User;
}

// Frequency distribution type
export interface FrequencyDistribution {
  frequency: string;
  count: number;
}

// PM Statistics Response
export interface PMStatistics {
  counts: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  frequency_distribution: FrequencyDistribution[];
  upcoming: PreventiveMaintenance[];
}

// Request/Response interfaces for API calls

// Create/Update PM Request
export interface PreventiveMaintenanceRequest {
  job_id: string;
  scheduled_date: string;
  frequency: string;
  custom_days?: number | null;
  notes?: string | null;
  before_image_id?: number | null;
  after_image_id?: number | null;
}

// Complete PM Request
export interface CompletePMRequest {
  completed_date?: string;
  notes?: string | null;
  after_image_id?: number | null;
}

// PM List Query Parameters
export interface PMListParams {
  status?: 'all' | 'pending' | 'completed' | 'overdue';
  frequency?: string;
  job_id?: string;
  property_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// API Response Pagination
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Error Response
export interface ApiError {
  detail?: string;
  [key: string]: any;
}

// PM Status Type
export type PMStatus = 'completed' | 'overdue' | 'scheduled';

// Export frequency options for dropdown menus
export const FREQUENCY_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom' }
];

// Export status filter options
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' }
];

// Helper function to validate frequency values
export function isValidFrequency(frequency: string): frequency is FrequencyType {
  return FREQUENCY_OPTIONS.some(option => option.value === frequency);
}

// Safely convert a string to a valid frequency type
export function validateFrequency(frequency: string): FrequencyType {
  if (isValidFrequency(frequency)) {
    return frequency;
  }
  console.warn(`Invalid frequency value received: ${frequency}. Defaulting to 'monthly'.`);
  return "monthly";
}
