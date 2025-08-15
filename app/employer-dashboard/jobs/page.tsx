"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { recordActivity } from "@/lib/activity-logger"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const userData = localStorage.getItem("ranaojobs_user")
      if (!userData) {
        throw new Error("Please log in to view jobs")
      }

      const user = JSON.parse(userData)
      const jobsQuery = query(
        collection(db, "jobs"),
        where("companyId", "==", user.id)
      )

      const querySnapshot = await getDocs(jobsQuery)
      const jobsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setJobs(jobsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (jobId: string, jobTitle: string) => {
    if (!confirm("Are you sure you want to delete this job?")) {
      return
    }

    try {
      const userData = localStorage.getItem("ranaojobs_user")
      if (!userData) {
        throw new Error("Please log in to delete jobs")
      }

      const user = JSON.parse(userData)

      // Delete job from Firestore
      await deleteDoc(doc(db, "jobs", jobId))

      // Record job deletion activity
      await recordActivity(
        user.id,
        "job_delete",
        "Deleted job",
        {
          jobId,
          jobTitle,
          companyName: user.companyName
        }
      )

      // Refresh jobs list
      await fetchJobs()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Job Listings</h1>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4">
        {jobs.map(job => (
          <Card key={job.id}>
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription>
                {job.location} • {job.salary}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Status: {job.status}</p>
                  <p className="text-sm text-gray-500">
                    Posted: {job.createdAt?.toDate().toLocaleDateString()}
                  </p>
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = `/employer-dashboard/edit-job/${job.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(job.id, job.title)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {jobs.length === 0 && (
          <Alert>
            <AlertDescription>No jobs posted yet.</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
} 