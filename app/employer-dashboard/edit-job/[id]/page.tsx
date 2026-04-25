"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc,db } from "@/config/firebase"
import { recordActivity } from "@/lib/activity-logger"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [requirements, setRequirements] = useState("")
  const [location, setLocation] = useState("")
  const [salary, setSalary] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobDoc = await getDoc(doc(db, "jobs", params.id))
        if (!jobDoc.exists()) {
          throw new Error("Job not found")
        }

        const jobData = jobDoc.data()
        setTitle(jobData.title)
        setDescription(jobData.description)
        setRequirements(jobData.requirements)
        setLocation(jobData.location)
        setSalary(jobData.salary)
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchJob()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const userData = localStorage.getItem("ranaojobs_user")
      if (!userData) {
        throw new Error("Please log in to edit jobs")
      }

      const user = JSON.parse(userData)
      const jobData = {
        title,
        description,
        requirements,
        location,
        salary,
        updatedAt: new Date()
      }

      // Update job in Firestore
      await updateDoc(doc(db, "jobs", params.id), jobData)

      // Record job editing activity
      await recordActivity(
        user.id,
        "job_edit",
        "Edited job",
        {
          jobId: params.id,
          jobTitle: title,
          companyName: user.companyName
        }
      )

      router.push("/employer-home")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Job</CardTitle>
          <CardDescription>Update the job listing details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter job title"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter job description"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Requirements</label>
              <Textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Enter job requirements"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter job location"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Salary</label>
              <Input
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Enter salary range"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 