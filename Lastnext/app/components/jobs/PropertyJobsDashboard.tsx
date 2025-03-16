"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { useSession } from "next-auth/react";
import { fetchJobs } from "@/app/lib/data";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { useJob } from "@/app/lib/JobContext";

interface PropertyJobsDashboardProps {
  initialJobs?: Job[];
}

const PropertyJobsDashboard = ({ initialJobs = [] }: PropertyJobsDashboardProps) => {
  const { selectedProperty } = useProperty();
  const { data: session, status } = useSession();
  const { jobCreationCount } = useJob();
  const [allJobs, setAllJobs] = useState<Job[]>(initialJobs);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>(initialJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    if (status !== "authenticated" || !session?.user) return;

    setIsLoading(true);
    setError(null);

    try {
      const jobsData = await fetchJobs();
      console.log("Fetched all jobs:", JSON.stringify(jobsData, null, 2));
      console.log("Session User:", JSON.stringify(session.user, null, 2));

      if (!Array.isArray(jobsData)) {
        throw new Error("Invalid jobs data format");
      }

      const currentUserId = session.user.id; // "1"
      const currentUsername = session.user.username; // "admin"

      const userJobs = jobsData.filter((job) => {
        // @ts-ignore: Assume profile_image.id exists
        const jobUserId = job.profile_image?.id;
        const jobUsername = job.user;
        const matchesId = jobUserId !== undefined && String(jobUserId) === String(currentUserId);
        const matchesUsername = jobUsername !== undefined && jobUsername === currentUsername;
        console.log(`Job ID: ${job.job_id}, Profile ID: ${jobUserId}, User: ${jobUsername}, Current ID: ${currentUserId}, Current Username: ${currentUsername}, Matches ID: ${matchesId}, Matches Username: ${matchesUsername}`);
        return matchesId || matchesUsername; // Match either ID or username
      });

      console.log(`Filtered to ${userJobs.length} jobs for current user:`, JSON.stringify(userJobs, null, 2));
      setAllJobs(userJobs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch jobs";
      console.error("Error loading jobs:", errorMessage);
      setError(errorMessage);
      setAllJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [status, selectedProperty, jobCreationCount]);

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
        ? String(user.properties[0].property_id) // "PBDA570D9"
        : null);

    if (!effectiveProperty) {
      setError("No property selected and no default available.");
      setFilteredJobs([]);
      return;
    }

    console.log("Filtering jobs for property:", effectiveProperty);

    const filtered = allJobs.filter((job) => {
      const propertyMatch = job.property_id && String(job.property_id) === effectiveProperty;
      const roomMatch = job.rooms && job.rooms.length > 0 && job.rooms.some((room) => {
        return (room.property && String(room.property) === effectiveProperty) ||
               (room.properties && room.properties.some((prop) => String(prop) === effectiveProperty));
      });
      const propertiesMatch = job.properties && job.properties.some((prop) => String(prop) === effectiveProperty);
      console.log(`Job ID: ${job.job_id}, Property ID: ${job.property_id}, Rooms: ${JSON.stringify(job.rooms)}, Properties: ${JSON.stringify(job.properties)}, Matches Property: ${propertyMatch || roomMatch || propertiesMatch}`);
      return propertyMatch || roomMatch || propertiesMatch;
    });

    console.log(`Filtered to ${filtered.length} jobs for property ${effectiveProperty}:`, JSON.stringify(filtered, null, 2));
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

  const jobsByMonth = useMemo(() => {
    if (!filteredJobs.length) return [];

    const grouped = _.groupBy(filteredJobs, (job) => {
      const date = job.created_at ? new Date(job.created_at) : new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });

    return Object.entries(grouped)
      .map(([month, monthJobs]) => {
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
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        return months.indexOf(aMonth) - months.indexOf(bMonth);
      });
  }, [filteredJobs]);

  if (status === "loading" || isLoading) {
    return (
      <Card className="w-full p-4">
        <CardContent className="text-center">
          <p className="text-gray-600 text-base">Loading charts...</p>
        </CardContent>
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
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full p-4 bg-red-50 border border-yellow-200 rounded-md">
        <CardContent className="text-center space-y-4">
          <p className="text-red-600 text-base">{error}</p>
          <Button asChild variant="outline" className="w-full h-12 text-base">
            <Link href="/dashboard/myJobs">Go to My Jobs</Link>
          </Button>
        </CardContent>
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
      </Card>
    );
  }

  return (
    <div className="space-y-4 px-2">
      <div className="space-y-4">
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