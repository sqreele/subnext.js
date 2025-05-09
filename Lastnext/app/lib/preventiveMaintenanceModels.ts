// Frequency options for dropdown selections
export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' }
];

// Helper function to validate frequency
export function validateFrequency(frequency: string): string {
  const validFrequencies = FREQUENCY_OPTIONS.map(option => option.value);
  return validFrequencies.includes(frequency) ? frequency : 'monthly';
}

// Topic interface
export interface Topic {
  id: number;
  title: string;
  description: string;
}

// Image interface for maintenance images
export interface MaintenanceImage {
  id: string | number;
  image_url: string;
}

// Job data interface
export interface MaintenanceJobData {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  topics?: Topic[];
}

// Complete PreventiveMaintenance model
export interface PreventiveMaintenance {
  pm_id: string;
  pmtitle?: string;
  job?: MaintenanceJobData | string;
  topics?: Topic[] | number[];
  scheduled_date: string;
  completed_date: string | null;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  custom_days: number | null;
  next_due_date: string | null;
  before_image?: MaintenanceImage | null;
  after_image?: MaintenanceImage | null;
  before_image_url?: string | null;
  after_image_url?: string | null;
  notes: string;
}

// Request interface for creating/updating maintenance
export interface PreventiveMaintenanceRequest {
  job_id: string;
  scheduled_date: string;
  frequency: string;
  custom_days: number | null;
  notes: string;
  before_image_id: number | null;
  after_image_id: number | null;
  topic_ids?: number[];
}

// Filter interface for searching
export interface PMFilters {
  pm_id: string;
  status: string;
  topic_id: string;
  date_from: string;
  date_to: string;
}

// Response interface for API
export interface PMResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PreventiveMaintenance[];
  topics: Topic[];
  filters: PMFilters;
}

// Interface for form state management
export interface PMFormState {
  scheduled_date: string;
  frequency: string;
  custom_days: number | null;
  notes: string;
  before_image_id: number | null;
  after_image_id: number | null;
  before_image_file?: File | null;
  after_image_file?: File | null;
  selected_topics: number[];
}

// Interface for form errors
export interface PMFormErrors {
  scheduled_date?: string;
  frequency?: string;
  custom_days?: string;
  job_selection?: string;
}

// Status options for maintenance records
export const MAINTENANCE_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' }
];

// Interface for detail view
export interface PMDetailViewProps {
  pm: PreventiveMaintenance;
  onUpdate?: () => void;
  onDelete?: () => void;
}

// Interface for list view
export interface PMListViewProps {
  pmList: PreventiveMaintenance[];
  totalCount: number;
  topics: Topic[];
  filters: PMFilters;
  onFilterChange: (filters: PMFilters) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
}

// Jobs response interface
export interface MaintenanceJobsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  jobs: MaintenanceJobData[];
}

// Image upload response
export interface ImageUploadResponse {
  success: boolean;
  message: string;
  images?: {
    before?: MaintenanceImage;
    after?: MaintenanceImage;
  };
}

// Service response interface
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// Search params with pagination
export interface SearchParams extends PaginationParams {
  pm_id?: string;
  status?: string;
  topic_id?: string;
  date_from?: string;
  date_to?: string;
}
