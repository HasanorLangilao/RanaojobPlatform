"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAdminToast } from "@/components/admin-toast"
import { AdminDataTable } from "@/components/admin-data-table"
import { 
  Loader2, 
  ArrowLeft,
  Trash2 
} from "lucide-react"
import { collection, getDocs, query, orderBy, where, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { permanentlyDeleteArchivedJob } from "@/lib/jobs"

// Archive Job interface
interface ArchivedJob {
  id: string
  title: string
  companyName: string
  employerId: string
  location: string
  type: string
  category: string
  createdAt: any
  archivedAt: any
  originalJobId: string
  applicationsCount: number
}

interface AdminAction {
  label: string
  onClick: (row: ArchivedJob) => void
  isShown?: (row: ArchivedJob) => boolean
}

export default function AdminJobsArchivePage() {
  const router = useRouter()
  const { toast, error } = useAdminToast()
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // State for job data
  const [archivedJobs, setArchivedJobs] = useState<ArchivedJob[]>([])
  const [filteredJobs, setFilteredJobs] = useState<ArchivedJob[]>([])

  // Load archived jobs data
  useEffect(() => {
    const loadArchivedJobs = async () => {
      setIsLoading(true)
      try {
        // Get all jobs from JobArchive collection
        const archiveQuery = query(
          collection(db, "jobArchive"),
          orderBy("archivedAt", "desc")
        )
        
        const archiveSnap = await getDocs(archiveQuery)
        const jobs = archiveSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || "Untitled Job",
          companyName: doc.data().companyName || "Unknown Company",
          employerId: doc.data().employerId,
          location: doc.data().location || "Remote",
          type: doc.data().type || doc.data().jobType || "Not specified",
          category: doc.data().category || "Not specified",
          createdAt: formatTimestamp(doc.data().createdAt),
          archivedAt: formatTimestamp(doc.data().archivedAt),
          originalJobId: doc.data().originalJobId,
          applicationsCount: doc.data().applicationsCount || doc.data().applicationCount || 0
        }))
        
        setArchivedJobs(jobs)
        setFilteredJobs(jobs)
      } catch (err) {
        console.error("Error loading archived jobs:", err)
        error("Failed to load archived jobs data")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadArchivedJobs()
  }, [error])
  
  // Apply search filter when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = archivedJobs.filter(job => 
        job.title.toLowerCase().includes(query) ||
        job.companyName.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query) ||
        job.category.toLowerCase().includes(query)
      )
      setFilteredJobs(filtered)
    } else {
      setFilteredJobs(archivedJobs)
    }
  }, [searchQuery, archivedJobs])
  
  // Format timestamps for display
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "Unknown"
    
    if (timestamp.toDate) {
      return format(timestamp.toDate(), "MMM d, yyyy")
    }
    
    return "Unknown"
  }

  // Handle permanent deletion of an archived job
  const handlePermanentDelete = async (job: ArchivedJob) => {
    if (!confirm(`Are you sure you want to permanently delete the job "${job.title}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      await permanentlyDeleteArchivedJob(job.id)
      
      // Remove the deleted job from state
      setArchivedJobs(prev => prev.filter(j => j.id !== job.id))
      setFilteredJobs(prev => prev.filter(j => j.id !== job.id))
      
      toast({
        title: "Job permanently deleted",
        description: "The job has been permanently removed from the system",
        variant: "default"
      })
    } catch (err) {
      console.error("Error permanently deleting job:", err)
      error("Failed to permanently delete job")
    }
  }

  return (
    <AdminLayout title="Archived Jobs">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Archived Jobs</h1>
            <p className="text-gray-500">View and manage deep archived job listings</p>
          </div>
          <Button 
            onClick={() => router.push('/admin/jobs')}
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Input
            type="search"
            placeholder="Search archived jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Archived Job Listings</CardTitle>
            <CardDescription>
              {filteredJobs.length} archived job{filteredJobs.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No archived jobs found</p>
              </div>
            ) : (
              <AdminDataTable
                columns={[
                  { key: "title", title: "Job Title" },
                  { key: "companyName", title: "Company" },
                  { key: "type", title: "Type" },
                  { key: "location", title: "Location" },
                  { key: "createdAt", title: "Created" },
                  { key: "archivedAt", title: "Archived" },
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
                    onClick: (row: ArchivedJob) => router.push(`/admin/jobs/archive/${row.id}`),
                  },
                  {
                    label: "Delete Permanently",
                    onClick: handlePermanentDelete,
                  },
                ] as AdminAction[]}
                onRowClick={(row) => router.push(`/admin/jobs/archive/${row.id}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 