"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAdminToast } from "@/components/admin-toast"
import { AdminDataTable } from "@/components/admin-data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Loader2, 
  CheckCircle, 
  XCircle,
  Trash
} from "lucide-react"
import { collection, getDocs, query, orderBy, deleteDoc, doc, DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

// Job interface
interface AdminJobListing {
  id: string
  title: string
  companyName: string
  employerId: string
  location: string
  type: string
  category: string
  createdAt: any
  verificationStatus: string
  isActive: boolean
  isDeleted?: boolean
  deletedAt?: any
  isArchived?: boolean
  applicationsCount: number
}

interface AdminAction {
  label: string
  onClick: (row: AdminJobListing) => void
  isShown?: (row: AdminJobListing) => boolean
}

export default function AdminJobsPage() {
  const router = useRouter()
  const { error } = useAdminToast()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // State for job data
  const [allJobs, setAllJobs] = useState<AdminJobListing[]>([])
  const [filteredJobs, setFilteredJobs] = useState<AdminJobListing[]>([])

  // Load job data
  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true)
      try {
        // Get all jobs from Firestore
        const jobsQuery = query(
          collection(db, "jobs")
        )
        
        const jobsSnap = await getDocs(jobsQuery)
        const jobs = jobsSnap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          title: doc.data().title || "Untitled Job",
          companyName: doc.data().companyName || "Unknown Company",
          employerId: doc.data().employerId,
          location: doc.data().location || "Remote",
          type: doc.data().type || doc.data().jobType || "Not specified",
          category: doc.data().category || "Not specified",
          createdAt: formatTimestamp(doc.data().createdAt),
          verificationStatus: doc.data().verificationStatus || "unknown",
          isActive: doc.data().isActive || false,
          isDeleted: doc.data().isDeleted || false,
          deletedAt: formatTimestamp(doc.data().deletedAt),
          applicationsCount: doc.data().applicationsCount || doc.data().applicationCount || 0
        }))
        
        setAllJobs(jobs)
        setFilteredJobs(jobs)
      } catch (err) {
        console.error("Error loading jobs:", err)
        error("Failed to load jobs data")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadJobs()
  }, [error])
  
  // Apply filters when search query or status filter changes
  useEffect(() => {
    let filtered = [...allJobs]
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(query) ||
        job.companyName.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query) ||
        job.category.toLowerCase().includes(query)
      )
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter(job => job.isActive && !job.isDeleted)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter(job => !job.isActive && !job.isDeleted)
      } else if (statusFilter === "deleted") {
        filtered = filtered.filter(job => job.isDeleted)
      } else if (statusFilter === "approved") {
        filtered = filtered.filter(job => job.verificationStatus === "approved")
      } else if (statusFilter === "rejected") {
        filtered = filtered.filter(job => job.verificationStatus === "rejected")
      } else if (statusFilter === "pending") {
        filtered = filtered.filter(job => job.verificationStatus === "pending")
      }
    }
    
    setFilteredJobs(filtered)
  }, [allJobs, searchQuery, statusFilter])
  
  // Format timestamps for display
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "Unknown"
    
    if (timestamp.toDate) {
      return format(timestamp.toDate(), "MMM d, yyyy")
    }
    
    return "Unknown"
  }
  
  // Get status badge based on verification status
  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Approved</span>
      case "rejected":
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejected</span>
      case "pending":
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Pending</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Unknown</span>
    }
  }
  
  // Get activity status badge
  const getActivityBadge = (isActive: boolean) => {
    return isActive ? 
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Hiring</span> :
      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Closed</span>
  }

  // Get job status badge
  const getJobStatusBadge = (job: AdminJobListing) => {
    if (job.isDeleted) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Deleted</span>
    }
    if (job.isActive) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Hiring</span>
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Closed</span>
  }

  const handlePermanentDelete = async (jobId: string, jobTitle: string) => {
    if (confirm(`Are you sure you want to permanently delete the job "${jobTitle}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, "jobs", jobId));
        // Remove the job from the state
        const updatedJobs = allJobs.filter(job => job.id !== jobId);
        setAllJobs(updatedJobs);
        setFilteredJobs(updatedJobs);
        toast({
          title: "Success",
          description: "Job has been permanently deleted",
          variant: "default",
        });
      } catch (error) {
        console.error("Error deleting job:", error);
        toast({
          title: "Error",
          description: "Failed to delete job",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AdminLayout title="Manage Jobs">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">All Jobs</h1>
            <p className="text-gray-500">Manage all job listings across the platform</p>
          </div>
          <div>
            <Button 
              onClick={() => router.push('/admin/jobs/archive')}
              variant="outline"
              className="flex items-center"
            >
              <Trash className="mr-2 h-4 w-4" />
              View Archived Jobs
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Input
              type="search"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              <SelectItem value="active">Hiring</SelectItem>
              <SelectItem value="inactive">Closed</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Listings</CardTitle>
            <CardDescription>
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No jobs found matching your criteria</p>
              </div>
            ) : (
              <AdminDataTable
                columns={[
                  { key: "title", title: "Job Title" },
                  { key: "companyName", title: "Company" },
                  { key: "type", title: "Type" },
                  { key: "location", title: "Location" },
                  { 
                    key: "status", 
                    title: "Status",
                    render: (_, row) => getJobStatusBadge(row)
                  },
                  { key: "createdAt", title: "Posted" },
                  { 
                    key: "applicationsCount", 
                    title: "Applications",
                    render: (_, row) => row.applicationsCount
                  },
                ]}
                data={filteredJobs}
                searchable={false}
                actions={[
                  {
                    label: "View Details",
                    onClick: (row: AdminJobListing) => router.push(`/admin/jobs/${row.id}`),
                  },
                  {
                    label: "Verify",
                    onClick: (row: AdminJobListing) => router.push(`/admin/jobs/verification/${row.id}`),
                    // Only show verify button for pending jobs that aren't deleted or archived
                    isShown: (row: AdminJobListing) => 
                      row.verificationStatus === "pending" && !row.isDeleted
                  },
                  {
                    label: "Delete Permanently",
                    onClick: (row: AdminJobListing) => handlePermanentDelete(row.id, row.title),
                    // Only show permanent delete for deleted jobs
                    isShown: (row: AdminJobListing) => row.isDeleted === true
                  },
                ] as AdminAction[]}
                onRowClick={(row) => router.push(`/admin/jobs/${row.id}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
