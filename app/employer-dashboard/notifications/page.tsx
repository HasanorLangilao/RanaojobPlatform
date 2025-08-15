"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getEmployerNotifications, markAllNotificationsAsRead, deleteNotification, EmployerNotification, markNotificationAsRead } from "@/lib/notifications"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCircle, Clock, User, Briefcase, AlertCircle, X, ArrowLeft, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function NotificationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<EmployerNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false)
  const [deleteMode, setDeleteMode] = useState<'selected' | 'all'>('selected')

  useEffect(() => {
    fetchNotifications()
  }, [])

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

  const handleMarkAllAsRead = async () => {
    try {
      const userData = localStorage.getItem("ranaojobs_user")
      if (!userData) return

      const user = JSON.parse(userData)
      await markAllNotificationsAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const handleDeleteSelected = async () => {
    try {
      const deletePromises: Promise<void>[] = [];

      if (deleteMode === 'all') {
        // Delete all notifications
        notifications.forEach(notification => {
          deletePromises.push(deleteNotification(notification.id!));
        });

        await Promise.all(deletePromises);
        setNotifications([]);
        toast({
          title: "Success",
          description: "All notifications deleted",
        });
      } else {
        // Delete only selected notifications
        selectedNotifications.forEach(id => {
          deletePromises.push(deleteNotification(id));
        });

        await Promise.all(deletePromises);
        setNotifications(prev => prev.filter(n => !selectedNotifications.has(n.id!)));
        setSelectedNotifications(new Set());
        toast({
          title: "Success",
          description: `${deletePromises.length} notification${deletePromises.length !== 1 ? 's' : ''} deleted`,
        });
      }
    } catch (error) {
      console.error("Error deleting notifications:", error);
      toast({
        title: "Error",
        description: "Failed to delete notifications",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

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
        if (notification.type === "new_application" && notification.applicationId) {
          router.push(`/employer/applicants/${notification.applicationId}`)
        } else {
          router.push(notification.link)
        }
      }
    } catch (error) {
      console.error("Error handling notification click:", error)
    }
  }

  const toggleNotificationSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const newSet = new Set<string>();
    notifications.forEach(n => {
      if (n.id) newSet.add(n.id);
    });
    setSelectedNotifications(newSet);
  };

  const deselectAll = () => {
    setSelectedNotifications(new Set());
  };

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

  const unreadCount = notifications.filter(n => !n.isRead).length
  const selectedCount = selectedNotifications.size;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notifications</CardTitle>
          <div className="flex space-x-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading notifications...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No notifications</div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${notification.isRead ? "bg-white" : "bg-yellow-50"}`}
                >
                  <div className="flex gap-4">
                    <div className="flex items-center">
                      <Checkbox
                        checked={notification.id ? selectedNotifications.has(notification.id) : false}
                        onCheckedChange={(checked) => {
                          if (notification.id) {
                            setSelectedNotifications(prev => {
                              const newSet = new Set(prev);
                              if (checked) {
                                newSet.add(notification.id!);
                              } else {
                                newSet.delete(notification.id!);
                              }
                              return newSet;
                            });
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-2"
                      />
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div
                      className="flex-1"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{notification.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {notification.createdAt && formatDistanceToNow(notification.createdAt.toDate(), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(notification.id!)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {notifications.length > 0 && (
          <CardFooter className="flex justify-between border-t pt-6">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              {selectedCount > 0 && (
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              {selectedCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteMode('selected');
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedCount})
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteMode('all');
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === 'all'
                ? 'This will permanently delete all notifications. This action cannot be undone.'
                : `This will permanently delete ${selectedCount} selected notification${selectedCount !== 1 ? 's' : ''}. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 