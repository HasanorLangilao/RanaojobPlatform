"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { addEmployerNotification } from '@/lib/notifications'

export default function TestNotificationButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleAddNotification = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      // Get the current user from localStorage
      const storedUser = localStorage.getItem("ranaojobs_user")
      if (!storedUser) {
        setResult("No user found. Please log in first.")
        setIsLoading(false)
        return
      }

      // Parse the stored user data
      const user = JSON.parse(storedUser)
      
      // Check if the user is an employer
      if (user.role !== 'employer' && !(user.role === 'multi' && user.activeRole === 'employer')) {
        setResult("Current user is not an employer. Please switch to employer role.")
        setIsLoading(false)
        return
      }
      
      // Create a test notification
      const success = await addEmployerNotification(
        user.id,
        "Test Notification",
        "This is a test notification to verify the notification system is working properly.",
        "system",
        "/employer-home"
      )
      
      if (success) {
        setResult(`Successfully added a test notification for employer ID: ${user.id}`)
      } else {
        setResult("Failed to add notification")
      }
    } catch (error) {
      console.error("Error adding test notification:", error)
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Test Notification System</h3>
      <p className="text-sm text-gray-500 mb-4">
        Click the button below to add a test notification for the current employer account.
      </p>
      
      <Button
        onClick={handleAddNotification}
        disabled={isLoading}
        className="bg-yellow-500 hover:bg-yellow-600 text-black"
      >
        {isLoading ? "Adding..." : "Add Test Notification"}
      </Button>
      
      {result && (
        <div className={`mt-4 p-3 rounded ${result.includes("Error") || result.includes("Failed") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {result}
        </div>
      )}
    </div>
  )
} 