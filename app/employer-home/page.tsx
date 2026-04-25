"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { Briefcase, Users, Clock, AlertCircle, ChevronRight, Bell, CheckCircle2, LogIn, Edit, User, FileText, XCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc,
  db,
  DocumentData
} from "@/config/firebase"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow, format } from "date-fns"
import { calculateEmployerProfileCompletion } from "@/lib/profile"

// Define interfaces for type safety
interface JobDocument extends DocumentData {
  isActive: boolean
  title: string
  companyName: string
  location: string
  type: string
  category: string
  createdAt: any
  isDeleted: boolean
  employerId: string
  applicationsCount: number
  id?: string
}

interface ApplicationDocument extends DocumentData {
  status: string
  id?: string
}

interface ActivityDocument extends DocumentData {
  type: string
  message: string
  createdAt: any
  metadata: Record<string, any>
  id?: string
}

interface ActivityItem {
  id: string
  type: string
  message: string
  time: string
  exactTime: Date
  createdAtSeconds: number
  metadata: Record<string, any>
}

interface FirestoreDocument {
  id: string
  data(): DocumentData
}

export default function EmployerHomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplicants: 0,
    activeJobs: 0,
    newApplicants: 0,
    reviewedApplicants: 0
  })
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

  // Activity type icons mapping for employer activities (same as activity page)
  const activityIcons: Record<string, any> = {
    login: <LogIn className="h-4 w-4 text-green-600" />,
    job_edit: <Edit className="h-4 w-4 text-orange-600" />,
    profile_update: <User className="h-4 w-4 text-blue-600" />,
    job_post: <Briefcase className="h-4 w-4 text-yellow-600" />,
    job_delete: <Trash2 className="h-4 w-4 text-red-600" />,
    job_status_change: <Clock className="h-4 w-4 text-gray-500" />,
    application: <FileText className="h-4 w-4 text-purple-600" />,
    approval: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    rejection: <XCircle className="h-4 w-4 text-red-600" />,
    // Add other employer-specific activity types here with appropriate icons
    info: <Bell className="h-4 w-4 text-purple-600" /> // Default or general info icon
  }

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      setIsAuthModalOpen(true)
      return
    }

    let user;
    try {
      user = JSON.parse(storedUser)

    // Check if user has employer role
    if (user.role !== "employer" && user.role !== "multi") {
      router.push("/jobseeker-home")
      return
    }

    // If multi-role, ensure active role is employer
    if (user.role === "multi" && user.activeRole !== "employer") {
      user.activeRole = "employer"
      localStorage.setItem("ranaojobs_user", JSON.stringify(user))
    }

    setUserData(user)
    } catch (err) {
      console.error("Error parsing user data:", err)
      setIsAuthModalOpen(true)
      return
    }
    
    // Fetch employer data from Firestore
    const fetchEmployerData = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      
      try {
        const userId = user?.id
        if (!userId) {
          throw new Error("User ID not found")
        }
        
        // Get all jobs posted by this employer
        const jobsQuery = query(
          collection(db, "jobs"),
          where("employerId", "==", userId)
        )
        const jobsSnapshot = await getDocs(jobsQuery)
        
        // Count ALL jobs regardless of approval status (but not deleted ones)
        const allJobs = jobsSnapshot.docs.map((doc: FirestoreDocument) => ({
          id: doc.id,
          ...doc.data()
        })) as JobDocument[]
        
        const nonDeletedJobs = allJobs.filter((job: JobDocument) => job.isDeleted !== true)
        const totalJobs = nonDeletedJobs.length
        
        // Count active jobs (isActive === true)
        const activeJobs = nonDeletedJobs.filter((job: JobDocument) => job.isActive === true).length
        
        // Get applications
        const applicationsQuery = query(
          collection(db, "applications"),
          where("employerId", "==", userId)
        )
        const applicationsSnapshot = await getDocs(applicationsQuery)
        
        const applications = applicationsSnapshot.docs.map((doc: FirestoreDocument) => ({
          id: doc.id,
          ...doc.data()
        })) as ApplicationDocument[]
        
        const applicantsCount = applications.length
        
        // Count new/unreviewed applications
        const newApplicantsCount = applications.filter((app: ApplicationDocument) => 
          app.status === "pending" || app.status === "new"
        ).length
        
        // Count reviewed applications
        const reviewedApplicantsCount = applications.filter((app: ApplicationDocument) => 
          app.status !== "pending" && app.status !== "new"
        ).length
        
        // Get recent activities
        const recentActivitiesQuery = query(
          collection(db, "activity_emp"),
          where("employerId", "==", userId)
        )
        const recentActivitiesSnapshot = await getDocs(recentActivitiesQuery)
        
        // Get all activities and sort them manually
        let activities = recentActivitiesSnapshot.docs.map((doc: FirestoreDocument) => {
          const data = doc.data()
          
          // Safely handle dates
          let createdTime: Date
          try {
            createdTime = data.createdAt?.toDate?.() || new Date()
          } catch (err) {
            createdTime = new Date()
          }
            
            return {
              id: doc.id,
              type: data.type || "info",
              message: data.message || "",
              time: format(createdTime, "MMM d, yyyy 'at' h:mm a"),
              exactTime: createdTime,
            createdAtSeconds: data.createdAt?.seconds || 0,
              metadata: data.metadata || {}
          } as ActivityItem
        })
        
        // Sort by timestamp (newest first)
        activities = activities.sort((a: ActivityItem, b: ActivityItem) => {
          return b.createdAtSeconds - a.createdAtSeconds
        })
        
        // Get the 5 most recent
        activities = activities.slice(0, 5)

        setRecentActivity(activities)
        setStats({
          totalJobs,
          totalApplicants: applicantsCount,
          activeJobs,
          newApplicants: newApplicantsCount,
          reviewedApplicants: reviewedApplicantsCount
        })

        // Calculate profile completion
        try {
          const completionPercentage = await calculateEmployerProfileCompletion(userId)
        setProfileCompletion(completionPercentage)
        } catch (err) {
          console.error("Error calculating profile completion:", err)
          setProfileCompletion(0) // Default to 0 if calculation fails
        }
      } catch (err: any) {
        console.error("Error fetching employer data:", err)
        setErrorMessage(err.message || "Failed to load dashboard data")
        toast({
          title: "Error",
          description: "Failed to load your dashboard data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchEmployerData()
  }, [router, toast])

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />

      <main className="grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-6xl">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{errorMessage}</p>
              </div>
              <div className="mt-2 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
          
          {/* Welcome Banner */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Welcome, {userData?.companyName || userData?.firstName || "Employer"}!
                </h1>
                <p className="text-gray-600">Complete your company profile to build credibility with applicants.</p>
              </div>
              <Link href="/employer/profile">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">Complete Profile</Button>
              </Link>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Company Profile Completion</span>
                <span className="text-sm font-medium">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Jobs Posted</CardTitle>
                <CardDescription>All jobs (including pending approval)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{stats.totalJobs}</div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/employer/jobs">
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-blue-600">
                      View all jobs
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Reviewed Applicants</CardTitle>
                <CardDescription>Applications you've reviewed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{stats.reviewedApplicants}</div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/employer/applicants?filter=reviewed">
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-purple-600">
                      View reviewed applicants
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Active Jobs</CardTitle>
                <CardDescription>Jobs that are currently active</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{stats.activeJobs}</div>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/employer/jobs?filter=active">
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-orange-600">
                      View active jobs
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">New Applicants</CardTitle>
                <CardDescription>Unreviewed job applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{stats.newApplicants}</div>
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/employer/applicants?filter=new">
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-blue-600">
                      View new applicants
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/post-job">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Post a Job
                </Button>
              </Link>
              <Link href="/employer/jobs">
                <Button variant="outline">View My Jobs</Button>
              </Link>
              <Link href="/employer/applicants">
                <Button variant="outline">View Applicants</Button>
              </Link>
              {/* <Link href="/employer-home/notification">

                <Button variant="outline" className="relative">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                  {stats.newApplicants > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {stats.newApplicants}
                    </span>
                  )}
                </Button>
              </Link> */}

            </div>
          </div>

          {/* Job Analytics */}

          <div className="grid grid-cols-1 gap-6">
            {/* Recent Activity */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4 max-h-100 overflow-y-auto pr-2">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50">
                          <div
                            className={`p-2 rounded-full shrink-0 
                            ${
                              activity.type === "application"
                                ? "bg-blue-100"
                                : activity.type === "approval"
                                  ? "bg-green-100"
                                  : "bg-purple-100"
                            }`}
                          >
                            {/* Use the mapped icon based on activity type */}
                            {activityIcons[activity.type] || activityIcons.info}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{activity.message}</p>
                            {activity.metadata && activity.metadata.changes && Object.keys(activity.metadata.changes).length > 0 && (
                              <div className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded-sm">
                                <p className="font-medium">Changes:</p>
                                <div className="max-h-20 overflow-y-auto">
                                  {Object.entries(activity.metadata.changes)
                                    .slice(0, 3) // Limit to first 3 changes to save space
                                    .map(([key, value], index) => (
                                      <p key={key + index} className="ml-2">
                                        <span className="font-semibold">{key}:</span> {
                                          typeof value === 'object' && value !== null 
                                            ? JSON.stringify(value).substring(0, 40) + (JSON.stringify(value).length > 40 ? '...' : '')  // Truncate long values
                                            : String(value).substring(0, 40) + (String(value).length > 40 ? '...' : '')
                                        }
                                      </p>
                                  ))}
                                  {Object.keys(activity.metadata.changes).length > 3 && (
                                    <p className="ml-2 text-blue-500">+{Object.keys(activity.metadata.changes).length - 3} more changes</p>
                                  )}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No recent activities to display.
                    </div>
                  )}
                  {recentActivity.length > 0 && (
                    <div className="mt-4 text-center">
                      <Button variant="ghost" size="sm" onClick={() => router.push('/employer-home/activity')}>
                        View All Activity
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <AuthCheckModal
        isOpen={isAuthModalOpen}
        onClose={() => router.push("/")}
        title="Employer Account Required"
        message="You need to login or register as an employer to access this page."
      />
    </div>
  )
}
