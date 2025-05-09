// Type definitions for Preventive Maintenance module

// Topic definition
export interface Topic {
    id: number;
    title: string;
    description: string;
  }
  
  // Image definition
  export interface MaintenanceImage {
    id?: number;
    image_url?: string;
  }
  
  // Frequency options
  export const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'biannually', label: 'Bi-Annually' },
    { value: 'annually', label: 'Annually' },
    { value: 'custom', label: 'Custom Days' },
  ];
  
  // Valid frequency values
  export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually' | 'custom';
  
  // Frequency validation helper
  export function validateFrequency(frequency: string): FrequencyType {
    return FREQUENCY_OPTIONS.find(option => option.value === frequency)
      ? (frequency as FrequencyType)
      : 'monthly';
  }
  
  // Preventive Maintenance main interface
  export interface PreventiveMaintenance {
    pm_id: string;
    pmtitle?: string;
    topics: Topic[] | number[];
    scheduled_date: string; 
    completed_date?: string | null;
    frequency: FrequencyType;
    custom_days?: number | null;
    next_due_date?: string | null;
    before_image?: MaintenanceImage | null;
    after_image?: MaintenanceImage | null;
    before_image_url?: string | null;
    after_image_url?: string | null;
    notes?: string;
    status?: string;
  }
  
  // Request structure for creating/updating maintenance
  export interface PreventiveMaintenanceRequest {
    pmtitle?: string;
    scheduled_date: string;
    frequency: FrequencyType;
    custom_days?: number | null;
    notes?: string;
    before_image_id?: number | null;
    after_image_id?: number | null;
    topic_ids?: number[];
  }
  
  // Form errors interface
  export interface PMFormErrors {
    [key: string]: string | undefined;
    pmtitle?: string;
    scheduled_date?: string;
    frequency?: string;
    custom_days?: string;
    notes?: string;
    job_selection?: string;
  }
  
  // API response wrapper
  export interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }
  
  // Maintenance statistics
  export interface PMStatistics {
    counts: {
      total: number;
      completed: number;
      pending: number;
      overdue: number;
    };
  }
  
  // Frequency distribution for statistics
  export interface FrequencyDistribution {
    frequency: string;
    count: number;
  }
  
  // Paginated API response
  export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
  }
  
  // Helper to determine PM status
  export function determinePMStatus(item: PreventiveMaintenance): string {
    // If status is already set, return it
    if (item.status) {
      return item.status;
    }
    
    // Get current date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if completed
    if (item.completed_date) {
      return 'completed';
    }
    
    // Check if scheduled date is in the past
    if (item.scheduled_date) {
      const scheduledDate = new Date(item.scheduled_date);
      if (scheduledDate < today) {
        return 'overdue';
      }
    }
    
    // Default to pending
    return 'pending';
  }
  
  // Helper to get image URL from various formats
  export function getImageUrl(image: MaintenanceImage | null | undefined): string | null {
    if (!image) return null;
    
    // First try to get direct URL property
    if (typeof image === 'object' && 'image_url' in image && image.image_url) {
      return image.image_url;
    }
    
    // If no direct URL but we have an ID, construct URL
    if (typeof image === 'object' && 'id' in image && image.id) {
      return `/api/images/${image.id}`;
    }
    
    // If image is just a string URL
    if (typeof image === 'string') {
      return image;
    }
    
    return null;
  }
  
  // Response format for PM list with included topics
  export interface PMResponse {
    results: PreventiveMaintenance[];
    topics: Topic[];
    count: number;
    next: string | null;
    previous: string | null;
    filters?: {
      pm_id: string;
      status: string;
      topic_id: string;
      date_from: string;
      date_to: string;
    };
  }