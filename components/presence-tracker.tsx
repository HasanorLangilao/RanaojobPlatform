"use client"

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getDatabase, ref, set, onDisconnect, serverTimestamp } from "firebase/database"

export function PresenceTracker() {
  const { user } = useAuth()
  
  useEffect(() => {
    if (!user) return
    
    const rtdb = getDatabase()
    const userStatusRef = ref(rtdb, `status/${user.uid}`)
    
    // When the user is online, update their status
    set(userStatusRef, true)
    
    // When the user disconnects, update the database
    onDisconnect(userStatusRef).set(false)
    
    // Also store the last online timestamp
    const userLastOnlineRef = ref(rtdb, `lastOnline/${user.uid}`)
    onDisconnect(userLastOnlineRef).set(serverTimestamp())
    
    return () => {
      // When component unmounts, set status to offline
      set(userStatusRef, false)
    }
  }, [user])
  
  return null
} 