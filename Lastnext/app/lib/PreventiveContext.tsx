'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
// Import types from the fixed models file
import { 
  PreventiveMaintenance, 
  FrequencyType,
  PreventiveMaintenanceRequest,
  FrequencyDistribution,
  Topic,
  ServiceResponse
} from '@/app/lib/preventiveMaintenanceModels';

// Import SearchParams and PreventiveMaintenanceCompleteRequest from service
import preventiveMaintenanceService, {
  SearchParams,
  PreventiveMaintenanceCompleteRequest
} from '@/app/lib/PreventiveMaintenanceService';

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
      const response = await preventiveMaintenanceService.getAllPreventiveMaintenance(fetchParams);
      
      if (response.success && response.data) {
        // Set maintenance items from results
        setMaintenanceItems(response.data.results);
        setTotalCount(response.data.count);
        
        // If topics are included in the response, update topics state
        if (response.data.topics && Array.isArray(response.data.topics)) {
          setTopics(response.data.topics);
        }
      } else {
        throw new Error(response.error || 'Failed to fetch maintenance items');
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
      const response = await preventiveMaintenanceService.getPreventiveMaintenanceStats();
      
      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch maintenance statistics');
      }
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to fetch maintenance statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch topics
  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await preventiveMaintenanceService.getTopics();
      
      if (response.success && response.data) {
        setTopics(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch topics');
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
        throw new Error(response.error || `Failed to fetch maintenance with ID ${pmId}`);
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
      const response = await preventiveMaintenanceService.createPreventiveMaintenance(data);
      
      if (response.success && response.data) {
        // Refresh the list after creating a new item
        fetchMaintenanceItems();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create maintenance record');
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
      const response = await preventiveMaintenanceService.updatePreventiveMaintenance(pmId, data);
      
      if (response.success && response.data) {
        // Refresh selected maintenance
        setSelectedMaintenance(response.data);
        // Refresh the list
        fetchMaintenanceItems();
        return response.data;
      } else {
        throw new Error(response.error || `Failed to update maintenance with ID ${pmId}`);
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
        throw new Error(response.error || `Failed to delete maintenance with ID ${pmId}`);
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
      const safeData: PreventiveMaintenanceCompleteRequest = {
        ...data,
        notes: data.notes === null ? '' : data.notes // Convert null to empty string if needed
      };
      
      const response = await preventiveMaintenanceService.completePreventiveMaintenance(pmId, safeData);
      
      if (response.success && response.data) {
        // Refresh selected maintenance
        setSelectedMaintenance(response.data);
        // Refresh the list
        fetchMaintenanceItems();
        return response.data;
      } else {
        throw new Error(response.error || `Failed to complete maintenance with ID ${pmId}`);
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