// ./app/lib/PreventiveMaintenanceService.ts - Fixed with correct types
import apiClient, { handleApiError } from '@/app/lib/api-client';
import {
  PreventiveMaintenance,
  ServiceResponse,
} from './preventiveMaintenanceModels';

// Define the data types for creating and updating PM records
interface CreatePreventiveMaintenanceData {
  scheduled_date: string;
  frequency: string;
  custom_days?: number | null;
  notes?: string;
  pmtitle?: string;
  topic_ids?: number[];
  before_image?: File;
  after_image?: File;
}

interface UpdatePreventiveMaintenanceData extends Partial<CreatePreventiveMaintenanceData> {
  // All fields are optional for updates
}

class PreventiveMaintenanceService {
  private baseUrl = '/api/preventive-maintenance';

  /**
   * Get all preventive maintenance records
   */
  async getAllPreventiveMaintenance(params?: Record<string, string>): Promise<ServiceResponse<PreventiveMaintenance[]>> {
    try {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await apiClient.get(`${this.baseUrl}/${queryString}`);
      
      // Handle different response formats
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get a specific preventive maintenance by ID
   */
  async getPreventiveMaintenanceById(id: string): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}/`);
      
      if (response.data.success && response.data.data) {
        return response.data;
      } else if (response.data.pm_id) {
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Create a new preventive maintenance record
   */
  async createPreventiveMaintenance(data: CreatePreventiveMaintenanceData): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      // Check if we have files to upload
      const hasFiles = data.before_image instanceof File || data.after_image instanceof File;
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        // Add all fields to FormData
        Object.entries(data).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          
          if (Array.isArray(value)) {
            // Handle arrays (like topic_ids)
            value.forEach(item => {
              formData.append(key, String(item));
            });
          } else if (value instanceof File) {
            // Handle file uploads
            formData.append(key, value);
          } else {
            // Handle primitive values
            formData.append(key, String(value));
          }
        });
        
        // Use the API client's ability to handle multipart form data
        const response = await apiClient.post<ServiceResponse<PreventiveMaintenance>>(
          `${this.baseUrl}/`,
          formData,
          {
            headers: {
              // Let the browser set the Content-Type with boundary
            }
          }
        );
        
        return response.data;
      } else {
        // Use regular JSON for non-file uploads
        const response = await apiClient.post(`${this.baseUrl}/`, data);
        return response.data;
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update an existing preventive maintenance record
   */
  async updatePreventiveMaintenance(
    id: string,
    data: UpdatePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      // Check if we have files to upload
      const hasFiles = data.before_image instanceof File || data.after_image instanceof File;
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        // Add all fields to FormData
        Object.entries(data).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          
          if (Array.isArray(value)) {
            // Handle arrays (like topic_ids)
            value.forEach(item => {
              formData.append(key, String(item));
            });
          } else if (value instanceof File) {
            // Handle file uploads
            formData.append(key, value);
          } else {
            // Handle primitive values
            formData.append(key, String(value));
          }
        });
        
        const response = await apiClient.patch<ServiceResponse<PreventiveMaintenance>>(
          `${this.baseUrl}/${id}/`,
          formData,
          {
            headers: {
              // Let the browser set the Content-Type with boundary for multipart/form-data
            }
          }
        );
        
        return response.data;
      } else {
        // Use regular JSON for non-file uploads
        const response = await apiClient.patch(`${this.baseUrl}/${id}/`, data);
        return response.data;
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Delete a preventive maintenance record
   */
  async deletePreventiveMaintenance(id: string): Promise<ServiceResponse<void>> {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}/`);
      return {
        success: true,
        message: 'Preventive maintenance deleted successfully'
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get preventive maintenance history for a specific item
   */
  async getPreventiveMaintenanceHistory(itemId: string): Promise<ServiceResponse<PreventiveMaintenance[]>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/history/${itemId}/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Mark preventive maintenance as completed
   */
  async completePreventiveMaintenance(id: string, data: {
    completion_notes?: string;
    after_image?: File;
  }): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      // Check if we have files to upload
      const hasFiles = data.after_image instanceof File;
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        if (data.completion_notes) {
          formData.append('completion_notes', data.completion_notes);
        }
        
        if (data.after_image) {
          formData.append('after_image', data.after_image);
        }
        
        formData.append('status', 'completed'); // Add completion status
        
        const response = await apiClient.patch(`${this.baseUrl}/${id}/complete/`, formData, {
          headers: {
            // Let the browser set the Content-Type with boundary for multipart/form-data
          }
        });
        
        return response.data;
      } else {
        // Use regular JSON for non-file uploads
        const response = await apiClient.patch(`${this.baseUrl}/${id}/complete/`, {
          ...data,
          status: 'completed'
        });
        return response.data;
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Generate preventive maintenance report
   */
  async generateReport(params: {
    startDate?: string;
    endDate?: string;
    propertyId?: string;
    format?: 'pdf' | 'excel';
  }): Promise<Blob> {
    try {
      const queryString = new URLSearchParams(params as any).toString();
      const response = await apiClient.get(`${this.baseUrl}/report/?${queryString}`, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export default new PreventiveMaintenanceService();