"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { JobPostingForm } from "@/components/job-posting-form"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { BackButton } from "@/components/back-button"

export default function PostJobPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
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
    setIsLoading(false)
  }, [router])

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <BackButton />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Post a Job</h1>
        <p className="text-gray-500">Create a new job listing to attract qualified candidates</p>
      </div>

      <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow">
        <JobPostingForm userData={userData} />
      </div>

      <AuthCheckModal
        isOpen={isAuthModalOpen}
        onClose={() => router.push("/")}
        title="Employer Account Required"
        message="You need to login or register as an employer to post a job."
      />
    </div>
  )
}
