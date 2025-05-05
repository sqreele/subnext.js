import axios from 'axios';
// Import types from the models file to ensure consistency
import {
  PreventiveMaintenance,
  PMStatistics,
  Job,
  PMListParams,
  PreventiveMaintenanceRequest
} from './preventiveMaintenanceModels';

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

// Defining request types that are specific to the service
// Note: We're using the CompletePMRequest from models but renaming it for backward compatibility
export interface PreventiveMaintenanceCompleteRequest {
  completed_date?: string;
  notes?: string; // Note: Changed from string | null to match the expected type
  after_image_id?: number | null;
}

// Preventive Maintenance API
const preventiveMaintenanceService = {
  // Get all preventive maintenance records
  getAllPreventiveMaintenance: async (params: Record<string, any> = {}): Promise<PreventiveMaintenance[]> => {
    try {
      const response = await api.get('/preventive-maintenance/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching preventive maintenance records:', error);
      throw error;
    }
  },

  // Get a single preventive maintenance record by ID
  getPreventiveMaintenanceById: async (pmId: string): Promise<PreventiveMaintenance> => {
    try {
      const response = await api.get(`/preventive-maintenance/${pmId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching preventive maintenance record ${pmId}:`, error);
      throw error;
    }
  },

  // Create a new preventive maintenance record
  createPreventiveMaintenance: async (data: PreventiveMaintenanceRequest): Promise<PreventiveMaintenance> => {
    try {
      const response = await api.post('/preventive-maintenance/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating preventive maintenance record:', error);
      throw error;
    }
  },

  // Update an existing preventive maintenance record
  updatePreventiveMaintenance: async (pmId: string, data: PreventiveMaintenanceRequest): Promise<PreventiveMaintenance> => {
    try {
      const response = await api.put(`/preventive-maintenance/${pmId}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating preventive maintenance record ${pmId}:`, error);
      throw error;
    }
  },

  // Delete a preventive maintenance record
  deletePreventiveMaintenance: async (pmId: string): Promise<any> => {
    try {
      const response = await api.delete(`/preventive-maintenance/${pmId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting preventive maintenance record ${pmId}:`, error);
      throw error;
    }
  },

  // Mark a preventive maintenance task as completed
  completePreventiveMaintenance: async (pmId: string, data: PreventiveMaintenanceCompleteRequest = {}): Promise<PreventiveMaintenance> => {
    try {
      const completionData: PreventiveMaintenanceCompleteRequest = {
        completed_date: data.completed_date || new Date().toISOString(),
        notes: data.notes || '',
        after_image_id: data.after_image_id || null
      };
      
      const response = await api.post(
        `/preventive-maintenance/${pmId}/complete/`, 
        completionData
      );
      return response.data;
    } catch (error) {
      console.error(`Error completing preventive maintenance task ${pmId}:`, error);
      throw error;
    }
  },

  // Get upcoming preventive maintenance tasks
  getUpcomingTasks: async (days: number = 30): Promise<PreventiveMaintenance[]> => {
    try {
      const response = await api.get('/preventive-maintenance/upcoming/', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw error;
    }
  },

  // Get overdue preventive maintenance tasks
  getOverdueTasks: async (): Promise<PreventiveMaintenance[]> => {
    try {
      const response = await api.get('/preventive-maintenance/overdue/');
      return response.data;
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw error;
    }
  },

  // Get preventive maintenance statistics and overview
  getPreventiveMaintenanceStats: async (): Promise<PMStatistics> => {
    try {
      const response = await api.get('/preventive-maintenance/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching preventive maintenance statistics:', error);
      throw error;
    }
  },

  // Get preventive maintenance jobs
  getPreventiveMaintenanceJobs: async (params: Record<string, any> = {}): Promise<{ jobs: Job[] } | Job[]> => {
    try {
      const response = await api.get('/maintenance/jobs/preventive-maintenance/', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching preventive maintenance jobs:', error);
      throw error;
    }
  },

  // Upload images for a job
  uploadJobImages: async (jobId: string, formData: FormData): Promise<any> => {
    try {
      // Create a special instance for file uploads
      const response = await axios.post(
        `${api.defaults.baseURL}/maintenance/jobs/${jobId}/upload-images/`,
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
      return response.data;
    } catch (error) {
      console.error(`Error uploading images for job ${jobId}:`, error);
      throw error;
    }
  }
};

export default preventiveMaintenanceService;