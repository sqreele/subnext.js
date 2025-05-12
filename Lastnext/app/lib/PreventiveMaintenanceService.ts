import apiClient from './api-client';
import { handleApiError } from './api-client';
import type { ServiceResponse } from './types';
import {
  validateFrequency,
  type PreventiveMaintenance,
  type FrequencyType,
} from './preventiveMaintenanceModels';

export interface CreatePreventiveMaintenanceData {
  scheduled_date: string;
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
  frequency?: FrequencyType;
  custom_days?: number | null;
  notes?: string;
  pmtitle?: string;
  topic_ids?: number[];
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

      const createResponse = await apiClient.post<PreventiveMaintenance>(
        `${this.baseUrl}/`,
        formData
      );
      const createdRecord = createResponse.data;

      if (data.before_image instanceof File || data.after_image instanceof File) {
        const imageFormData = new FormData();
        if (data.before_image instanceof File) {
          imageFormData.append('images', data.before_image);
          imageFormData.append('image_types', 'before');
        }
        if (data.after_image instanceof File) {
          imageFormData.append('images', data.after_image);
          imageFormData.append('image_types', 'after');
        }

        console.log('Uploading images...');
        await apiClient.post(
          `${this.baseUrl}/${createdRecord.pm_id}/upload_images/`,
          imageFormData
        );
      }

      return { success: true, data: createdRecord };
    } catch (error: any) {
      console.error('Service error creating maintenance:', error);
      throw handleApiError(error, 'Failed to create preventive maintenance');
    }
  }

  async updatePreventiveMaintenance(
    id: string,
    data: UpdatePreventiveMaintenanceData
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    console.log('=== UPDATE PREVENTIVE MAINTENANCE ===');

    try {
      const formData = new FormData();
      if (data.scheduled_date !== undefined) {
        formData.append('scheduled_date', data.scheduled_date);
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
          data.topic_ids.forEach((id) =>
            formData.append('topic_ids[]', String(id))
          );
        } else {
          formData.append('topic_ids[]', '');
        }
      }

      if (data.before_image instanceof File || data.after_image instanceof File) {
        const imageFormData = new FormData();
        if (data.before_image instanceof File) {
          imageFormData.append('images', data.before_image);
          imageFormData.append('image_types', 'before');
        }
        if (data.after_image instanceof File) {
          imageFormData.append('images', data.after_image);
          imageFormData.append('image_types', 'after');
        }

        await apiClient.post(
          `${this.baseUrl}/${id}/upload_images/`,
          imageFormData
        );
      }

      console.log('Sending update request...');
      const response = await apiClient.patch<PreventiveMaintenance>(
        `${this.baseUrl}/${id}/`,
        formData
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error updating maintenance:', error);
      throw handleApiError(error, 'Failed to update preventive maintenance');
    }
  }

  async getPreventiveMaintenanceById(
    id: string
  ): Promise<ServiceResponse<PreventiveMaintenance>> {
    try {
      const response = await apiClient.get<PreventiveMaintenance>(
        `${this.baseUrl}/${id}/`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Service error fetching maintenance:', error);
      throw handleApiError(error, 'Failed to fetch preventive maintenance');
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
      throw handleApiError(error, 'Failed to fetch preventive maintenances');
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
      throw handleApiError(error, 'Failed to fetch preventive maintenances');
    }
  }

  async deletePreventiveMaintenance(
    id: string
  ): Promise<ServiceResponse<null>> {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}/`);
      return { success: true, data: null };
    } catch (error: any) {
      console.error('Service error deleting maintenance:', error);
      throw handleApiError(error, 'Failed to delete preventive maintenance');
    }
  }
}

export default new PreventiveMaintenanceService();
