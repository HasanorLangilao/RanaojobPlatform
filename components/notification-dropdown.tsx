"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCircle, Clock, User, Briefcase, AlertCircle, X } from "lucide-react"
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
import { getEmployerNotifications, EmployerNotification, markNotificationAsRead, deleteNotification } from "@/lib/notifications"
import { formatDistanceToNow } from "date-fns"

export function NotificationDropdown() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<EmployerNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const userData = localStorage.getItem("ranaojobs_user")
        if (!userData) {
          setIsLoading(false)
          return
        }

        const user = JSON.parse(userData)
        const employerNotifications = await getEmployerNotifications(user.id)
        setNotifications(employerNotifications)
      } catch (err) {
        setError("Failed to load notifications")
        console.error("Error fetching notifications:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()

    // Set up an interval to refresh notifications
    const intervalId = setInterval(fetchNotifications, 30000) // Every 30 seconds
    
    return () => clearInterval(intervalId)
  }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleNotificationClick = async (notification: EmployerNotification) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id!)
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        )
      }

      if (notification.link) {
        // Transform the URL if it's an application link
        const transformedLink = notification.link.replace(
          '/employer-dashboard/applications/',
          '/employer/applicants/'
        )
        router.push(transformedLink)
        setOpen(false)
      }
    } catch (error) {
      console.error("Error handling notification click:", error)
    }
  }

  const handleDelete = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "job_verification":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "new_application":
        return <User className="h-5 w-5 text-blue-500" />
      case "applicant_update":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "system_alert":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "announcement":
        return <Briefcase className="h-5 w-5 text-purple-500" />
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
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No notifications</div>
        ) : (
          <DropdownMenuGroup className="max-h-75 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer ${notification.isRead ? "opacity-70" : "bg-yellow-50"}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-gray-500">{notification.message}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2 opacity-50 hover:opacity-100"
                    onClick={(e) => handleDelete(notification.id!, e)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="p-2 text-center cursor-pointer"
          onClick={() => {
            router.push("/employer-dashboard/notifications")
            setOpen(false)
          }}
        >
          <p className="w-full text-sm text-blue-500">View all notifications</p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}