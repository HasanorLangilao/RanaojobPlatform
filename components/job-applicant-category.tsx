"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ApplicantList } from "@/components/applicant-list"
import { Search, Briefcase, Users, Calendar, MapPin, ChevronRight } from "lucide-react"

import { collection, query, where, getDocs,db } from "@/config/firebase"
import { getEmployerJobPostings, JobPosting } from "@/lib/jobs"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

export function JobApplicantCategory() {
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("")

  useEffect(() => {
    // Get user data from localStorage
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      setIsLoading(false)
      return
    }

    const user = JSON.parse(storedUser)

    // Fetch jobs from Firestore
    const fetchJobs = async () => {
      try {
        const fetchedJobs = await getEmployerJobPostings(user.id)
        // Sort jobs by applicant count (highest first)
        fetchedJobs.sort((a, b) => (b.applicationsCount || 0) - (a.applicationsCount || 0))
        setJobs(fetchedJobs)
        setFilteredJobs(fetchedJobs)
      } catch (error) {
        console.error("Error fetching jobs:", error)
        toast({
          title: "Error",
          description: "Failed to load your job listings",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [toast])

  // Filter jobs based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.location?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredJobs(filtered)
    } else {
      setFilteredJobs(jobs)
    }
  }, [searchQuery, jobs])

  const handleSelectJob = (jobId: string, jobTitle: string) => {
    setSelectedJobId(jobId)
    setSelectedJobTitle(jobTitle)
  }

  const formatDate = (dateString: any) => {
    if (!dateString) return "N/A"
    
    if (dateString.seconds) {
      // Firestore timestamp
      return format(new Date(dateString.seconds * 1000), "MMM d, yyyy")
    } else if (typeof dateString === 'string') {
      // Regular date string
      return dateString
    }
    
    return "N/A"
  }

  const handleBackToJobs = () => {
    setSelectedJobId(null)
    setSelectedJobTitle("")
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  // If a job is selected, show applicants for that job
  if (selectedJobId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleBackToJobs}>
            ←
          </Button>
          <h2 className="text-xl font-semibold">Applicants for: {selectedJobTitle}</h2>
        </div>
               <Suspense fallback={<div>Loading...</div>}>
        
        <ApplicantList jobId={selectedJobId} /></Suspense>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Applications</h1>
          <p className="text-gray-500">View applicants categorized by job posting</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="search"
          placeholder="Search job titles..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Select a job to view applicants</h2>
        
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
            <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">No jobs found</h3>
            <p className="mt-2 text-gray-500">
              {jobs.length === 0
                ? "You haven't posted any jobs yet."
                : "No jobs match your search criteria."}
            </p>
            {jobs.length === 0 && (
              <Button 
                className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={() => router.push("/employer/jobs/new")}
              >
                Post Your First Job
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <Card 
                key={job.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSelectJob(job.id as string, job.title)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Posted: {formatDate(job.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <Badge className="bg-blue-100 text-blue-800">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{job.applicationsCount || 0} Applicants</span>
                        </Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 