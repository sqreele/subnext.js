'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { PreventiveMaintenance, FrequencyType, Topic, ServiceResponse } from '@/app/lib/preventiveMaintenanceModels';
import preventiveMaintenanceService from '@/app/lib/PreventiveMaintenanceService';
import TopicService from '@/app/lib/TopicService';

export interface SearchParams {
  status?: string;
  frequency?: string;
  page?: number;
  page_size?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  property_id?: string;
  topic_id?: string;
}

export interface PreventiveMaintenanceRequest {
  scheduled_date: string;
  frequency: FrequencyType;
  custom_days?: number | null;
  notes?: string;
  pmtitle?: string;
  topic_ids?: number[];
  before_image?: File;
  after_image?: File;
}

export interface PreventiveMaintenanceCompleteRequest {
  completion_notes?: string;
  after_image?: File;
  notes?: string | null;
}

interface FrequencyDistribution {
  name: string;
  value: number;
}

interface DashboardStats {
  counts: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  frequency_distribution: FrequencyDistribution[];
  upcoming: PreventiveMaintenance[];
}

interface PreventiveMaintenanceContextState {
  maintenanceItems: PreventiveMaintenance[];
  topics: Topic[];
  statistics: DashboardStats | null;
  selectedMaintenance: PreventiveMaintenance | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  filterParams: SearchParams;
  fetchMaintenanceItems: (params?: SearchParams) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  fetchMaintenanceById: (pmId: string) => Promise<PreventiveMaintenance | null>;
  createMaintenance: (data: PreventiveMaintenanceRequest) => Promise<PreventiveMaintenance | null>;
  updateMaintenance: (pmId: string, data: PreventiveMaintenanceRequest) => Promise<PreventiveMaintenance | null>;
  deleteMaintenance: (pmId: string) => Promise<boolean>;
  completeMaintenance: (pmId: string, data: PreventiveMaintenanceCompleteRequest) => Promise<PreventiveMaintenance | null>;
  fetchTopics: () => Promise<void>;
  setFilterParams: (params: SearchParams) => void;
  clearError: () => void;
}

const PreventiveMaintenanceContext = createContext<PreventiveMaintenanceContextState | undefined>(undefined);

interface PreventiveMaintenanceProviderProps {
  children: ReactNode;
}

export const PreventiveMaintenanceProvider: React.FC<PreventiveMaintenanceProviderProps> = ({ children }) => {
  const [maintenanceItems, setMaintenanceItems] = useState<PreventiveMaintenance[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [statistics, setStatistics] = useState<DashboardStats | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<PreventiveMaintenance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterParams, setFilterParams] = useState<SearchParams>({
    status: '',
    page: 1,
    page_size: 10,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchMaintenanceItems = useCallback(
    async (params?: SearchParams) => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchParams = params || filterParams;
        const queryParams: Record<string, string> = {};

        if (fetchParams.status) queryParams.status = fetchParams.status;
        if (fetchParams.frequency) queryParams.frequency = fetchParams.frequency;
        if (fetchParams.page) queryParams.page = fetchParams.page.toString();
        if (fetchParams.page_size) queryParams.page_size = fetchParams.page_size.toString();
        if (fetchParams.search) queryParams.search = fetchParams.search;
        if (fetchParams.start_date) queryParams.start_date = fetchParams.start_date;
        if (fetchParams.end_date) queryParams.end_date = fetchParams.end_date;
        if (fetchParams.property_id) queryParams.property_id = fetchParams.property_id;
        if (fetchParams.topic_id) queryParams.topic_id = fetchParams.topic_id;

        const response = await preventiveMaintenanceService.getAllPreventiveMaintenance(queryParams);

        if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            setMaintenanceItems(response.data);
            setTotalCount(response.data.length);
          } else if ('results' in response.data) {
            const paginatedData = response.data as { results: PreventiveMaintenance[]; count: number };
            setMaintenanceItems(paginatedData.results);
            setTotalCount(paginatedData.count || paginatedData.results.length);
          } else {
            throw new Error('Invalid response format for maintenance items');
          }
        } else {
          throw new Error(response.message || 'Failed to fetch maintenance items');
        }
      } catch (err: any) {
        console.error('Error fetching maintenance items:', err);
        setError(err.message || 'Failed to fetch maintenance items');
      } finally {
        setIsLoading(false);
      }
    },
    [filterParams]
  );

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await preventiveMaintenanceService.getMaintenanceStatistics();

      if (response.success && response.data) {
        setStatistics(response.data as DashboardStats);
      } else {
        throw new Error(response.message || 'Failed to fetch maintenance statistics');
      }
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to fetch maintenance statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const topicService = new TopicService();
      const response = await topicService.getTopics();

      if (response.success && response.data) {
        // Transform the data to ensure compatibility with your Topic interface
        const transformedTopics = response.data.map(topic => ({
          id: topic.id,
          title: topic.title,
          description: topic.description || '' // Ensure description is never undefined
        }));
        
        setTopics(transformedTopics);
      } else {
        throw new Error(response.message || 'Failed to fetch topics');
      }
    } catch (err: any) {
      console.error('Error fetching topics:', err);
      setError(err.message || 'Failed to fetch topics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMaintenanceById = useCallback(async (pmId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await preventiveMaintenanceService.getPreventiveMaintenanceById(pmId);

      if (response.success && response.data) {
        setSelectedMaintenance(response.data);
        return response.data;
      } else {
        throw new Error(response.message || `Failed to fetch maintenance with ID ${pmId}`);
      }
    } catch (err: any) {
      console.error(`Error fetching maintenance with ID ${pmId}:`, err);
      setError(err.message || 'Failed to fetch maintenance details');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createMaintenance = useCallback(
    async (data: PreventiveMaintenanceRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await preventiveMaintenanceService.createPreventiveMaintenance(data);

        if (response.success && response.data) {
          fetchMaintenanceItems();
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to create maintenance record');
        }
      } catch (err: any) {
        console.error('Error creating maintenance:', err);
        setError(err.message || 'Failed to create maintenance record');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMaintenanceItems]
  );

  const updateMaintenance = useCallback(
    async (pmId: string, data: PreventiveMaintenanceRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await preventiveMaintenanceService.updatePreventiveMaintenance(pmId, data);

        if (response.success && response.data) {
          setSelectedMaintenance(response.data);
          fetchMaintenanceItems();
          return response.data;
        } else {
          throw new Error(response.message || `Failed to update maintenance with ID ${pmId}`);
        }
      } catch (err: any) {
        console.error(`Error updating maintenance with ID ${pmId}:`, err);
        setError(err.message || 'Failed to update maintenance record');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMaintenanceItems]
  );

  const deleteMaintenance = useCallback(
    async (pmId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await preventiveMaintenanceService.deletePreventiveMaintenance(pmId);

        if (response.success) {
          fetchMaintenanceItems();
          return true;
        } else {
          throw new Error(response.message || `Failed to delete maintenance with ID ${pmId}`);
        }
      } catch (err: any) {
        console.error(`Error deleting maintenance with ID ${pmId}:`, err);
        setError(err.message || 'Failed to delete maintenance record');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMaintenanceItems]
  );

  const completeMaintenance = useCallback(
    async (pmId: string, data: PreventiveMaintenanceCompleteRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const safeData = {
          completion_notes: data.completion_notes,
          after_image: data.after_image,
        };

        const response = await preventiveMaintenanceService.completePreventiveMaintenance(pmId, safeData);

        if (response.success && response.data) {
          setSelectedMaintenance(response.data);
          fetchMaintenanceItems();
          return response.data;
        } else {
          throw new Error(response.message || `Failed to complete maintenance with ID ${pmId}`);
        }
      } catch (err: any) {
        console.error(`Error completing maintenance with ID ${pmId}:`, err);
        setError(err.message || 'Failed to complete maintenance record');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMaintenanceItems]
  );

  useEffect(() => {
    fetchTopics();
    fetchStatistics();
  }, [fetchTopics, fetchStatistics]);

  const contextValue: PreventiveMaintenanceContextState = {
    maintenanceItems,
    topics,
    statistics,
    selectedMaintenance,
    totalCount,
    isLoading,
    error,
    filterParams,
    fetchMaintenanceItems,
    fetchStatistics,
    fetchMaintenanceById,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    completeMaintenance,
    fetchTopics,
    setFilterParams,
    clearError,
  };

  return (
    <PreventiveMaintenanceContext.Provider value={contextValue}>
      {children}
    </PreventiveMaintenanceContext.Provider>
  );
};

export const usePreventiveMaintenance = () => {
  const context = useContext(PreventiveMaintenanceContext);
  if (context === undefined) {
    throw new Error('usePreventiveMaintenance must be used within a PreventiveMaintenanceProvider');
  }
  return context;
};