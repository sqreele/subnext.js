'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
// Import types from the fixed models file
import { 
  PreventiveMaintenance, 
  FrequencyType,
  Topic,
  ServiceResponse
} from '@/app/lib/preventiveMaintenanceModels';

// Import SearchParams from service
import preventiveMaintenanceService from '@/app/lib/PreventiveMaintenanceService';

// Define SearchParams type for context use
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

// Define the maintenance request type (simplified from the service interface)
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

// Define the complete request type
export interface PreventiveMaintenanceCompleteRequest {
  completion_notes?: string;
  after_image?: File;
  notes?: string | null;
}

// Define FrequencyDistribution as it might be returned by stats
interface FrequencyDistribution {
  name: string;
  value: number;
}

// Define the dashboard statistics type
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

// Define the context state type
interface PreventiveMaintenanceContextState {
  // Data
  maintenanceItems: PreventiveMaintenance[];
  topics: Topic[];
  statistics: DashboardStats | null;
  selectedMaintenance: PreventiveMaintenance | null;
  totalCount: number;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  filterParams: SearchParams;
  
  // Actions
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

// Create the context
const PreventiveMaintenanceContext = createContext<PreventiveMaintenanceContextState | undefined>(undefined);

// Create a provider component
interface PreventiveMaintenanceProviderProps {
  children: ReactNode;
}

export const PreventiveMaintenanceProvider: React.FC<PreventiveMaintenanceProviderProps> = ({ children }) => {
  // State for maintenance items
  const [maintenanceItems, setMaintenanceItems] = useState<PreventiveMaintenance[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // State for statistics
  const [statistics, setStatistics] = useState<DashboardStats | null>(null);
  
  const [selectedMaintenance, setSelectedMaintenance] = useState<PreventiveMaintenance | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterParams, setFilterParams] = useState<SearchParams>({
    status: '',
    page: 1,
    page_size: 10
  });

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper function to validate frequency values (using our updated type)
  const validateFrequency = (frequency: string): FrequencyType => {
    const validFrequencies: FrequencyType[] = ["daily", "weekly", "biweekly", "monthly", "quarterly", "biannually", "annually", "custom"];
    if (validFrequencies.includes(frequency as FrequencyType)) {
      return frequency as FrequencyType;
    }
    // Default to monthly if an invalid value is received
    console.warn(`Invalid frequency value received: ${frequency}. Defaulting to 'monthly'.`);
    return "monthly";
  };

  // Fetch maintenance items
  const fetchMaintenanceItems = useCallback(async (params?: SearchParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchParams = params || filterParams;
      // Convert SearchParams to record for service call
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
        // Handle different response structures
        if (Array.isArray(response.data)) {
          setMaintenanceItems(response.data);
          setTotalCount(response.data.length);
        } else if (typeof response.data === 'object' && 'results' in response.data) {
          // Type cast to handle the paginated response
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
  }, [filterParams]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to get stats if the endpoint exists
      // If not, we'll create a simple stats object from the maintenance items
      try {
        // Attempt to call a stats endpoint if it exists
        const response = await preventiveMaintenanceService.getAllPreventiveMaintenance({});
        
        if (response.success && response.data) {
          let items: PreventiveMaintenance[] = [];
          
          // Handle different response formats
          if (Array.isArray(response.data)) {
            items = response.data;
          } else if (typeof response.data === 'object' && 'results' in response.data) {
            // Type cast to handle the paginated response
            const paginatedData = response.data as { results: PreventiveMaintenance[]; count: number };
            items = paginatedData.results;
          }
          
          // Calculate statistics from the items
          const stats: DashboardStats = {
            counts: {
              total: items.length,
              completed: items.filter((item: PreventiveMaintenance) => item.status === 'completed').length,
              pending: items.filter((item: PreventiveMaintenance) => item.status === 'pending').length,
              overdue: items.filter((item: PreventiveMaintenance) => {
                const now = new Date();
                const scheduledDate = new Date(item.scheduled_date);
                return item.status !== 'completed' && scheduledDate < now;
              }).length,
            },
            frequency_distribution: calculateFrequencyDistribution(items),
            upcoming: items
              .filter((item: PreventiveMaintenance) => item.status !== 'completed')
              .sort((a: PreventiveMaintenance, b: PreventiveMaintenance) => 
                new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
              )
              .slice(0, 5) // Get next 5 upcoming items
          };
          
          setStatistics(stats);
        }
      } catch (statsError) {
        console.warn('Stats endpoint not available, using calculated stats');
        throw statsError;
      }
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to fetch maintenance statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to calculate frequency distribution
  const calculateFrequencyDistribution = (items: PreventiveMaintenance[]): FrequencyDistribution[] => {
    const distribution: Record<string, number> = {};
    
    items.forEach(item => {
      const freq = item.frequency || 'unknown';
      distribution[freq] = (distribution[freq] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  // Fetch topics
  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the getAllPreventiveMaintenance endpoint which might include topics
      const response = await preventiveMaintenanceService.getAllPreventiveMaintenance({});
      
      if (response.success && response.data && typeof response.data === 'object' && 'topics' in response.data) {
        // Type cast to handle the response with topics
        const dataWithTopics = response.data as { topics: Topic[] };
        if (Array.isArray(dataWithTopics.topics)) {
          setTopics(dataWithTopics.topics);
        } else {
          setTopics([]);
        }
      } else {
        // If topics aren't included, we might need to fetch them separately
        // For now, we'll set an empty array
        setTopics([]);
      }
    } catch (err: any) {
      console.error('Error fetching topics:', err);
      setError(err.message || 'Failed to fetch topics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch maintenance by ID
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

  // Create maintenance
  const createMaintenance = useCallback(async (data: PreventiveMaintenanceRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert the request data to match service interface
      const serviceData = {
        scheduled_date: data.scheduled_date,
        frequency: data.frequency,
        custom_days: data.custom_days,
        notes: data.notes,
        pmtitle: data.pmtitle,
        topic_ids: data.topic_ids,
        before_image: data.before_image,
        after_image: data.after_image,
      };
      
      const response = await preventiveMaintenanceService.createPreventiveMaintenance(serviceData);
      
      if (response.success && response.data) {
        // Refresh the list after creating a new item
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
  }, [fetchMaintenanceItems]);

  // Update maintenance
  const updateMaintenance = useCallback(async (pmId: string, data: PreventiveMaintenanceRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert the request data to match service interface
      const serviceData = {
        scheduled_date: data.scheduled_date,
        frequency: data.frequency,
        custom_days: data.custom_days,
        notes: data.notes,
        pmtitle: data.pmtitle,
        topic_ids: data.topic_ids,
        before_image: data.before_image,
        after_image: data.after_image,
      };
      
      const response = await preventiveMaintenanceService.updatePreventiveMaintenance(pmId, serviceData);
      
      if (response.success && response.data) {
        // Refresh selected maintenance
        setSelectedMaintenance(response.data);
        // Refresh the list
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
  }, [fetchMaintenanceItems]);

  // Delete maintenance
  const deleteMaintenance = useCallback(async (pmId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await preventiveMaintenanceService.deletePreventiveMaintenance(pmId);
      
      if (response.success) {
        // Refresh the list after deleting
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
  }, [fetchMaintenanceItems]);

  // Complete maintenance
  const completeMaintenance = useCallback(async (pmId: string, data: PreventiveMaintenanceCompleteRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Ensure notes is not null before sending to API
      const safeData = {
        completion_notes: data.completion_notes,
        after_image: data.after_image,
      };
      
      const response = await preventiveMaintenanceService.completePreventiveMaintenance(pmId, safeData);
      
      if (response.success && response.data) {
        // Refresh selected maintenance
        setSelectedMaintenance(response.data);
        // Refresh the list
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
  }, [fetchMaintenanceItems]);

  // Initial fetch of data
  useEffect(() => {
    fetchTopics();
    fetchStatistics();
    // We don't fetch maintenance items here to avoid unnecessary fetches
    // Components should call fetchMaintenanceItems when they mount
  }, [fetchTopics, fetchStatistics]);

  const contextValue: PreventiveMaintenanceContextState = {
    // Data
    maintenanceItems,
    topics,
    statistics,
    selectedMaintenance,
    totalCount,
    
    // UI State
    isLoading,
    error,
    filterParams,
    
    // Actions
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

// Custom hook to use the context
export const usePreventiveMaintenance = () => {
  const context = useContext(PreventiveMaintenanceContext);
  if (context === undefined) {
    throw new Error('usePreventiveMaintenance must be used within a PreventiveMaintenanceProvider');
  }
  return context;
};