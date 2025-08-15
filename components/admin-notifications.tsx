"use client"

import { useState, useEffect } from "react"
import { Bell, Briefcase, User, AlertTriangle, Settings, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { collection, getDocs, query, orderBy, limit, where, Timestamp, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  title: string
  message: string
  createdAt: Timestamp | Date | string
  isRead: boolean
  type: 'info' | 'warning' | 'success' | 'error'
  link?: string
  activityType?: 'jobseeker' | 'employer' | 'admin' | 'system'
  relatedUserId?: string
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUnread, setHasUnread] = useState(false)
  
  // Activity filters
  const [filters, setFilters] = useState({
    showJobseeker: true,
    showEmployer: true,
    showAdmin: true,
    showSystem: true,
  })

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true)
      try {
        // Get current user from localStorage
        const userData = localStorage.getItem("ranaojobs_user")
        if (!userData) {
          setLoading(false)
          return
        }

        const user = JSON.parse(userData)
        
        // Construct query to get notifications
        const notificationsQuery = query(
          collection(db, "adminNotifications"),
          where("adminId", "==", user.id || "all"), // "all" for global notifications
          orderBy("createdAt", "desc"),
          limit(10)
        )

        const querySnapshot = await getDocs(notificationsQuery)
        const notificationsData = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt || new Date()
          } as Notification
        })

        setNotifications(notificationsData)
        
        // Check if there are any unread notifications
        const hasAnyUnread = notificationsData.some(notif => !notif.isRead)
        setHasUnread(hasAnyUnread)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
    
    // Set up a polling interval to check for new notifications
    const interval = setInterval(() => {
      fetchNotifications()
    }, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [])
  
  // Apply filters when notifications or filters change
  useEffect(() => {
    const filtered = notifications.filter(notification => {
      const activityType = notification.activityType || 'admin';
      
      if (activityType === 'jobseeker' && !filters.showJobseeker) return false;
      if (activityType === 'employer' && !filters.showEmployer) return false;
      if (activityType === 'admin' && !filters.showAdmin) return false;
      if (activityType === 'system' && !filters.showSystem) return false;
      
      return true;
    });
    
    setFilteredNotifications(filtered);
  }, [notifications, filters]);

  // Format date for display
  const formatNotificationDate = (date: Timestamp | Date | string) => {
    try {
      let dateObj: Date
      
      if (date instanceof Timestamp) {
        dateObj = date.toDate()
      } else if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string') {
        dateObj = new Date(date)
      } else {
        return 'Just now'
      }
      
      return formatDistanceToNow(dateObj, { addSuffix: true })
    } catch (e) {
      return 'Recently'
    }
  }

  // Handle marking a notification as read
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Only mark as read if it's not already read
      if (!notification.isRead) {
        // Update in Firestore
        const notificationRef = doc(db, "adminNotifications", notification.id)
        await updateDoc(notificationRef, {
          isRead: true
        })
        
        // Update local state
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, isRead: true } : n
        ))
        
        // Check if all notifications are now read
        const stillHasUnread = notifications.some(n => n.id !== notification.id && !n.isRead)
        setHasUnread(stillHasUnread)
      }
      
      // If there's a link, navigate to it
      if (notification.link) {
        window.location.href = notification.link
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }
  
  // Get icon for activity type
  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'jobseeker':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'employer':
        return <Briefcase className="h-4 w-4 text-green-500" />;
      case 'system':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Settings className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="py-0">User Activities</DropdownMenuLabel>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
                <span className="sr-only">Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter Activities</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.showJobseeker}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({ ...prev, showJobseeker: checked }))}
              >
                <User className="h-4 w-4 text-blue-500 mr-2" />
                Jobseekers
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuCheckboxItem
                checked={filters.showEmployer}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({ ...prev, showEmployer: checked }))}
              >
                <Briefcase className="h-4 w-4 text-green-500 mr-2" />
                Employers
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuCheckboxItem
                checked={filters.showAdmin}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({ ...prev, showAdmin: checked }))}
              >
                <Settings className="h-4 w-4 text-yellow-500 mr-2" />
                Admin
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuCheckboxItem
                checked={filters.showSystem}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({ ...prev, showSystem: checked }))}
              >
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                System
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <div className="h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No activities found
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id} 
                className={`flex flex-col items-start p-3 ${!notification.isRead ? 'bg-gray-50' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between w-full">
                  <div className="flex items-center gap-2">
                    {getActivityIcon(notification.activityType)}
                    <span className="font-medium">{notification.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatNotificationDate(notification.createdAt)}
                  </span>
                </div>
                <p className="text-sm mt-1 text-gray-600">{notification.message}</p>
                {!notification.isRead && (
                  <span className="h-2 w-2 bg-blue-500 rounded-full absolute top-3 right-3"></span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-center justify-center"
          onClick={() => window.location.href = '/admin/activity'}
        >
          View all activities
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 