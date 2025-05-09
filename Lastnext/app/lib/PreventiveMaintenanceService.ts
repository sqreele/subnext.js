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

// API endpoint configurations
const API_ROUTES = {
  // Main API routes using router.register
  BASE: '/api/preventive-maintenance',
  JOBS: '/api/preventive-maintenance/jobs/',
  ROOMS: '/api/preventive-maintenance/rooms/',
  TOPICS: '/api/preventive-maintenance/topics/',
  
  // ViewSet routes through the router
  PM_LIST: '/api/preventive-maintenance/',
  PM_DETAIL: (id: string) => `/api/preventive-maintenance/${id}/`,
  PM_COMPLETE: (id: string) => `/api/preventive-maintenance/${id}/complete/`,
  PM_UPLOAD: (id: string) => `/api/preventive-maintenance/${id}/upload-images/`,
  PM_STATS: '/api/preventive-maintenance/stats/',
  PM_UPCOMING: '/api/preventive-maintenance/upcoming/',
  PM_OVERDUE: '/api/preventive-maintenance/overdue/',
  
  // Job routes
  JOB_PM: '/api/jobs/preventive-maintenance/',
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
   */
  completePreventiveMaintenance: async (pmId: string, data: PreventiveMaintenanceCompleteRequest = {}): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const completionData: PreventiveMaintenanceCompleteRequest = {
        completed_date: data.completed_date || new Date().toISOString(),
        notes: data.notes || '',
        before_image_id: data.before_image_id || null,
        after_image_id: data.after_image_id || null
      };
      
      const response = await postData<PreventiveMaintenance, PreventiveMaintenanceCompleteRequest>(
        API_ROUTES.PM_COMPLETE(pmId), 
        completionData
      );
      
      return {
        success: true,
        data: response
      };
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
   */
  getUpcomingTasks: async (days: number = 30): Promise<ServiceResponse<PreventiveMaintenance[]>> => {
    try {
      const response = await fetchData<PreventiveMaintenance[]>(API_ROUTES.PM_UPCOMING, {
        params: { days }
      });
      
      return {
        success: true,
        data: response
      };
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
   */
  getOverdueTasks: async (): Promise<ServiceResponse<PreventiveMaintenance[]>> => {
    try {
      const response = await fetchData<PreventiveMaintenance[]>(API_ROUTES.PM_OVERDUE);
      
      return {
        success: true,
        data: response
      };
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
   */
  getPreventiveMaintenanceStats: async (): Promise<ServiceResponse<any>> => {
    try {
      const response = await fetchData(API_ROUTES.PM_STATS);
      
      return {
        success: true,
        data: response
      };
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