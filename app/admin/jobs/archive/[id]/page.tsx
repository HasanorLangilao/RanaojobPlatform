"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAdminToast } from "@/components/admin-toast"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  ArrowLeft,
  Trash2,
  Calendar,
  MapPin,
  Briefcase,
  Mail,
  Phone,
  Clock,
  User
} from "lucide-react"
import { doc, getDoc,db } from "@/config/firebase"
import { format } from "date-fns"
import { permanentlyDeleteArchivedJob } from "@/lib/jobs"
import { Badge } from "@/components/ui/badge"

export default function AdminArchivedJobDetailPage({ params }: { params: { id: string } }) {
  const jobId = params.id
  const router = useRouter()
  const { toast } = useToast()
  const { error } = useAdminToast()
  const [isLoading, setIsLoading] = useState(true)
  const [job, setJob] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load archived job data
  useEffect(() => {
    const loadArchivedJob = async () => {
      setIsLoading(true)
      try {
        const jobRef = doc(db, "jobArchive", jobId)
        const jobSnapshot = await getDoc(jobRef)
        
        if (!jobSnapshot.exists()) {
          error("Archived job not found")
          router.push("/admin/jobs/archive")
          return
        }
        
        setJob({
          id: jobSnapshot.id,
          ...jobSnapshot.data()
        })
      } catch (err) {
        console.error("Error loading archived job:", err)
        error("Failed to load archived job data")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadArchivedJob()
  }, [jobId, router, error])
  
  // Format timestamps for display
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "Unknown"
    
    if (timestamp.toDate) {
      return format(timestamp.toDate(), "MMM d, yyyy")
    }
    
    return "Unknown"
  }

  // Handle permanent deletion of the archived job
  const handlePermanentDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this job? This action cannot be undone.")) {
      return
    }
    
    try {
      setIsDeleting(true)
      await permanentlyDeleteArchivedJob(jobId)
      
      toast({
        title: "Job permanently deleted",
        description: "The job has been permanently removed from the system",
        variant: "default"
      })
      
      router.push("/admin/jobs/archive")
    } catch (err) {
      console.error("Error permanently deleting job:", err)
      error("Failed to permanently delete job")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout title="Loading Archived Job...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={`Archived Job: ${job?.title || 'Unknown'}`}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Button 
              onClick={() => router.push('/admin/jobs/archive')}
              variant="outline"
              className="flex items-center mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Archived Jobs
            </Button>
            <h1 className="text-2xl font-bold">{job?.title}</h1>
            <p className="text-gray-500">{job?.companyName} • {job?.location}</p>
          </div>
          <div>
            <Button 
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={isDeleting}
              className="flex items-center"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription>
                  Archived on {formatTimestamp(job?.archivedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-line">{job?.description || "No description provided"}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Requirements</h3>
                  <p className="text-gray-700 whitespace-pre-line">{job?.requirements || "No requirements specified"}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Benefits</h3>
                  <p className="text-gray-700 whitespace-pre-line">{job?.benefits || "No benefits specified"}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Application History</CardTitle>
                <CardDescription>
                  This job received {job?.applicationsCount || 0} application(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  Application data is preserved for reference, but no new applications can be submitted to archived jobs.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Job Type</p>
                    <p>{job?.type || "Not specified"}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p>{job?.location || "Not specified"}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Posted</p>
                    <p>{formatTimestamp(job?.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Deadline</p>
                    <p>{job?.applicationDeadline || "Not specified"}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Employer ID</p>
                    <p className="font-mono text-xs">{job?.employerId || "Unknown"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p>{job?.contactEmail || "Not provided"}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p>{job?.contactPhone || "Not provided"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Archive Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Archived On</p>
                    <p>{formatTimestamp(job?.archivedAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Original Job ID</p>
                    <p className="font-mono text-xs">{job?.originalJobId || "Unknown"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 