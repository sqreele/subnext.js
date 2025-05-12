import apiClient from './api-client';
import { handleApiError } from './api-client';
import {
  validateFrequency,
  type PreventiveMaintenance,
  type FrequencyType,
  type ServiceResponse
} from './preventiveMaintenanceModels';

export interface CreatePreventiveMaintenanceData {
  scheduled_date: string;
  completed_date?: string | null;
  frequency: FrequencyType;
  custom_days?: number | null;
  notes?: string;
  pmtitle?: string;
  topic_ids?: number[];
  before_image?: File;
  after_image?: File;
}

export interface UpdatePreventiveMaintenanceData {
  scheduled_date?: string;
  completed_date?: string | null;
  frequency?: FrequencyType;
  custom_days?: number | null;
  notes?: string;
  pmtitle?: string;
  topic_ids?: number[];
  before_image?: File;
  after_image?: File;
}

interface CompletePreventiveMaintenanceData {
  completion_notes?: string;
  after_image?: File;
}

interface DashboardStats {
  counts: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  frequency_distribution: {
    name: string;
    value: number;
  }[];
  upcoming: PreventiveMaintenance[];
}

export interface UploadImagesData {
  before_image?: File;
  after_image?: File;
}

class PreventiveMaintenanceService {
  private baseUrl: string = '/api/preventive-maintenance';

  async createPreventiveMaintenance(
    data: CreatePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    console.log('=== CREATE PREVENTIVE MAINTENANCE ===');
    console.log('Input data:', {
      ...data,
      before_image: data.before_image
        ? {
            name: data.before_image.name,
            size: data.before_image.size,
            type: data.before_image.type,
          }
        : undefined,
      after_image: data.after_image
        ? {
            name: data.after_image.name,
            size: data.after_image.size,
            type: data.after_image.type,
          }
        : undefined,
    });

    try {
      // Create a clean form data object without image files to avoid potential issues
      const formData = new FormData();
      formData.append('scheduled_date', data.scheduled_date);
      formData.append('frequency', data.frequency);
      if (data.custom_days !== undefined && data.custom_days !== null) {
        formData.append('custom_days', String(data.custom_days));
      }
      if (data.notes?.trim()) {
        formData.append('notes', data.notes.trim());
      }
      if (data.pmtitle?.trim()) {
        formData.append('pmtitle', data.pmtitle.trim());
      }
      if (data.topic_ids && data.topic_ids.length > 0) {
        data.topic_ids.forEach((topicId) =>
          formData.append('topic_ids[]', String(topicId))
        );
      } else {
        formData.append('topic_ids[]', '');
      }

      console.log('FormData entries (create):');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      // First create the maintenance record without images
      const createResponse = await apiClient.post<PreventiveMaintenance>(
        `${this.baseUrl}/`,
        formData
      );
      const createdRecord = createResponse.data;
      
      // Check if we have a valid PM ID before attempting to upload images
      if (createdRecord && createdRecord.pm_id) {
        console.log(`Maintenance record created with ID: ${createdRecord.pm_id}`);
        
        // If we have images, upload them separately
        if (data.before_image instanceof File || data.after_image instanceof File) {
          try {
            await this.uploadMaintenanceImages(createdRecord.pm_id, {
              before_image: data.before_image,
              after_image: data.after_image
            });
          } catch (uploadError) {
            console.error(`Error uploading images for PM ${createdRecord.pm_id}:`, uploadError);
            // Continue despite image upload error - the record was created successfully
          }
        }
      } else {
        console.error('Created record missing PM ID:', createdRecord);
      }

      return { success: true, data: createdRecord };
    } catch (error: any) {
      console.error('Service error creating maintenance:', error);
      throw handleApiError(error);
    }
  }

  async uploadMaintenanceImages(
    pmId: string,
    data: UploadImagesData
  ): Promise<ServiceResponse<null>> {
    console.log(`=== UPLOAD IMAGES FOR PM ${pmId} ===`);
  
    if (!pmId) {
      console.error('Cannot upload images: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required for image upload' };
    }
  
    // Skip if no images to upload
    if (!data.before_image && !data.after_image) {
      console.log('No images to upload, skipping');
      return { success: true, data: null };
    }
  
    try {
      const imageFormData = new FormData();
      let hasImages = false;
  
      // Add the images to the form data
      if (data.before_image instanceof File) {
        imageFormData.append('images', data.before_image);
        imageFormData.append('image_types', 'before');
        hasImages = true;
        console.log(`Adding before image: ${data.before_image.name}`);
      }
  
      if (data.after_image instanceof File) {
        imageFormData.append('images', data.after_image);
        imageFormData.append('image_types', 'after');
        hasImages = true;
        console.log(`Adding after image: ${data.after_image.name}`);
      }
  
      if (!hasImages) {
        console.log('No valid images found, skipping upload');
        return { success: true, data: null };
      }
  
      console.log(`Uploading images to: ${this.baseUrl}/${pmId}/upload_images/`);
  
      // Log the form data entries for debugging
      console.log('FormData entries:');
      for (const [key, value] of imageFormData.entries()) {
        console.log(`  ${key}: ${value instanceof File ? value.name : value}`);
      }
  
      // Post the form data with headers
      await apiClient.post(
        `${this.baseUrl}/${pmId}/upload_images/`,
        imageFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
  
      console.log('Images uploaded successfully');
      return { success: true, data: null };
    } catch (error: any) {
      console.error(`Service error uploading images for PM ${pmId}:`, error);
      throw handleApiError(error);
    }
  }

  async updatePreventiveMaintenance(
    id: string,
    data: UpdatePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    console.log('=== UPDATE PREVENTIVE MAINTENANCE ===');
    
    if (!id) {
      console.error('Cannot update: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required for updates' };
    }
  
    try {
      const formData = new FormData();
      if (data.scheduled_date !== undefined) {
        formData.append('scheduled_date', data.scheduled_date);
      }
      
      // Add completed_date if it exists
      if (data.completed_date !== undefined) {
        formData.append('completed_date', data.completed_date !== null ? data.completed_date : '');
      }
      
      if (data.frequency !== undefined) {
        formData.append('frequency', validateFrequency(data.frequency));
      }
      if (data.custom_days !== undefined) {
        formData.append('custom_days', data.custom_days !== null ? String(data.custom_days) : '');
      }
      if (data.notes !== undefined) {
        formData.append('notes', data.notes.trim());
      }
      if (data.pmtitle !== undefined) {
        formData.append('pmtitle', data.pmtitle.trim());
      }
      if (data.topic_ids !== undefined) {
        if (data.topic_ids.length > 0) {
          data.topic_ids.forEach((topicId) =>
            formData.append('topic_ids[]', String(topicId))
          );
        } else {
          formData.append('topic_ids[]', '');
        }
      }
  
      // First update the record
      console.log('Sending update request...');
      const response = await apiClient.patch<PreventiveMaintenance>(
        `${this.baseUrl}/${id}/`,
        formData
      );
      
      // Then handle image uploads separately
      if (data.before_image instanceof File || data.after_image instanceof File) {
        try {
          await this.uploadMaintenanceImages(id, {
            before_image: data.before_image,
            after_image: data.after_image
          });
        } catch (uploadError) {
          console.error(`Error uploading images during update for PM ${id}:`, uploadError);
          // Continue despite image upload error - the update was successful
        }
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error updating maintenance:', error);
      throw handleApiError(error);
    }
  }

  async completePreventiveMaintenance(
    id: string,
    data: CompletePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    console.log('=== COMPLETE PREVENTIVE MAINTENANCE ===');
    
    if (!id) {
      console.error('Cannot complete: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required to mark as complete' };
    }

    try {
      const formData = new FormData();
      if (data.completion_notes) {
        formData.append('completion_notes', data.completion_notes.trim());
      }

      // First make the completion request
      const response = await apiClient.post<PreventiveMaintenance>(
        `${this.baseUrl}/${id}/complete/`,
        formData
      );
      
      // Then handle after image upload if present
      if (data.after_image instanceof File) {
        try {
          await this.uploadMaintenanceImages(id, {
            after_image: data.after_image
          });
        } catch (uploadError) {
          console.error(`Error uploading after image during completion for PM ${id}:`, uploadError);
          // Continue despite image upload error - the completion was successful
        }
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error completing maintenance:', error);
      throw handleApiError(error);
    }
  }

  async getPreventiveMaintenanceById(
    id: string
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    if (!id) {
      console.error('Cannot fetch: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required to fetch details' };
    }
    
    try {
      const response = await apiClient.get<PreventiveMaintenance>(
        `${this.baseUrl}/${id}/`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error fetching maintenance:', error);
      throw handleApiError(error);
    }
  }

  async getPreventiveMaintenances(): Promise<ServiceResponse<PreventiveMaintenance[]>> {
    try {
      const response = await apiClient.get<PreventiveMaintenance[]>(
        `${this.baseUrl}/`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error fetching maintenances:', error);
      throw handleApiError(error);
    }
  }

  async getAllPreventiveMaintenance(
    params?: Record<string, any>
  ): Promise<ServiceResponse<PreventiveMaintenance[]>> {
    try {
      console.log('Fetching preventive maintenances with params:', params);
      const response = await apiClient.get<PreventiveMaintenance[]>(
        `${this.baseUrl}/`,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error fetching with filters:', error);
      throw handleApiError(error);
    }
  }

  async getMaintenanceStatistics(): Promise<ServiceResponse<DashboardStats>> {
    try {
      const response = await apiClient.get<DashboardStats>(
        `${this.baseUrl}/statistics/`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error fetching maintenance statistics:', error);
      throw handleApiError(error);
    }
  }

  async deletePreventiveMaintenance(
    id: string
  ): Promise<ServiceResponse<null>> {
    if (!id) {
      console.error('Cannot delete: PM ID is undefined or empty');
      return { success: false, message: 'PM ID is required for deletion' };
    }
    
    try {
      await apiClient.delete(`${this.baseUrl}/${id}/`);
      return { success: true, data: null };
    } catch (error: any) {
      console.error('Service error deleting maintenance:', error);
      throw handleApiError(error);
    }
  }
}

export default new PreventiveMaintenanceService();