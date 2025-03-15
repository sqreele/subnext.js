"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Home,
  Pencil,
  Trash2,
  Loader,
  RefreshCcw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useToast } from "@/app/components/ui/use-toast";
import { useUser } from "@/app/lib/user-context";
import { updateJob, deleteJob } from "@/app/lib/data";
import { Job, JobStatus, JobPriority } from "@/app/lib/types";
import { useJobsData } from "@/app/lib/hooks/useJobsData";
import CreateJobButton from "@/app/components/jobs/CreateJobButton";
import JobFilters, { FilterState } from "@/app/components/jobs/JobFilters";

// Constants
const ITEMS_PER_PAGE = 5;
const MAX_VISIBLE_PAGES = 5;

// Tailwind-based priority styles
const PRIORITY_STYLES: Record<JobPriority | 'default', string> = {
  high: "bg-red-100 text-red-800 border border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  low: "bg-green-100 text-green-800 border border-green-200",
  default: "bg-gray-100 text-gray-800 border border-gray-200",
};

const STATUS_STYLES: Record<JobStatus | "default", string> = {
  completed: "bg-green-100 text-green-800 border border-green-200",
  in_progress: "bg-blue-100 text-blue-800 border border-blue-200",
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  cancelled: "bg-red-100 text-red-800 border border-red-200",
  waiting_sparepart: "bg-gray-100 text-gray-800 border border-gray-200",
  default: "bg-gray-100 text-gray-800 border border-gray-200",
};

// Types
interface JobTableRowProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
}

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

// JobTableRow component
const JobTableRow: React.FC<JobTableRowProps> = React.memo(
  ({ job, onEdit, onDelete }) => (
    <>
      {/* Desktop View */}
      <TableRow
        key={job.job_id}
        className="hidden md:table-row hover:bg-gray-50"
      >
        <TableCell className="py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">#{job.job_id}</div>
            <Badge
              className={`${
                PRIORITY_STYLES[job.priority as JobPriority] || PRIORITY_STYLES.default
              } text-xs`}
            >
              {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="py-4">
          <div className="max-w-[300px] space-y-2">
            <p className="text-sm text-gray-700 truncate">{job.description}</p>
            <div className="flex flex-wrap gap-1">
              {job.topics?.map((topic) => (
                <Badge
                  key={topic.id ?? topic.title}
                  variant="outline"
                  className="text-xs"
                >
                  {topic.title}
                </Badge>
              ))}
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4">
          {job.rooms?.map((room) => (
            <div key={room.room_id} className="flex items-center gap-2 text-sm text-gray-600">
              <Home className="h-4 w-4" />
              {room.name}
            </div>
          ))}
        </TableCell>
        <TableCell className="py-4">
          <Badge
            className={`${
              STATUS_STYLES[job.status] || STATUS_STYLES.default
            } text-xs px-2 py-1`}
          >
            {job.status.replace("_", " ").charAt(0).toUpperCase() + job.status.replace("_", " ").slice(1)}
          </Badge>
        </TableCell>
        <TableCell className="py-4 text-sm text-gray-600">
          {new Date(job.created_at).toLocaleDateString()}
        </TableCell>
        <TableCell className="py-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(job);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(job);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Mobile View */}
      <div className="md:hidden border rounded-lg p-4 mb-4 bg-white shadow-sm">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900">#{job.job_id}</div>
              <Badge
                className={`${
                  PRIORITY_STYLES[job.priority as JobPriority] || PRIORITY_STYLES.default
                } text-xs`}
              >
                {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
              </Badge>
            </div>
            <Badge
              className={`${
                STATUS_STYLES[job.status] || STATUS_STYLES.default
              } text-xs px-2 py-1`}
            >
              {job.status.replace("_", " ").charAt(0).toUpperCase() + job.status.replace("_", " ").slice(1)}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Description:</p>
            <p className="text-sm text-gray-600">{job.description}</p>
            <div className="flex flex-wrap gap-1">
              {job.topics?.map((topic) => (
                <Badge
                  key={topic.id ?? topic.title}
                  variant="outline"
                  className="text-xs"
                >
                  {topic.title}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Location:</p>
            {job.rooms?.map((room) => (
              <div key={room.room_id} className="flex items-center gap-2 text-sm text-gray-600">
                <Home className="h-4 w-4" />
                {room.name}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Created:</p>
            <p className="text-sm text-gray-600">{new Date(job.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => onEdit(job)}
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 h-9"
              onClick={() => onDelete(job)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  ),
  (prevProps, nextProps) => prevProps.job.job_id === nextProps.job.job_id
);

// EditDialog component
const EditDialog: React.FC<EditDialogProps> = ({
  isOpen,
  onClose,
  job,
  onSubmit,
  isSubmitting,
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">Edit Maintenance Job</DialogTitle>
        <DialogDescription className="text-sm text-gray-600">
          Make changes to the maintenance job here.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            defaultValue={job?.description}
            className="min-h-[100px] text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="priority" className="text-sm font-medium text-gray-700">
            Priority
          </label>
          <Select name="priority" defaultValue={job?.priority}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low" className="text-sm">Low</SelectItem>
              <SelectItem value="medium" className="text-sm">Medium</SelectItem>
              <SelectItem value="high" className="text-sm">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="remarks" className="text-sm font-medium text-gray-700">
            Remarks (Optional)
          </label>
          <Textarea
            id="remarks"
            name="remarks"
            defaultValue={job?.remarks}
            className="min-h-[60px] text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="is_defective"
            name="is_defective"
            defaultChecked={job?.is_defective}
          />
          <label htmlFor="is_defective" className="text-sm text-gray-700">
            Mark as defective
          </label>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);

// DeleteDialog component
const DeleteDialog: React.FC<DeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}) => (
  <AlertDialog open={isOpen} onOpenChange={onClose}>
    <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-lg font-semibold">Are you sure?</AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-gray-600">
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
        <AlertDialogCancel
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
        >
          {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Main MyJobs component
const MyJobs: React.FC<{ activePropertyId?: string }> = ({ activePropertyId }) => {
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const { userProfile, loading: userLoading } = useUser();
  const router = useRouter();

  const {
    jobs,
    isLoading,
    error,
    refreshJobs,
    updateJob: updateJobInState,
    removeJob,
  } = useJobsData({ propertyId: activePropertyId || null });

  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    status: "all",
    priority: "all",
  });

  const filteredJobs = React.useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        filters.search === "" ||
        job.description.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === "all" || job.status === filters.status;
      const matchesPriority = filters.priority === "all" || job.priority === filters.priority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [jobs, filters]);

  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredJobs.length);
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  React.useEffect(() => {
    if (sessionStatus === "unauthenticated" || (!session && !userLoading)) {
      router.push("/auth/signin");
    }
  }, [sessionStatus, session, userLoading, router]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      priority: "all",
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleEdit = (job: Job) => {
    setSelectedJob(job);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (job: Job) => {
    setSelectedJob(job);
    setIsDeleteDialogOpen(true);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedJob || !session?.user?.accessToken) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      const updatedJobData: Partial<Job> = {
        description: formData.get("description") as string,
        priority: formData.get("priority") as JobPriority,
        status: selectedJob.status,
        remarks: (formData.get("remarks") as string) || undefined,
        is_defective: formData.get("is_defective") === "on",
        topics: selectedJob.topics,
        rooms: selectedJob.rooms,
        property_id: selectedJob.property_id,
      };

      const updatedJob = await updateJob(String(selectedJob.job_id), updatedJobData);
      updateJobInState(updatedJob);

      toast({
        title: "Success",
        description: "Maintenance job updated successfully.",
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedJob || !session?.user?.accessToken) return;

    setIsSubmitting(true);
    try {
      await deleteJob(String(selectedJob.job_id));
      removeJob(selectedJob.job_id);

      toast({
        title: "Success",
        description: "Maintenance job deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJobCreated = async () => {
    const success = await refreshJobs(true);
    if (!success) {
      toast({
        title: "Warning",
        description: "Job created but unable to refresh list automatically.",
        variant: "default",
      });
    }
  };

  const handleManualRefresh = async () => {
    await refreshJobs(true);
  };

  if (sessionStatus === "loading" || userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated" || !session || !userProfile || !session.user?.id) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Maintenance Jobs</h1>
            <p className="text-gray-600 mt-1">
              Viewing {filteredJobs.length} of {jobs.length} request{jobs.length !== 1 ? "s" : ""} for {userProfile.username}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="h-10"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <CreateJobButton onJobCreated={handleJobCreated} />
          </div>
        </div>
      </div>

      <JobFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
          <p className="font-medium">Error loading jobs</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {filteredJobs.length > 0 ? (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[180px] hidden md:table-cell py-3 text-gray-700 font-semibold">
                    Job Details
                  </TableHead>
                  <TableHead className="hidden md:table-cell py-3 text-gray-700 font-semibold">
                    Description
                  </TableHead>
                  <TableHead className="hidden md:table-cell py-3 text-gray-700 font-semibold">
                    Location
                  </TableHead>
                  <TableHead className="hidden md:table-cell py-3 text-gray-700 font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="hidden md:table-cell py-3 text-gray-700 font-semibold">
                    Created
                  </TableHead>
                  <TableHead className="w-[100px] hidden md:table-cell py-3 text-gray-700 font-semibold">
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

          <EditDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            job={selectedJob}
            onSubmit={handleEditSubmit}
            isSubmitting={isSubmitting}
          />

          <DeleteDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={handleDeleteConfirm}
            isSubmitting={isSubmitting}
          />

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {endIndex} of {filteredJobs.length} results
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, MAX_VISIBLE_PAGES) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={currentPage === pageNum}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  {totalPages > MAX_VISIBLE_PAGES && <PaginationEllipsis />}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-12 border rounded-lg bg-white shadow-sm">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            {jobs.length > 0 ? "No jobs match your filters" : "No maintenance jobs found"}
          </h3>
          <p className="text-gray-600 mt-2">
            {jobs.length > 0
              ? "Try adjusting your filters or search terms"
              : activePropertyId
              ? "You haven't created any maintenance requests for this property"
              : "You haven't created any maintenance requests yet"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center">
            {jobs.length > 0 && (
              <Button onClick={handleClearFilters} variant="outline">
                Clear Filters
              </Button>
            )}
            <Button onClick={() => refreshJobs(true)} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyJobs;