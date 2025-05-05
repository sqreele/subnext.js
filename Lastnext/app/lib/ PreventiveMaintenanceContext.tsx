'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
// Import all types from the models file
import { 
  PreventiveMaintenance, 
  PMStatistics,
  Job,
  PMListParams,
  ApiError,
  FrequencyDistribution,
  CompletePMRequest,
  PreventiveMaintenanceRequest
} from '@/app/lib/preventiveMaintenanceModels';

// Import the service but use local model types
import preventiveMaintenanceService, {
  PreventiveMaintenanceCompleteRequest 
} from '@/app/lib/PreventiveMaintenanceService';

// Define the context state type
interface PreventiveMaintenanceContextState {
  // Data
  maintenanceItems: PreventiveMaintenance[];
  statistics: PMStatistics | null;
  selectedMaintenance: PreventiveMaintenance | null;
  availableJobs: Job[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
  filterParams: PMListParams;
  
  // Actions
  fetchMaintenanceItems: (params?: PMListParams) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  fetchMaintenanceById: (pmId: string) => Promise<PreventiveMaintenance | null>;
  createMaintenance: (data: PreventiveMaintenanceRequest) => Promise<PreventiveMaintenance | null>;
  updateMaintenance: (pmId: string, data: PreventiveMaintenanceRequest) => Promise<PreventiveMaintenance | null>;
  deleteMaintenance: (pmId: string) => Promise<boolean>;
  completeMaintenance: (pmId: string, data: PreventiveMaintenanceCompleteRequest) => Promise<PreventiveMaintenance | null>;
  fetchAvailableJobs: () => Promise<void>;
  setFilterParams: (params: PMListParams) => void;
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
  
  // Initialize statistics with the correct typed structure
  const [statistics, setStatistics] = useState<PMStatistics | null>(null);
  
  const [selectedMaintenance, setSelectedMaintenance] = useState<PreventiveMaintenance | null>(null);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterParams, setFilterParams] = useState<PMListParams>({
    status: 'all',
    page: 1,
    page_size: 10
  });

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch maintenance items
  const fetchMaintenanceItems = useCallback(async (params?: PMListParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchParams = params || filterParams;
      const response = await preventiveMaintenanceService.getAllPreventiveMaintenance(fetchParams);
      
      // Ensure frequency is correctly typed
      const typedData = response.map(item => ({
        ...item,
        // Make sure frequency is one of the expected values
        frequency: validateFrequency(item.frequency)
      })) as PreventiveMaintenance[];
      
      setMaintenanceItems(typedData);
    } catch (err: any) {
      console.error('Error fetching maintenance items:', err);
      setError(err.message || 'Failed to fetch maintenance items');
    } finally {
      setIsLoading(false);
    }
  }, [filterParams]);

  // Helper function to validate frequency values
  const validateFrequency = (frequency: string): "daily" | "weekly" | "monthly" | "quarterly" | "semi_annual" | "annual" | "custom" => {
    const validFrequencies = ["daily", "weekly", "monthly", "quarterly", "semi_annual", "annual", "custom"];
    if (validFrequencies.includes(frequency)) {
      return frequency as "daily" | "weekly" | "monthly" | "quarterly" | "semi_annual" | "annual" | "custom";
    }
    // Default to monthly if an invalid value is received
    console.warn(`Invalid frequency value received: ${frequency}. Defaulting to 'monthly'.`);
    return "monthly";
  };

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await preventiveMaintenanceService.getPreventiveMaintenanceStats();
      
      // Process upcoming items to ensure frequency is correctly typed
      const typedUpcoming = response.upcoming?.map(item => ({
        ...item,
        frequency: validateFrequency(item.frequency)
      })) || [];
      
      // Make sure the data structure matches our PMStatistics interface
      const typedData: PMStatistics = {
        counts: response.counts || { total: 0, completed: 0, pending: 0, overdue: 0 },
        frequency_distribution: response.frequency_distribution || [],
        upcoming: typedUpcoming
      };
      
      setStatistics(typedData);
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to fetch maintenance statistics');
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
      
      // Ensure frequency is correctly typed
      const typedData: PreventiveMaintenance = {
        ...response,
        frequency: validateFrequency(response.frequency)
      };
      
      setSelectedMaintenance(typedData);
      return typedData;
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
      
      // Ensure frequency is correctly typed
      const typedResult: PreventiveMaintenance = {
        ...response,
        frequency: validateFrequency(response.frequency)
      };
      
      // Refresh the list after creating a new item
      fetchMaintenanceItems();
      return typedResult;
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
      
      // Ensure frequency is correctly typed
      const typedResult: PreventiveMaintenance = {
        ...response,
        frequency: validateFrequency(response.frequency)
      };
      
      // Refresh selected maintenance
      setSelectedMaintenance(typedResult);
      // Refresh the list
      fetchMaintenanceItems();
      return typedResult;
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
      await preventiveMaintenanceService.deletePreventiveMaintenance(pmId);
      // Refresh the list after deleting
      fetchMaintenanceItems();
      return true;
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
      
      // Ensure frequency is correctly typed
      const typedResult: PreventiveMaintenance = {
        ...response,
        frequency: validateFrequency(response.frequency)
      };
      
      // Refresh selected maintenance
      setSelectedMaintenance(typedResult);
      // Refresh the list
      fetchMaintenanceItems();
      return typedResult;
    } catch (err: any) {
      console.error(`Error completing maintenance with ID ${pmId}:`, err);
      setError(err.message || 'Failed to complete maintenance record');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchMaintenanceItems]);

  // Fetch available jobs
  const fetchAvailableJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await preventiveMaintenanceService.getPreventiveMaintenanceJobs();
      const jobs = Array.isArray(result) ? result : result.jobs || [];
      setAvailableJobs(jobs as Job[]); // Type assertion to ensure compatibility
    } catch (err: any) {
      console.error('Error fetching available jobs:', err);
      setError(err.message || 'Failed to fetch available jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch of data
  useEffect(() => {
    fetchAvailableJobs();
    fetchStatistics();
    // We don't fetch maintenance items here to avoid unnecessary fetches
    // Components should call fetchMaintenanceItems when they mount
  }, [fetchAvailableJobs, fetchStatistics]);

  const contextValue: PreventiveMaintenanceContextState = {
    // Data
    maintenanceItems,
    statistics,
    selectedMaintenance,
    availableJobs,
    
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
    fetchAvailableJobs,
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