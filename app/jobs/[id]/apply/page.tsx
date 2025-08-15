"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { recordActivity } from "@/lib/activity-logger"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function JobApplicationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [jobData, setJobData] = useState<any>(null)
  const [coverLetter, setCoverLetter] = useState("")
  const [resumeUrl, setResumeUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const jobDoc = await getDoc(doc(db, "jobs", params.id))
        if (jobDoc.exists()) {
          setJobData(jobDoc.data())
        } else {
          setError("Job not found")
        }
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchJobData()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const userData = localStorage.getItem("ranaojobs_user")
      if (!userData) {
        throw new Error("Please log in to apply for jobs")
      }

      const user = JSON.parse(userData)
      const applicationData = {
        jobId: params.id,
        userId: user.id,
        status: "pending",
        appliedAt: serverTimestamp(),
        coverLetter: coverLetter,
        resumeUrl: resumeUrl
      }

      // Add application to Firestore
      const docRef = await addDoc(collection(db, "applications"), applicationData)

      // Record job application activity
      await recordActivity(
        user.id,
        "job_application",
        "Applied for job",
        {
          jobId: params.id,
          jobTitle: jobData?.title,
          companyName: jobData?.companyName,
          applicationId: docRef.id
        }
      )

      router.push("/jobseeker-dashboard")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!jobData) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Apply for {jobData.title}</CardTitle>
          <CardDescription>{jobData.companyName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cover Letter</label>
              <Textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Write your cover letter here..."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resume URL</label>
              <input
                type="url"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="Enter your resume URL"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 