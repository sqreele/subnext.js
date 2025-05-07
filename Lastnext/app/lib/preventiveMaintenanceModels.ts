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
  
  // Image model (replacing JobImage)
  export interface MaintenanceImage extends BaseModel {
    id: number;
    maintenance_id: string;
    image: string;
    image_url?: string;  // URL for displaying the image
    uploaded_by: number | string | User;
    uploaded_at: string;
  }
  
  // Before and After image types
  export interface BeforeImage extends MaintenanceImage {}
  export interface AfterImage extends MaintenanceImage {}
  
  // Maintenance Job Data (replacing Job)
  // Not extending BaseModel to avoid id type conflict
  export interface MaintenanceJobData {
    id: string;
    created_at?: string;
    updated_at?: string;
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
    images?: MaintenanceImage[];
    is_preventivemaintenance: boolean;
  }
  
  // Frequency type definition
  export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom';
  
  // Preventive Maintenance model
  export interface PreventiveMaintenance extends BaseModel {
    pm_id: string;
    job: MaintenanceJobData | { id: string };
    job_details?: {
      id: string;
      description: string;
      status: string;
      priority: string;
    };
    scheduled_date: string;
    completed_date?: string | null;
    frequency: FrequencyType;
    custom_days?: number | null;
    next_due_date?: string | null;
    before_image?: BeforeImage | null;
    after_image?: AfterImage | null;
    notes?: string | null;
    created_by: number | string | User;
    status?: 'completed' | 'overdue' | 'pending';  // Virtual field from API
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
    job_id: string;  // This can be kept as a simple ID reference
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
    after_image_file?: File;  // For file uploads
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
  export type PMStatus = 'completed' | 'overdue' | 'scheduled' | 'pending';
  
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
  
  // Helper functions for image uploads
  export interface FileUploadParams {
    file: File;
    entity_id: string;
    field_name: string;
  }
  
  // Form data preparation for PM with image uploads
  export function preparePMFormData(data: PreventiveMaintenanceRequest, beforeImage?: File, afterImage?: File): FormData {
    const formData = new FormData();
    
    // Add basic fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, String(value));
      }
    });
    
    // Add image files if provided
    if (beforeImage) {
      formData.append('before_image_file', beforeImage);
    }
    
    if (afterImage) {
      formData.append('after_image_file', afterImage);
    }
    
    return formData;
  }
  
  // Function to get image URL from a MaintenanceImage object
  export function getImageUrl(image: MaintenanceImage | null | undefined): string | null {
    if (!image) return null;
    return image.image_url || image.image || null;
  }
  
  // Function to determine PM status
  export function determinePMStatus(item: PreventiveMaintenance): PMStatus {
    if (item.status) return item.status as PMStatus;
    
    if (item.completed_date) return 'completed';
    
    const now = new Date();
    const scheduledDate = new Date(item.scheduled_date);
    
    return scheduledDate < now ? 'overdue' : 'pending';
  }