import { DateRange } from "react-day-picker";
import 'next-auth';

// Extend the built-in NextAuth session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;  // Changed to string to match Prisma
      username: string;
      email: string | null;
      profile_image: string | null;
      positions: string;
      properties: Property[];
      accessToken: string;
      refreshToken: string;
      accessTokenExpires?: number; // Added for token expiration tracking
      sessionToken?: string;  // Added to match DRF Session model
      created_at: string;
      error?: string;
    };
  }
}

// Also extend the JWT type
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    properties: Property[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpires?: number; // Added for token expiration tracking
    created_at?: string;
    error?: string;
  }
}

export interface User {
  id: string;  // Changed to string to match Prisma
  username: string;
  email: string | null;
  profile_image: string | null;
  positions: string;
  properties: Property[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpires?: number; // Added for token expiration tracking
  sessionToken?: string;
  created_at: string;
}

// Profile-related types
export interface ProfileImage {
  profile_image: string;
  positions: string;
  username: string;
  properties: Property[];
}

// Job-related types
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'waiting_sparepart';
export type JobPriority = 'low' | 'medium' | 'high';

export interface JobImage {
  id: number;
  image_url: string;
  uploaded_by: number;
  uploaded_at: string;
}

export interface Topic {
  id?: number;
  title: string;
  description: string;
}

export interface Room {
  room_id: number | string;
  name: string;
  room_type: string;
  is_active: boolean;
  created_at: string;
  property_id?: string | number;
  property?: number| string;
  properties?:number;
}

export interface Job {
  job_id: string | number;
  id?: number;
  description: string;
  status: JobStatus;
  priority: JobPriority;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  user?: string | number;
  profile_image?: ProfileImage | null;
  images?: JobImage[];
  topics?: Topic[];
  rooms?: Room[];
  properties?: number[];
  property_id?: string | number;
  remarks?: string;
  is_defective?: boolean;
  image_urls?: string[];
}

// Property-related types
export interface Property {
  id: string | number; // Optional, as DRF uses property_id as the unique identifier
  name: string;
  description: string;
  property_id: string;
  users: number[] | string[];
  created_at: string;
  rooms?: Room[];
  properties?: Property[];
}

// User-related types
export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  profile_image: string | null;
  positions: string;
  properties: Property[];
  created_at: string; //
}

export interface UserContextType {
  userProfile: UserProfile | null;
  selectedProperty: string | null;
  setSelectedProperty: (propertyId: string) => void;
  loading: boolean;
}

// Component prop types
export interface JobCardProps {
  job: Job;
}

export interface JobListProps {
  jobs: Job[];
}

export interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export interface UserFilterProps {
  users: string[];
  selectedUser: string | null;
  onSelectUser: (user: string | null) => void;
}

// Filters and Sorting
export type TabValue = 'all' | 'waiting_sparepart' | 'pending' | 'completed' | 'cancelled' | 'defect';
export type SortOrder = 'Newest first' | 'Oldest first';

export interface FilterState {
  user: string | null;
  status: JobStatus | null;
  priority: JobPriority | null;
  topic: string | null;
  room: string | null;
  dateRange?: DateRange;
}

export interface SortState {
  field: 'created_at' | 'updated_at' | 'completed_at' | 'priority';
  direction: 'asc' | 'desc';
}

// API Responses
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface JobsApiResponse {
  jobs: Job[];
  totalPages: number;
  currentPage: number;
  totalJobs: number;
  filters: Partial<FilterState>;
}

export interface JobsPDFProps {
  jobs: Job[];
  filter: TabValue;
}

// Constants for UI
export const STATUS_COLORS: Record<JobStatus, string> = {
  pending: '#FFA500',
  waiting_sparepart: '#0000FF',
  completed: '#008000',
  cancelled: '#FF0000',
  in_progress: '#9B59B6',
};

export const FILTER_TITLES: Record<TabValue, string> = {
  all: 'All Jobs Report',
  waiting_sparepart: 'Active Jobs Report',
  pending: 'Pending Jobs Report',
  completed: 'Completed Jobs Report',
  cancelled: 'Cancelled Jobs Report',
  defect: 'Defective Jobs Report',
};

export const PRIORITY_COLORS: Record<JobPriority, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
};

export interface TopicFromAPI {
  id: number;
  title: string;
  description: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
}

export interface ErrorState {
  message: string;
  field?: string;
}

export const ITEMS_PER_PAGE = 5;
export const MAX_VISIBLE_PAGES = 5;

export const PRIORITY_VARIANTS = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
  default: 'default',
} as const;

export const STATUS_VARIANTS = {
  completed: 'outline',
  in_progress: 'secondary',
  pending: 'default',
  cancelled: 'destructive',
  waiting_sparepart: 'default',
  default: 'default',
} as const;

export interface SearchCriteria {
  query?: string;
  category?: 'Jobs' | 'Properties' | 'All';
  status?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  page?: number;
  pageSize?: number;
}

// Search response type
export interface SearchResponse {
  jobs: Job[];
  properties: Property[];
  totalCount: number;
  error?: string;
}

// DRF-specific helper types
export interface DRFValidationError {
  [key: string]: string[];
}

export interface DRFErrorResponse {
  detail?: string;
  [key: string]: string | string[] | undefined;
}

// Page props
export type PageProps = {
  params: { jobId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};
