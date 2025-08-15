"use client"

import React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getJobPosting, JobPosting, toggleJobStatus } from "@/lib/jobs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BackButton } from "@/components/back-button"
import { AuthCheckModal } from "@/components/auth-check-modal"
import {
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  PhilippinePeso,
  Mail,
  Phone,
  Edit,
  Users,
} from "lucide-react"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params)
  const jobId = unwrappedParams.id
  const router = useRouter()
  const { toast } = useToast()
  const [job, setJob] = useState<JobPosting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      setIsAuthModalOpen(true)
      return
    }

    const user = JSON.parse(storedUser)

    // Check if user has employer role
    if (user.role !== "employer" && user.role !== "multi") {
      router.push("/jobseeker-dashboard")
      return
    }

    setUserData(user)

    const fetchJob = async () => {
      try {
        const jobData = await getJobPosting(jobId)
        if (jobData) {
          setJob(jobData)
        }
      } catch (error) {
        console.error("Error fetching job:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchJob()
  }, [jobId, router])

  const formatDate = (dateString: any) => {
    if (!dateString) return "Not specified"
    
    if (dateString.seconds) {
      // Firestore timestamp
      return format(new Date(dateString.seconds * 1000), "MMMM d, yyyy")
    } else if (typeof dateString === 'string') {
      // Regular date string
      return dateString
    }
    
    return "Not specified"
  }

  const handleStatusToggle = async (checked: boolean) => {
    if (!job || isToggling) return
    
    setIsToggling(true)
    try {
      await toggleJobStatus(jobId, checked)
      setJob({
        ...job,
        isActive: checked
      })
      
      toast({
        title: "Success",
        description: `Job listing ${checked ? 'set to Hiring' : 'set to Closed'} successfully`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error toggling job status:", error)
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Job not found</h2>
          <p className="mt-2 text-gray-500">The job you're looking for doesn't exist or has been removed.</p>
          <Button 
            className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
            onClick={() => router.push("/employer/jobs")}
          >
            Back to Jobs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-grow pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <BackButton href="/employer/jobs" className="mb-4" />
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Job
            </Button>
            <Button onClick={() => router.push(`/employer/jobs/${job.id}/applicants`)}>
              <Users className="mr-2 h-4 w-4" />
              View Applicants ({job.applicationsCount || 0})
            </Button>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">{job.title}</CardTitle>
                <div className="flex items-center mt-2 text-gray-600">
                  <Briefcase className="h-4 w-4 mr-1" />
                  <span className="text-sm">{job.companyName || job.company}</span>
                  <span className="mx-2">•</span>
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm">{job.location}</span>
                  <span className="mx-2">•</span>
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">{job.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={job.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {job.isActive ? "Hiring" : "Closed"}
                </Badge>
                <div className="flex items-center ml-4">
                  <Switch 
                    checked={job.isActive || false} 
                    onCheckedChange={handleStatusToggle}
                    disabled={isToggling}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">{isToggling ? 'Updating...' : (job.isActive ? 'Hiring' : 'Closed')}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Category</span>
                <span className="font-medium">{job.category}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Salary</span>
                <div className="flex items-center">
                  <PhilippinePeso className="h-4 w-4 mr-1 text-gray-600" />
                  <span className="font-medium">{job.salary || "Not specified"}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Remote</span>
                <span className="font-medium">{job.remote ? "Yes" : "No"}</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Job Description</h3>
              <p className="whitespace-pre-line">{job.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Requirements</h3>
              <p className="whitespace-pre-line">{job.requirements}</p>
            </div>

            {job.benefits && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Benefits</h3>
                <p className="whitespace-pre-line">{job.benefits}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div>
                <h3 className="text-lg font-semibold mb-4">Application Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-600">Posted on: </span>
                    <span className="ml-1 font-medium">{formatDate(job.createdAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-600">Application Deadline: </span>
                    <span className="ml-1 font-medium">{job.applicationDeadline || "Not specified"}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-600">Applicants: </span>
                    <span className="ml-1 font-medium">{job.applicationsCount || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-600">Email: </span>
                    <span className="ml-1 font-medium">{job.contactEmail}</span>
                  </div>
                  {job.contactPhone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="text-sm text-gray-600">Phone: </span>
                      <span className="ml-1 font-medium">{job.contactPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <AuthCheckModal
          isOpen={isAuthModalOpen}
          onClose={() => router.push("/")}
          title="Employer Account Required"
          message="You need to login or register as an employer to access this page."
        />
      </div>
    </main>
  )
} 
 