// ./app/lib/types.ts

import { DateRange } from "react-day-picker"; // Ensure this import is correct based on your project setup
import 'next-auth'; // Required for module augmentation

// --- NextAuth Module Augmentation ---
// Extend the built-in NextAuth session and JWT types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;           // Changed to string if using string IDs (e.g., UUIDs from Prisma/DB)
      username: string;
      email: string | null;
      profile_image: string | null;
      positions: string;      // Consider if this should be string[] or a specific enum/type
      properties: Property[]; // Array of Property objects
      accessToken: string;
      refreshToken: string;
      accessTokenExpires?: number; // Optional: For client-side expiration checks
      sessionToken?: string;       // Optional: If storing DRF session token
      created_at: string;       // User creation timestamp
      error?: string;            // Optional: For auth errors
    };
    // Add other session properties if needed
    expires: string; // Default NextAuth session expiry
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    properties: Property[]; // Store serialized properties if possible/needed
    accessToken: string;
    refreshToken: string;
    accessTokenExpires?: number;
    created_at?: string;
    error?: string;
    // Add other JWT claims if needed (e.g., roles, permissions)
    iat?: number;
    exp?: number;
    jti?: string;
  }
}

// --- Reusable User Type (Matches Session User structure) ---
export interface User {
  id: string;
  username: string;
  email: string | null;
  profile_image: string | null;
  positions: string;
  properties: Property[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpires?: number;
  sessionToken?: string;
  created_at: string;
}

// --- Profile-related Types ---
export interface ProfileImage { // Simplified - might not be needed if UserProfile used directly
  profile_image: string | null; 
  properties: Property[]; // <<< Ensure this syntax is EXACTLY like this
  // Other fields might not be needed here if UserProfile is the main source
}

export interface UserProfile {
  id: string; // UserProfile ID (might differ from User ID)
  user: string; // Typically the User ID it links to
  username: string;
  email: string | null;
  profile_image: string | null;
  positions: string;
  properties: Property[]; // Properties associated with this user's profile
  created_at: string; // User creation timestamp (often from related User)
}

export interface UserContextType {
  userProfile: UserProfile | null;
  selectedProperty: string | null; // Assuming property ID is string
  setSelectedProperty: (propertyId: string | null) => void; // Allow setting null
  loading: boolean;
  error: string | null;                   // <<< ADDED error property
  refetch: () => Promise<UserProfile | null>;
}


// --- Job-related Types ---
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'waiting_sparepart';
export type JobPriority = 'low' | 'medium' | 'high';

export interface JobImage {
  id: number;
  image_url: string; // URL provided by the backend serializer
  uploaded_by?: number | string | User | null; // ID or nested user object depending on serializer depth
  uploaded_at: string; // ISO date string
}

export interface Topic {
  id: number; // Assuming ID is always present when fetched
  title: string;
  description: string | null; // Allow null description based on model
}

export interface TopicFromAPI { // Keep if API structure differs slightly from Topic
  id: number;
  title: string;
  description: string | null; // Allow null description based on model
}


export interface Room {
  room_id: number; // Assuming primary key is integer
  name: string;
  room_type: string;
  is_active: boolean;
  created_at: string; // ISO date string
  // Based on model, Room links to Property via ManyToMany 'properties'
  // Backend serializer might provide property IDs or nested Property objects
  properties?: (number | string | Property)[]; // IDs or nested objects
  // Remove property_id / property if not directly on Room model/serializer output
}

export interface Job {
  id: number; // Primary key from DB
  job_id: string; // Custom generated job ID string
  description: string;
  status: JobStatus;
  priority: JobPriority;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  completed_at: string | null; // Allow null
  user: number | string | User; // User ID or nested User object
  updated_by?: number | string | User | null; // Optional user who last updated
  profile_image?: ProfileImage | null; // Might be redundant if user object contains it
  images?: JobImage[]; // Array of job images
  topics?: Topic[]; // Array of topics
  rooms?: Room[]; // Array of rooms (usually just one based on serializer logic?)
  // properties?: number[]; // Seems unlikely based on model structure
  property_id?: string | number; // Often inferred from Room or passed separately
  remarks?: string | undefined | null; // Allow undefined or null based on usage
  is_defective?: boolean; // Use boolean type
  image_urls?: string[]; // Redundant if images array provides URLs? Check serializer
  is_preventivemaintenance?: boolean; // Use boolean type
}

// --- Property-related Types ---
export interface Property {
  // id?: string | number; // Might not be present if property_id is the identifier
  property_id: string; // Custom generated ID string
  name: string;
  description: string | null; // Allow null based on model
  // users?: (number | string | User)[]; // User IDs or nested objects based on serializer
  created_at: string; // ISO date string
  rooms?: Room[]; // Nested rooms if serialized that way
  // Remove properties?: Property[]; - self-reference seems unlikely here
}


// --- Component Prop Types (Examples) ---
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
  // Adjust type based on what represents a user in filters (ID, username?)
  users: (string | { id: string; username: string })[];
  selectedUser: string | null;
  onSelectUser: (user: string | null) => void;
}

// --- Filters and Sorting ---
export type TabValue = 'all' | 'waiting_sparepart' | 'pending' | 'completed' | 'cancelled' | 'defect' | 'preventive_maintenance';
export type SortOrder = 'Newest first' | 'Oldest first'; // Consider 'asc' | 'desc' for programmatic use

// Filter state used by components and potentially API calls
export interface FilterState {
  search: string;                 // Search term
  status: JobStatus | "all";      // Job status filter ('all' means no filter)
  priority: JobPriority | "all";    // Job priority filter ('all' means no filter) - CORRECTED
  dateRange?: DateRange;          // Date range object from react-day-picker
  is_preventivemaintenance?: boolean | null; // Filter by PM flag (null means ignore)
  is_defective?: boolean | null;   // Filter by defect flag (null means ignore)

  // Optional filters based on your UI/API capabilities
  user?: string | null;           // Filter by user ID or username?
  topic?: string | number | null; // Filter by topic ID or title?
  room?: string | number | null;  // Filter by room ID or name?
  property?: string | number | null;// Filter by property ID?
}

// Example Sort State (adjust based on actual sortable fields)
export interface SortState {
  field: 'created_at' | 'updated_at' | 'completed_at' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}


// --- API Responses ---
// Generic wrapper if your API uses one (optional)
export interface ApiResponse<T = any> {
  success?: boolean; // Indicate success/failure
  data?: T;          // The actual payload
  message?: string;  // Optional message
  error?: string;    // Optional error string
}

// Standard DRF pagination structure
export interface PaginatedResponse<T> {
  count: number;         // Total number of items matching filters
  next: string | null;   // URL for the next page
  previous: string | null;// URL for the previous page
  results: T[];        // Array of items for the current page
}

// Specific structure if your /api/jobs endpoint returns this directly (unlikely with DRF pagination)
// export interface JobsApiResponse {
//   jobs: Job[];
//   totalPages: number;
//   currentPage: number;
//   totalJobs: number;
//   filters?: Partial<FilterState>; // Echo back filters? Optional.
// }

export interface JobsPDFProps { // Props for a PDF generation component
  jobs: Job[];
  filter: TabValue;
}


// --- UI Constants ---
export const STATUS_COLORS: Record<JobStatus, string> = {
  pending: '#FFA500', // Orange
  waiting_sparepart: '#87CEEB', // SkyBlue (adjust color)
  completed: '#008000', // Green
  cancelled: '#FF0000', // Red
  in_progress: '#9B59B6', // Purple
};

export const FILTER_TITLES: Record<TabValue, string> = {
  all: 'All Jobs Report',
  waiting_sparepart: 'Waiting Parts Report', // Corrected title
  pending: 'Pending Jobs Report',
  completed: 'Completed Jobs Report',
  cancelled: 'Cancelled Jobs Report',
  defect: 'Defective Jobs Report',
  preventive_maintenance: 'Preventive Maintenance Report',
};

export const PRIORITY_COLORS: Record<JobPriority, string> = {
  low: '#4CAF50',    // Green
  medium: '#FF9800', // Orange
  high: '#F44336',   // Red
};

// ShadCN Variant mappings (ensure these variant names exist in your Button/Badge theme)
export const PRIORITY_VARIANTS = {
  high: 'destructive',
  medium: 'secondary', // Or 'warning' if you have one
  low: 'outline',    // Or 'success' if you have one
  default: 'default',
} as const; // Use const assertion for stricter typing

export const STATUS_VARIANTS = {
  completed: 'outline',   // Or 'success'
  in_progress: 'secondary', // Or 'info'
  pending: 'default',   // Or 'warning'
  cancelled: 'destructive',
  waiting_sparepart: 'default', // Or a distinct color/variant
  default: 'default',
} as const;


// --- Other Misc Types ---
export interface RegisterFormData { // For user registration form
  username: string;
  email: string;
  password: string;
}

export interface ErrorState { // Simple error state shape
  message: string;
  field?: string; // Optional field association
}

export const ITEMS_PER_PAGE = 10; // Default items per page (can be overridden)
export const MAX_VISIBLE_PAGES = 5; // For pagination UI component


// --- Search Feature Types ---
export interface SearchCriteria {
  query?: string;
  category?: 'Jobs' | 'Properties' | 'All'; // Example categories
  status?: string; // Could be JobStatus or other status types
  dateRange?: {
    start?: string; // ISO Date string
    end?: string;   // ISO Date string
  };
  page?: number;
  pageSize?: number;
}

export interface SearchResponse { // Example structure for combined search results
  jobs: Job[];
  properties: Property[];
  totalCount: number; // Total across all categories matching criteria
  error?: string;     // Optional error message
}


// --- DRF Specific Error Types ---
// For detailed validation errors from DRF serializers
export interface DRFValidationError {
  [key: string]: string[]; // Field name -> array of error strings
}

// General structure for DRF error responses (can include detail or field errors)
export interface DRFErrorResponse {
  detail?: string; // Common for authentication errors, not found, etc.
  // Can also include specific field errors matching DRFValidationError structure
  [key: string]: string | string[] | undefined;
}


// --- Page Prop Types (Example for Next.js App Router) ---
export type PageProps<TParams = { jobId: string }, TSearchParams = { [key: string]: string | string[] | undefined }> = {
  params: TParams;
  searchParams: TSearchParams;
};