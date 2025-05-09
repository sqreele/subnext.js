import { fetchData, postData, updateData, patchData, deleteData, uploadFile } from './api-client';
import { 
  PreventiveMaintenance,
  PreventiveMaintenanceRequest,
  ServiceResponse
} from './preventiveMaintenanceModels';

// Define interfaces that are specific to the service
export interface SearchParams {
  pm_id?: string;
  status?: string;
  topic_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  [key: string]: any;
}

export interface PreventiveMaintenanceCompleteRequest {
  completed_date?: string;
  notes?: string;
  before_image_id?: number | null;
  after_image_id?: number | null;
}

// Define a response type for paginated results
interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  [key: string]: any; // For any additional fields
}

// API endpoint configurations based on actual backend URLs
const API_ROUTES = {
  // Main API endpoints
  PM_LIST: '/api/preventive-maintenance/',
  PM_DETAIL: (id: string) => `/api/preventive-maintenance/${id}/`,
  
  // Additional PM endpoints
  JOBS: '/api/preventive-maintenance/jobs/',
  ROOMS: '/api/preventive-maintenance/rooms/',
  
  // Topics endpoint - note this is /api/topics/ not /api/preventive-maintenance/topics/
  TOPICS: '/api/topics/',
  
  // Job preventive maintenance
  JOB_PM: '/api/jobs/preventive-maintenance/',
  
  // ImageUpload
  PM_UPLOAD: (id: string) => `/api/preventive-maintenance/${id}/upload-images/`,
  
  // Extra endpoints that might not exist yet - these will need to be created on the backend
  // or handled differently in the frontend
  PM_COMPLETE: (id: string) => `/api/preventive-maintenance/${id}/complete/`,
  PM_STATS: '/api/preventive-maintenance/stats/',
  PM_UPCOMING: '/api/preventive-maintenance/upcoming/',
  PM_OVERDUE: '/api/preventive-maintenance/overdue/',
};

/**
 * Preventive Maintenance API Service
 * 
 * This service uses the centralized api-client for making requests
 * and handles the specific endpoints for preventive maintenance.
 */
const preventiveMaintenanceService = {
  /**
   * Get all preventive maintenance records with optional filtering
   */
  getAllPreventiveMaintenance: async (params: SearchParams = {}): Promise<ServiceResponse<any>> => {
    try {
      console.log('Getting preventive maintenance items with params:', params);
      
      const data = await fetchData(API_ROUTES.PM_LIST, { params });
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error fetching preventive maintenance records:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch preventive maintenance records'
      };
    }
  },

  /**
   * Get a single preventive maintenance record by ID
   */
  getPreventiveMaintenanceById: async (pmId: string): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const data = await fetchData<PreventiveMaintenance>(API_ROUTES.PM_DETAIL(pmId));
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error(`Error fetching preventive maintenance record ${pmId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to fetch preventive maintenance record ${pmId}`
      };
    }
  },

  /**
   * Create a new preventive maintenance record
   */
  createPreventiveMaintenance: async (data: PreventiveMaintenanceRequest): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      console.log('Creating maintenance with data:', data);
      
      const response = await postData<PreventiveMaintenance, PreventiveMaintenanceRequest>(API_ROUTES.PM_LIST, data);
      
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error('Error creating preventive maintenance record:', error);
      return {
        success: false,
        error: error.message || 'Failed to create preventive maintenance record'
      };
    }
  },

  /**
   * Update an existing preventive maintenance record
   */
  updatePreventiveMaintenance: async (pmId: string, data: PreventiveMaintenanceRequest): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const response = await updateData<PreventiveMaintenance, PreventiveMaintenanceRequest>(API_ROUTES.PM_DETAIL(pmId), data);
      
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error(`Error updating preventive maintenance record ${pmId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to update preventive maintenance record ${pmId}`
      };
    }
  },

  /**
   * Partially update an existing preventive maintenance record
   */
  partialUpdatePreventiveMaintenance: async (pmId: string, data: Partial<PreventiveMaintenanceRequest>): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const response = await patchData<PreventiveMaintenance, Partial<PreventiveMaintenanceRequest>>(API_ROUTES.PM_DETAIL(pmId), data);
      
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error(`Error partially updating preventive maintenance record ${pmId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to partially update preventive maintenance record ${pmId}`
      };
    }
  },

  /**
   * Delete a preventive maintenance record
   */
  deletePreventiveMaintenance: async (pmId: string): Promise<ServiceResponse<any>> => {
    try {
      await deleteData(API_ROUTES.PM_DETAIL(pmId));
      
      return {
        success: true,
        data: null
      };
    } catch (error: any) {
      console.error(`Error deleting preventive maintenance record ${pmId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to delete preventive maintenance record ${pmId}`
      };
    }
  },

  /**
   * Mark a preventive maintenance task as completed
   * This endpoint may need to be implemented on the backend
   */
  completePreventiveMaintenance: async (pmId: string, data: PreventiveMaintenanceCompleteRequest = {}): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      // Prepare completion data
      const completionData: PreventiveMaintenanceCompleteRequest = {
        completed_date: data.completed_date || new Date().toISOString(),
        notes: data.notes || '',
        before_image_id: data.before_image_id || null,
        after_image_id: data.after_image_id || null
      };
      
      // Try to use the dedicated completion endpoint
      try {
        const response = await postData<PreventiveMaintenance, PreventiveMaintenanceCompleteRequest>(
          API_ROUTES.PM_COMPLETE(pmId), 
          completionData
        );
        
        return {
          success: true,
          data: response
        };
      } catch (completeError: any) {
        // If the completion endpoint doesn't exist (404), use a regular update instead
        if (completeError.status === 404) {
          console.warn('Complete endpoint not found, falling back to regular update');
          
          // Get the current record first
          const currentData = await fetchData<PreventiveMaintenance>(API_ROUTES.PM_DETAIL(pmId));
          
          // Update with completion data
          const updatedRecord = {
            ...currentData,
            completed_date: completionData.completed_date,
            notes: completionData.notes || currentData.notes,
            before_image_id: completionData.before_image_id || currentData.before_image?.id || null,
            after_image_id: completionData.after_image_id || currentData.after_image?.id || null
          };
          
          const response = await updateData<PreventiveMaintenance, any>(API_ROUTES.PM_DETAIL(pmId), updatedRecord);
          
          return {
            success: true,
            data: response
          };
        }
        
        // If it's not a 404, pass through the original error
        throw completeError;
      }
    } catch (error: any) {
      console.error(`Error completing preventive maintenance task ${pmId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to complete preventive maintenance task ${pmId}`
      };
    }
  },

  /**
   * Get upcoming preventive maintenance tasks
   * This endpoint may need to be implemented on the backend
   */
  getUpcomingTasks: async (days: number = 30): Promise<ServiceResponse<PreventiveMaintenance[]>> => {
    try {
      // Try to use the dedicated upcoming endpoint
      try {
        const response = await fetchData<PreventiveMaintenance[]>(API_ROUTES.PM_UPCOMING, {
          params: { days }
        });
        
        return {
          success: true,
          data: response
        };
      } catch (upcomingError: any) {
        // If the upcoming endpoint doesn't exist (404), use a regular list with filters instead
        if (upcomingError.status === 404) {
          console.warn('Upcoming endpoint not found, falling back to filtered list');
          
          // Calculate the date for "days" in the future
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + days);
          
          // Get a list of all non-completed maintenance items with scheduled dates in range
          const response = await fetchData<PaginatedResponse<PreventiveMaintenance>>(API_ROUTES.PM_LIST, {
            params: {
              completed: false,
              scheduled_date_before: futureDate.toISOString().split('T')[0]
            }
          });
          
          // If we have results, filter for upcoming maintenance
          if (response && response.results && Array.isArray(response.results)) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            const upcomingItems = response.results
              .filter((item: PreventiveMaintenance) => {
                // Skip completed items
                if (item.completed_date) return false;
                
                // Include items scheduled today or in the future, but within the "days" window
                const scheduledDate = new Date(item.scheduled_date);
                scheduledDate.setHours(0, 0, 0, 0);
                return scheduledDate >= now && scheduledDate <= futureDate;
              })
              .sort((a: PreventiveMaintenance, b: PreventiveMaintenance) => {
                const dateA = new Date(a.scheduled_date);
                const dateB = new Date(b.scheduled_date);
                return dateA.getTime() - dateB.getTime();
              });
            
            return {
              success: true,
              data: upcomingItems
            };
          }
        }
        
        // If it's not a 404, pass through the original error
        throw upcomingError;
      }
    } catch (error: any) {
      console.error('Error fetching upcoming tasks:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch upcoming tasks'
      };
    }
  },

  /**
   * Get overdue preventive maintenance tasks
   * This endpoint may need to be implemented on the backend
   */
  getOverdueTasks: async (): Promise<ServiceResponse<PreventiveMaintenance[]>> => {
    try {
      // Try to use the dedicated overdue endpoint
      try {
        const response = await fetchData<PreventiveMaintenance[]>(API_ROUTES.PM_OVERDUE);
        
        return {
          success: true,
          data: response
        };
      } catch (overdueError: any) {
        // If the overdue endpoint doesn't exist (404), use a regular list with filters instead
        if (overdueError.status === 404) {
          console.warn('Overdue endpoint not found, falling back to filtered list');
          
          // Get current date for comparison
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Get a list of all non-completed maintenance items
          const response = await fetchData<PaginatedResponse<PreventiveMaintenance>>(API_ROUTES.PM_LIST, {
            params: {
              completed: false
            }
          });
          
          // If we have results, filter for overdue maintenance
          if (response && response.results && Array.isArray(response.results)) {
            const overdueItems = response.results
              .filter((item: PreventiveMaintenance) => {
                // Skip completed items
                if (item.completed_date) return false;
                
                // Include items scheduled before today
                const scheduledDate = new Date(item.scheduled_date);
                scheduledDate.setHours(0, 0, 0, 0);
                return scheduledDate < today;
              })
              .sort((a: PreventiveMaintenance, b: PreventiveMaintenance) => {
                // Sort by date (oldest first)
                const dateA = new Date(a.scheduled_date);
                const dateB = new Date(b.scheduled_date);
                return dateA.getTime() - dateB.getTime();
              });
            
            return {
              success: true,
              data: overdueItems
            };
          }
        }
        
        // If it's not a 404, pass through the original error
        throw overdueError;
      }
    } catch (error: any) {
      console.error('Error fetching overdue tasks:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch overdue tasks'
      };
    }
  },

  /**
   * Get preventive maintenance statistics and overview
   * This endpoint may need to be implemented on the backend as it returns 404
   */
  getPreventiveMaintenanceStats: async (): Promise<ServiceResponse<any>> => {
    try {
      // Try to use the stats endpoint, but it may 404
      try {
        const response = await fetchData(API_ROUTES.PM_STATS);
        return {
          success: true,
          data: response
        };
      } catch (statsError) {
        console.warn('Stats endpoint not found, falling back to list endpoint with a limit');
        
        // If the stats endpoint is not available, fall back to getting a limited list
        // and constructing some basic stats from it
        const listResponse = await fetchData<PaginatedResponse<PreventiveMaintenance>>(API_ROUTES.PM_LIST, {
          params: { limit: 50 }
        });
        
        // If we have results, create some basic stats
        if (listResponse && listResponse.results && Array.isArray(listResponse.results)) {
          const items = listResponse.results;
          
          // Calculate counts for different statuses
          const completed = items.filter((item: PreventiveMaintenance) => item.completed_date).length;
          const total = items.length;
          const pending = items.filter((item: PreventiveMaintenance) => !item.completed_date).length;
          const overdue = items.filter((item: PreventiveMaintenance) => {
            if (item.completed_date) return false;
            
            // If scheduled date is in the past, item is overdue
            const scheduledDate = new Date(item.scheduled_date);
            const now = new Date();
            return scheduledDate < now;
          }).length;
          
          // Create a basic frequency distribution
          const frequencies: Record<string, number> = {};
          items.forEach((item: PreventiveMaintenance) => {
            const freq = item.frequency || 'unknown';
            frequencies[freq] = (frequencies[freq] || 0) + 1;
          });
          
          const frequency_distribution = Object.entries(frequencies).map(([frequency, count]) => ({
            frequency,
            count
          }));
          
          // Coming up items (not completed, scheduled in the future)
          const upcoming = items
            .filter(item => {
              if (item.completed_date) return false;
              
              // If scheduled date is in the future or today, include in upcoming
              const scheduledDate = new Date(item.scheduled_date);
              const now = new Date();
              scheduledDate.setHours(0, 0, 0, 0);
              now.setHours(0, 0, 0, 0);
              return scheduledDate >= now;
            })
            .sort((a, b) => {
              const dateA = new Date(a.scheduled_date);
              const dateB = new Date(b.scheduled_date);
              return dateA.getTime() - dateB.getTime();
            })
            .slice(0, 5); // Take up to 5 upcoming items
          
          return {
            success: true,
            data: {
              counts: { total, completed, pending, overdue },
              frequency_distribution,
              upcoming
            }
          };
        }
        
        // If we couldn't get results, return an empty stats object
        return {
          success: true,
          data: {
            counts: { total: 0, completed: 0, pending: 0, overdue: 0 },
            frequency_distribution: [],
            upcoming: []
          }
        };
      }
    } catch (error: any) {
      console.error('Error fetching preventive maintenance statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch preventive maintenance statistics'
      };
    }
  },

  /**
   * Upload images directly for preventive maintenance
   */
  uploadImages: async (pmId: string, formData: FormData): Promise<ServiceResponse<any>> => {
    try {
      const response = await uploadFile(API_ROUTES.PM_UPLOAD(pmId), formData);
      
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error(`Error uploading images for PM ${pmId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to upload images for PM ${pmId}`
      };
    }
  },

  /**
   * This is a legacy method to maintain backward compatibility
   * It's a wrapper around uploadImages that accepts jobId as a parameter
   */
  uploadJobImages: async (jobId: string, formData: FormData): Promise<ServiceResponse<any>> => {
    console.warn('uploadJobImages is deprecated, please use uploadImages instead');
    return preventiveMaintenanceService.uploadImages(jobId, formData);
  },
  
  /**
   * Get all topics for preventive maintenance
   * Uses the /api/topics/ endpoint - NOT /api/preventive-maintenance/topics/
   */
  getTopics: async (): Promise<ServiceResponse<any>> => {
    try {
      const response = await fetchData(API_ROUTES.TOPICS);
      
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error('Error fetching topics:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch topics'
      };
    }
  },

  /**
   * Get preventive maintenance jobs
   */
  getPreventiveMaintenanceJobs: async (params: Record<string, any> = {}): Promise<ServiceResponse<any>> => {
    try {
      const response = await fetchData(API_ROUTES.JOBS, { params });
      
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error('Error fetching preventive maintenance jobs:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch preventive maintenance jobs'
      };
    }
  }
};

export default preventiveMaintenanceService;