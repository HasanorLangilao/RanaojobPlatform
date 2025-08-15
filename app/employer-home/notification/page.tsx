"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { Bell, CheckCircle, Trash2, ArrowLeft, UserPlus, Briefcase, FileCheck, Users } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"

export default function EmployerNotificationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [filter, setFilter] = useState<string>("all")

  // Notification type icons mapping
  const notificationIcons: Record<string, any> = {
    application: <UserPlus className="h-5 w-5 text-blue-600" />,
    job_related: <Briefcase className="h-5 w-5 text-yellow-600" />,
    system: <Bell className="h-5 w-5 text-purple-600" />,
    approval: <FileCheck className="h-5 w-5 text-green-600" />,
    applicant_update: <Users className="h-5 w-5 text-orange-600" />
  }

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
      router.push("/jobseeker-home")
      return
    }

    // If multi-role, ensure active role is employer
    if (user.role === "multi" && user.activeRole !== "employer") {
      user.activeRole = "employer"
      localStorage.setItem("ranaojobs_user", JSON.stringify(user))
    }

    setUserData(user)
    
    fetchNotifications(user.id)
  }, [router, toast])

  const fetchNotifications = async (employerId: string) => {
    try {
      setIsLoading(true)
      
      const notificationsQuery = query(
        collection(db, "employernotifications"),
        where("employerId", "==", employerId),
        orderBy("createdAt", "desc")
      )
      
      const notificationsSnapshot = await getDocs(notificationsQuery)
      
      const notificationsList = notificationsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "Notification",
          message: data.message || "",
          createdAt: data.createdAt ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true }) : "Recently",
          isRead: data.isRead || false,
          type: data.type || "info",
          link: data.link || null,
          relatedJob: data.relatedJob || null,
          applicantId: data.applicantId || null,
          applicationId: data.applicationId || null
        }
      })
      
      setNotifications(notificationsList)
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load your notifications",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, "employernotifications", notificationId)
      await updateDoc(notificationRef, {
        isRead: true
      })
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      )
      
      toast({
        title: "Success",
        description: "Notification marked as read",
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to update notification status",
        variant: "destructive",
      })
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, "employernotifications", notificationId)
      await deleteDoc(notificationRef)
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== notificationId)
      )
      
      toast({
        title: "Success",
        description: "Notification deleted",
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notification => !notification.isRead)
      
      // Update each unread notification in Firestore
      const updatePromises = unreadNotifications.map(notification => 
        updateDoc(doc(db, "employernotifications", notification.id), {
          isRead: true
        })
      )
      
      await Promise.all(updatePromises)
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      )
      
      toast({
        title: "Success",
        description: `${unreadNotifications.length} notifications marked as read`,
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to update notifications status",
        variant: "destructive",
      })
    }
  }

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />

      <main className="flex-grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back button and header */}
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push("/employer-home")}
              className="mr-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          
          <Card>
            <CardHeader className="flex flex-col space-y-2">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Stay updated with the latest announcements and activities
                  </CardDescription>
                </div>
                
                {notifications.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button 
                    variant={filter === "all" ? "default" : "outline"}
                    size="sm" 
                    onClick={() => setFilter("all")}
                  >
                    All
                  </Button>
                  <Button 
                    variant={filter === "application" ? "default" : "outline"}
                    size="sm" 
                    onClick={() => setFilter("application")}
                    className="flex items-center gap-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    New Applicants
                  </Button>
                  <Button 
                    variant={filter === "job_related" ? "default" : "outline"}
                    size="sm" 
                    onClick={() => setFilter("job_related")}
                  >
                    Job Related
                  </Button>
                  <Button 
                    variant={filter === "unread" ? "default" : "outline"}
                    size="sm" 
                    onClick={() => setFilter("unread")}
                  >
                    Unread
                  </Button>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications
                    .filter(notification => {
                      if (filter === "all") return true;
                      if (filter === "unread") return !notification.isRead;
                      return notification.type === filter;
                    })
                    .map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`flex items-start p-4 rounded-md border ${notification.isRead ? 'bg-white' : 'bg-blue-50'}`}
                    >
                      <div className={`p-2 rounded-full mr-4 ${
                        notification.type === "application" 
                          ? "bg-blue-100" 
                          : notification.type === "job_related" 
                            ? "bg-yellow-100"
                            : notification.type === "approval"
                              ? "bg-green-100"
                              : notification.type === "applicant_update"
                                ? "bg-orange-100"
                                : "bg-purple-100"
                      }`}>
                        {notificationIcons[notification.type] || <Bell className="h-5 w-5 text-purple-600" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium">{notification.title}</h3>
                          <span className="text-xs text-gray-500">{notification.createdAt}</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        
                        {(notification.relatedJob || notification.applicationId) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {notification.relatedJob && (
                              <Link 
                                href={`/employer/jobs/${notification.relatedJob.id}`} 
                                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full"
                              >
                                <Briefcase className="inline-block h-3 w-3 mr-1" />
                                {notification.relatedJob.title || "View Job"}
                              </Link>
                            )}
                            
                            {notification.applicationId && (
                              <Link 
                                href={`/employer/applicants?application=${notification.applicationId}`}
                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded-full"
                              >
                                <UserPlus className="inline-block h-3 w-3 mr-1" />
                                View Application
                              </Link>
                            )}
                          </div>
                        )}
                        
                        {notification.link && !notification.relatedJob && !notification.applicationId && (
                          <div className="mt-2">
                            <Link href={notification.link} className="text-sm text-blue-600 hover:underline">
                              View details
                            </Link>
                          </div>
                        )}
                        
                        <div className="flex mt-3">
                          {!notification.isRead && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => markAsRead(notification.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 p-0 h-8 mr-4"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark as read
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-0 h-8"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="p-3 bg-gray-100 rounded-full mb-4">
                    <Bell className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-lg mb-1">No notifications</h3>
                  <p className="text-gray-500 text-center">
                    You don't have any notifications right now.
                    <br />
                    We'll notify you when there's any activity.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      <AuthCheckModal
        isOpen={isAuthModalOpen}
        onClose={() => router.push("/")}
        title="Employer Account Required"
        message="You need to login or register as an employer to access this page."
      />
    </div>
  )
} 