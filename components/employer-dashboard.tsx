"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, Users, Clock, Building2, ChevronRight } from "lucide-react"
import Link from "next/link"

interface EmployerDashboardProps {
  employerData?: any
}

export function EmployerDashboard({ employerData }: EmployerDashboardProps) {
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplicants: 0,
    newApplicants: 0,
  })
  const [recentApplications, setRecentApplications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would be an API call to fetch employer stats
    // For now, we'll use mock data
    setTimeout(() => {
      setStats({
        totalJobs: 12,
        activeJobs: 8,
        totalApplicants: 47,
        newApplicants: 8,
      })

      setRecentApplications([
        {
          id: "1",
          applicantName: "John Doe",
          jobTitle: "Senior Frontend Developer",
          appliedDate: "2 days ago",
          status: "New",
        },
        {
          id: "2",
          applicantName: "Jane Smith",
          jobTitle: "UX Designer",
          appliedDate: "3 days ago",
          status: "Reviewed",
        },
        {
          id: "3",
          applicantName: "Mike Johnson",
          jobTitle: "Backend Developer",
          appliedDate: "1 week ago",
          status: "Shortlisted",
        },
        {
          id: "4",
          applicantName: "Sarah Williams",
          jobTitle: "Project Manager",
          appliedDate: "1 week ago",
          status: "To be Interviewed",
        },
      ])

      setIsLoading(false)
    }, 1000)
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Employer Dashboard</h1>
          <p className="text-gray-500">
            Welcome back, {employerData?.companyName || employerData?.firstName || "Employer"}
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link href="/post-job">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
              <Briefcase className="mr-2 h-4 w-4" />
              Post New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Jobs</CardTitle>
            <CardDescription>All jobs you've posted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.totalJobs}</div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/employer/jobs">
                <Button variant="ghost" size="sm" className="p-0 h-auto text-blue-600">
                  View all jobs
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Jobs</CardTitle>
            <CardDescription>Currently active listings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.activeJobs}</div>
              <div className="p-2 bg-green-100 rounded-full">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/employer/jobs?filter=active">
                <Button variant="ghost" size="sm" className="p-0 h-auto text-green-600">
                  View active jobs
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Applicants</CardTitle>
            <CardDescription>All job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.totalApplicants}</div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/employer/applicants">
                <Button variant="ghost" size="sm" className="p-0 h-auto text-purple-600">
                  View all applicants
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">New Applicants</CardTitle>
            <CardDescription>Unreviewed applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.newApplicants}</div>
              <div className="p-2 bg-yellow-100 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/employer/applicants?filter=new">
                <Button variant="ghost" size="sm" className="p-0 h-auto text-yellow-600">
                  View new applicants
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>Latest candidates who applied to your job postings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Applicant</th>
                  <th className="text-left p-4">Position</th>
                  <th className="text-left p-4">Applied On</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((applicant, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <span>{applicant.applicantName}</span>
                      </div>
                    </td>
                    <td className="p-4">{applicant.jobTitle}</td>
                    <td className="p-4">{applicant.appliedDate}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          applicant.status === "New"
                            ? "bg-blue-100 text-blue-800"
                            : applicant.status === "Reviewed"
                              ? "bg-yellow-100 text-yellow-800"
                              : applicant.status === "Shortlisted"
                                ? "bg-green-100 text-green-800"
                                : applicant.status === "To be Interviewed"
                                  ? "bg-purple-100 text-purple-800"
                                  : applicant.status === "Hired"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {applicant.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/employer/applicants/${applicant.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <Link href="/employer/applicants">
              <Button variant="outline">View All Applicants</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Company Profile Completion */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>Complete your profile to attract more candidates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Profile Completion</span>
                <span>80%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-yellow-500 rounded-full w-[80%]"></div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/employer/profile">
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">Complete Your Profile</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
