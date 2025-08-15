"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EmployerJobsList } from "@/components/employer-jobs-list"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { BackButton } from "@/components/back-button"

export default function EmployerJobsPage() {
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
    <main className="flex-grow pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-6xl">
        <BackButton className="mb-4" href="/employer-home" />
        <EmployerJobsList />

        <AuthCheckModal
          isOpen={isAuthModalOpen}
          onClose={() => router.push("/")}
          title="Employer Account Required"
          message="You need to login or register as an employer to access this page."
        />
      </div>
    </main>
  )
}
