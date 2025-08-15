"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Eye, UserCheck, Users, TrendingUp, Calendar, Download } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface JobAnalyticsProps {
  jobId?: string
  className?: string
}

export function JobAnalytics({ jobId, className }: JobAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [timeRange, setTimeRange] = useState("week")

  useEffect(() => {
    // Simulate API call to fetch analytics data
    const fetchAnalytics = async () => {
      setIsLoading(true)
      try {
        // In a real app, this would be an API call with the jobId
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mock data
        const mockData = {
          summary: {
            totalViews: 1245,
            applicationsReceived: 47,
            applicantsHired: 2,
            conversionRate: "3.8%",
          },
          viewsData: [
            { date: "Mon", views: 120, applications: 5 },
            { date: "Tue", views: 145, applications: 7 },
            { date: "Wed", views: 190, applications: 9 },
            { date: "Thu", views: 210, applications: 12 },
            { date: "Fri", views: 180, applications: 8 },
            { date: "Sat", views: 160, applications: 4 },
            { date: "Sun", views: 240, applications: 2 },
          ],
          applicantSources: [
            { source: "Direct Search", value: 25 },
            { source: "Job Alerts", value: 12 },
            { source: "Social Media", value: 8 },
            { source: "Referrals", value: 2 },
          ],
          applicantsByExperience: [
            { experience: "0-1 years", value: 15 },
            { experience: "1-3 years", value: 18 },
            { experience: "3-5 years", value: 9 },
            { experience: "5+ years", value: 5 },
          ],
        }

        setAnalyticsData(mockData)
      } catch (error) {
        console.error("Error fetching analytics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [jobId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Job Performance Analytics</CardTitle>
          <CardDescription>Track your job posting performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analyticsData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Job Performance Analytics</CardTitle>
          <CardDescription>Track your job posting performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No analytics data available</h3>
            <p className="text-gray-500">Analytics will appear once your job starts receiving views and applications</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <CardTitle>Job Performance Analytics</CardTitle>
          <CardDescription>Track your job posting performance</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</p>
                  <h3 className="text-2xl font-bold">{analyticsData.summary.totalViews}</h3>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Applications</p>
                  <h3 className="text-2xl font-bold">{analyticsData.summary.applicationsReceived}</h3>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hired</p>
                  <h3 className="text-2xl font-bold">{analyticsData.summary.applicantsHired}</h3>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Rate</p>
                  <h3 className="text-2xl font-bold">{analyticsData.summary.conversionRate}</h3>
                </div>
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <Tabs defaultValue={timeRange} onValueChange={setTimeRange}>
            <TabsList className="grid grid-cols-3 w-[300px]">
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Views & Applications Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Views & Applications</CardTitle>
            <CardDescription>Daily performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.viewsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="views"
                    stroke="#3b82f6"
                    activeDot={{ r: 8 }}
                    name="Views"
                  />
                  <Line yAxisId="right" type="monotone" dataKey="applications" stroke="#10b981" name="Applications" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Applicant Sources & Experience Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applicant Sources</CardTitle>
              <CardDescription>Where your applicants are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.applicantSources} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Applicants" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applicants by Experience</CardTitle>
              <CardDescription>Experience level of your applicants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData.applicantsByExperience}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="experience" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Applicants" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
