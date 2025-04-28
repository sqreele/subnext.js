// app/dashboard/myJobs/myJobs.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader, RefreshCcw, WifiOff, Clock } from "lucide-react";

// UI Component Imports
import {
  Table, TableBody, TableHead, TableHeader, TableRow
} from "@/app/components/ui/table";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious
} from "@/app/components/ui/pagination";
import { Button } from "@/app/components/ui/button";
import { useToast } from "@/app/components/ui/use-toast";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

// Lib/Context/Hook Imports
import { useJobsData } from "@/app/lib/hooks/useJobsData";
import { updateJob, deleteJob, ApiError } from "@/app/lib/data.server";
import { Job, JobStatus, JobPriority } from "@/app/lib/types";
import { useProperty } from "@/app/lib/PropertyContext"; // Added PropertyContext

// Feature Component Imports
import CreateJobButton from "@/app/components/jobs/CreateJobButton";
import JobFilters, { FilterState } from "@/app/components/jobs/JobFilters";
import EditJobDialog from "@/app/components/jobs/EditJobDialog";
import DeleteJobDialog from "@/app/components/jobs/DeleteJobDialog";
import JobTableRow from "@/app/components/jobs/JobTableRow";

// Constants
const ITEMS_PER_PAGE = 10;
const MAX_VISIBLE_PAGES = 5;
const MAX_RETRY_ATTEMPTS = 3;

// Pagination Helper
const getPaginationRange = (currentPage: number, totalPages: number, maxVisible: number): (number | '...')[] => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const sideWidth = Math.max(1, Math.floor((maxVisible - 3) / 2));
  const leftBound = currentPage - sideWidth;
  const rightBound = currentPage + sideWidth;
  const range: (number | '...')[] = [];
  range.push(1);
  if (leftBound > 2) range.push('...');
  let middleStart = Math.max(2, leftBound);
  let middleEnd = Math.min(totalPages - 1, rightBound);
  if (currentPage <= sideWidth + 2) {
    middleStart = 2;
    middleEnd = Math.min(totalPages - 1, maxVisible - 1);
  } else if (currentPage >= totalPages - sideWidth - 1) {
    middleStart = Math.max(2, totalPages - maxVisible + 2);
    middleEnd = totalPages - 1;
  }
  for (let i = middleStart; i <= middleEnd; i++) range.push(i);
  if (rightBound < totalPages - 1) range.push('...');
  if (totalPages > 1) range.push(totalPages);
  return range;
};

// Error Message Helper
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim() !== '') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return "An unknown error occurred";
};

// Helper function to check if a job belongs to a property
const jobBelongsToProperty = (job: Job, propertyId: string): boolean => {
  // Direct property match
  if (job.property_id === propertyId) {
    return true;
  }

  // Check profile_image.properties
  const profileMatches = job.profile_image?.properties?.some(
    prop => {
      if (typeof prop === 'object' && prop !== null && 'property_id' in prop) {
        return String(prop.property_id) === propertyId;
      }
      return String(prop) === propertyId;
    }
  ) || false;

  if (profileMatches) return true;

  // Check rooms.properties
  const roomsMatch = job.rooms?.some(room => {
    return room.properties?.some(
      propId => String(propId) === propertyId
    );
  }) || false;

  return roomsMatch;
};

// Main Component
const MyJobs: React.FC<{ activePropertyId?: string }> = ({ activePropertyId: propActivePropertyId }) => {
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  // Add PropertyContext integration
  const { selectedProperty, setSelectedProperty, userProperties } = useProperty();

  // Initialize propertyId from props, PropertyContext, or localStorage
  const [localPropertyId, setLocalPropertyId] = useState<string | null>(null);
  
  useEffect(() => {
    // Try to load from localStorage on initial render if not provided via props or context
    if (typeof window !== 'undefined' && !propActivePropertyId && !selectedProperty && !localPropertyId) {
      const storedPropertyId = localStorage.getItem("selectedPropertyId");
      if (storedPropertyId) {
        setLocalPropertyId(storedPropertyId);
        // Also update the PropertyContext for consistency
        setSelectedProperty(storedPropertyId);
      }
    }
  }, [propActivePropertyId, selectedProperty, localPropertyId, setSelectedProperty]);

  // Determine the current active property ID, prioritizing props over context over local state
  const currentActivePropertyId = propActivePropertyId ?? selectedProperty ?? localPropertyId;

  // Get property name for display purposes
  const getPropertyName = useCallback((propertyId: string): string => {
    const property = userProperties.find(p => p.property_id === propertyId);
    return property?.name || `Property ${propertyId}`;
  }, [userProperties]);

  // State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    priority: "all",
    dateRange: {},
    is_preventivemaintenance: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualRetryCount, setManualRetryCount] = useState(0);

  // Data Fetching Hook with optimized settings
  const {
    jobs: allJobs,
    isLoading: jobsLoading,
    error: jobsError,
    refreshJobs,
    updateJob: updateLocalJob,
    removeJob,
    retryCount
  } = useJobsData({
    propertyId: currentActivePropertyId || null,
    retryCount: MAX_RETRY_ATTEMPTS,
    showToastErrors: true
  });

  // Combined loading state
  const isInitialLoading = sessionStatus === "loading" || 
    (jobsLoading && (!allJobs || allJobs.length === 0) && !jobsError);
  const isRefreshing = jobsLoading && !isInitialLoading;

  // Determine if there's a timeout error
  const isTimeoutError = jobsError && (
    jobsError.includes('timeout') || 
    jobsError.includes('time out') || 
    jobsError.includes('ECONNABORTED')
  );

  // Determine if we can show cached jobs while retrying
  const showCachedJobs = allJobs && allJobs.length > 0 && isTimeoutError;

  // Sync property changes
  useEffect(() => {
    // When selectedProperty changes in context but doesn't match our local state
    if (selectedProperty && selectedProperty !== localPropertyId && selectedProperty !== propActivePropertyId) {
      // Update our local reference
      setLocalPropertyId(selectedProperty);
      
      // If we were viewing filtered jobs, refresh with the new property
      refreshJobs(true);
    }
  }, [selectedProperty, localPropertyId, propActivePropertyId, refreshJobs]);

  // Client-Side Filtering with proper safeguards and property filtering
  const filteredJobs = useMemo(() => {
    if (!allJobs || !Array.isArray(allJobs)) return [];
    
    // First, filter jobs by property if needed
    let propertyFilteredJobs = allJobs;
    if (currentActivePropertyId) {
      propertyFilteredJobs = allJobs.filter(job => 
        jobBelongsToProperty(job, currentActivePropertyId)
      );
    }
    
    return propertyFilteredJobs.filter((job) => {
      // Null check for job object
      if (!job) return false;
      
      // Search Filter with null checks
      const searchLower = (filters.search || "").toLowerCase();
      const matchesSearch =
        !searchLower || // Empty search matches everything
        (job.job_id != null && job.job_id.toString().includes(searchLower)) ||
        (job.description && job.description.toLowerCase().includes(searchLower)) ||
        (job.rooms && Array.isArray(job.rooms) && job.rooms.some(room => 
          room && room.name && room.name.toLowerCase().includes(searchLower)
        )) ||
        (job.topics && Array.isArray(job.topics) && job.topics.some(topic => 
          topic && topic.title && topic.title.toLowerCase().includes(searchLower)
        ));

      // Status Filter
      const matchesStatus = filters.status === "all" || job.status === filters.status;
      
      // Priority Filter
      const matchesPriority = filters.priority === "all" || job.priority === filters.priority;
      
      // Preventive Maintenance Filter
      const matchesPreventive = filters.is_preventivemaintenance === null || 
        job.is_preventivemaintenance === filters.is_preventivemaintenance;
      
      // Date Range Filter with guards for invalid dates
      let matchesDate = true;
      if (filters.dateRange?.from || filters.dateRange?.to) {
        try {
          if (!job.created_at) return false;
          
          const jobDate = new Date(job.created_at);
          // Invalid date check
          if (isNaN(jobDate.getTime())) return false;
          
          jobDate.setHours(0, 0, 0, 0);
          
          const fromDate = filters.dateRange.from ? new Date(filters.dateRange.from) : null;
          if (fromDate) fromDate.setHours(0, 0, 0, 0);
          
          const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : null;
          if (toDate) toDate.setHours(0, 0, 0, 0);
          
          if (fromDate && toDate) {
            matchesDate = jobDate >= fromDate && jobDate <= toDate;
          } else if (fromDate) {
            matchesDate = jobDate >= fromDate;
          } else if (toDate) {
            matchesDate = jobDate <= toDate;
          }
        } catch (e) {
          console.error("Error parsing job date for filtering:", job.created_at, e);
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesStatus && matchesPriority && matchesPreventive && matchesDate;
    });
  }, [allJobs, filters, currentActivePropertyId]);


  // Client-Side Pagination Calculations
  const totalJobsFiltered = filteredJobs.length;
  const totalPages = totalJobsFiltered > 0 ? Math.ceil(totalJobsFiltered / ITEMS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalJobsFiltered);
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Callbacks
  const handleFilterChange = useCallback((newFilters: FilterState) => { 
    setFilters(newFilters); 
  }, []);
  
  const handleClearFilters = useCallback(() => { 
    setFilters({ 
      search: "", 
      status: "all", 
      priority: "all", 
      dateRange: {}, 
      is_preventivemaintenance: null 
    }); 
  }, []);
  
  const handlePageChange = useCallback((page: number) => { 
    const newPage = Math.max(1, Math.min(page, totalPages || 1)); 
    setCurrentPage(newPage); 
    
    // Smooth scroll to top with delay to allow for rendering
    setTimeout(() => {
      const tableElement = document.querySelector('.job-grid-container');
      if (tableElement) {
        const headerOffset = 100; // Adjust based on your header height
        const elementPosition = tableElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, [totalPages]);
  
  const handleEdit = useCallback((job: Job) => { 
    setSelectedJob(job); 
    setIsEditDialogOpen(true); 
  }, []);
  
  const handleDelete = useCallback((job: Job) => { 
    setSelectedJob(job); 
    setIsDeleteDialogOpen(true); 
  }, []);

  // IMPROVED: Manual job refresh with error handling 
  const handleManualRefresh = useCallback(async () => {
    // Show toast to indicate refresh attempt
    toast({ 
      title: "Refreshing jobs...", 
      description: "Fetching the latest data from server." 
    });
    
    // Increment manual retry counter for UX feedback
    setManualRetryCount(prev => prev + 1);
    
    try {
      const success = await refreshJobs(true);
      if (!success && !isTimeoutError) {
        // Only show error toast if it's not a timeout (timeout already has dedicated UI)
        toast({
          title: "Refresh failed",
          description: jobsError || "Could not retrieve jobs at this time.",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Refresh error",
        description: getErrorMessage(err),
        variant: "destructive"
      });
    }
  }, [refreshJobs, toast, jobsError, isTimeoutError]);

  // Job Creation Callback
  const handleJobCreated = useCallback(async () => {
    toast({ 
      title: "Job Created", 
      description: "Refreshing job list..." 
    });
    await refreshJobs(true);
  }, [refreshJobs, toast]);

  // Edit Submit Handler with better error feedback
  const handleEditSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Add checks for id and user on selectedJob in the guard clause for runtime safety
    if (!selectedJob || !selectedJob.id || selectedJob.user === undefined || 
        selectedJob.user === null || !session?.user?.accessToken) {
      toast({ 
        title: "Error", 
        description: "Cannot edit job: missing required job data.", 
        variant: "destructive" 
      });
      return;
    }
  
    const formData = new FormData(event.currentTarget);
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as JobPriority;
    
    // Validation
    if (!description || description.trim() === "") { 
      toast({ 
        title: "Validation Error", 
        description: "Description is required.", 
        variant: "destructive" 
      }); 
      return; 
    }
    
    if (!priority) { 
      toast({ 
        title: "Validation Error", 
        description: "Priority is required.", 
        variant: "destructive" 
      }); 
      return; 
    }
    
    const remarksValue = formData.get("remarks") as string | null;
    const remarks: string | undefined = (remarksValue && remarksValue.trim() !== "") 
      ? remarksValue.trim() 
      : undefined;
    const is_defective = formData.get("is_defective") === "on";
  
    setIsSubmitting(true);
    
    try {
      // Construct the FULL Job object for local state updates
      const locallyUpdatedJob: Job = {
        // Required fields from selectedJob
        id: selectedJob.id,
        user: selectedJob.user,
        job_id: selectedJob.job_id,
        status: selectedJob.status,
        created_at: selectedJob.created_at,
        property_id: selectedJob.property_id,
        rooms: selectedJob.rooms,
        topics: selectedJob.topics,
        completed_at: selectedJob.completed_at,
  
        // Fields updated from the form
        description: description,
        priority: priority,
        remarks: remarks,
        is_defective: is_defective,
  
        // Timestamp
        updated_at: new Date().toISOString(),
  
        // Other optional fields from selectedJob
        profile_image: selectedJob.profile_image,
        images: selectedJob.images,
        image_urls: selectedJob.image_urls,
        is_preventivemaintenance: selectedJob.is_preventivemaintenance,
      };
  
      // API Call using the correct parameter signature:
      // updateJob(jobId: string, jobData: Partial<Job>, accessToken?: string)
      const jobId = String(selectedJob.job_id);
      const jobData = {
        description,
        priority,
        remarks,
        is_defective,
        updated_at: new Date().toISOString(),
      };
      
      await updateJob(jobId, jobData, session.user.accessToken);
  
      // Update local state with the complete job object
      updateLocalJob(locallyUpdatedJob);
  
      toast({ 
        title: "Success", 
        description: `Job #${selectedJob.job_id} updated.` 
      });
      
      setIsEditDialogOpen(false);
      setSelectedJob(null);
    } catch (error) {
      console.error("Error updating job:", error);
      
      // Enhanced error display with different messages based on error type
      let errorTitle = "Error Updating Job";
      let errorDesc = "An unexpected error occurred.";
      
      if (error instanceof ApiError) {
        errorTitle = `Update Error (${error.status || 'Network'})`;
        
        if (error.status === 408 || (error.message && error.message.includes('timeout'))) {
          errorTitle = "Connection Timeout";
          errorDesc = "The server took too long to respond. Your changes may still be saved.";
        } else if (error.errorData && typeof error.errorData === 'object') {
          const details = Object.entries(error.errorData)
            .map(([field, messages]) => `${field}: ${(Array.isArray(messages) ? messages.join(', ') : messages)}`)
            .join('; ');
          errorDesc = details || error.errorData.detail || error.message || "Update failed.";
        } else {
          errorDesc = error.message || "Update failed.";
        }
      } else if (error instanceof Error) {
        errorDesc = error.message;
      }
      
      toast({ 
        title: errorTitle, 
        description: errorDesc, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedJob, session, updateLocalJob, toast]);

  // Delete Confirmation Handler with improved error handling
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedJob || !session?.user?.accessToken) {
      console.error("Delete confirm cancelled: Missing prerequisites.");
      return;
    }
    
    setIsSubmitting(true);
    const jobIdToDelete = selectedJob.job_id;
    
    try {
      // API Call with 3 retry attempts for network issues
      let success = false;
      let attempts = 0;
      let lastError;
      
      while (!success && attempts < 3) {
        try {
          await deleteJob(String(jobIdToDelete), session.user.accessToken);
          success = true;
        } catch (e) {
          lastError = e;
          attempts++;
          
          // Only retry for network/timeout errors
          const isNetworkError = e instanceof Error && 
            (e.message.includes('timeout') || e.message.includes('network') || e.message.includes('connection'));
            
          if (!isNetworkError) break;
          
          // Wait before retrying (exponential backoff)
          await new Promise(r => setTimeout(r, 1000 * attempts));
        }
      }
      
      if (!success) throw lastError;
      
      // Success - Update local state
      removeJob(jobIdToDelete);
      toast({ 
        title: "Success", 
        description: `Job #${jobIdToDelete} deleted.` 
      });
      
      setIsDeleteDialogOpen(false);
      
      // If we just deleted the last item on the current page, go back one page
      if (currentJobs.length === 1 && currentPage > 1) {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }
      
      setSelectedJob(null);
    } catch (error) {
      console.error("Error deleting job:", error);
      
      let errorTitle = "Error Deleting Job";
      let errorDesc = "An unexpected error occurred.";
      
      if (error instanceof ApiError) {
        errorTitle = `Delete Error (${error.status || 'Network'})`;
        
        if (error.status === 408 || (error.message && error.message.includes('timeout'))) {
          errorTitle = "Connection Timeout";
          errorDesc = "The server took too long to respond. Please check if the job was deleted.";
        } else {
          errorDesc = error.errorData?.detail || error.message || "Delete failed.";
        }
      } else if (error instanceof Error) {
        errorDesc = error.message;
      }
      
      toast({ 
        title: errorTitle, 
        description: errorDesc, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedJob, session, removeJob, toast, currentJobs, currentPage]);

  // Handle property selection change
  const handlePropertyChange = useCallback((propertyId: string) => {
    setSelectedProperty(propertyId);
    
    // Reset filters and current page when changing property
    setFilters({
      search: "",
      status: "all",
      priority: "all",
      dateRange: {},
      is_preventivemaintenance: null,
    });
    setCurrentPage(1);
    
    // Refresh jobs with the new property
    refreshJobs(true);
  }, [setSelectedProperty, refreshJobs]);

  // Authentication redirect effect
  useEffect(() => {
    if (sessionStatus === "unauthenticated" || 
       (sessionStatus === "authenticated" && !session)) {
      router.push("/api/auth/signin");
    }
  }, [sessionStatus, session, router]);
  
  // --- Render Logic ---
  // Show loading spinner when initializing
  if (isInitialLoading) { 
    return (
      <div className="flex justify-center items-center min-h-[400px] p-8 rounded-lg bg-white shadow-sm">
        <Loader className="h-8 w-8 animate-spin text-blue-500 mr-4" />
        <span className="text-lg text-gray-600">Loading jobs...</span>
      </div>
    );
  }
  
  // Show authentication check
  if (sessionStatus === 'unauthenticated' || !session || !session.user) { 
    return (
      <div className="flex justify-center items-center min-h-[400px] p-8 rounded-lg bg-white shadow-sm">
        <span className="text-lg text-gray-600">
          {sessionStatus === 'unauthenticated' ? 'Redirecting to sign in...' : 'Authenticating...'}
        </span>
      </div>
    );
  }

  // Special case for timeout errors but with cached data
  if (isTimeoutError && showCachedJobs) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header with warning */}
        <Alert variant="default" className="bg-yellow-50 border-yellow-300 mb-6">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h3 className="font-semibold text-yellow-700">Connection Timeout</h3>
              <AlertDescription className="text-yellow-600">
                The server is taking too long to respond. Showing previously loaded jobs.
                {retryCount > 0 && <span> Retry attempt {retryCount}/{MAX_RETRY_ATTEMPTS}...</span>}
              </AlertDescription>
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleManualRefresh} 
                  className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <><Loader className="h-3 w-3 animate-spin mr-2" /> Retrying...</>
                  ) : (
                    <><RefreshCcw className="h-3 w-3 mr-2" /> Try Again</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Alert>

        {/* Main Content */}
        <div className="flex flex-col gap-4 md:gap-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Maintenance Jobs</h1>
              <p className="text-gray-600 mt-1 text-sm">
                {totalJobsFiltered > 0 ? 
                  `Viewing ${startIndex + 1}-${endIndex} of ${totalJobsFiltered} matching request${totalJobsFiltered !== 1 ? "s" : ""}` : 
                  (allJobs && allJobs.length > 0) ? 
                    "No requests match filters" : 
                    "No requests found"}
                {session.user?.username ? ` for ${session.user.username}` : ""}
                {currentActivePropertyId ? 
                  ` at ${getPropertyName(currentActivePropertyId)}` : 
                  ""}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={handleManualRefresh} 
                disabled={isRefreshing}
                className="h-10"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Retrying...' : 'Refresh'}
              </Button>
              {currentActivePropertyId && <CreateJobButton onJobCreated={handleJobCreated} />}
            </div>
          </div>
        </div>

        {/* Property Selector (if multiple properties) */}
        {userProperties.length > 1 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {userProperties.map((property) => (
                <Button
                  key={property.property_id}
                  variant={currentActivePropertyId === property.property_id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePropertyChange(property.property_id)}
                >
                  {property.name || `Property ${property.property_id}`}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <JobFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
          onClearFilters={handleClearFilters} 
        />

        {/* Table or Jobs List with cached data */}
        {renderJobsTable()}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:gap-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Maintenance Jobs</h1>
            <p className="text-gray-600 mt-1 text-sm">
              {totalJobsFiltered > 0 ? 
                `Viewing ${startIndex + 1}-${endIndex} of ${totalJobsFiltered} matching request${totalJobsFiltered !== 1 ? "s" : ""}` : 
                (allJobs && allJobs.length > 0) ? 
                  "No requests match filters" : 
                  "No requests found"}
              {session.user?.username ? ` for ${session.user.username}` : ""}
              {currentActivePropertyId ? 
                ` at ${getPropertyName(currentActivePropertyId)}` : 
                ""}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={handleManualRefresh} 
              disabled={isRefreshing} 
              className="h-10"
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            {currentActivePropertyId && <CreateJobButton onJobCreated={handleJobCreated} />}
          </div>
        </div>
      </div>

      {/* Property Selector (if multiple properties) */}
      {userProperties.length > 1 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {userProperties.map((property) => (
              <Button
                key={property.property_id}
                variant={currentActivePropertyId === property.property_id ? "default" : "outline"}
                size="sm"
                onClick={() => handlePropertyChange(property.property_id)}
              >
                {property.name || `Property ${property.property_id}`}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <JobFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        onClearFilters={handleClearFilters} 
      />

      {/* Error */}
      {jobsError && !isRefreshing && !isTimeoutError && (
        <div className="my-6 p-4 border border-red-200 rounded-lg bg-red-50 text-red-800">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="font-medium">
              Error loading jobs: {getErrorMessage(jobsError)}
            </span>
          </div>
          <Button 
            variant="link" 
            size="sm" 
            onClick={handleManualRefresh} 
            className="text-red-800 px-0 h-auto py-1 mt-1"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Network timeout specific error */}
      {isTimeoutError && !showCachedJobs && (
        <div className="my-6 p-6 border border-yellow-300 rounded-lg bg-yellow-50 flex flex-col items-center justify-center text-center">
          <WifiOff className="h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800">Connection Timeout</h3>
          <p className="text-yellow-700 mb-4 max-w-md">
            The server is taking too long to respond. This might be due to network issues or high server load.
          </p>
          <Button 
            onClick={handleManualRefresh} 
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <><Loader className="h-4 w-4 animate-spin mr-2" /> Retrying...</>
            ) : (
              <><RefreshCcw className="h-4 w-4 mr-2" /> Try Again ({manualRetryCount + 1})</>
            )}
          </Button>
        </div>
      )}

      {/* Refreshing */}
      {isRefreshing && (
        <div className="text-center py-4 px-6 my-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-700">
          <Loader className="h-5 w-5 animate-spin inline mr-2" /> 
          Refreshing job data...
        </div>
      )}

      {/* Jobs List Area */}
      {!isTimeoutError && renderJobsTable()}

      {/* Dialogs */}
      {isEditDialogOpen && selectedJob ? (
        <EditJobDialog 
          isOpen={isEditDialogOpen} 
          onClose={() => setIsEditDialogOpen(false)} 
          job={selectedJob} 
          onSubmit={handleEditSubmit} 
          isSubmitting={isSubmitting}
        />
      ) : null}
      
      {isDeleteDialogOpen ? (
        <DeleteJobDialog 
          isOpen={isDeleteDialogOpen} 
          onClose={() => setIsDeleteDialogOpen(false)} 
          onConfirm={handleDeleteConfirm} 
          isSubmitting={isSubmitting} 
          jobId={selectedJob?.job_id}
        />
      ) : null}
    </div>
  );

  // Helper function to render the jobs table
  function renderJobsTable() {
    if (!isInitialLoading && !jobsError && !showCachedJobs && currentJobs.length === 0) {
      return (
        <div className="text-center p-10 md:p-16 border rounded-lg bg-white shadow-sm">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            {allJobs && allJobs.length > 0 ? 
              "No jobs match your current filters" : 
              "No maintenance jobs found"}
            {currentActivePropertyId ? ` for ${getPropertyName(currentActivePropertyId)}` : ""}
          </h3>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            {allJobs && allJobs.length > 0 ? 
              "Try adjusting or clearing your filters." : 
              (currentActivePropertyId ? 
                "Create a new job request to get started." : 
                "Select a property to view or create jobs.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
            {(filters.search !== '' || 
              filters.status !== 'all' || 
              filters.priority !== 'all' || 
              filters.dateRange?.from || 
              filters.dateRange?.to || 
              filters.is_preventivemaintenance !== null) && (
                <Button onClick={handleClearFilters} variant="outline">
                  Clear Filters
                </Button>
              )}
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              disabled={isRefreshing}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> 
              Refresh
            </Button>
            {currentActivePropertyId && 
              <CreateJobButton onJobCreated={handleJobCreated} />}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-100">
                <TableHead className="md:hidden p-3 text-gray-700 font-semibold text-left">
                  Job Details
                </TableHead>
                <TableHead className="w-[180px] hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">
                  Job Details
                </TableHead>
                <TableHead className="hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">
                  Description
                </TableHead>
                <TableHead className="hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">
                  Location & Topic
                </TableHead>
                <TableHead className="hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">
                  Status
                </TableHead>
                <TableHead className="hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">
                  Created
                </TableHead>
                <TableHead className="w-[100px] hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentJobs.map((job) => (
                <JobTableRow 
                  key={job.job_id} 
                  job={job} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                />
              ))}
            </TableBody>
          </Table>
        </div>
                
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {endIndex} of {totalJobsFiltered} results
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    aria-disabled={currentPage === 1} 
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {getPaginationRange(currentPage, totalPages, MAX_VISIBLE_PAGES).map((page, index) => (
                  <PaginationItem key={index}>
                    {page === '...' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink 
                        isActive={currentPage === page} 
                        onClick={() => handlePageChange(page as number)} 
                        aria-current={currentPage === page ? "page" : undefined} 
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    aria-disabled={currentPage === totalPages} 
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    );
  }
};

export default MyJobs;
