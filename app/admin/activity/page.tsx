"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, FileText, Briefcase, AlertTriangle, Clock, LogIn, LogOut, Edit, Trash2, Upload, CheckCircle, XCircle, Shield, Bell } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, doc, getDoc, DocumentData, deleteDoc, writeBatch } from "firebase/firestore"
import { formatDistanceToNow } from "date-fns"
import { addEmployerActivity } from "@/lib/notifications"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface UserData {
  firstName?: string
  lastName?: string
  email?: string
  role?: string
}

interface Activity {
  id: string
  userId: string
  type: string
  description: string
  timestamp: string
  metadata?: Record<string, any>
  userData?: UserData
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedRole, setSelectedRole] = useState("all")
  const [isDeleting, setIsDeleting] = useState(false)

  // Activity type icons mapping
  const activityIcons: Record<string, any> = {
    login: <LogIn className="h-5 w-5 text-green-500" />,
    logout: <LogOut className="h-5 w-5 text-red-500" />,
    profile_update: <User className="h-5 w-5 text-blue-500" />,
    job_application: <FileText className="h-5 w-5 text-purple-500" />,
    job_post: <Briefcase className="h-5 w-5 text-yellow-500" />,
    job_edit: <Edit className="h-5 w-5 text-orange-500" />,
    job_delete: <Trash2 className="h-5 w-5 text-red-500" />,
    verification: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    status_change: <Clock className="h-5 w-5 text-red-500" />,
    resume_upload: <Upload className="h-5 w-5 text-blue-500" />,
    permit_upload: <Upload className="h-5 w-5 text-green-500" />,
    note_added: <FileText className="h-5 w-5 text-gray-500" />,
    verification_approved: <CheckCircle className="h-5 w-5 text-green-500" />,
    verification_rejected: <XCircle className="h-5 w-5 text-red-500" />,
    admin_action: <Shield className="h-5 w-5 text-purple-500" />,
    notification_read: <CheckCircle className="h-5 w-5 text-blue-500" />,
    notification_click: <Bell className="h-5 w-5 text-blue-500" />,
    notifications_all_read: <CheckCircle className="h-5 w-5 text-green-500" />
  }

  // Helper function to format Firestore timestamps
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp.toISOString();
    if (timestamp?.toDate) return timestamp.toDate().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    return null;
  };

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      // Fetch activities from activity_log_all collection
      const activitiesRef = collection(db, "activity_log_all")
      const q = query(activitiesRef, orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(q)
      
      const activitiesData = await Promise.all(
        querySnapshot.docs.map(async (activityDoc) => {
          const data = activityDoc.data() as Activity;
          
          // Get user data
          let userData: UserData = {};
          if (data.userId) {
            try {
              const userDocRef = doc(db, "users", data.userId);
              const userDoc = await getDoc(userDocRef);
              userData = userDoc.data() as UserData || {};
            } catch (error) {
              console.error("Error fetching user data for userId:", data.userId, error);
            }
          }
          
          return {
            id: activityDoc.id,
            userId: data.userId || "",
            type: data.type || "",
            description: data.description || "",
            timestamp: formatTimestamp(data.timestamp) || "",
            metadata: data.metadata || {},
            userData
          };
        })
      );
      
      setActivities(activitiesData)
    } catch (error) {
      console.error("Error fetching activities:", error)
      toast.error("Failed to fetch activities")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  const clearAllLogs = async () => {
    setIsDeleting(true)
    try {
      const activitiesRef = collection(db, "activity_log_all")
      const q = query(activitiesRef)
      const querySnapshot = await getDocs(q)
      
      // Use batch write for better performance and atomicity
      const batch = writeBatch(db)
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      
      await batch.commit()
      setActivities([])
      toast.success("All activity logs have been cleared")
    } catch (error) {
      console.error("Error clearing logs:", error)
      toast.error("Failed to clear logs")
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter activities based on search term and selected filters
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.userData?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (activity.userData?.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (activity.userData?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = selectedType === "all" || activity.type === selectedType
    const matchesRole = selectedRole === "all" || activity.userData?.role === selectedRole
    
    return matchesSearch && matchesType && matchesRole
  })

  if (isLoading) {
    return (
      <AdminLayout title="Activity Log">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Activity Log">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Track all activities across the platform</CardDescription>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting || activities.length === 0}>
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All Logs
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all activity logs
                      from the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllLogs} className="bg-red-600 hover:bg-red-700">
                      Yes, clear all logs
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-1/3"
              />
             
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="md:w-1/4">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="jobseeker">Jobseeker</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredActivities.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No activities found</p>
              ) : (
                filteredActivities.map((activity) => (
                  <Card key={activity.id} className="p-4">
                    <CardContent className="p-0 flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {activityIcons[activity.type] || <Clock className="h-5 w-5 text-gray-500" />}
                      </div>
                      <div className="flex-1">
                        {/* Activity title */}
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {activity.type === 'profile_update' ? (
                              `${activity.userData?.role === 'employer' ? 'Employer' : 'Jobseeker'} ${activity.userData?.firstName} ${activity.userData?.lastName} updated their ${activity.userData?.role === 'employer' ? 'company' : ''} profile`
                            ) : activity.type === 'job_post' ? (
                              `${activity.userData?.role === 'employer' ? 'Employer' : 'User'} ${activity.userData?.firstName} ${activity.userData?.lastName} posted a new job${activity.metadata?.jobTitle ? ': ' + activity.metadata.jobTitle : ''}`
                            ) : (
                              activity.description
                            )}
                          </p>
                          <Badge variant="outline">
                            {activity.userData?.role || "User"}
                          </Badge>
                        </div>
                        
                        {/* Only show user info if not a profile update */}
                        {activity.type !== 'profile_update' && (
                          <p className="text-sm text-gray-500">
                            {activity.userData?.firstName} {activity.userData?.lastName} ({activity.userData?.email})
                          </p>
                        )}
                        
                        {/* Activity metadata/changes */}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <>
                            {activity.type === 'profile_update' && activity.metadata.changes ? (
                              <div className="mt-2 text-sm text-gray-500">
                                <p className="font-medium">Changes:</p>
                                {Object.entries(activity.metadata.changes).map(([key, value], index) => (
                                  <p key={key + index} className="ml-4">
                                    {key}: {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                                  </p>
                                ))}
                              </div>
                            ) : activity.type === 'job_post' && activity.metadata.jobTitle ? (
                              <div className="mt-2 text-sm text-gray-500">
                                <p className="font-medium">Job Details:</p>
                                <p className="ml-4">Title: {activity.metadata.jobTitle}</p>
                                {activity.metadata.jobType && <p className="ml-4">Type: {activity.metadata.jobType}</p>}
                                {activity.metadata.jobCategory && <p className="ml-4">Category: {activity.metadata.jobCategory}</p>}
                                {activity.metadata.salary && <p className="ml-4">Salary: {activity.metadata.salary}</p>}
                              </div>
                            ) : (
                              <div className="mt-1 text-sm text-gray-500">
                                {Object.entries(activity.metadata).map(([key, value], index) => (
                                  <p key={key + index}>
                                    {key}: {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                                  </p>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Timestamp */}
                        <p className="text-xs text-gray-400 mt-2">
                          {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : 'Timestamp missing'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 