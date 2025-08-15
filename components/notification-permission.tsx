"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { initializePushNotifications, saveTokenToProfile } from '@/lib/push-notifications'

interface NotificationPermissionProps {
  userId: string
  className?: string
}

export function NotificationPermission({ userId, className }: NotificationPermissionProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [notificationSupported, setNotificationSupported] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Check if notifications are supported in this browser
    if (!('Notification' in window)) {
      setNotificationSupported(false)
      return
    }

    // Check current permission status
    setPermissionStatus(Notification.permission)

    // Check if user is already subscribed
    const checkSubscriptionStatus = async () => {
      try {
        const storedUser = localStorage.getItem("ranaojobs_user")
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setIsSubscribed(userData.pushNotificationsEnabled || false)
        }
      } catch (error) {
        console.error('Error checking subscription status:', error)
      }
    }

    checkSubscriptionStatus()
  }, [])

  const handleSubscriptionToggle = async (enabled: boolean) => {
    if (!enabled) {
      // Unsubscribe
      setIsSubscribed(false)
      
      // Update local storage
      const storedUser = localStorage.getItem("ranaojobs_user")
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        userData.pushNotificationsEnabled = false
        localStorage.setItem("ranaojobs_user", JSON.stringify(userData))
      }
      
      toast({
        title: "Notifications disabled",
        description: "You will no longer receive push notifications from this site.",
      })
      
      return
    }

    try {
      // Subscribe to notifications
      const token = await initializePushNotifications()
      
      if (!token) {
        toast({
          title: "Permission denied",
          description: "Please allow notifications in your browser settings to receive updates.",
          variant: "destructive",
        })
        return
      }
      
      // Save token to user profile
      const success = await saveTokenToProfile(userId, token)
      
      if (success) {
        setIsSubscribed(true)
        
        // Update permission status
        setPermissionStatus(Notification.permission)
        
        // Update local storage
        const storedUser = localStorage.getItem("ranaojobs_user")
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          userData.pushNotificationsEnabled = true
          localStorage.setItem("ranaojobs_user", JSON.stringify(userData))
        }
        
        toast({
          title: "Notifications enabled",
          description: "You will now receive push notifications for important updates.",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to enable notifications. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!notificationSupported) {
    return (
      <Alert className={className}>
        <AlertTitle>Notifications not supported</AlertTitle>
        <AlertDescription>
          Your browser does not support push notifications. Please use a modern browser to receive updates.
        </AlertDescription>
      </Alert>
    )
  }

  if (permissionStatus === 'denied') {
    return (
      <Alert className={className}>
        <AlertTitle>Notifications blocked</AlertTitle>
        <AlertDescription>
          You have blocked notifications for this site. Please update your browser settings to receive updates.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Switch 
        id="notifications" 
        checked={isSubscribed}
        onCheckedChange={handleSubscriptionToggle}
      />
      <Label htmlFor="notifications" className="flex items-center gap-1.5">
        {isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        {isSubscribed ? "Notifications enabled" : "Enable notifications"}
      </Label>
    </div>
  )
} 