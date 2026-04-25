"use client"

import { useEffect, useRef } from 'react'
import { doc, updateDoc, serverTimestamp } from '@/config/firebase'
import { db } from '@/lib/firebase'
import { useAuth } from './use-auth'

// Time interval in milliseconds to update lastActive (5 minutes)
const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000

export function useActivityTracker() {
  const { user } = useAuth()
  const lastUpdateRef = useRef<number>(0)

  const updateLastActive = async () => {
    if (!user) return
    
    const now = Date.now()
    
    // Only update if more than the interval has passed since last update
    if (now - lastUpdateRef.current > ACTIVITY_UPDATE_INTERVAL) {
      try {
        const userRef = doc(db, "users", user.uid)
        await updateDoc(userRef, {
          lastActive: serverTimestamp()
        })
        lastUpdateRef.current = now
        console.log("Updated lastActive timestamp")
      } catch (error) {
        console.error("Error updating lastActive:", error)
      }
    }
  }

  useEffect(() => {
    if (!user) return

    // Update lastActive on initial load
    updateLastActive()

    // Set up event listeners for user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll']
    
    const handleUserActivity = () => {
      updateLastActive()
    }

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true })
    })

    // Set up interval to check for activity periodically
    const intervalId = setInterval(updateLastActive, ACTIVITY_UPDATE_INTERVAL)

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity)
      })
      clearInterval(intervalId)
    }
  }, [user])
} 