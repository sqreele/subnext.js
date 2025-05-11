// ./app/lib/PreventiveMaintenanceService.ts - Fixed with proper file handling
import apiClient, { handleApiError } from '@/app/lib/api-client';
import {
  PreventiveMaintenance,
  ServiceResponse,
} from './preventiveMaintenanceModels';

// Export the data types for creating and updating PM records
export interface CreatePreventiveMaintenanceData {
  scheduled_date: string;
  frequency: string;
  custom_days?: number | null;
  notes?: string;
  pmtitle?: string;
  topic_ids?: number[];
  before_image?: File;
  after_image?: File;
}

export interface UpdatePreventiveMaintenanceData extends Partial<CreatePreventiveMaintenanceData> {
  // All fields are optional for updates
}

// Export the data type for completing PM records
export interface CompletePreventiveMaintenanceData {
  completion_notes?: string;
  after_image?: File;
}

class PreventiveMaintenanceService {
  public readonly baseUrl = '/api/preventive-maintenance';

  /**
   * Create a new preventive maintenance record
   */
  public async createPreventiveMaintenance(data: CreatePreventiveMaintenanceData): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      // Determine content type based on presence of files
      const hasFiles = data.before_image instanceof File || data.after_image instanceof File;
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        // Add required fields
        formData.append('scheduled_date', data.scheduled_date);
        formData.append('frequency', data.frequency);
        
        // Add optional fields only if they have values
        if (data.custom_days !== undefined && data.custom_days !== null) {
          formData.append('custom_days', String(data.custom_days));
        }
        if (data.notes && data.notes.trim()) {
          formData.append('notes', data.notes.trim());
        }
        if (data.pmtitle && data.pmtitle.trim()) {
          formData.append('pmtitle', data.pmtitle.trim());
        }
        
        // Handle topic_ids array
        if (data.topic_ids && data.topic_ids.length > 0) {
          data.topic_ids.forEach(topicId => {
            formData.append('topic_ids', String(topicId));
          });
        }
        
        // Handle file uploads - ONLY add if they are actual File objects
        if (data.before_image instanceof File) {
          formData.append('before_image', data.before_image);
        }
        if (data.after_image instanceof File) {
          formData.append('after_image', data.after_image);
        }
        
        console.log('Sending FormData with files:', {
          hasBeforeImage: data.before_image instanceof File,
          hasAfterImage: data.after_image instanceof File,
          entries: Array.from(formData.entries()).map(([key, value]) => ({
            key,
            type: value instanceof File ? 'File' : typeof value,
            fileName: value instanceof File ? value.name : undefined
          }))
        });
        
        // Make the request with proper headers for multipart/form-data
        const response = await apiClient.post<ServiceResponse<PreventiveMaintenance>>(
          `${this.baseUrl}/`,
          formData,
          {
            headers: {
              // Don't set Content-Type manually for FormData
              // Let the browser set it with the correct boundary
            }
          }
        );
        
        return response.data;
      } else {
        // Use regular JSON for non-file uploads
        const cleanData: Record<string, any> = {
          scheduled_date: data.scheduled_date,
          frequency: data.frequency,
        };
        
        // Add optional fields only if they have values
        if (data.custom_days !== undefined && data.custom_days !== null) {
          cleanData.custom_days = data.custom_days;
        }
        if (data.notes && data.notes.trim()) {
          cleanData.notes = data.notes.trim();
        }
        if (data.pmtitle && data.pmtitle.trim()) {
          cleanData.pmtitle = data.pmtitle.trim();
        }
        if (data.topic_ids && data.topic_ids.length > 0) {
          cleanData.topic_ids = data.topic_ids;
        }
        
        const response = await apiClient.post(`${this.baseUrl}/`, cleanData);
        return response.data;
      }
    } catch (error) {
      console.error('Service error creating maintenance:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Update an existing preventive maintenance record
   */
  public async updatePreventiveMaintenance(
    id: string,
    data: UpdatePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      // Determine content type based on presence of files
      const hasFiles = data.before_image instanceof File || data.after_image instanceof File;
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        // Add fields only if they exist (for updates)
        if (data.scheduled_date) {
          formData.append('scheduled_date', data.scheduled_date);
        }
        if (data.frequency) {
          formData.append('frequency', data.frequency);
        }
        if (data.custom_days !== undefined && data.custom_days !== null) {
          formData.append('custom_days', String(data.custom_days));
        }
        if (data.notes !== undefined) {
          formData.append('notes', data.notes || '');
        }
        if (data.pmtitle !== undefined) {
          formData.append('pmtitle', data.pmtitle || '');
        }
        
        // Handle topic_ids array
        if (data.topic_ids !== undefined) {
          if (data.topic_ids && data.topic_ids.length > 0) {
            data.topic_ids.forEach(topicId => {
              formData.append('topic_ids', String(topicId));
            });
          } else {
            // Send empty array when clearing topics
            formData.append('topic_ids', '');
          }
        }
        
        // Handle file uploads - ONLY add if they are actual File objects
        if (data.before_image instanceof File) {
          formData.append('before_image', data.before_image);
        }
        if (data.after_image instanceof File) {
          formData.append('after_image', data.after_image);
        }
        
        console.log('Updating with FormData:', {
          entries: Array.from(formData.entries()).map(([key, value]) => ({
            key,
            type: value instanceof File ? 'File' : typeof value,
            fileName: value instanceof File ? value.name : undefined
          }))
        });
        
        const response = await apiClient.patch<ServiceResponse<PreventiveMaintenance>>(
          `${this.baseUrl}/${id}/`,
          formData,
          {
            headers: {
              // Don't set Content-Type for FormData
            }
          }
        );
        
        return response.data;
      } else {
        // Use regular JSON for non-file updates
        console.log('Updating with JSON data');
        const response = await apiClient.patch(`${this.baseUrl}/${id}/`, data);
        return response.data;
      }
    } catch (error) {
      console.error('Service error updating maintenance:', error);
      throw handleApiError(error);
    }
  }

  /**
   * Get a preventive maintenance record by ID
   */
  public async getPreventiveMaintenanceById(id: string): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get all preventive maintenance records with optional query parameters
   */
  public async getAllPreventiveMaintenance(params?: Record<string, string>): Promise<ServiceResponse<PreventiveMaintenance[] | { results: PreventiveMaintenance[]; count: number; topics?: any[] }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Delete a preventive maintenance record
   */
  public async deletePreventiveMaintenance(id: string): Promise<ServiceResponse<void>> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${id}/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Complete a preventive maintenance record
   */
  public async completePreventiveMaintenance(
    id: string,
    data: CompletePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      // Determine content type based on presence of files
      const hasFile = data.after_image instanceof File;
      
      if (hasFile) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        // Add completion notes if provided
        if (data.completion_notes !== undefined) {
          formData.append('completion_notes', data.completion_notes);
        }
        
        // Handle file upload - ONLY add if it's an actual File object
        if (data.after_image instanceof File) {
          formData.append('after_image', data.after_image);
        }
        
        const response = await apiClient.post<ServiceResponse<PreventiveMaintenance>>(
          `${this.baseUrl}/${id}/complete/`,
          formData,
          {
            headers: {
              // Don't set Content-Type for FormData
            }
          }
        );
        
        return response.data;
      } else {
        // Use regular JSON for non-file completion
        const response = await apiClient.post(`${this.baseUrl}/${id}/complete/`, data);
        return response.data;
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get maintenance statistics
   */
  public async getMaintenanceStatistics(): Promise<ServiceResponse<any>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/statistics/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get maintenance dashboard data
   */
  public async getDashboardData(): Promise<ServiceResponse<any>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dashboard/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export default new PreventiveMaintenanceService();