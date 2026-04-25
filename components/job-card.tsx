"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, MapPin, Calendar, PhilippinePeso, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"
import { EmployerRating } from "@/components/employer-rating"
import { doc, getDoc, Timestamp,db } from "@/config/firebase"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface JobCardProps {
  variant?: "default" | "horizontal" | "compact" | "featured"
  jobId?: string
  companyId?: string
  className?: string
}

interface JobData {
  id: string
  title: string
  company: string
  companyId: string
  location: string
  type: string
  category: string
  salary: string
  postedAt: string | Timestamp
  deadline: string
  tags: string[]
  employerName?: string // Add this to fix TypeScript error
}

// Helper function to format location
const formatLocation = (location: string | undefined): string => {
  if (!location) return "Location not specified";
  return location;
}

export function JobCard({ variant = "default", jobId, companyId, className = "" }: JobCardProps) {
  const [isJobseeker, setIsJobseeker] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [job, setJob] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check if user is jobseeker
  useEffect(() => {
    setMounted(true)
    // Only run this on client-side
    if (typeof window !== 'undefined') {
    const userData = localStorage.getItem("ranaojobs_user")
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setIsJobseeker(user.role === "jobseeker" || (user.role === "multi" && user.activeRole === "jobseeker"))
        setUserRole(user.activeRole || user.role)
      } catch (error) {
        console.error("Error parsing user data:", error)
        }
      }
    }
  }, [])

  // Fetch job data from Firestore
  useEffect(() => {
    async function fetchJobData() {
      if (!jobId) {
        setError("Invalid job ID")
        setLoading(false)
        return
      }
      
      setLoading(true)
      setError(null)
      
      try {
        console.log(`Fetching job with ID: ${jobId}`)
        const jobDoc = await getDoc(doc(db, "jobs", jobId))
        
        if (jobDoc.exists()) {
          console.log(`Found job: ${jobId}`, jobDoc.data())
          const jobData = jobDoc.data() as Omit<JobData, "id">
          
          // Set default values for potentially missing fields
          setJob({
            id: jobId,
            title: jobData.title || "Untitled Position",
            company: jobData.company || "Unknown Company",
            companyId: jobData.companyId || companyId || "",
            location: jobData.location || "Location not specified",
            type: jobData.type || "Not specified",
            category: jobData.category || "",
            salary: jobData.salary || "Not specified",
            postedAt: jobData.postedAt || "Recently",
            deadline: jobData.deadline || "",
            tags: jobData.tags || [],
            employerName: jobData.employerName || jobData.company || "Unknown Company"
          })
        } else {
          console.log(`Job not found: ${jobId}`)
          setError("Job not found")
        }
      } catch (err) {
        console.error(`Error fetching job data for ID ${jobId}:`, err)
        setError("Failed to load job data")
      } finally {
        setLoading(false)
      }
    }
    
    fetchJobData()
  }, [jobId, companyId])

  if (!mounted) {
    return null
  }

  // Loading state
  if (loading) {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error || !job) {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <p className="text-center text-red-500">{error || "Job not available"}</p>
        </CardContent>
      </Card>
    )
  }

  // Format the posted date (assuming postedAt is a timestamp from Firestore)
  const formatPostedDate = (dateValue: string | Timestamp) => {
    // Check if it's a Firestore timestamp
    if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
      const date = new Date((dateValue as Timestamp).seconds * 1000)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 1) return "Today"
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      return `${Math.floor(diffDays / 30)} months ago`
    }
    
    // If it's already a formatted string
    return dateValue as string
  }



  if (variant === "horizontal") {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <div className="p-6 flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                <h3 className="text-xl font-semibold hover:text-yellow-500 transition-colors">
                  <Link href={`/job/${job.id}`}>{job.title}</Link>
                </h3>
                <Badge variant="outline" className="w-fit">
                  {job.type || "Full-time"}
                </Badge>
              </div>

              <div className="flex flex-col flex-wrap gap-y-2 gap-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4 mr-1" />
                  <span>{job.company || job.employerName}</span>
                  {/* <EmployerRating
                    employerId={job.companyId || companyId || ""}
                    employerName={job.company}
                    initialRating={4.2}
                    showRatingButton={false}
                    size="sm"
                  /> */}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{formatLocation(job.location)}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Posted {formatPostedDate(job.postedAt)}</span>
                </div>
                <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
                  <PhilippinePeso className="h-4 w-4 mr-1" />
                  <span>{job.salary}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {job.tags && job.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-gray-100 dark:bg-gray-700">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/job/${job.id}`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ExternalLink className="h-4 w-4" />
                    View Details
                  </Button>
                </Link>

                

                {isJobseeker && (
                  <Link href={`/job/${job.id}/apply`}>
                    <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                      Apply Now
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold hover:text-yellow-500 transition-colors">
            <Link href={`/job/${job.id}`}>{job.title}</Link>
          </h3>
          <Badge variant="outline">{job.type || "Full-time"}</Badge>
        </div>

        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4 mr-1" />
            <span>{job.company}</span>
            {/* <EmployerRating
              employerId={job.companyId || companyId || ""}
              employerName={job.company}
              initialRating={4.2}
              showRatingButton={false}
              size="sm"
            /> */}
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{formatLocation(job.location)}</span>
          </div>
          <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
            <PhilippinePeso className="h-4 w-4 mr-1" />
            <span>{job.salary}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {job.tags && job.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-gray-100 dark:bg-gray-700">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Link href={`/job/${job.id}`}>
            <Button variant="outline" size="sm" className="gap-1">
              View Details
            </Button>
          </Link>

          {userRole !== "employer" && (
            <Link href={`/job/${job.id}/apply`}>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">Apply Now</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
