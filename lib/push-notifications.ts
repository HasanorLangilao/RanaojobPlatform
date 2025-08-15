import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Store a push notification subscription in Firestore
export const subscribeToPushNotifications = async (userId: string, subscription: PushSubscription): Promise<boolean> => {
  try {
    // Check if user exists
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      console.error(`User ${userId} not found`)
      return false
    }
    
    // Add the subscription to the user's document
    await updateDoc(userRef, {
      pushSubscription: JSON.stringify(subscription),
      pushNotificationsEnabled: true,
      updatedAt: serverTimestamp()
    })
    
    return true
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return false
  }
}

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (userId: string): Promise<boolean> => {
  try {
    // Check if user exists
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      console.error(`User ${userId} not found`)
      return false
    }
    
    // Remove the subscription from the user's document
    await updateDoc(userRef, {
      pushSubscription: null,
      pushNotificationsEnabled: false,
      updatedAt: serverTimestamp()
    })
    
    return true
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return false
  }
}

// Send a push notification to a specific user
export const sendPushNotification = async (
  userId: string, 
  title: string, 
  body: string, 
  icon: string = '/icons/icon-192x192.png',
  data: any = {}
): Promise<boolean> => {
  try {
    // Get the user's push subscription
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      console.error(`User ${userId} not found`)
      return false
    }
    
    const userData = userDoc.data()
    
    // Check if push notifications are enabled for this user
    if (!userData.pushNotificationsEnabled || !userData.pushSubscription) {
      console.log(`Push notifications not enabled for user ${userId}`)
      return false
    }
    
    // Create a record of the notification in Firestore
    await addDoc(collection(db, "pushNotifications"), {
      userId,
      title,
      body,
      icon,
      data,
      createdAt: serverTimestamp(),
      delivered: false
    })
    
    // The actual sending of the push notification will be handled by a Firebase Cloud Function
    // This is because sending web push notifications requires the use of VAPID keys
    // and should be done from a secure server environment
    
    return true
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

// Initialize push notifications in the browser
export const initializePushNotifications = async (): Promise<string | null> => {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications are not supported in this browser')
      return null
    }
    
    // Request permission
    const permission = await Notification.requestPermission()
    
    if (permission !== 'granted') {
      console.log('Notification permission not granted')
      return null
    }
    
    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.ready
    
    // Get FCM token
    const messaging = getMessaging()
    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    })
    
    if (!currentToken) {
      console.log('No registration token available')
      return null
    }
    
    // Listen for messages when the app is in the foreground
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload)
      
      // Display notification manually when app is in foreground
      if (payload.notification) {
        const { title, body } = payload.notification
        
        const notificationOptions = {
          body,
          icon: payload.notification.icon || '/icons/icon-192x192.png',
          data: payload.data
        }
        
        registration.showNotification(title, notificationOptions)
      }
    })
    
    return currentToken
  } catch (error) {
    console.error('Error initializing push notifications:', error)
    return null
  }
}

// Save FCM token to user profile
export const saveTokenToProfile = async (userId: string, token: string): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId)
    
    await updateDoc(userRef, {
      fcmToken: token,
      pushNotificationsEnabled: true,
      updatedAt: serverTimestamp()
    })
    
    return true
  } catch (error) {
    console.error('Error saving token to user profile:', error)
    return false
  }
} 