"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader,
  RefreshCcw,
} from "lucide-react";

// --- UI Component Imports ---
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination";
import { Button } from "@/app/components/ui/button";
import { useToast } from "@/app/components/ui/use-toast";

// --- Lib/Context/Hook Imports ---
import { useUser } from "@/app/lib/user-context";
import { updateJob, deleteJob, ApiError } from "@/app/lib/data.server"; // Verify path
import { Job, JobStatus, JobPriority, Topic, Room } from "@/app/lib/types"; // Verify path
import { useJobsData } from "@/app/lib/hooks/useJobsData"; // Verify path & hook signature

// --- Feature Component Imports ---
import CreateJobButton from "@/app/components/jobs/CreateJobButton"; // Verify path
import JobFilters, { FilterState } from "@/app/components/jobs/JobFilters"; // Verify path
import EditJobDialog from "@/app/components/jobs/EditJobDialog"; // Verify path
import DeleteJobDialog from "@/app/components/jobs/DeleteJobDialog"; // Verify path
import JobTableRow from "@/app/components/jobs/JobTableRow"; // Verify path

// Constants
const ITEMS_PER_PAGE = 10;
const MAX_VISIBLE_PAGES = 5;

// --- Pagination Helper ---
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

// --- Error Message Helper ---
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


// --- Main Component ---
const MyJobs: React.FC<{ activePropertyId?: string }> = ({ activePropertyId: propActivePropertyId }) => {
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const { userProfile, loading: userLoading, selectedProperty } = useUser();
  const router = useRouter();

  const currentActivePropertyId = propActivePropertyId ?? selectedProperty;

  // --- State ---
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


  // --- Data Fetching Hook (Adjusted Call) ---
  const {
    jobs: allJobs,
    isLoading: jobsLoading,
    error: jobsError,
    refreshJobs,
    updateJob, // Hook's function to update local state
    removeJob,
  } = useJobsData({
      propertyId: currentActivePropertyId || null,
    });

  // Combined loading state
  const isInitialLoading = sessionStatus === "loading" || userLoading || (jobsLoading && (!allJobs || allJobs.length === 0) && !jobsError);
  const isRefreshing = jobsLoading && !isInitialLoading;


  // --- Client-Side Filtering (Reintroduced) ---
  const filteredJobs = useMemo(() => {
    if (!allJobs) return [];
    return allJobs.filter((job) => {
        // Search Filter
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
            filters.search === "" ||
            job.job_id.toString().includes(searchLower) ||
            job.description.toLowerCase().includes(searchLower) ||
            (job.rooms && job.rooms.some(room => room.name.toLowerCase().includes(searchLower))) ||
            (job.topics && job.topics.some(topic => topic.title.toLowerCase().includes(searchLower)));

        // Status Filter
        const matchesStatus = filters.status === "all" || job.status === filters.status;
        // Priority Filter
        const matchesPriority = filters.priority === "all" || job.priority === filters.priority;
        // Preventive Maintenance Filter
        const matchesPreventive = filters.is_preventivemaintenance === null || job.is_preventivemaintenance === filters.is_preventivemaintenance;
        // Date Range Filter
        let matchesDate = true;
        if (filters.dateRange?.from || filters.dateRange?.to) {
            try {
                const jobDate = new Date(job.created_at); jobDate.setHours(0, 0, 0, 0);
                const fromDate = filters.dateRange.from ? new Date(filters.dateRange.from) : null; if (fromDate) fromDate.setHours(0, 0, 0, 0);
                const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : null; if (toDate) toDate.setHours(0, 0, 0, 0);
                if (fromDate && toDate) { matchesDate = jobDate >= fromDate && jobDate <= toDate; }
                else if (fromDate) { matchesDate = jobDate >= fromDate; }
                else if (toDate) { matchesDate = jobDate <= toDate; }
            } catch (e) { console.error("Error parsing job date for filtering:", job.created_at, e); matchesDate = false; }
        }
        return matchesSearch && matchesStatus && matchesPriority && matchesPreventive && matchesDate;
    });
  }, [allJobs, filters]);


  // --- Client-Side Pagination Calculations ---
  const totalJobsFiltered = filteredJobs.length;
  const totalPages = totalJobsFiltered > 0 ? Math.ceil(totalJobsFiltered / ITEMS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE , totalJobsFiltered);
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  // --- Effects ---
  useEffect(() => {
    if (sessionStatus === "unauthenticated" || (sessionStatus === "authenticated" && !session)) {
      router.push("/api/auth/signin");
    }
  }, [sessionStatus, session, router]);

   useEffect(() => {
       setCurrentPage(1);
   }, [filters]);

  // --- Callbacks ---
  const handleFilterChange = useCallback((newFilters: FilterState) => { setFilters(newFilters); }, []);
  const handleClearFilters = useCallback(() => { setFilters({ search: "", status: "all", priority: "all", dateRange: {}, is_preventivemaintenance: null }); }, []);
  const handlePageChange = useCallback((page: number) => { const newPage = Math.max(1, Math.min(page, totalPages || 1)); setCurrentPage(newPage); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [totalPages]);
  const handleEdit = useCallback((job: Job) => { setSelectedJob(job); setIsEditDialogOpen(true); }, []);
  const handleDelete = useCallback((job: Job) => { setSelectedJob(job); setIsDeleteDialogOpen(true); }, []);

  // --- handleEditSubmit ---
  const handleEditSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedJob || !session?.user?.accessToken || !updateJob || !toast) { console.error("Edit submit cancelled: Missing prerequisites."); return; }

      const formData = new FormData(event.currentTarget);
      const description = formData.get("description") as string;
      const priority = formData.get("priority") as JobPriority;
      if (!description || description.trim() === "") { toast({ title: "Validation Error", description: "Description is required.", variant: "destructive" }); return; }
      if (!priority) { toast({ title: "Validation Error", description: "Priority is required.", variant: "destructive" }); return; }
      const remarksValue = formData.get("remarks") as string | null;
      const remarks: string | undefined = (remarksValue && remarksValue.trim() !== "") ? remarksValue.trim() : undefined;
      const is_defective = formData.get("is_defective") === "on";

      setIsSubmitting(true);
      try {
          // Construct the FULL Job object for API and local state
          const locallyUpdatedJob: Job = {
              job_id: selectedJob.job_id, status: selectedJob.status, created_at: selectedJob.created_at,
              property_id: selectedJob.property_id, rooms: selectedJob.rooms, topics: selectedJob.topics,
              completed_at: selectedJob.completed_at, description: description, priority: priority,
              remarks: remarks, is_defective: is_defective, updated_at: new Date().toISOString(),
          };

          // API Call (expects full Job object) - Ensure imported updateJob is correct
          await updateJob(locallyUpdatedJob); // API Update function

          // Update local state via hook's updateJob function
          updateJob(locallyUpdatedJob as Job); // Hook Update function (assertion as fallback)

          toast({ title: "Success", description: `Job #${selectedJob.job_id} updated.` });
          setIsEditDialogOpen(false); setSelectedJob(null);
      } catch (error) {
           console.error("Error updating job:", error);
           let errorTitle = "Error Updating Job"; let errorDesc = "An unexpected error occurred.";
           if (error instanceof ApiError) { errorTitle = `Update Error (${error.status || 'Network'})`; if (error.errorData && typeof error.errorData === 'object') { const details = Object.entries(error.errorData).map(([field, messages]) => `${field}: ${(Array.isArray(messages) ? messages.join(', ') : messages)}`).join('; '); errorDesc = details || error.errorData.detail || error.message || "Update failed."; } else { errorDesc = error.message || "Update failed."; } }
           else if (error instanceof Error) { errorDesc = error.message; }
           toast({ title: errorTitle, description: errorDesc, variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  }, [selectedJob, session, updateJob, toast]); // Ensure hook's updateJob is dependency

  // --- handleDeleteConfirm ---
  const handleDeleteConfirm = useCallback(async () => {
      if (!selectedJob || !session?.user?.accessToken || !removeJob || !toast) { console.error("Delete confirm cancelled: Missing prerequisites."); return; }
      setIsSubmitting(true);
      const jobIdToDelete = selectedJob.job_id;
      try {
          // API Call - Ensure imported deleteJob is correct
          await deleteJob(String(jobIdToDelete), session.user.accessToken); // Assuming delete needs ID and token
          removeJob(jobIdToDelete); // Update local state via hook's function
          toast({ title: "Success", description: `Job #${jobIdToDelete} deleted.` });
          setIsDeleteDialogOpen(false);
          if (currentJobs.length === 1 && currentPage > 1) { setCurrentPage(prev => Math.max(1, prev - 1)); }
          setSelectedJob(null);
      } catch (error) {
          console.error("Error deleting job:", error);
          let errorTitle = "Error Deleting Job"; let errorDesc = "An unexpected error occurred.";
          if (error instanceof ApiError) { errorTitle = `Delete Error (${error.status || 'Network'})`; errorDesc = error.errorData?.detail || error.message || "Delete failed."; }
          else if (error instanceof Error) { errorDesc = error.message; }
          toast({ title: errorTitle, description: errorDesc, variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  }, [selectedJob, session, removeJob, toast, currentJobs, currentPage]);

  const handleJobCreated = useCallback(async () => { toast({ title: "Job Created", description: "Refreshing list..." }); await refreshJobs(true); }, [refreshJobs, toast]);
  const handleManualRefresh = useCallback(async () => { toast({ title: "Refreshing...", description: "Fetching latest jobs." }); await refreshJobs(true); }, [refreshJobs, toast]);


  // --- Render Logic ---
  if (isInitialLoading) { return (<div className="flex justify-center items-center min-h-[400px]"><Loader className="h-8 w-8 animate-spin text-gray-500" /><span className="ml-3 text-lg text-gray-600">Loading jobs...</span></div>); }
  if (sessionStatus === 'unauthenticated' || !session || !userProfile) { return (<div className="flex justify-center items-center min-h-[400px]"><span className="text-lg text-gray-600">{sessionStatus === 'unauthenticated' ? 'Redirecting to sign in...' : 'Authenticating...'}</span></div>); }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:gap-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Maintenance Jobs</h1>
            <p className="text-gray-600 mt-1 text-sm">
              {totalJobsFiltered > 0 ? `Viewing ${startIndex + 1}-${endIndex} of ${totalJobsFiltered} matching request${totalJobsFiltered !== 1 ? "s" : ""}` : (allJobs && allJobs.length > 0) ? "No requests match filters" : "No requests found"}
              {userProfile?.username ? ` for ${userProfile.username}` : ""}
              {currentActivePropertyId && userProfile?.properties?.find(p=>p.property_id === currentActivePropertyId)?.name ? ` at ${userProfile?.properties?.find(p=>p.property_id === currentActivePropertyId)?.name}` : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
             <Button variant="outline" onClick={handleManualRefresh} disabled={jobsLoading} className="h-10"><RefreshCcw className={`h-4 w-4 mr-2 ${jobsLoading ? 'animate-spin' : ''}`} />Refresh</Button>
             {currentActivePropertyId && <CreateJobButton onJobCreated={handleJobCreated} />}
          </div>
        </div>
      </div>

      {/* Filters */}
      <JobFilters filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />

      {/* Error */}
      {jobsError && !isInitialLoading && (
          <div className="my-6 p-4 border border-red-200 rounded-lg bg-red-50 text-red-800">
              <div className="flex items-center"><AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" /><span className="font-medium">Error loading jobs: {getErrorMessage(jobsError)}</span></div>
              <Button variant="link" size="sm" onClick={handleManualRefresh} className="text-red-800 px-0 h-auto py-1 mt-1">Retry</Button>
          </div>
      )}

      {/* Refreshing */}
      {isRefreshing && (<div className="text-center py-4 text-gray-500"><Loader className="h-5 w-5 animate-spin inline mr-2" /> Loading...</div>)}

      {/* Jobs List Area */}
       <div className="mt-6">
           {!isInitialLoading && !jobsError && (
               <>
                    {currentJobs.length > 0 ? (
                        <>
                            <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 hover:bg-gray-100">
                                            <TableHead className="md:hidden p-3 text-gray-700 font-semibold text-left">Job Details</TableHead>
                                            <TableHead className="w-[180px] hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">Job Details</TableHead>
                                            <TableHead className="hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">Description</TableHead>
                                            <TableHead className="hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">Location & Topic</TableHead>
                                            <TableHead className="hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">Status</TableHead>
                                            <TableHead className="hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-left">Created</TableHead>
                                            <TableHead className="w-[100px] hidden md:table-cell py-3 px-4 text-gray-700 font-semibold text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentJobs.map((job) => (<JobTableRow key={job.job_id} job={job} onEdit={handleEdit} onDelete={handleDelete}/>))}
                                    </TableBody>
                                </Table>
                             </div>
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                    <div className="text-sm text-gray-600">Showing {startIndex + 1} to {endIndex} of {totalJobsFiltered} results</div>
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem><PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} aria-disabled={currentPage === 1} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} /></PaginationItem>
                                            {getPaginationRange(currentPage, totalPages, MAX_VISIBLE_PAGES).map((page, index) => (<PaginationItem key={index}>{page === '...' ? <PaginationEllipsis /> : <PaginationLink isActive={currentPage === page} onClick={() => handlePageChange(page as number)} aria-current={currentPage === page ? "page" : undefined} className="cursor-pointer">{page}</PaginationLink>}</PaginationItem>))}
                                            <PaginationItem><PaginationNext onClick={() => handlePageChange(currentPage + 1)} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} /></PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    ) : (
                        /* No Jobs Message */
                        <div className="text-center p-10 md:p-16 border rounded-lg bg-white shadow-sm">
                             <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                             <h3 className="text-lg font-medium text-gray-900">{allJobs && allJobs.length > 0 ? "No jobs match your current filters" : "No maintenance jobs found"}{currentActivePropertyId ? ` for this property` : ""}</h3>
                             <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">{allJobs && allJobs.length > 0 ? "Try adjusting or clearing your filters." : (currentActivePropertyId ? "Create a new job request to get started." : "Select a property to view or create jobs.")}</p>
                             <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                                  {(filters.search !== '' || filters.status !== 'all' || filters.priority !== 'all' || filters.dateRange?.from || filters.dateRange?.to || filters.is_preventivemaintenance !== null) && (<Button onClick={handleClearFilters} variant="outline">Clear Filters</Button>)}
                                 <Button onClick={handleManualRefresh} variant="outline" disabled={jobsLoading}><RefreshCcw className={`h-4 w-4 mr-2 ${jobsLoading ? 'animate-spin' : ''}`} /> Refresh</Button>
                                 {currentActivePropertyId && <CreateJobButton onJobCreated={handleJobCreated} />}
                             </div>
                         </div>
                    )}
               </>
           )}
       </div>

      {/* Dialogs */}
      {isEditDialogOpen && selectedJob ? (<EditJobDialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} job={selectedJob} onSubmit={handleEditSubmit} isSubmitting={isSubmitting}/>) : null}
      {isDeleteDialogOpen ? (<DeleteJobDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={handleDeleteConfirm} isSubmitting={isSubmitting} jobId={selectedJob?.job_id}/>) : null}

    </div>
  );
};
MyJobs.displayName = "MyJobs";
export default MyJobs;