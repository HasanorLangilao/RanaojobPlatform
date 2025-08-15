"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  ArrowLeft,
  Trash2,
  RefreshCw,
  Search,
} from "lucide-react"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { BackButton } from "@/components/back-button"
import { getEmployerJobPostings, JobPosting, moveJobToArchive, restoreJobPosting } from "@/lib/jobs"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function EmployerJobsArchivePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [jobToDeepArchive, setJobToDeepArchive] = useState<JobPosting | null>(null)
  const [showDeepArchiveDialog, setShowDeepArchiveDialog] = useState(false)
  const [jobToRestore, setJobToRestore] = useState<JobPosting | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

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

    // If multi-role, ensure active role is employer
    if (user.role === "multi" && user.activeRole !== "employer") {
      user.activeRole = "employer"
      localStorage.setItem("ranaojobs_user", JSON.stringify(user))
    }

    setUserData(user)
    
    // Fetch jobs from Firestore
    const fetchJobs = async () => {
      try {
        const fetchedJobs = await getEmployerJobPostings(user.id)
        // Filter for deleted jobs only that haven't been deep archived
        const deletedJobs = fetchedJobs.filter(job => 
          job.isDeleted === true && job.isDeepArchived !== true
        )
        setJobs(deletedJobs)
        setFilteredJobs(deletedJobs)
      } catch (error) {
        console.error("Error fetching archived jobs:", error)
        toast({
          title: "Error",
          description: "Failed to load your archived job listings",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [router, toast])

  useEffect(() => {
    // Filter jobs based on search query
    if (searchQuery) {
      const filtered = jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.location.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredJobs(filtered)
    } else {
      setFilteredJobs(jobs)
    }
  }, [searchQuery, jobs])

  const handleRestoreJob = (job: JobPosting) => {
    setJobToRestore(job)
    setShowRestoreDialog(true)
  }

  const confirmRestoreJob = async () => {
    if (!jobToRestore?.id) return
    
    try {
      setIsProcessing(true)
      await restoreJobPosting(jobToRestore.id)
      
      // Update local state
      setJobs(jobs.filter((job) => job.id !== jobToRestore.id))
      
      toast({
        title: "Success",
        description: "Job restored successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error restoring job:", error)
      toast({
        title: "Error",
        description: "Failed to restore job",
        variant: "destructive",
      })
    } finally {
      setShowRestoreDialog(false)
      setJobToRestore(null)
      setIsProcessing(false)
    }
  }

  const handleDeepArchive = (job: JobPosting) => {
    setJobToDeepArchive(job)
    setShowDeepArchiveDialog(true)
  }

  const confirmDeepArchive = async () => {
    if (!jobToDeepArchive?.id) return
    
    try {
      setIsProcessing(true)
      await moveJobToArchive(jobToDeepArchive.id)
      
      // Remove the job from the list after deep archiving
      setJobs(jobs.filter(job => job.id !== jobToDeepArchive.id))
      setFilteredJobs(filteredJobs.filter(job => job.id !== jobToDeepArchive.id))
      
      toast({
        title: "Success",
        description: "Job deleted successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error deleted job:", error)
      toast({
        title: "Error",
        description: "Failed to move job to deleted",
        variant: "destructive",
      })
    } finally {
      setShowDeepArchiveDialog(false)
      setJobToDeepArchive(null)
      setIsProcessing(false)
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <main className="flex-grow pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-6xl">
        <BackButton className="mb-4" href="/employer/jobs" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Job Archive</h1>
            <p className="text-gray-500">Manage your archived job listings</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="search"
            placeholder="Search archived jobs..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <Trash2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No archived jobs</h3>
            <p className="mt-2 text-sm text-gray-500">
              You don't have any archived job listings at the moment.
            </p>
            <Button
              className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => router.push("/employer/jobs")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-semibold">{job.title}</h2>
                        <Badge className="bg-gray-100 text-gray-800">Archived</Badge>
                      </div>
                      <p className="text-gray-600">{job.companyName}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          Deleted: {formatDate(job.deletedAt)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          Created: {formatDate(job.createdAt)}
                        </div>
                        <div className="flex items-center">
                          <Briefcase className="mr-1 h-4 w-4" />
                          {job.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => handleRestoreJob(job)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-red-300 text-red-600"
                        onClick={() => handleDeepArchive(job)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Permanently Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Restore Job Dialog */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Job</DialogTitle>
              <DialogDescription>
                Are you sure you want to restore the job post "{jobToRestore?.title}"? 
                The job will be made active and visible to job seekers again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={confirmRestoreJob}
                disabled={isProcessing}
              >
                {isProcessing ? "Restoring..." : "Restore Job"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deep Archive Dialog */}
        <Dialog open={showDeepArchiveDialog} onOpenChange={setShowDeepArchiveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Job</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{jobToDeepArchive?.title}"? 
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeepArchiveDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDeepArchive}
                disabled={isProcessing}
              >
                {isProcessing ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Auth Check Modal */}
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