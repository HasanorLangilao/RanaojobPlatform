"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bell, CheckCircle, Clock, User, Briefcase, AlertCircle, X, LogIn, Edit, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc ,db} from "@/config/firebase"
import { formatDistanceToNow } from "date-fns"
import { recordActivity } from "@/lib/activity-logger"

// Define JobseekerNotification type
interface JobseekerNotification {
  id: string;
  jobseekerId: string;
  title: string;
  message: string;
  createdAt: any;
  isRead: boolean;
  type: string;
  link?: string | null;
  relatedJob?: any;
  applicationId?: string | null;
  applicationStatus?: string;
}

// Helper function to safely get user data from localStorage
const getUserFromLocalStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedUser = window.localStorage.getItem("ranaojobs_user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
  }
  return null;
};


export function JobseekerNotificationDropdown() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<JobseekerNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const fetchNotifications = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Get user data from local storage
      const user = getUserFromLocalStorage();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check if the user is a jobseeker or multi-role with active jobseeker role
      if (user.role === "jobseeker" || (user.role === "multi" && user.activeRole === "jobseeker")) {
        const notificationsQuery = query(
          collection(db, "jobseekernotifications"),
          where("jobseekerId", "==", user.id),
          orderBy("createdAt", "desc")
        );
        
        console.log(`Fetching notifications for jobseeker ${user.id}`);
        const notificationsSnapshot = await getDocs(notificationsQuery);
        console.log(`Found ${notificationsSnapshot.size} notifications`);
        
        const jobseekerNotifications: JobseekerNotification[] = notificationsSnapshot.docs.map(doc => {
          const data = doc.data();
          const notification = {
            id: doc.id,
            jobseekerId: data.jobseekerId,
            title: data.title || "Notification",
            message: data.message || "",
            createdAt: data.createdAt,
            isRead: data.isRead || false,
            type: data.type || "system",
            link: data.link || null,
            relatedJob: data.relatedJob || null,
            applicationId: data.applicationId || null,
            applicationStatus: data.applicationStatus || null
          };
          console.log(`Notification ${doc.id}:`, notification);
          return notification;
        });
        
        setNotifications(jobseekerNotifications);
        console.log("Fetched notifications:", jobseekerNotifications);
      } else {
        setNotifications([]);
      }

    } catch (err: any) {
      setError("Failed to load notifications")
      console.error("Error fetching notifications in dropdown:", err)
      setNotifications([]);
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch notifications on initial load
  useEffect(() => {
    fetchNotifications()
    
    // Listen for user state changes
    const handleUserStateChange = () => {
      fetchNotifications()
    }
    
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      window.addEventListener("userStateChange", handleUserStateChange)
      
      return () => {
        window.removeEventListener("userStateChange", handleUserStateChange)
      }
    }
    
    return undefined
  }, [])
  
  // Refresh notifications when dropdown is opened
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])


  // Count unread notifications
  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  const markAsRead = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    try {
      // Get user data from local storage
      const user = getUserFromLocalStorage();
      if (!user) return;


      // Update in Firestore
      const notificationRef = doc(db, "jobseekernotifications", id);
      await updateDoc(notificationRef, {
        isRead: true
      });
      
      // Log activity
      await recordActivity(
        user.id,
        "notification_read",
        `Jobseeker ${user.firstName || user.email} marked notification as read`,
        {
          notificationId: id,
          role: "jobseeker"
        }
      );
      
      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  const markAllAsRead = async () => {
    try {
      // Get user data from local storage
      const user = getUserFromLocalStorage();
      if (!user) return;


      // Get all unread notifications
      const unreadNotifications = notifications.filter(notification => !notification.isRead);
      
      // Update each unread notification in Firestore
      const updatePromises = unreadNotifications.map(notification => 
        updateDoc(doc(db, "jobseekernotifications", notification.id), {
          isRead: true
        })
      );
      
      await Promise.all(updatePromises);
      
      // Log activity
      await recordActivity(
        user.id,
        "notifications_all_read",
        `Jobseeker ${user.firstName || user.email} marked all notifications as read`,
        {
          count: unreadNotifications.length,
          role: "jobseeker"
        }
      );
      
      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }

  const handleNotificationClick = async (notification: JobseekerNotification) => {
    try {
      // Get user data from local storage
      const user = getUserFromLocalStorage();
      if (!user) return;


      // Mark as read in Firestore
      const notificationRef = doc(db, "jobseekernotifications", notification.id);
      await updateDoc(notificationRef, {
        isRead: true
      });
      
      // Log activity
      await recordActivity(
        user.id,
        "notification_click",
        `Jobseeker ${user.firstName || user.email} clicked on notification: ${notification.title}`,
        {
          notificationId: notification.id,
          notificationType: notification.type,
          role: "jobseeker"
        }
      );
      
      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      
      // Navigate to the link if it exists
      if (notification.link) {
        router.push(notification.link);
      } else if (notification.relatedJob?.id) {
        router.push(`/job/${notification.relatedJob.id}`);
      } else {
        router.push("/jobseeker-home/notification");
      }
      
      setOpen(false);
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "application":
        return <FileCheck className="h-5 w-5 text-blue-500" />
      case "job":
        return <Briefcase className="h-5 w-5 text-green-500" />
      case "profile":
        return <User className="h-5 w-5 text-purple-500" />
      case "alert":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />

      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white">
          <Bell className="h-5 w-5 relative" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-yellow-500 text-black">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between p-4">
          <DropdownMenuLabel className="text-base">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-8">
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Bell className="h-6 w-6 mx-auto mb-2" />
            <p>No new notifications</p>
          </div>
        ) : (
          <DropdownMenuGroup className="max-h-75 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer ${notification.isRead ? "opacity-70" : "bg-yellow-50 dark:bg-yellow-900/10"}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{notification.message}</p>
                    {notification.applicationStatus && (
                      <p className="text-xs font-medium text-blue-600">
                        Status: {notification.applicationStatus}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt.toDate()), { addSuffix: true }) : 'Recently'}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2 opacity-50 hover:opacity-100"
                      onClick={(e) => markAsRead(notification.id, e)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem className="p-2 text-center cursor-pointer" onClick={() => router.push("/jobseeker-home/notification")}>
          <p className="w-full text-sm text-yellow-500">View all notifications</p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 