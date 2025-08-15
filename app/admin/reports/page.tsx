"use client"

import { useState, useEffect, useRef } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Calendar, X } from "lucide-react"
import { db } from "@/lib/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  startAt,
  endAt,
  doc,
  getDoc
} from "firebase/firestore"
import { useAdminToast } from "@/components/admin-toast"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  BarChart,
  Bar as RechartsBar,
  PieChart,
  Pie as RechartsPie,
  Cell
} from 'recharts'
import { format, startOfDay, endOfDay, subDays, subMonths, subYears, parseISO } from 'date-fns'
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateRange } from "react-day-picker"

// Define interfaces for data types
interface User {
  id: string;
  createdAt: any;
  updatedAt: any;
  lastLogin: any;
  role: string;
  city?: string;
  barangay?: string;
  location?: string;
  isVerified?: boolean;
  verifiedAt?: any;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  [key: string]: any;
}

interface Job {
  id: string;
  createdAt: any;
  updatedAt: any;
  postedAt: any;
  category: string;
  type: string;
  isActive: boolean;
  salary: string | number;
  employerId: string;
  title?: string;
  companyName?: string;
  location?: string;
  [key: string]: any;
}

interface Application {
  id: string;
  appliedAt: any;
  createdAt: any;
  updatedAt: any;
  status: string;
  statusUpdatedAt?: any;
  jobId: string;
  userId: string;
  jobseekerId?: string;
  [key: string]: any;
}

// Define interfaces for chart data
interface ChartDataPoint {
  name: string;
  value: number;
}

interface UserTypeCounts {
  jobseeker: number;
  employer: number;
  multi: number;
  admin: number;
}

export default function ReportsPage() {
  const { error, success } = useAdminToast()
  const [isLoading, setIsLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState("30days")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isCustomDateRange, setIsCustomDateRange] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Add state for fetched data
  const [users, setUsers] = useState<User[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeJobListings: 0,
    jobApplications: 0,
    userGrowth: 0,
    jobGrowth: 0,
    applicationGrowth: 0
  })

  // Chart data state
  const [chartData, setChartData] = useState<{
    userGrowthData: { name: string; users: number }[];
    jobCategoriesData: ChartDataPoint[];
    userTypesData: ChartDataPoint[];
    userLocationsData: ChartDataPoint[];
    jobPostingTrendData: { name: string; jobs: number }[];
    jobCategoriesChartData: ChartDataPoint[];
    jobTypesData: ChartDataPoint[];
    salaryRangesData: any[];
    applicationTrendData: { name: string; applications: number }[];
    applicationStatusData: ChartDataPoint[];
    popularJobCategoriesData: ChartDataPoint[];
    responseTimeData: any[];
  }>({
    userGrowthData: [],
    jobCategoriesData: [],
    userTypesData: [],
    userLocationsData: [],
    jobPostingTrendData: [],
    jobCategoriesChartData: [],
    jobTypesData: [],
    salaryRangesData: [],
    applicationTrendData: [],
    applicationStatusData: [],
    popularJobCategoriesData: [],
    responseTimeData: []
  })

  // Format date helper
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "N/A";

    let date: Date | null = null;

    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }

    return date ? format(date, 'MMM d, yyyy') : "N/A";
  };

  // Helper function to format Firestore timestamps
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp.toISOString();
    if (timestamp?.toDate) return timestamp.toDate().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    return null;
  };

  // Load data based on selected time period or custom date range
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Get date range based on selected period or custom range
        const now = new Date()
        let startDate = new Date()
        let endDate = now
        let previousStartDate = new Date()
        let previousEndDate = startDate

        if (isCustomDateRange && dateRange?.from) {
          // Custom date range
          startDate = startOfDay(dateRange.from)
          endDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)

          // Calculate previous period of same duration
          const durationInDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          previousStartDate = startOfDay(subDays(startDate, durationInDays))
          previousEndDate = endOfDay(subDays(startDate, 1))
        } else {
          // Predefined periods
          switch (timePeriod) {
            case "7days":
              startDate = startOfDay(subDays(now, 7))
              previousStartDate = startOfDay(subDays(now, 14))
              previousEndDate = endOfDay(subDays(now, 8))
              break
            case "30days":
              startDate = startOfDay(subDays(now, 30))
              previousStartDate = startOfDay(subDays(now, 60))
              previousEndDate = endOfDay(subDays(now, 31))
              break
            case "90days":
              startDate = startOfDay(subDays(now, 90))
              previousStartDate = startOfDay(subDays(now, 180))
              previousEndDate = endOfDay(subDays(now, 91))
              break
            case "year":
              startDate = startOfDay(subYears(now, 1))
              previousStartDate = startOfDay(subYears(now, 2))
              previousEndDate = endOfDay(subDays(startDate, 1))
              break
            default:
              startDate = startOfDay(subDays(now, 30))
              previousStartDate = startOfDay(subDays(now, 60))
              previousEndDate = endOfDay(subDays(now, 31))
          }
        }

        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();
        const previousStartTimestamp = new Date(previousStartDate).getTime();
        const previousEndTimestamp = new Date(previousEndDate).getTime();

        console.log('Date range:', {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
          previousStart: format(previousStartDate, 'yyyy-MM-dd'),
          previousEnd: format(previousEndDate, 'yyyy-MM-dd')
        });

        // Format user data to handle timestamps
        const formatUserData = (doc: any): User => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: formatTimestamp(data.createdAt),
            updatedAt: formatTimestamp(data.updatedAt),
            lastLogin: formatTimestamp(data.lastLogin),
            verifiedAt: formatTimestamp(data.verifiedAt)
          };
        };

        // Format job data to handle timestamps
        const formatJobData = (doc: any): Job => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: formatTimestamp(data.createdAt),
            updatedAt: formatTimestamp(data.updatedAt),
            postedAt: formatTimestamp(data.postedAt)
          };
        };

        // Format application data to handle timestamps
        const formatApplicationData = (doc: any): Application => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            appliedAt: formatTimestamp(data.appliedAt),
            createdAt: formatTimestamp(data.createdAt),
            updatedAt: formatTimestamp(data.updatedAt),
            statusUpdatedAt: formatTimestamp(data.statusUpdatedAt)
          };
        };

        // Get total users
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        const users = usersSnapshot.docs.map(formatUserData);
        setUsers(users);
        const totalUsers = users.length;

        // Get new users in current period
        const newUsersQuery = query(
          collection(db, "users"),
          where("createdAt", ">=", startTimestamp),
          where("createdAt", "<=", endTimestamp)
        );
        const newUsersSnapshot = await getDocs(newUsersQuery);
        const newUsers = newUsersSnapshot.size;

        // Get new users in previous period
        const previousNewUsersQuery = query(
          collection(db, "users"),
          where("createdAt", ">=", previousStartTimestamp),
          where("createdAt", "<=", previousEndTimestamp)
        );
        const previousNewUsersSnapshot = await getDocs(previousNewUsersQuery);
        const previousNewUsers = previousNewUsersSnapshot.size;

        const userGrowth = previousNewUsers > 0
          ? Math.round(((newUsers - previousNewUsers) / previousNewUsers) * 100)
          : newUsers > 0 ? 100 : 0;

        // Get all jobs
        const allJobsQuery = query(collection(db, "jobs"));
        const allJobsSnapshot = await getDocs(allJobsQuery);
        const allJobs = allJobsSnapshot.docs.map(formatJobData);
        setAllJobs(allJobs);

        // Get active jobs
        const jobsQuery = query(
          collection(db, "jobs"),
          where("isActive", "==", true)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        const activeJobs = jobsSnapshot.size;

        // Get new jobs in current period
        const newJobsQuery = query(
          collection(db, "jobs"),
          where("createdAt", ">=", startTimestamp),
          where("createdAt", "<=", endTimestamp),
          where("isActive", "==", true)
        );
        const newJobsSnapshot = await getDocs(newJobsQuery);
        const newJobs = newJobsSnapshot.size;

        // Get new jobs in previous period
        const previousNewJobsQuery = query(
          collection(db, "jobs"),
          where("createdAt", ">=", previousStartTimestamp),
          where("createdAt", "<=", previousEndTimestamp),
          where("isActive", "==", true)
        );
        const previousNewJobsSnapshot = await getDocs(previousNewJobsQuery);
        const previousNewJobs = previousNewJobsSnapshot.size;

        const jobGrowth = previousNewJobs > 0
          ? Math.round(((newJobs - previousNewJobs) / previousNewJobs) * 100)
          : newJobs > 0 ? 100 : 0;

        // Get all applications
        const applicationsQuery = query(collection(db, "applications"));
        const applicationsSnapshot = await getDocs(applicationsQuery);
        const applications = applicationsSnapshot.docs.map(formatApplicationData);
        setApplications(applications);
        const totalApplications = applications.length;

        // Get new applications in current period
        const newApplicationsQuery = query(
          collection(db, "applications"),
          where("appliedAt", ">=", startTimestamp),
          where("appliedAt", "<=", endTimestamp)
        );
        const newApplicationsSnapshot = await getDocs(newApplicationsQuery);
        const newApplications = newApplicationsSnapshot.size;

        // Get new applications in previous period
        const previousApplicationsQuery = query(
          collection(db, "applications"),
          where("appliedAt", ">=", previousStartTimestamp),
          where("appliedAt", "<=", previousEndTimestamp)
        );
        const previousApplicationsSnapshot = await getDocs(previousApplicationsQuery);
        const previousApplications = previousApplicationsSnapshot.size;

        const applicationGrowth = previousApplications > 0
          ? Math.round(((newApplications - previousApplications) / previousApplications) * 100)
          : newApplications > 0 ? 100 : 0;

        setStats({
          totalUsers,
          activeJobListings: activeJobs,
          jobApplications: totalApplications,
          userGrowth,
          jobGrowth,
          applicationGrowth
        });

        // Generate chart data
        // User growth trend data - last 6 months
        let userGrowthData = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = startOfDay(subMonths(now, i));
          const monthEnd = i > 0 ? startOfDay(subMonths(now, i - 1)) : now;

          // Count users created in this month
          const monthUsers = users.filter((user: User) => {
            if (!user.createdAt) return false;
            const createdAt = new Date(user.createdAt);
            return createdAt >= monthStart && createdAt <= monthEnd;
          });

          userGrowthData.push({
            name: format(monthStart, 'MMM'),
            users: monthUsers.length
          });
        }

        // Job categories distribution
        const categoryCounts: Record<string, number> = {};
        allJobs.forEach((job: Job) => {
          const category = job.category || 'Uncategorized';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });

        const jobCategoriesData = Object.entries(categoryCounts)
          .map(([category, count]) => ({ name: category, value: count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5 categories

        // User types data
        const userTypes: Record<string, number> = { jobseeker: 0, employer: 0, multi: 0, admin: 0 };
        users.forEach((user: User) => {
          const role = user.role || 'jobseeker';
          userTypes[role] = (userTypes[role] || 0) + 1;
        });

        const userTypesData = Object.entries(userTypes)
          .map(([type, count]) => ({ name: type, value: count }))
          .filter(item => item.value > 0);

        // User locations
        const locationCounts: Record<string, number> = {};
        users.forEach((user: User) => {
          const location = user.city || user.barangay || user.location || 'Unknown';
          locationCounts[location] = (locationCounts[location] || 0) + 1;
        });

        const userLocationsData = Object.entries(locationCounts)
          .map(([location, count]) => ({ name: location, value: count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5 locations

        // Job posting trend - last 6 months
        let jobPostingTrendData = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = startOfDay(subMonths(now, i));
          const monthEnd = i > 0 ? startOfDay(subMonths(now, i - 1)) : now;

          // Count jobs created in this month
          const monthJobs = allJobs.filter((job: Job) => {
            if (!job.createdAt) return false;
            const createdAt = new Date(job.createdAt);
            return createdAt >= monthStart && createdAt <= monthEnd;
          });

          jobPostingTrendData.push({
            name: format(monthStart, 'MMM'),
            jobs: monthJobs.length
          });
        }

        // Job types data
        const jobTypeCounts: Record<string, number> = {};
        allJobs.forEach((job: Job) => {
          const type = job.type || 'Unspecified';
          jobTypeCounts[type] = (jobTypeCounts[type] || 0) + 1;
        });

        const jobTypesData = Object.entries(jobTypeCounts)
          .map(([type, count]) => ({ name: type, value: count }))
          .sort((a, b) => b.value - a.value);

        // Application status data
        const statusCounts: Record<string, number> = { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, hired: 0 };
        applications.forEach((application: Application) => {
          const status = application.status || 'pending';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const applicationStatusData = Object.entries(statusCounts)
          .map(([status, count]) => ({ name: status, value: count }))
          .filter(item => item.value > 0);

        // Application trend - last 6 months
        let applicationTrendData = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = startOfDay(subMonths(now, i));
          const monthEnd = i > 0 ? startOfDay(subMonths(now, i - 1)) : now;

          // Count applications created in this month
          const monthApplications = applications.filter((application: Application) => {
            if (!application.appliedAt) return false;
            const appliedAt = new Date(application.appliedAt);
            return appliedAt >= monthStart && appliedAt <= monthEnd;
          });

          applicationTrendData.push({
            name: format(monthStart, 'MMM'),
            applications: monthApplications.length
          });
        }

        // Salary ranges data
        const salaryRanges = {
          '< ₱15,000': 0,
          '₱15,000 - ₱30,000': 0,
          '₱30,000 - ₱50,000': 0,
          '₱50,000 - ₱80,000': 0,
          '₱80,000+': 0,
          'Not specified': 0
        };

        allJobs.forEach((job: Job) => {
          // Extract salary and convert to number for comparison
          let salaryValue = job.salary;

          if (!salaryValue) {
            salaryRanges['Not specified']++;
            return;
          }

          // Extract numeric values from salary string
          const salaryText = String(salaryValue);
          const numericValues = salaryText.match(/\d+,\d+|\d+/g);

          if (!numericValues || numericValues.length === 0) {
            salaryRanges['Not specified']++;
            return;
          }

          // Convert to numbers
          const salaryNumbers = numericValues.map(val => Number(val.replace(',', '')));

          // Use the maximum value if range is provided
          const maxSalary = Math.max(...salaryNumbers);

          // Categorize
          if (maxSalary < 15000) {
            salaryRanges['< ₱15,000']++;
          } else if (maxSalary < 30000) {
            salaryRanges['₱15,000 - ₱30,000']++;
          } else if (maxSalary < 50000) {
            salaryRanges['₱30,000 - ₱50,000']++;
          } else if (maxSalary < 80000) {
            salaryRanges['₱50,000 - ₱80,000']++;
          } else {
            salaryRanges['₱80,000+']++;
          }
        });

        const salaryRangesData = Object.entries(salaryRanges)
          .map(([range, count]) => ({ name: range, value: count }))
          .filter(item => item.value > 0);

        // Employer response time data
        // Group applications by employer
        const applicationsByEmployer: Record<string, Application[]> = {};

        // First, get all jobs with their employer IDs
        const jobEmployerMap: Record<string, string> = {};
        allJobs.forEach((job: Job) => {
          if (job.employerId) {
            jobEmployerMap[job.id] = job.employerId;
          }
        });

        // Then group applications by employer using the job's employer ID
        applications.forEach((application: Application) => {
          const jobId = application.jobId;
          const employerId = jobEmployerMap[jobId];

          if (employerId) {
            if (!applicationsByEmployer[employerId]) {
              applicationsByEmployer[employerId] = [];
            }
            applicationsByEmployer[employerId].push(application);
          }
        });

        // Calculate response times for each employer
        const employerResponseTimes: Record<string, number[]> = {};
        Object.entries(applicationsByEmployer).forEach(([employerId, apps]) => {
          employerResponseTimes[employerId] = apps.map(app => {
            if (app.status === 'pending' || !app.appliedAt || !app.statusUpdatedAt) {
              return -1; // No response yet
            }

            const appliedDate = new Date(app.appliedAt);
            const statusUpdateDate = new Date(app.statusUpdatedAt);
            return Math.floor((statusUpdateDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
          }).filter(time => time >= 0); // Only include valid response times
        });

        // Calculate average response time per employer
        const employerAvgResponseTimes: Record<string, number> = {};
        Object.entries(employerResponseTimes).forEach(([employerId, times]) => {
          if (times.length > 0) {
            const sum = times.reduce((a, b) => a + b, 0);
            employerAvgResponseTimes[employerId] = sum / times.length;
          }
        });

        // Group response times into categories
        const responseTimeCounts = {
          'Same day': 0,
          '1-2 days': 0,
          '3-7 days': 0,
          'Over a week': 0,
          'No response': 0
        };

        // Count applications by response time
        applications.forEach((app: Application) => {
          if (app.status === 'pending') {
            responseTimeCounts['No response']++;
            return;
          }

          if (!app.appliedAt || !app.statusUpdatedAt) {
            responseTimeCounts['No response']++;
            return;
          }

          const appliedDate = new Date(app.appliedAt);
          const statusUpdateDate = new Date(app.statusUpdatedAt);
          const daysDiff = Math.floor((statusUpdateDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff === 0) {
            responseTimeCounts['Same day']++;
          } else if (daysDiff <= 2) {
            responseTimeCounts['1-2 days']++;
          } else if (daysDiff <= 7) {
            responseTimeCounts['3-7 days']++;
          } else {
            responseTimeCounts['Over a week']++;
          }
        });

        const responseTimeData = Object.entries(responseTimeCounts)
          .map(([time, count]) => ({ name: time, value: count }))
          .filter(item => item.value > 0);

        // Set all chart data
        setChartData({
          userGrowthData,
          jobCategoriesData,
          userTypesData,
          userLocationsData,
          jobPostingTrendData,
          jobCategoriesChartData: jobCategoriesData,
          jobTypesData,
          salaryRangesData,
          applicationTrendData,
          applicationStatusData,
          popularJobCategoriesData: jobCategoriesData,
          responseTimeData
        });

        console.log('Charts data loaded successfully:', {
          users: users.length,
          jobs: allJobs.length,
          applications: applications.length
        });

      } catch (err) {
        console.error("Error fetching report data:", err);
        error("Failed to load report data. Please check console for details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [timePeriod, dateRange, isCustomDateRange, error]);

  const handlePeriodChange = (value: string) => {
    setTimePeriod(value)
    setIsCustomDateRange(false)
    setDateRange(undefined)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from) {
      setIsCustomDateRange(true)
    }
  }

  const clearCustomDateRange = () => {
    setIsCustomDateRange(false)
    setDateRange(undefined)
    setTimePeriod("30days")
    setIsCalendarOpen(false)
  }

  const handleExport = () => {
    try {
      // Get date range information for filename
      let dateInfo = timePeriod
      if (isCustomDateRange && dateRange?.from) {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd')
        const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate
        dateInfo = `${fromDate}_to_${toDate}`
      }

      // Create data for export
      const dataStr = JSON.stringify({
        stats,
        charts: chartData,
        exportDate: new Date().toISOString(),
        period: isCustomDateRange ? "custom" : timePeriod,
        dateRange: isCustomDateRange ? {
          from: dateRange?.from?.toISOString(),
          to: dateRange?.to?.toISOString() || dateRange?.from?.toISOString()
        } : null
      }, null, 2)

      // Create download link
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

      const exportFileDefaultName = `ranao-jobs-report-${dateInfo}-${format(new Date(), 'yyyy-MM-dd')}.json`

      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()

      success("Report data exported successfully")
    } catch (err) {
      console.error("Error exporting data:", err)
      error("Failed to export report data")
    }
  }

  // Chart colors
  const CHART_COLORS = [
    '#f59e0b', // Yellow
    '#10b981', // Green
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#ef4444', // Red
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#a855f7'  // Violet
  ]

  // Salary ranges data
  const salaryData = {
    labels: ['< ₱15,000', '₱30,000 - ₱50,000', '₱80,000+', 'Not specified'],
    datasets: [
      {
        label: 'Jobs',
        data: [3, 2, 2, 1],
        backgroundColor: '#F59E0B',
        borderRadius: 6,
      },
    ],
  }

  // Employer response time data
  const responseTimeData = {
    labels: ['No Response', '< 24 hours'],
    datasets: [
      {
        data: [100, 0],
        backgroundColor: ['#EC4899', '#93C5FD'],
        borderWidth: 0,
      },
    ],
  }

  // Chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: 'black',
        bodyColor: 'black',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function (context: any) {
            return `${context.parsed.y} jobs`
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, index: number) => ({
                text: label,
                fillStyle: CHART_COLORS[index % CHART_COLORS.length],
                strokeStyle: CHART_COLORS[index % CHART_COLORS.length],
                lineWidth: 0,
                hidden: false,
                index: index
              }));
            }
            return [];
          }
        },
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: 'black',
        bodyColor: 'black',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function (context: any) {
            const value = context.raw;
            const label = context.label;
            return `${label}: ${value}`;
          }
        }
      },
    },
  }

  return (
    <AdminLayout title="View Reports">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>View platform performance data</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {!isCustomDateRange ? (
                <Select value={timePeriod} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2">
                  <span className="text-sm">
                    {dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : ''}
                    {dateRange?.to ? ` - ${format(dateRange.to, 'MMM d, yyyy')}` : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCustomDateRange}
                    className="h-5 w-5 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <Button variant="outline" onClick={() => setIsCalendarOpen(true)}>
                <Calendar className="mr-2 h-4 w-4" />
                Custom Range
              </Button>


            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            ) : (
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="jobs">Jobs</TabsTrigger>
                  <TabsTrigger value="applications">Applications</TabsTrigger>
                  <TabsTrigger value="employers">Employers</TabsTrigger>
                  <TabsTrigger value="jobseekers">Jobseekers</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                      { title: "Total Users", value: stats.totalUsers.toString(), change: `${stats.userGrowth >= 0 ? '+' : ''}${stats.userGrowth}%` },
                      { title: "Active Job Listings", value: stats.activeJobListings.toString(), change: `${stats.jobGrowth >= 0 ? '+' : ''}${stats.jobGrowth}%` },
                      { title: "Job Applications", value: stats.jobApplications.toString(), change: `${stats.applicationGrowth >= 0 ? '+' : ''}${stats.applicationGrowth}%` },
                    ].map((stat, index) => (
                      <Card key={index}>
                        <CardContent className="p-6">
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                            <div className="flex items-baseline mt-1">
                              <p className="text-2xl font-bold">{stat.value}</p>
                              <p className={`ml-2 text-sm ${parseFloat(stat.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stat.change}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData.userGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <Line type="monotone" dataKey="users" stroke="#f59e0b" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Job Categories Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <RechartsPie
                              data={chartData.jobCategoriesData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.jobCategoriesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsPie>
                            <RechartsTooltip formatter={(value, name, props) => [`${value} jobs`, props.payload.name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="users">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>User Registration Trend</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData.userGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>User Types</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <RechartsPie
                              data={chartData.userTypesData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.userTypesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsPie>
                            <RechartsTooltip formatter={(value) => [`${value} users`]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>User Locations</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.userLocationsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <RechartsBar dataKey="value" name="Users">
                              {chartData.userLocationsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>User Growth by Month</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.userGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <RechartsBar dataKey="users">
                              {chartData.userGrowthData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="jobs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Job Postings Trend</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData.jobPostingTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <Line type="monotone" dataKey="jobs" stroke="#f59e0b" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Job Categories</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.jobCategoriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip formatter={(value) => [`${value} jobs`]} />
                            <RechartsLegend />
                            <RechartsBar dataKey="value" name="Jobs">
                              {chartData.jobCategoriesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Job Types</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <RechartsPie
                              data={chartData.jobTypesData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.jobTypesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsPie>
                            <RechartsTooltip formatter={(value) => [`${value} jobs`]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Jobs by Month</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.jobPostingTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <RechartsBar dataKey="jobs">
                              {chartData.jobPostingTrendData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="applications">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Application Trend</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData.applicationTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <Line type="monotone" dataKey="applications" name="Applications" stroke="#ec4899" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Application Status</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <RechartsPie
                              data={chartData.applicationStatusData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.applicationStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsPie>
                            <RechartsTooltip formatter={(value) => [`${value} applications`]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Popular Job Categories</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.popularJobCategoriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip formatter={(value) => [`${value} applications`]} />
                            <RechartsLegend />
                            <RechartsBar dataKey="value" name="Applications">
                              {chartData.popularJobCategoriesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Applications by Month</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.applicationTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <RechartsBar dataKey="applications" name="Applications">
                              {chartData.applicationTrendData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="employers">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Salary Ranges</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.salaryRangesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip formatter={(value) => [`${value} jobs`]} />
                            <RechartsLegend />
                            <RechartsBar dataKey="value" name="Jobs" radius={[4, 4, 0, 0]}>
                              {chartData.salaryRangesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Top Employers by Job Posts</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={
                            (() => {
                              const jobsByEmployer: Record<string, Job[]> = {};
                              allJobs.forEach((job: Job) => {
                                if (job.employerId) {
                                  if (!jobsByEmployer[job.employerId]) jobsByEmployer[job.employerId] = [];
                                  jobsByEmployer[job.employerId].push(job);
                                }
                              });
                              return Object.entries(jobsByEmployer)
                                .map(([employerId, jobs]) => {
                                  const employer = users.find((u: User) => u.id === employerId);
                                  return {
                                    name: employer?.companyName || employerId.substring(0, 8),
                                    value: jobs.length
                                  };
                                })
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 10);
                            })()
                          }>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <RechartsBar dataKey="value" name="Job Posts">
                              {Array.from({ length: 10 }).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="jobseekers">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Job Categories Applied</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={
                            (() => {
                              const categoryCount: Record<string, number> = {};
                              applications.forEach((app: Application) => {
                                const jobId = app.jobId;
                                const job = allJobs.find((j: Job) => j.id === jobId);
                                if (job) {
                                  const category = job.category || 'Uncategorized';
                                  categoryCount[category] = (categoryCount[category] || 0) + 1;
                                }
                              });
                              return Object.entries(categoryCount)
                                .map(([category, count]) => ({ name: category, value: count }))
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 5);
                            })()
                          }>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <RechartsLegend />
                            <RechartsBar dataKey="value" name="Applications">
                              {[0, 1, 2, 3, 4].map((index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsBar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Application Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <RechartsPie
                              data={[
                                { name: 'Hired', value: applications.filter(app => app.status === 'hired').length },
                                { name: 'Shortlisted', value: applications.filter(app => app.status === 'shortlisted').length },
                                { name: 'Reviewed', value: applications.filter(app => app.status === 'reviewed').length },
                                { name: 'Rejected', value: applications.filter(app => app.status === 'rejected').length },
                                { name: 'Pending', value: applications.filter(app => app.status === 'pending').length }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[0, 1, 2, 3, 4].map((index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </RechartsPie>
                            <RechartsTooltip formatter={(value) => [`${value} applications`]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <CalendarComponent
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={1}
              className="mx-auto"
            />
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={clearCustomDateRange}
            >
              Reset
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCalendarOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (dateRange?.from) {
                    setIsCustomDateRange(true);
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={!dateRange?.from}
              >
                Apply Range
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
