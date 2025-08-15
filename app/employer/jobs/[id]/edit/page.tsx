"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { JobPostingForm } from "@/components/job-posting-form"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { BackButton } from "@/components/back-button"
import { getJobPosting } from "@/lib/jobs"

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = React.use(params)
  const jobId = resolvedParams.id
  
  const [userData, setUserData] = useState<any>(null)
  const [jobData, setJobData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      setIsAuthModalOpen(true)
      return
    }

    const user = JSON.parse(storedUser)

    // Check if user has employer role
    if (user.role !== "employer" && user.role !== "multi") {
      router.push("/jobseeker-dashboard")
      return
    }

    // If multi-role, ensure active role is employer
    if (user.role === "multi" && user.activeRole !== "employer") {
      user.activeRole = "employer"
      localStorage.setItem("ranaojobs_user", JSON.stringify(user))
    }

    setUserData(user)

    // Fetch job data for editing from Firestore
    const fetchJob = async () => {
      try {
        const job = await getJobPosting(jobId)
        if (job) {
          setJobData(job)
        } else {
          // Job not found
          console.error("Job not found")
        }
      } catch (error) {
        console.error("Error fetching job:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchJob()
  }, [router, jobId])

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <BackButton href={`/employer/jobs/${jobId}`} className="mb-4" />
        <h1 className="text-2xl font-bold">Edit Job Listing</h1>
        <p className="text-gray-500">Update your job posting information</p>
      </div>

      {jobData && <JobPostingForm initialData={jobData} isEdit={true} userData={userData} />}

      <AuthCheckModal
        isOpen={isAuthModalOpen}
        onClose={() => router.push("/")}
        title="Employer Account Required"
        message="You need to login or register as an employer to edit job listings."
      />
    </div>
  )
}
