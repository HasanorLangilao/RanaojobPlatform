"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ApplicantList } from "@/components/applicant-list"
import { JobApplicantCategory } from "@/components/job-applicant-category"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { BackButton } from "@/components/back-button"
import { NavBar } from "@/components/nav-bar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileBarChart } from "lucide-react"

export default function AllApplicantsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    // Set active tab based on filter parameter
    const filterParam = searchParams?.get('filter')
    if (filterParam) {
      setActiveTab("all") // Always show "all" tab when filter is applied
    }
  }, [searchParams])

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
    <div>
      <NavBar />
      <main className="flex-grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <BackButton className="mb-4" href="/employer-home" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="categorized" className="flex items-center gap-2">
                <FileBarChart className="h-4 w-4" />
                By Job Post
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Applicants
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="categorized">
              <JobApplicantCategory />
            </TabsContent>
            
            <TabsContent value="all">
              <Suspense fallback={<div>Loading...</div>}>
              <ApplicantList />
              </Suspense>
            </TabsContent>
          </Tabs>

          <AuthCheckModal
            isOpen={isAuthModalOpen}
            onClose={() => router.push("/")}
            title="Employer Account Required"
            message="You need to login or register as an employer to view applicants."
          />
        </div>
      </main>
    </div>
  )
}
