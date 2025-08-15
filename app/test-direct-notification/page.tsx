"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { createDirectNotification } from "@/lib/notifications"

export default function TestDirectNotificationPage() {
  const [jobseekerId, setJobseekerId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<Record<string, string>>({})

  const handleCreateNotification = async (status: string) => {
    if (!jobseekerId) {
      toast({
        title: "Error",
        description: "Please enter a jobseeker ID",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      const notificationId = await createDirectNotification(
        jobseekerId,
        status,
        "Test Job Position",
        "Test Company"
      )
      
      setResult(prev => ({
        ...prev,
        [status]: notificationId
      }))
      
      toast({
        title: "Success",
        description: `Created ${status} notification with ID: ${notificationId}`,
        variant: "default"
      })
    } catch (error) {
      console.error(`Error creating ${status} notification:`, error)
      toast({
        title: "Error",
        description: `Failed to create ${status} notification`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Test Direct Notification Creation</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create Direct Notifications</CardTitle>
          <CardDescription>
            This will create notifications directly in Firestore for a jobseeker with the specified ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="jobseekerId" className="block text-sm font-medium mb-1">
                Jobseeker ID
              </label>
              <Input
                id="jobseekerId"
                placeholder="Enter jobseeker ID"
                value={jobseekerId}
                onChange={(e) => setJobseekerId(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline"
                onClick={() => handleCreateNotification("To be Interviewed")}
                disabled={isLoading || !jobseekerId}
              >
                Create "To be Interviewed"
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleCreateNotification("Hired")}
                disabled={isLoading || !jobseekerId}
              >
                Create "Hired"
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleCreateNotification("Rejected")}
                disabled={isLoading || !jobseekerId}
              >
                Create "Rejected"
              </Button>
            </div>
          </div>
        </CardContent>
        {Object.keys(result).length > 0 && (
          <CardFooter>
            <div className="text-sm">
              <p>Created notifications:</p>
              <ul className="list-disc pl-5 mt-2">
                {Object.entries(result).map(([status, id]) => (
                  <li key={status}>{status}: {id}</li>
                ))}
              </ul>
            </div>
          </CardFooter>
        )}
      </Card>
      
      <div className="bg-yellow-100 p-4 rounded-md">
        <p className="text-yellow-800">
          <strong>Note:</strong> After creating notifications, check the Firestore database to verify that they
          have been created with the correct status values. Then check the jobseeker notifications dropdown to see if they appear correctly.
        </p>
      </div>
    </div>
  )
} 