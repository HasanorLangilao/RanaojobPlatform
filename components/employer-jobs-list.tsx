"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Briefcase,
  Calendar,
  Clock,
  PhilippinePeso,
  Edit,
  MapPin,
  MoreHorizontal,
  Search,
  Trash,
  Users,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { getEmployerJobPostings, deleteJobPosting, JobPosting, toggleJobStatus } from "@/lib/jobs"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"

export function EmployerJobsList() {
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [isLoading, setIsLoading] = useState(true)
  const [jobToDelete, setJobToDelete] = useState<JobPosting | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null)

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
        // Filter out deleted jobs from the main view
        const activeJobs = fetchedJobs.filter(job => !job.isDeleted)
        setJobs(activeJobs)
        setFilteredJobs(activeJobs)
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

  useEffect(() => {
    // Filter jobs based on search query and status filter
    let filtered = [...jobs]

    if (searchQuery) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.location.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((job) => job.isActive === true)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((job) => job.isActive === false)
      }
    }

    setFilteredJobs(filtered)
  }, [searchQuery, statusFilter, jobs])

  const handleDeleteJob = (job: JobPosting) => {
    setJobToDelete(job)
    setShowDeleteDialog(true)
  }

  const confirmDeleteJob = async () => {
    if (!jobToDelete?.id) return
    
    try {
      setIsLoading(true)
      await deleteJobPosting(jobToDelete.id)
      setJobs(jobs.filter((job) => job.id !== jobToDelete.id))
      toast({
        title: "Success",
        description: "Job deleted successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error deleting job:", error)
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      })
    } finally {
      setShowDeleteDialog(false)
      setJobToDelete(null)
      setIsLoading(false)
    }
  }

  const getStatusBadge = (isActive: boolean | undefined) => {
    if (isActive === true) {
      return <Badge className="bg-green-100 text-green-800">Hiring</Badge>
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
    }
  }

  const getVerificationBadge = (status: string | undefined) => {
    if (status === "approved") {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>
    } else if (status === "rejected") {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
    } else {
      return <Badge className="bg-blue-100 text-blue-800">Pending Approval</Badge>
    }
  }

  const formatDate = (dateString: any) => {
    if (!dateString) return "N/A"
    
    if (dateString.seconds) {
      // Firestore timestamp
      return format(new Date(dateString.seconds * 1000), "yyyy-MM-dd")
    } else if (typeof dateString === 'string') {
      // Regular date string
      return dateString
    }
    
    return "N/A"
  }

  const handleToggleStatus = async (jobId: string, isActive: boolean) => {
    try {
      setIsTogglingStatus(jobId)
      await toggleJobStatus(jobId, !isActive)
      
      // Update the jobs state with the new status
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === jobId ? { ...job, isActive: !isActive } : job
      ))
      
      toast({
        title: "Success",
        description: `Job status updated to ${!isActive ? 'hiring' : 'closed'}`,
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
      setIsTogglingStatus(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-gray-500">Manage your job listings</p>
        </div>
        <div className="flex gap-3">
          <Link href="/employer/jobs/archive">
            <Button variant="outline" className="border-yellow-400 text-black">
              <Trash className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </Link>
        <Link href="/employer/jobs/new">
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
            <Briefcase className="mr-2 h-4 w-4" />
            Post New Job
          </Button>
        </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="search"
            placeholder="Search jobs..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Hiring</SelectItem>
            <SelectItem value="inactive">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="card" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="card">Card View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        {/* Card View */}
        <TabsContent value="card">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No jobs found</h3>
              <p className="mt-2 text-gray-500">
                {jobs.length === 0
                  ? "You haven't posted any jobs yet. Click 'Post New Job' to get started."
                  : "No jobs match your current filters. Try adjusting your search criteria."}
              </p>
              {jobs.length === 0 && (
                <Link href="/employer/jobs/new">
                  <Button className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black">Post Your First Job</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{job.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {getStatusBadge(job.isActive)}
                            <Switch 
                              checked={job.isActive === true}
                              onCheckedChange={() => handleToggleStatus(job.id as string, job.isActive === true)}
                              disabled={isTogglingStatus === job.id}
                              className="ml-2"
                            />
                            {isTogglingStatus === job.id && (
                              <span className="text-xs text-gray-500 ml-1">Updating...</span>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/employer/jobs/${job.id}/applicants`)}>
                                <Users className="mr-2 h-4 w-4" />
                                View Applicants ({job.applicationsCount || 0})
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteJob(job)} className="text-red-600">
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center text-gray-500">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Briefcase className="h-4 w-4 mr-2" />
                          <span>{job.type}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <PhilippinePeso className="h-4 w-4 mr-2" />
                          <span>{job.salary}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Posted: {formatDate(job.createdAt)}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Deadline: {job.applicationDeadline || "N/A"}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-blue-600" />
                          <span className="text-sm font-medium">{job.applicationsCount || 0} applicants</span>
                        </div>
                        <Link href={`/employer/jobs/${job.id}/applicants`}>
                          <Button variant="outline" size="sm">
                            View Applicants
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 border-t flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteJob(job)}>
                        <Trash className="mr-2 h-4 w-4" />
                        Archive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No jobs found</h3>
              <p className="mt-2 text-gray-500">
                {jobs.length === 0
                  ? "You haven't posted any jobs yet. Click 'Post New Job' to get started."
                  : "No jobs match your current filters. Try adjusting your search criteria."}
              </p>
              {jobs.length === 0 && (
                <Link href="/employer/jobs/new">
                  <Button className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black">Post Your First Job</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-4">Job Title</th>
                    <th className="text-left p-4">Location</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Posted</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Verification</th>
                    <th className="text-left p-4">Applicants</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{job.title}</p>
                          <p className="text-sm text-gray-500">{job.category}</p>
                        </div>
                      </td>
                      <td className="p-4">{job.location}</td>
                      <td className="p-4">{job.type}</td>
                      <td className="p-4">{formatDate(job.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.isActive)}
                          <Switch 
                            checked={job.isActive === true}
                            onCheckedChange={() => handleToggleStatus(job.id as string, job.isActive === true)}
                            disabled={isTogglingStatus === job.id}
                            className="ml-2"
                          />
                          {isTogglingStatus === job.id && (
                            <span className="text-xs text-gray-500">Updating...</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getVerificationBadge(job.verificationStatus)}</td>
                      <td className="p-4">{job.applicationsCount || 0}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/employer/jobs/${job.id}/applicants`)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteJob(job)}>
                            <Trash className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Job Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Job Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive the job post "{jobToDelete?.title}"? 
              The job will be moved to your archive and will no longer be visible to job seekers. 
              All applicants will be notified that the job post is no longer active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteJob}
              disabled={isLoading}
            >
              {isLoading ? "Archiving..." : "Archive Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
