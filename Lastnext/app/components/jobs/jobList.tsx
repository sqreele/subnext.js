// ./app/components/jobs/JobList.tsx
"use client";

import { useState, useEffect } from 'react';
import { useProperty } from '@/app/lib/PropertyContext';
import { JobCard } from '@/app/components/jobs/JobCard';
import Pagination from '@/app/components/jobs/Pagination';
import JobActions from '@/app/components/jobs/JobActions';
import { Job, TabValue, Property, SortOrder } from '@/app/lib/types';
import { Loader2 } from 'lucide-react';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// Date filter type
type DateFilter = "all" | "today" | "yesterday" | "thisWeek" | "thisMonth" | "custom";

interface JobListProps {
  jobs: Job[];
  filter: TabValue;
  properties: Property[];
}

export default function JobList({ jobs, filter, properties }: JobListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("Newest first");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDateRange, setCustomDateRange] = useState<{start?: Date, end?: Date}>({});
  const { selectedProperty } = useProperty();
  
  // Adjusted number of items per page based on screen size
  const [itemsPerPage, setItemsPerPage] = useState(getInitialItemsPerPage());
  
  // Function to determine initial items per page based on screen width
  function getInitialItemsPerPage() {
    if (typeof window === 'undefined') return 10; // SSR default
    
    const width = window.innerWidth;
    if (width < 640) return 6; // Mobile
    if (width < 1024) return 8; // Tablet
    return 15; // Desktop
  }
  
  // Update items per page when window resizes
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getInitialItemsPerPage());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset page when filter, sort, or property changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sortOrder, selectedProperty, dateFilter]);

  // Show loading animation
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [filter, sortOrder, selectedProperty, dateFilter]);

  // Handle date filter change
  const handleDateFilterChange = (
    filterType: DateFilter, 
    startDate?: Date, 
    endDate?: Date
  ) => {
    setIsLoading(true);
    setDateFilter(filterType);
    
    if (filterType === "custom" && startDate && endDate) {
      setCustomDateRange({ start: startDate, end: endDate });
    }
    
    setTimeout(() => setIsLoading(false), 300);
  };

  // Apply date filters to jobs
  const applyDateFilter = (job: Job): boolean => {
    // Get job creation date
    const jobDate = job.created_at ? new Date(job.created_at) : null;
    if (!jobDate) return true; // Include jobs without dates
    
    const now = new Date();
    
    switch (dateFilter) {
      case "today":
        return isWithinInterval(jobDate, {
          start: startOfDay(now),
          end: endOfDay(now)
        });
        
      case "yesterday":
        const yesterday = subDays(now, 1);
        return isWithinInterval(jobDate, {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        });
        
      case "thisWeek":
        return isWithinInterval(jobDate, {
          start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
          end: endOfWeek(now, { weekStartsOn: 1 })
        });
        
      case "thisMonth":
        return isWithinInterval(jobDate, {
          start: startOfMonth(now),
          end: endOfMonth(now)
        });
        
      case "custom":
        if (customDateRange.start && customDateRange.end) {
          return isWithinInterval(jobDate, {
            start: startOfDay(customDateRange.start),
            end: endOfDay(customDateRange.end)
          });
        }
        return true;
        
      default: // "all"
        return true;
    }
  };

  // Apply all filters: property, status, and date
  const filteredJobs = jobs.filter(job => {
    // 1. Property filter
    const matchesProperty = !selectedProperty || 
      job.profile_image?.properties?.some(
        property => String(property.property_id) === selectedProperty
      ) ||
      job.rooms?.some(
        room => room.properties?.some(
          prop => String(prop) === selectedProperty
        )
      );
    
    if (!matchesProperty) return false;
    
    // 2. Status filter
    let matchesStatus = true;
    switch (filter) {
      case 'waiting_sparepart':
        matchesStatus = ['in_progress', 'waiting_sparepart'].includes(job.status);
        break;
      case 'pending':
        matchesStatus = job.status === 'pending';
        break;
      case 'completed':
        matchesStatus = job.status === 'completed';
        break;
      case 'cancelled':
        matchesStatus = job.status === 'cancelled';
        break;
      case 'defect':
        matchesStatus = job.is_defective === true;
        break;
    }
    
    if (!matchesStatus) return false;
    
    // 3. Date filter
    return applyDateFilter(job);
  });

  // Apply sorting
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = new Date(a.created_at || '').getTime();
    const dateB = new Date(b.created_at || '').getTime();
    return sortOrder === "Newest first" ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentJobs = sortedJobs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setIsLoading(true);
    setCurrentPage(page);
    // Smooth scroll to top with a slight offset to account for fixed headers
    window.scrollTo({ 
      top: document.querySelector('.job-grid-container')?.getBoundingClientRect().top 
           ? window.scrollY + (document.querySelector('.job-grid-container')?.getBoundingClientRect().top || 0) - 80
           : 0,
      behavior: 'smooth' 
    });
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  if (sortedJobs.length === 0 && !isLoading) {
    return (
      <div className="space-y-4">
        {/* JobActions at the top */}
        <div className="flex justify-end mb-2">
          <JobActions 
            jobs={jobs}
            currentTab={filter}
            properties={properties}
            onRefresh={handleRefresh}
            onSort={(order) => setSortOrder(order)}
            currentSort={sortOrder}
            onDateFilter={handleDateFilterChange}
            currentDateFilter={dateFilter}
          />
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[200px] p-4 text-center bg-white rounded-lg shadow-sm">
          <p className="text-base font-medium text-gray-600 mb-2">
            No jobs found
          </p>
          <p className="text-sm text-gray-500">
            {selectedProperty
              ? `No jobs match your current filters`
              : 'No property selected.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* JobActions at the top */}
      <div className="flex justify-end mb-2">
        <JobActions 
          jobs={sortedJobs}
          currentTab={filter}
          properties={properties}
          onRefresh={handleRefresh}
          onSort={(order) => setSortOrder(order)}
          currentSort={sortOrder}
          onDateFilter={handleDateFilterChange}
          currentDateFilter={dateFilter}
        />
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-2">
        Showing {Math.min(currentJobs.length, itemsPerPage)} of {sortedJobs.length} results
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px] bg-white rounded-lg shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="job-grid-container">
          {/* Mobile-optimized grid with different column counts based on screen size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {currentJobs.map((job) => (
              <div
                key={job.job_id}
                className="h-full"
              >
                {/* Apply mobile-specific adjustments */}
                <div className="h-full touch-action-manipulation">
                  <JobCard 
                    job={job} 
                    properties={properties}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination with better mobile styling */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-sm p-2 touch-action-manipulation">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}
      
      {/* Mobile bottom spacing */}
      <div className="h-16 md:h-4" />
    </div>
  );
}