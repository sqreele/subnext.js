"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/app/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import _ from "lodash";
import { 
  Job, 
  Property, 
  Room, 
  JobStatus,
  STATUS_COLORS
} from "@/app/lib/types";
import { useProperty } from "@/app/lib/PropertyContext";
import { useSession, signOut } from "next-auth/react";
import { fetchJobs } from "@/app/lib/data";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { useJob } from "@/app/lib/JobContext";

interface PropertyJobsDashboardProps {
  initialJobs?: Job[];
}

const PropertyJobsDashboard = ({ initialJobs = [] }: PropertyJobsDashboardProps) => {
  const { selectedProperty } = useProperty();
  const { data: session, status, update } = useSession();
  const { jobCreationCount } = useJob();
  const [allJobs, setAllJobs] = useState<Job[]>(initialJobs);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>(initialJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [sessionDebugInfo, setSessionDebugInfo] = useState<string>("");

  // Function to refresh session
  const refreshSession = async () => {
    try {
      setSessionDebugInfo("Refreshing session...");
      const updatedSession = await update();
      setSessionDebugInfo(`Session refreshed: ${new Date().toISOString()}`);
      return updatedSession;
    } catch (error) {
      setSessionDebugInfo(`Session refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Check session and extract debug information
  useEffect(() => {
    if (session) {
      const tokenInfo = session.user?.accessToken ? 
        `Token: ${session.user.accessToken.substring(0, 15)}...` : 
        "No access token";
      
      const expiry = session.user?.accessTokenExpires ? 
        new Date(session.user.accessTokenExpires * 1000).toLocaleString() : 
        "No expiry info";
      
      const propertyCount = session.user?.properties?.length || 0;
      
      // Create a debug summary
      const debugInfo = `
Status: ${status}
User: ${session.user?.username || 'No username'}
Properties: ${propertyCount}
${tokenInfo}
Expires: ${expiry}
Session error: ${session.error || 'None'}
`;
      setSessionDebugInfo(debugInfo);
    } else {
      setSessionDebugInfo(`Session status: ${status}, No session data available`);
    }
  }, [session, status]);

  const loadJobs = async () => {
    if (status !== "authenticated" || !session?.user) {
      setSessionDebugInfo(`Cannot load jobs: status=${status}, session ${session ? 'exists' : 'missing'}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setSessionDebugInfo(prev => `${prev}\nFetching jobs...`);
      const jobsData = await fetchJobs();
      console.log("Fetched all jobs:", jobsData.length);
      if (!Array.isArray(jobsData)) {
        throw new Error("Invalid jobs data format");
      }
      
      // Filter to only include current user's jobs
      const currentUserId = session.user.id;
      const currentUserEmail = session.user.email;
      
      const userJobs = jobsData.filter((job) => {
        // Match by user field (which could be an id or email)
        if (job.user !== undefined) {
          // Convert currentUserId to number if job.user is a number
          if (typeof job.user === 'number' && job.user === Number(currentUserId)) {
            return true;
          }
          
          // Compare string representations
          if (typeof job.user === 'string' && job.user === String(currentUserId)) {
            return true;
          }
          
          // Email comparison remains the same
          if (currentUserEmail && job.user === currentUserEmail) {
            return true;
          }
        }
      
        return false;
      });
      
      console.log(`Filtered to ${userJobs.length} jobs for current user`);
      setSessionDebugInfo(prev => `${prev}\nJobs loaded: ${userJobs.length}`);
      setAllJobs(userJobs);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch jobs";
      console.error("Error loading jobs:", errorMessage);
      setError(errorMessage);
      setAllJobs([]);
      setSessionDebugInfo(prev => `${prev}\nError loading jobs: ${errorMessage}`);
      
      // If it's an authentication error, try to refresh the session
      if (errorMessage.includes('auth') || errorMessage.includes('token') || errorMessage.includes('unauthorized')) {
        setSessionDebugInfo(prev => `${prev}\nDetected auth error, attempting refresh...`);
        await refreshSession();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch jobs when session, property, or job creation count changes
  useEffect(() => {
    loadJobs();
  }, [status, selectedProperty, jobCreationCount]);

  // Filter jobs based on selected property
  useEffect(() => {
    const user = session?.user;
    if (!user?.properties?.length) {
      setError("No properties associated with this user");
      setFilteredJobs([]);
      return;
    }

    if (!allJobs.length) {
      setFilteredJobs([]);
      return;
    }

    const effectiveProperty =
      selectedProperty ||
      (user.properties.length > 0
        ? String(user.properties[0].property_id)
        : null);

    if (!effectiveProperty) {
      setError("No property selected and no default available.");
      setFilteredJobs([]);
      return;
    }

    console.log("Filtering jobs for property:", effectiveProperty);

    const filtered = allJobs.filter((job) => {
      // Direct property_id match
      if (job.property_id && String(job.property_id) === effectiveProperty) {
        return true;
      }

      // Check rooms
      if (job.rooms && job.rooms.length > 0) {
        return job.rooms.some((room) => {
          // Check if room's property matches
          if (room.property && String(room.property) === effectiveProperty) {
            return true;
          }
          // Check if room's properties include the property
          if (room.properties) {
            return room.properties.some((prop) => 
              String(prop) === effectiveProperty
            );
          }
          return false;
        });
      }

      // Check properties array
      if (job.properties) {
        return job.properties.some((prop) => 
          String(prop) === effectiveProperty
        );
      }

      return false;
    });

    console.log(`Filtered to ${filtered.length} jobs for property ${effectiveProperty}`);
    setFilteredJobs(filtered);
  }, [allJobs, selectedProperty, session?.user?.properties]);

  const jobStats = useMemo(() => {
    const total = filteredJobs.length;
    const statusCounts = filteredJobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<JobStatus, number>);

    const getPercentage = (value: number): string =>
      total > 0 ? ((value / total) * 100).toFixed(1) : "0";

    return (['pending', 'in_progress', 'completed', 'waiting_sparepart', 'cancelled'] as JobStatus[])
      .map(status => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        value: statusCounts[status] || 0,
        color: STATUS_COLORS[status],
        percentage: getPercentage(statusCounts[status] || 0)
      }));
  }, [filteredJobs]);

  // Change jobsByUser to jobsByMonth to show monthly trends for current user
  const jobsByMonth = useMemo(() => {
    if (!filteredJobs.length) return [];
    
    // Group jobs by creation month
    const grouped = _.groupBy(filteredJobs, (job) => {
      const date = job.created_at ? new Date(job.created_at) : new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
    
    return Object.entries(grouped)
      .map(([month, monthJobs]) => {
        // Format the month for display (e.g. "2023-01" -> "Jan 2023")
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const formattedMonth = date.toLocaleDateString('en-US', { month: 'short' });
        
        return {
          month: `${formattedMonth} ${year}`,
          total: monthJobs.length,
          completed: monthJobs.filter(job => job.status === "completed").length,
          pending: monthJobs.filter(job => job.status === "pending").length,
          waiting: monthJobs.filter(job => job.status === "waiting_sparepart").length,
          in_progress: monthJobs.filter(job => job.status === "in_progress").length,
          cancelled: monthJobs.filter(job => job.status === "cancelled").length,
        };
      })
      .sort((a, b) => {
        // Sort by month chronologically
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        return months.indexOf(aMonth) - months.indexOf(bMonth);
      });
  }, [filteredJobs]);

  // Session debug panel
  const renderDebugPanel = () => {
    if (!showDebug) return null;
    
    return (
      <Card className="mt-4 bg-gray-100 border border-gray-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between">
            <span>Session Debug Info</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSessionDebugInfo("");
                setSessionDebugInfo(`Session refresh initiated: ${new Date().toISOString()}`);
                refreshSession();
              }}
            >
              Refresh Session
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-60 bg-gray-700 text-gray-100 p-2 rounded">
            {sessionDebugInfo}
          </pre>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => navigator.clipboard.writeText(sessionDebugInfo)}
          >
            Copy Debug Info
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (status === "loading" || isLoading) {
    return (
      <Card className="w-full p-4">
        <CardContent className="text-center">
          <p className="text-gray-600 text-base">Loading charts...</p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
            className="ml-auto"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </CardFooter>
        {renderDebugPanel()}
      </Card>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Card className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <CardContent className="text-center space-y-4">
          <p className="text-yellow-600 text-base">
            Please log in to view job statistics.
          </p>
          <Button asChild variant="outline" className="w-full h-12 text-base">
            <Link href="/auth/signin">Log In</Link>
          </Button>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
            className="ml-auto"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </CardFooter>
        {renderDebugPanel()}
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full p-4 bg-red-50 border border-yellow-200 rounded-md">
        <CardContent className="text-center space-y-4">
          <p className="text-red-600 text-base">{error}</p>
          <div className="flex space-x-2 justify-center">
            <Button asChild variant="outline" className="h-12">
              <Link href="/dashboard/myJobs">Go to My Jobs</Link>
            </Button>
            <Button 
              variant="default" 
              className="h-12"
              onClick={loadJobs} 
              disabled={isLoading}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
            className="ml-auto"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </CardFooter>
        {renderDebugPanel()}
      </Card>
    );
  }

  if (!filteredJobs.length) {
    return (
      <Card className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <CardContent className="text-center space-y-4">
          <p className="text-yellow-600 text-base">
            {allJobs.length
              ? "No jobs found for the selected property."
              : "No jobs available yet."}
          </p>
          <Button asChild variant="outline" className="w-full h-12 text-base">
            <Link href={allJobs.length ? "/dashboard/myJobs" : "/dashboard/createJob"}>
              {allJobs.length ? "View All Jobs" : "Create a Job"}
            </Link>
          </Button>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
            className="ml-auto"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </CardFooter>
        {renderDebugPanel()}
      </Card>
    );
  }

  return (
    <div className="space-y-4 px-2">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </div>
        
        {renderDebugPanel()}
        
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={jobStats}
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {jobStats.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${props.payload.percentage}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    iconSize={12}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Jobs by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    iconSize={12}
                  />
                  <Bar dataKey="total" fill="#8884d8" name="Total Jobs" />
                  <Bar dataKey="completed" stackId="a" fill={STATUS_COLORS.completed} />
                  <Bar dataKey="pending" stackId="a" fill={STATUS_COLORS.pending} />
                  <Bar
                    dataKey="waiting"
                    stackId="a"
                    fill={STATUS_COLORS.waiting_sparepart}
                  />
                  <Bar dataKey="in_progress" stackId="a" fill={STATUS_COLORS.in_progress} />
                  <Bar dataKey="cancelled" stackId="a" fill={STATUS_COLORS.cancelled} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: 'Total Jobs', status: null },
                ...(['pending', 'in_progress', 'completed', 'waiting_sparepart', 'cancelled'] as JobStatus[])
                  .map(status => ({ name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '), status }))
              ].map((item, index) => {
                const statValue = item.status 
                  ? filteredJobs.filter(job => job.status === item.status).length 
                  : filteredJobs.length;
                const color = item.status ? STATUS_COLORS[item.status] : '#8884d8';
                const percentage = item.status 
                  ? ((statValue / filteredJobs.length) * 100).toFixed(1)
                  : '100.0';

                return (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-gray-50 w-full flex flex-col"
                  >
                    <p className="text-sm text-gray-500 mb-1">{item.name}</p>
                    <div className="flex items-baseline">
                      <p
                        className="text-2xl font-semibold"
                        style={{ color }}
                      >
                        {statValue}
                      </p>
                      <p className="text-sm ml-2 text-gray-500">
                        {item.status && `(${percentage}%)`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropertyJobsDashboard;