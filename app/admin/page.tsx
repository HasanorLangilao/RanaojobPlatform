"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { AdminStatCard } from "@/components/admin-stat-card"
import { Users, Briefcase, Building2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAdminToast } from "@/components/admin-toast"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy as firestoreOrderBy, 
  limit as firestoreLimit, 
  Timestamp as FirestoreTimestamp 
} from "firebase/firestore"

// Types for our data
interface EmployerData {
  id: string;
  name: string;
  date: string | Timestamp;
  status: string;
}

interface JobData {
  id: string;
  title: string;
  company: string;
  date: string | Timestamp;
  status: string;
}

// Helper function to format dates
const formatDate = (timestamp: string | Date | FirestoreTimestamp | null | undefined): string => {
  if (!timestamp) return "N/A"
  
  const date = timestamp instanceof FirestoreTimestamp 
    ? timestamp.toDate() 
    : new Date(timestamp)
    
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { success } = useAdminToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const toastShownRef = useRef(false)
  
  // State for dashboard statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalEmployers: 0,
    pendingVerifications: 0
  })
  
  // State for recent data
  const [recentEmployers, setRecentEmployers] = useState<EmployerData[]>([])
  const [recentJobs, setRecentJobs] = useState<JobData[]>([])
  const [recentJobseekers, setRecentJobseekers] = useState<EmployerData[]>([])

  // Check admin status and load dashboard data
  useEffect(() => {
    const checkAdminStatus = async () => {
      const userData = localStorage.getItem("ranaojobs_user")
      if (userData) {
        const user = JSON.parse(userData)
        if (user.role === "admin") {
          setIsAdmin(true)
          
          // Only show welcome toast once
          if (!toastShownRef.current) {
            success(`Welcome back, ${user.firstName || "Admin"}!`)
            toastShownRef.current = true
          }
          
          // Fetch dashboard data
          await loadDashboardData()
        } else {
          router.push("/")
        }
      } else {
        router.push("/admin/login")
      }
    }

    checkAdminStatus()
    window.addEventListener("userStateChange", checkAdminStatus)

    return () => {
      window.removeEventListener("userStateChange", checkAdminStatus)
    }
  }, [router, toast, success])

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch total users count
      const usersSnapshot = await getDocs(collection(db, "users"))
      const totalUsers = usersSnapshot.size
      
      // Fetch employers count (users with employer or multi role where isVerified=true)
      const verifiedEmployersQuery = query(
        collection(db, "users"), 
        where("isVerified", "==", true),
        where("role", "in", ["employer", "multi"])
      )
      const verifiedEmployersSnapshot = await getDocs(verifiedEmployersQuery)
      const totalEmployers = verifiedEmployersSnapshot.size
      
      // Fetch pending verifications count
      const pendingVerificationsQuery = query(
        collection(db, "users"),
        where("isVerified", "==", false),
        where("role", "in", ["employer", "multi"])
      )
      const pendingVerificationsSnapshot = await getDocs(pendingVerificationsQuery)
      const pendingVerifications = pendingVerificationsSnapshot.docs.filter(
        doc => !doc.data().verificationRejected
      ).length
      
      // Fetch active jobs count
      const jobsQuery = query(collection(db, "jobs"), where("isActive", "==", true))
      const jobsSnapshot = await getDocs(jobsQuery)
      const totalJobs = jobsSnapshot.size
      
      // Update stats
      setStats({
        totalUsers,
        totalJobs,
        totalEmployers,
        pendingVerifications
      })
      
      // Fetch recent employers awaiting verification
      const recentEmployersQuery = query(
        collection(db, "users"),
        where("role", "in", ["employer", "multi"]),
        firestoreOrderBy("createdAt", "desc"),
        firestoreLimit(3)
      )
      const recentEmployersSnapshot = await getDocs(recentEmployersQuery)
      const recentEmployersData = recentEmployersSnapshot.docs.map(doc => {
        const data = doc.data();
        let status = "pending";
        if (data.isVerified) status = "approved";
        else if (data.verificationRejected) status = "rejected";
        else if (data.isDisabled) status = "suspended";
        return {
          id: doc.id,
          name: data.companyName || "Unnamed Company",
          date: data.createdAt,
          status
        };
      });
      setRecentEmployers(recentEmployersData)
      
      // Fetch recent job listings
      const recentJobsQuery = query(
        collection(db, "jobs"),
        firestoreOrderBy("createdAt", "desc"),
        firestoreLimit(3)
      )
      const recentJobsSnapshot = await getDocs(recentJobsQuery)
      const recentJobsData = recentJobsSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || "Untitled Job",
        company: doc.data().companyName || "Unknown Company",
        date: doc.data().createdAt,
        status: doc.data().isActive ? "Hiring" : "Closed"
      }))
      setRecentJobs(recentJobsData)
      
      // Fetch recent jobseeker registrations
      const recentJobseekersQuery = query(
        collection(db, "users"),
        where("role", "==", "jobseeker"),
        firestoreOrderBy("createdAt", "desc"),
        firestoreLimit(5)
      )
      const recentJobseekersSnapshot = await getDocs(recentJobseekersQuery)
      const recentJobseekersData = recentJobseekersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unnamed User',
          date: data.createdAt,
          status: data.isVerified ? "verified" : "unverified"
        };
      });
      setRecentJobseekers(recentJobseekersData)
      
      setIsLoading(false)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Welcome to Admin Dashboard</h1>
        <p className="text-gray-500">
          Manage users, job listings, and employer verifications from this central dashboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AdminStatCard
            title="Total Users"
            value={stats.totalUsers.toString()}
            description="Registered users"
            icon={<Users className="h-8 w-8 text-blue-500" />}
            href="/admin/users"
          />
          <AdminStatCard
            title="Job Listings"
            value={stats.totalJobs.toString()}
            description="Active job posts"
            icon={<Briefcase className="h-8 w-8 text-green-500" />}
            href="/admin/jobs"
          />
          <AdminStatCard
            title="Employers"
            value={stats.totalEmployers.toString()}
            description="Verified companies"
            icon={<Building2 className="h-8 w-8 text-purple-500" />}
            href="/admin/employers"
          />
          <AdminStatCard
            title="Pending Verifications"
            value={stats.pendingVerifications.toString()}
            description="Awaiting review"
            icon={<AlertTriangle className="h-8 w-8 text-yellow-500" />}
            href="/admin/verifications"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Employer Registrations</CardTitle>
              <CardDescription>New employers awaiting verification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEmployers.length > 0 ? (
                  recentEmployers.map((employer) => (
                    <div key={employer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">{employer.name}</p>
                        <p className="text-sm text-gray-500">Registered: {formatDate(employer.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          {employer.status}
                        </span>
                        <Link href={`/admin/verifications/${employer.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">No pending employer verifications</p>
                )}
              </div>
              <div className="mt-4 text-right">
                <Link href="/admin/verifications">
                  <Button variant="link" className="text-yellow-500 hover:text-yellow-600">
                    View all verifications
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Job Listings</CardTitle>
              <CardDescription>Latest jobs posted on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentJobs.length > 0 ? (
                  recentJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-gray-500">
                          {job.company} • Posted: {formatDate(job.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs ${
                          job.status === "Hiring" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        } rounded-full`}>
                          {job.status}
                        </span>
                        <Link href={`/admin/jobs/${job.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">No job listings available</p>
                )}
              </div>
              <div className="mt-4 text-right">
                <Link href="/admin/jobs">
                  <Button variant="link" className="text-yellow-500 hover:text-yellow-600">
                    View all job listings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Jobseeker Registrations</CardTitle>
              <CardDescription>New jobseekers who have signed up</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentJobseekers.length > 0 ? (
                  recentJobseekers.map((jobseeker) => (
                    <div key={jobseeker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <h3 className="font-medium">{jobseeker.name}</h3>
                        <p className="text-sm text-gray-500">Registered: {formatDate(jobseeker.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          jobseeker.status === "verified"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {jobseeker.status === "verified" ? "Verified" : "Unverified"}
                        </span>
                        <Link href={`/admin/users/${jobseeker.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-gray-500">No recent jobseeker registrations</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
