"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleSwitcher } from "@/components/role-switcher"
import { Building2, LogOut, Search, User } from "lucide-react"
import Link from "next/link"
import { recordActivity, logLogoutActivity } from "@/lib/activity-logger"

export default function JobseekerDashboard() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    const user = JSON.parse(storedUser)

    // Check if user has jobseeker role
    if (user.role !== "jobseeker" && user.role !== "multi") {
      router.push("/employer-home")
      return
    }

    // If multi-role, ensure active role is jobseeker
    if (user.role === "multi" && user.activeRole !== "jobseeker") {
      user.activeRole = "jobseeker"
      localStorage.setItem("ranaojobs_user", JSON.stringify(user))
    }

    setUserData(user)
    setIsLoading(false)
  }, [router])

  const handleLogout = async () => {
    const userData = localStorage.getItem("ranaojobs_user")
    if (userData) {
      const user = JSON.parse(userData)
      // Log logout activity using the specialized function
      await logLogoutActivity(
        user.id,
        user.role,
        user.activeRole || user.role
      )
    }

    localStorage.removeItem("ranaojobs_user")
    router.push("/login")
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-900 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">
              RANAO<span className="text-yellow-500">Jobs</span>
            </Link>

            <div className="flex items-center gap-4">
              {userData.role === "multi" && <RoleSwitcher />}

              <Button variant="ghost" onClick={handleLogout} className="text-white">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Jobseeker Dashboard</h1>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span>Welcome, {userData.firstName || userData.email}</span>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Profile Completion</CardTitle>
              <CardDescription>Complete your profile to increase visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-gray-200 rounded-full mb-4">
                <div className="h-2 bg-yellow-500 rounded-full w-[65%]"></div>
              </div>
              <p className="text-sm text-gray-500 mb-4">65% Complete</p>
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">Complete Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Job Applications</CardTitle>
              <CardDescription>Track your job applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Applications</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span>In Review</span>
                  <span className="font-medium">5</span>
                </div>
                <div className="flex justify-between">
                  <span>Interviews</span>
                  <span className="font-medium">2</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Applications
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Job Recommendations</CardTitle>
              <CardDescription>Based on your profile and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">You have 15 new job recommendations</p>
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
                <Search className="h-4 w-4 mr-2" />
                Browse Jobs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Job Listings */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Recent Job Listings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((job) => (
              <Card key={job}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Senior Frontend Developer</CardTitle>
                  <CardDescription>Tech Solutions Inc.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-gray-500">
                      <Building2 className="h-4 w-4 mr-2" />
                      <span>Marawi City</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <span className="font-medium text-green-600">₱60,000 - ₱80,000</span>
                    </div>
                  </div>
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">Apply Now</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-center mt-6">
            <Button variant="outline">View All Jobs</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
