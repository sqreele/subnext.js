import axios from 'axios';
// Import types from the updated models file
import {
  PreventiveMaintenance,
  PreventiveMaintenanceRequest,
  ServiceResponse,
  PMStatistics,
  PMResponse,
  Topic,
  FrequencyDistribution
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

// Create a reusable axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to inject auth token
api.interceptors.request.use(
  (config) => {
    // Check if running in browser
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Preventive Maintenance API Service
 * 
 * This service targets the Django REST Framework ViewSet registered as:
 * router.register(r'preventive-maintenance', views.PreventiveMaintenanceViewSet, basename='preventive-maintenance')
 */
const preventiveMaintenanceService = {
  /**
   * Get all preventive maintenance records with optional filtering
   * Maps to ViewSet's list action: GET /preventive-maintenance/
   */
  getAllPreventiveMaintenance: async (params: SearchParams = {}): Promise<ServiceResponse<PMResponse>> => {
    try {
      const response = await api.get('/preventive-maintenance/', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching preventive maintenance records:', error);
      return {
        success: false,
        error: 'Failed to fetch preventive maintenance records'
      };
    }
  },

  /**
   * Get a single preventive maintenance record by ID
   * Maps to ViewSet's retrieve action: GET /preventive-maintenance/{id}/
   */
  getPreventiveMaintenanceById: async (pmId: string): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const response = await api.get(`/preventive-maintenance/${pmId}/`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error fetching preventive maintenance record ${pmId}:`, error);
      return {
        success: false,
        error: `Failed to fetch preventive maintenance record ${pmId}`
      };
    }
  },

  /**
   * Create a new preventive maintenance record
   * Maps to ViewSet's create action: POST /preventive-maintenance/
   */
  createPreventiveMaintenance: async (data: PreventiveMaintenanceRequest): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const response = await api.post('/preventive-maintenance/', data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating preventive maintenance record:', error);
      return {
        success: false,
        error: 'Failed to create preventive maintenance record'
      };
    }
  },

  /**
   * Update an existing preventive maintenance record
   * Maps to ViewSet's update action: PUT /preventive-maintenance/{id}/
   */
  updatePreventiveMaintenance: async (pmId: string, data: PreventiveMaintenanceRequest): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const response = await api.put(`/preventive-maintenance/${pmId}/`, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error updating preventive maintenance record ${pmId}:`, error);
      return {
        success: false,
        error: `Failed to update preventive maintenance record ${pmId}`
      };
    }
  },

  /**
   * Partially update an existing preventive maintenance record
   * Maps to ViewSet's partial_update action: PATCH /preventive-maintenance/{id}/
   */
  partialUpdatePreventiveMaintenance: async (pmId: string, data: Partial<PreventiveMaintenanceRequest>): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const response = await api.patch(`/preventive-maintenance/${pmId}/`, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error partially updating preventive maintenance record ${pmId}:`, error);
      return {
        success: false,
        error: `Failed to partially update preventive maintenance record ${pmId}`
      };
    }
  },

  /**
   * Delete a preventive maintenance record
   * Maps to ViewSet's destroy action: DELETE /preventive-maintenance/{id}/
   */
  deletePreventiveMaintenance: async (pmId: string): Promise<ServiceResponse<any>> => {
    try {
      const response = await api.delete(`/preventive-maintenance/${pmId}/`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error deleting preventive maintenance record ${pmId}:`, error);
      return {
        success: false,
        error: `Failed to delete preventive maintenance record ${pmId}`
      };
    }
  },

  /**
   * Mark a preventive maintenance task as completed
   * Maps to ViewSet's custom @action: POST /preventive-maintenance/{id}/complete/
   */
  completePreventiveMaintenance: async (pmId: string, data: PreventiveMaintenanceCompleteRequest = {}): Promise<ServiceResponse<PreventiveMaintenance>> => {
    try {
      const completionData: PreventiveMaintenanceCompleteRequest = {
        completed_date: data.completed_date || new Date().toISOString(),
        notes: data.notes || '',
        before_image_id: data.before_image_id || null,
        after_image_id: data.after_image_id || null
      };
      
      const response = await api.post(
        `/preventive-maintenance/${pmId}/complete/`, 
        completionData
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error completing preventive maintenance task ${pmId}:`, error);
      return {
        success: false,
        error: `Failed to complete preventive maintenance task ${pmId}`
      };
    }
  },

  /**
   * Get upcoming preventive maintenance tasks
   * Maps to ViewSet's custom @action: GET /preventive-maintenance/upcoming/
   */
  getUpcomingTasks: async (days: number = 30): Promise<ServiceResponse<PreventiveMaintenance[]>> => {
    try {
      const response = await api.get('/preventive-maintenance/upcoming/', {
        params: { days }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      return {
        success: false,
        error: 'Failed to fetch upcoming tasks'
      };
    }
  },

  /**
   * Get overdue preventive maintenance tasks
   * Maps to ViewSet's custom @action: GET /preventive-maintenance/overdue/
   */
  getOverdueTasks: async (): Promise<ServiceResponse<PreventiveMaintenance[]>> => {
    try {
      const response = await api.get('/preventive-maintenance/overdue/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      return {
        success: false,
        error: 'Failed to fetch overdue tasks'
      };
    }
  },

  /**
   * Get preventive maintenance statistics and overview
   * Maps to ViewSet's custom @action: GET /preventive-maintenance/stats/
   */
  getPreventiveMaintenanceStats: async (): Promise<ServiceResponse<{
    counts: {
      total: number;
      completed: number;
      pending: number;
      overdue: number;
    };
    frequency_distribution: FrequencyDistribution[];
    upcoming: PreventiveMaintenance[];
  }>> => {
    try {
      const response = await api.get('/preventive-maintenance/stats/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching preventive maintenance statistics:', error);
      return {
        success: false,
        error: 'Failed to fetch preventive maintenance statistics'
      };
    }
  },

  /**
   * Upload images directly for preventive maintenance
   * Maps to ViewSet's custom @action: POST /preventive-maintenance/{id}/upload-images/
   */
  uploadImages: async (pmId: string, formData: FormData): Promise<ServiceResponse<any>> => {
    try {
      // Create a special instance for file uploads
      const response = await axios.post(
        `${api.defaults.baseURL}/preventive-maintenance/${pmId}/upload-images/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': typeof window !== 'undefined' 
              ? `Bearer ${localStorage.getItem('accessToken')}`
              : ''
          }
        }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error uploading images for PM ${pmId}:`, error);
      return {
        success: false,
        error: `Failed to upload images for PM ${pmId}`
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
   * Related endpoint: GET /topics/ (router registered)
   */
  getTopics: async (): Promise<ServiceResponse<Topic[]>> => {
    try {
      const response = await api.get('/topics/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching topics:', error);
      return {
        success: false,
        error: 'Failed to fetch topics'
      };
    }
  }
};

export default preventiveMaintenanceService;