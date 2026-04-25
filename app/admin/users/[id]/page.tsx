"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAdminToast } from "@/components/admin-toast"
import { User, Mail, MapPin, Calendar, Clock, Briefcase, FileText, AlertTriangle, Loader2 } from "lucide-react"
import { doc, getDoc, updateDoc,db, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, orderBy, DocumentData, QueryDocumentSnapshot } from "@/config/firebase"
import { formatDistanceToNow } from "date-fns"
import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { addAdminNotification } from "@/lib/notifications"

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isDisabled?: boolean
  isVerified?: boolean
  status?: string
  companyName?: string
  createdAt: string
  updatedAt?: string
  barangay?: string
  city?: string
  industry?: string
  skills?: string[]
  education?: Array<{
    degree: string
    institution: string
    year: string
  }>
  experience?: Array<{
    title: string
    company: string
    period: string
    description: string
  }>
  resumeUrl?: string
  businessPermitUrl?: string
  applications?: Array<{
    jobTitle: string
    company: string
    appliedAt: string
    status: string
  }>
  notes?: Array<{
    id: string
    content: string
    createdAt: string
    createdBy: string
  }>
}

interface Application {
  id: string
  jobTitle: string
  company: string
  appliedAt: string
  status: string
}

interface Job {
  id: string
  title: string
  companyName: string
  location: string
  type: string
  category: string
  createdAt: string
  verificationStatus: string
  isActive: boolean
  applicationsCount: number
}

interface Note {
  id: string
  content: string
  createdAt: string
  createdBy: string
}

interface Activity {
  id: string
  type: string
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

const recordUserActivity = async (
  userId: string,
  type: string,
  description: string,
  metadata?: Record<string, any>
) => {
  try {
    await addDoc(collection(db, "userActivities"), {
      userId,
      type,
      description,
      timestamp: serverTimestamp(),
      metadata
    })
  } catch (err) {
    console.error("Error recording user activity:", err)
  }
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { success, error } = useAdminToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  
  // Admin notes state
  const [notes, setNotes] = useState<Note[]>([])
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  
  // Access params using React.use()
  const resolvedParams = React.use(params)
  const userId = resolvedParams.id
  
  // Helper function to format Firestore timestamps
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp.toISOString();
    if (timestamp?.toDate) return timestamp.toDate().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    return null;
  };

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true)
      try {
        // Get user document from Firestore
        const userDoc = await getDoc(doc(db, "users", userId))
        
        if (!userDoc.exists()) {
          error("User not found")
          router.push("/admin/users")
          return
        }
        
        const userData = userDoc.data()
        const user = {
          id: userDoc.id,
          ...userData,
          createdAt: formatTimestamp(userData.createdAt),
          updatedAt: formatTimestamp(userData.updatedAt)
        } as UserData
        
        setUserData(user)
        
        // Fetch user notes
        const notesQuery = query(
          collection(db, "userNotes"),
          where("userId", "==", userId)
        )
        
        const notesSnapshot = await getDocs(notesQuery)
        const notesData = notesSnapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data()
          return {
            id: doc.id,
            content: data.content || "",
            createdAt: formatTimestamp(data.createdAt),
            createdBy: data.createdBy || "Admin"
          } as Note
        })
        
        setNotes(notesData)

        // Fetch user applications if jobseeker
        if (user.role === "jobseeker" || user.role === "multi") {
          const applicationsQuery = query(
            collection(db, "applications"),
            where("jobseekerId", "==", userId),
            orderBy("appliedAt", "desc")
          )
          
          const applicationsSnapshot = await getDocs(applicationsQuery)
          const applicationsData = await Promise.all(
            applicationsSnapshot.docs.map(async (docSnapshot: QueryDocumentSnapshot) => {
              const application = docSnapshot.data()
              const jobDoc = await getDoc(doc(db, "jobs", application.jobId))
              const jobData = jobDoc.exists() ? jobDoc.data() : {}
              
              return {
                id: docSnapshot.id,
                jobTitle: jobData?.title || "Unknown Job",
                company: jobData?.companyName || "Unknown Company",
                appliedAt: formatTimestamp(application.appliedAt),
                status: application.status || "pending"
              } as Application
            })
          )
          
          setApplications(applicationsData)
        }

        // Fetch user's job listings if employer
        if (user.role === "employer" || user.role === "multi") {
          const jobsQuery = query(
            collection(db, "jobs"),
            where("employerId", "==", userId),
            orderBy("createdAt", "desc")
          )
          
          const jobsSnapshot = await getDocs(jobsQuery)
          const jobsData = jobsSnapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const data = doc.data()
            return {
              id: doc.id,
              title: data.title || "",
              companyName: data.companyName || "",
              location: data.location || "",
              type: data.type || "",
              category: data.category || "",
              createdAt: formatTimestamp(data.createdAt),
              verificationStatus: data.verificationStatus || "pending",
              isActive: data.isActive || false,
              applicationsCount: data.applicationsCount || 0
            } as Job
          })
          
          setJobs(jobsData)
        }

        // Fetch user activities
        const activitiesQuery = query(
          collection(db, "userActivities"),
          where("userId", "==", userId),
          orderBy("timestamp", "desc")
        )
        
        const activitiesSnapshot = await getDocs(activitiesQuery)
        const activitiesData = activitiesSnapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const data = doc.data()
          return {
            id: doc.id,
            type: data.type || "",
            description: data.description || "",
            timestamp: formatTimestamp(data.timestamp),
            metadata: data.metadata || {}
          } as Activity
        })
        
        setActivities(activitiesData)
      } catch (err) {
        console.error("Error fetching user data:", err)
        error("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [userId, router, error])

  const handleSuspendUser = async () => {
    if (!userData) return
    
    setIsActionLoading(true)
    try {
      // Update user status in Firestore
      const userRef = doc(db, "users", userData.id)
      const newStatus = userData.isDisabled ? false : true
      
      await updateDoc(userRef, { 
        isDisabled: newStatus,
        updatedAt: new Date().toISOString()
      })
      
      // Record the activity
      await recordUserActivity(
        userData.id,
        "status_change",
        `User ${userData.isDisabled ? "reactivated" : "suspended"}`,
        {
          previousStatus: userData.isDisabled ? "suspended" : "active",
          newStatus: userData.isDisabled ? "active" : "suspended",
          actionBy: "admin"
        }
      )
      
      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        isDisabled: newStatus
      } : null)
      
      // Show success message
      if (userData.isDisabled) {
        success(`User ${userData.firstName} ${userData.lastName} has been reactivated`)
      } else {
        success(`User ${userData.firstName} ${userData.lastName} has been suspended`)
      }
    } catch (err) {
      console.error("Error updating user status:", err)
      error("Failed to update user status")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userData) return
    
    const confirmed = window.confirm(`Are you sure you want to delete ${userData.firstName} ${userData.lastName}? This action cannot be undone.`)
    
    if (!confirmed) return
    
    setIsActionLoading(true)
    try {
      // Record the activity before deleting
      await recordUserActivity(
        userData.id,
        "status_change",
        "User account deleted",
        {
          previousStatus: userData.isDisabled ? "suspended" : "active",
          actionBy: "admin",
          userRole: userData.role
        }
      )

      // Delete user from Firestore
      await deleteDoc(doc(db, "users", userData.id))
      
      // Show success message
      success(`User ${userData.firstName} ${userData.lastName} has been deleted`)
      
      // Redirect to users list
      router.push("/admin/users")
    } catch (err) {
      console.error("Error deleting user:", err)
      error("Failed to delete user")
      setIsActionLoading(false)
    }
  }
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (e) {
      return dateString
    }
  }
  
  // Format "time ago" for last active
  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "N/A"
    
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (e) {
      return dateString
    }
  }

  // Handle adding a new note
  const handleAddNote = async () => {
    if (!newNote.trim() || !userData) return
    
    setIsSubmittingNote(true)
    try {
      // Add note to Firestore
      const noteRef = await addDoc(collection(db, "userNotes"), {
        userId: userData.id,
        content: newNote.trim(),
        createdAt: serverTimestamp(),
        createdBy: "Admin", // Replace with actual admin user info when available
      })
      
      // Record the activity
      await recordUserActivity(
        userData.id,
        "note_added",
        "Admin note added",
        {
          noteId: noteRef.id,
          notePreview: newNote.trim().substring(0, 50) + (newNote.trim().length > 50 ? "..." : ""),
          actionBy: "admin"
        }
      )
      
      // Add to local state
      const now = new Date().toISOString()
      const newNoteObj = {
        id: noteRef.id,
        content: newNote.trim(),
        createdAt: now,
        createdBy: "Admin"
      }
      
      setNotes(prev => [...prev, newNoteObj])
      
      // Create a notification for other admins about this note
      await addAdminNotification(
        `Note added for ${userData.firstName} ${userData.lastName}`,
        newNote.trim().length > 50 ? `${newNote.trim().substring(0, 50)}...` : newNote.trim(),
        'info',
        'all',
        `/admin/users/${userData.id}`,
        userData.role === 'employer' ? 'employer' : 'jobseeker',
        userData.id
      )
      
      // Close dialog and reset form
      setNewNote("")
      setIsNoteDialogOpen(false)
      success("Note added successfully")
    } catch (err) {
      console.error("Error adding note:", err)
      error("Failed to add note")
    } finally {
      setIsSubmittingNote(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout title="User Profile">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      </AdminLayout>
    )
  }
  
  if (!userData) {
    return (
      <AdminLayout title="User Profile">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-gray-500 mb-4">The user you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push("/admin/users")}>Back to Users</Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="User Profile">
      <div className="space-y-6">
        {/* User Profile Header */}
        <div className="flex flex-col md:flex-row gap-6">
          <Card className="w-full md:w-1/3">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-500" />
                </div>
                <div>
                  <CardTitle>{userData.firstName} {userData.lastName}</CardTitle>
                  <CardDescription>{userData.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={userData.role === "employer" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
                >
                  {userData.role}
                </Badge>
                <Badge
                  className={
                    userData.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : userData.isVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {userData.status === "rejected"
                    ? "Inactive"
                    : userData.isVerified
                      ? "Verified"
                      : "Not Verified"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p>{userData.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p>{userData.city || ''} {userData.barangay ? `, ${userData.barangay}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Registered</p>
                    <p>{formatDate(userData.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Last Active</p>
                    <p>{formatTimeAgo(userData.updatedAt || userData.createdAt)}</p>
                  </div>
                </div>
              </div>

              {userData.role === "employer" && (
                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-2">Verification Status</p>
                  <Badge
                    className={
                      userData.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : userData.isVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                    }
                  >  {userData.status === "rejected"
                      ? "Rejected"
                      : userData.isVerified
                        ? "Verified"
                        : "Not Verified"}
                  
                  </Badge>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSuspendUser}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {userData.isDisabled ? "Reactivate User" : "Suspend User"}
              </Button>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleDeleteUser}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Delete User
              </Button>
            </CardFooter>
          </Card>

          <div className="w-full md:w-2/3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>
                  {userData.role === "jobseeker" ? "Jobseeker profile information" : "Employer account details"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profile">
                  <TabsList className="mb-4">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    {(userData.role === "jobseeker" || userData.role === "multi") && (
                      <>
                        {userData.resumeUrl && <TabsTrigger value="resume">Resume</TabsTrigger>}
                        <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
                      </>
                    )}
                    {(userData.role === "employer" || userData.role === "multi") && (
                      <>
                        <TabsTrigger value="company">Company</TabsTrigger>
                        <TabsTrigger value="jobs">Job Listings ({jobs.length})</TabsTrigger>
                      </>
                    )}
                    <TabsTrigger value="activity">Activity Log</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-4">
                    {(userData.role === "jobseeker" || userData.role === "multi") && (
                      <>
                        {userData.skills && userData.skills.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium mb-2">Skills</h3>
                            <div className="flex flex-wrap gap-2">
                              {userData.skills.map((skill, index) => (
                                <Badge key={index} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {userData.education && userData.education.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium mb-2">Education</h3>
                            {userData.education.map((edu, index) => (
                              <div key={index} className="mb-3">
                                <p className="font-medium">{edu.degree}</p>
                                <p className="text-sm text-gray-500">{edu.institution}</p>
                                <p className="text-sm text-gray-500">{edu.year}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {userData.experience && userData.experience.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium mb-2">Experience</h3>
                            {userData.experience.map((exp, index) => (
                              <div key={index} className="mb-3">
                                <p className="font-medium">{exp.title}</p>
                                <p className="text-sm text-gray-500">{exp.company}</p>
                                <p className="text-sm text-gray-500">{exp.period}</p>
                                <p className="text-sm">{exp.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {(!userData.skills || userData.skills.length === 0) && 
                         (!userData.education || userData.education.length === 0) && 
                         (!userData.experience || userData.experience.length === 0) && (
                          <div className="text-center py-4">
                            <p className="text-gray-500">No profile information available</p>
                          </div>
                        )}
                      </>
                    )}

                    {(userData.role === "employer" || userData.role === "multi") && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Company Name</p>
                            <p className="font-medium">{userData.companyName || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Industry</p>
                            <p className="font-medium">{userData.industry || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="font-medium">{userData.city || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Verification Status</p>
                            <p className="font-medium">{userData.isVerified ? 'Verified' : 'Not Verified'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {userData.resumeUrl && (
                    <TabsContent value="resume">
                      <div className="flex items-center gap-3 p-4 border rounded-md">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium">Resume</p>
                          <p className="text-sm text-gray-500">Uploaded on {formatDate(userData.updatedAt || userData.createdAt)}</p>
                        </div>
                        <Button variant="outline" onClick={() => window.open(userData.resumeUrl, '_blank')}>View</Button>
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="applications">
                    <div className="space-y-4">
                      {applications.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No applications found</p>
                      ) : (
                        applications.map((application) => (
                          <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{application.jobTitle}</p>
                              <p className="text-sm text-gray-500">{application.company}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Applied on {formatDate(application.appliedAt)}
                              </p>
                            </div>
                            <Badge
                              className={
                                application.status === "accepted"
                                  ? "bg-green-100 text-green-800"
                                  : application.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {application.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="company">
                    <div className="space-y-4">
                      {userData.companyName ? (
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Company Name</p>
                            <p className="font-medium">{userData.companyName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Industry</p>
                            <p className="font-medium">{userData.industry || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Business Documentation</p>
                            <p className="font-medium">
                              {userData.businessPermitUrl ? 'Business permit uploaded' : 'No business permit uploaded'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Verification Status</p>
                            <Badge
                              className={
                                userData.isVerified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {userData.isVerified ? "Verified" : "Not Verified"}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500">No company information available</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="jobs">
                    <div className="space-y-4">
                      {jobs.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No job listings found</p>
                      ) : (
                        jobs.map((job) => (
                          <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{job.title}</p>
                              <p className="text-sm text-gray-500">{job.location}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Posted on {formatDate(job.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  job.verificationStatus === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : job.verificationStatus === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {job.verificationStatus}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/admin/jobs/${job.id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity">
                    <div className="space-y-4">
                      {activities.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No activity found</p>
                      ) : (
                        activities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="shrink-0">
                              {activity.type === "profile_update" && <User className="h-5 w-5 text-blue-500" />}
                              {activity.type === "job_application" && <FileText className="h-5 w-5 text-green-500" />}
                              {activity.type === "job_post" && <Briefcase className="h-5 w-5 text-purple-500" />}
                              {activity.type === "verification" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                              {activity.type === "status_change" && <Clock className="h-5 w-5 text-red-500" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{activity.description}</p>
                              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                <div className="mt-1 text-sm text-gray-500">
                                  {Object.entries(activity.metadata).map(([key, value]) => (
                                    <p key={key}>
                                      {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                                    </p>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTimeAgo(activity.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admin Notes</CardTitle>
                <CardDescription>Internal notes about this user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userData?.isVerified === false && userData.role === "employer" && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">Employer verification pending</p>
                        <p className="text-sm text-gray-500">This employer account has not been verified yet.</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Display existing notes */}
                  {notes.length > 0 ? (
                    notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                         .map((note) => (
                      <div key={note.id} className="p-3 border rounded-md">
                        <p className="text-sm">{note.content}</p>
                        <div className="flex justify-between mt-2">
                          <p className="text-xs text-gray-400">By {note.createdBy}</p>
                          <p className="text-xs text-gray-400">{formatDate(note.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-2">No notes added yet</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  onClick={() => setIsNoteDialogOpen(true)}
                >
                  Add Note
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin Note</DialogTitle>
            <DialogDescription>
              Add a note about {userData ? `${userData.firstName} ${userData.lastName}` : 'this user'}. This will only be visible to admins.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your note here..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-25"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddNote} 
              disabled={isSubmittingNote || !newNote.trim()}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isSubmittingNote ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
