"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BackButton } from "@/components/back-button"
import { EmployerRating } from "@/components/employer-rating"
import {
  Building2,
  MapPin,
  Calendar,
  Clock,
  PhilippinePeso,
  Briefcase,
  GraduationCap,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { format } from "date-fns"
import { JobReviews } from "@/components/job-reviews"

export default function jobdetails({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params)
  const jobId = unwrappedParams.id
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [job, setJob] = useState<any>(null)

  // Fetch job data from Firebase
  useEffect(() => {
    const fetchJobData = async () => {
      try {
        setIsLoading(true)
        
        // Get the job document
        const jobRef = doc(db, "jobs", jobId)
        const jobDoc = await getDoc(jobRef)
        
        if (!jobDoc.exists()) {
          setError("Job not found")
          setIsLoading(false)
          return
        }
        
        const jobData = jobDoc.data()
        
        // Get the employer data to fetch rating information
        let employerRating = 0;
        let employerReviewCount = 0;
        
        if (jobData.employerId) {
          try {
            const employerRef = doc(db, "users", jobData.employerId);
            const employerDoc = await getDoc(employerRef);
            
            if (employerDoc.exists()) {
              const employerData = employerDoc.data();
              employerRating = employerData.averageRating || 0;
              employerReviewCount = employerData.totalRatingCount || 0;
            }
          } catch (error) {
            console.error("Error fetching employer data:", error);
          }
        }
        
        // Format posted date
        let postedAt = "Recently"
        if (jobData.createdAt instanceof Timestamp) {
          const now = new Date()
          const createdDate = jobData.createdAt.toDate()
          const diffTime = Math.abs(now.getTime() - createdDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays === 0) {
            postedAt = "Today"
          } else if (diffDays === 1) {
            postedAt = "1 day ago"
          } else {
            postedAt = `${diffDays} days ago`
          }
        }
        
        // Format deadline if it exists
        let deadline = "No deadline specified"
        if (jobData.applicationDeadline) {
          try {
            const deadlineDate = new Date(jobData.applicationDeadline)
            deadline = format(deadlineDate, "MMMM dd, yyyy")
            
            // Calculate days remaining
            const now = new Date()
            const diffTime = Math.abs(deadlineDate.getTime() - now.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            if (diffDays > 0) {
              deadline += ` (${diffDays} days remaining)`
            } else {
              deadline += " (Expired)"
            }
          } catch (err) {
            console.error("Error parsing deadline date:", err)
          }
        }
        
        // Parse responsibilities, requirements, benefits from strings if needed
        const parseListFromString = (text: string | string[]) => {
          if (Array.isArray(text)) return text
          return text ? text.split('\n').filter(item => item.trim().length > 0) : []
        }
        
        setJob({
          id: jobDoc.id,
          title: jobData.title || "Untitled Job",
          company: jobData.companyName || "Unknown Company",
          companyId: jobData.employerId || "",
          location: jobData.location || "Remote",
          type: jobData.type || "Full-time",
          category: jobData.category || "Uncategorized",
          salary: jobData.salary || "Not specified",
          postedAt: postedAt,
          deadline: deadline,
          description: jobData.description || "No description provided",
          responsibilities: parseListFromString(jobData.responsibilities || ""),
          requirements: parseListFromString(jobData.requirements || ""),
          benefits: parseListFromString(jobData.benefits || ""),
          skills: jobData.skills || [],
          education: jobData.education || "Not specified",
          experience: jobData.experience || "Not specified",
          applicationCount: jobData.applicationsCount || 0,
          isActive: jobData.isActive !== false, // Default to true if not specified
          employerRating: employerRating,
          employerReviewCount: employerReviewCount,
        })
        
      } catch (err) {
        console.error("Error fetching job data:", err)
        setError("Failed to load job details. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    // Check user role
    const userData = localStorage.getItem("ranaojobs_user")
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setUserRole(user.activeRole || user.role)
        setUserId(user.id || user.uid || null)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    fetchJobData()
  }, [jobId])

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="container mx-auto max-w-4xl px-4 pt-20 pb-10">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="container mx-auto max-w-4xl px-4 pt-20 pb-10">
          <BackButton className="mb-4" />
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Job not found"}</AlertDescription>
          </Alert>
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
            <h3 className="mt-4 text-lg font-medium">The job you're looking for doesn't exist or has been removed.</h3>
            <Button className="mt-4" variant="outline" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const handleApply = () => {
    if (!userId) {
      // Redirect to login if not logged in
      router.push(`/login?redirect=/job/${jobId}/apply`)
    } else {
      // Redirect to application page
      router.push(`/job/${jobId}/apply`)
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="container mx-auto max-w-4xl px-4 pt-20 pb-10">
        <BackButton className="mb-4" />

        {/* Job Header */}
        <div className="bg-gray-900 text-white rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <div className="flex items-center mt-1">
                <Building2 className="h-4 w-4 mr-1" />
                <Link href={`/employer/${job.companyId}`} className="hover:text-yellow-400 transition-colors">
                  {job.company}
                </Link>
                <div className="flex items-center ml-2">
                  <EmployerRating
                    employerId={job.companyId}
                    employerName={job.company}
                    initialRating={job.employerRating}
                    showRatingButton={false}
                    size="sm"
                  />
                  {job.employerRating > 0 && <span className="text-xs text-gray-400 ml-1">({job.employerReviewCount})</span>}
                </div>
              </div>
            </div>
            <Badge className="bg-yellow-500 text-black">{job.type}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-gray-300" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-300" />
              <span>Posted {job.postedAt}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-300" />
              <span>Deadline: {job.deadline}</span>
            </div>
            <div className="flex items-center">
              <PhilippinePeso className="h-5 w-5 mr-2 text-green-400" />
              <span className="text-green-400 font-medium">{job.salary}</span>
            </div>
          </div>

         
        </div>

        {/* Job Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="description">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                    <TabsTrigger value="benefits">Benefits</TabsTrigger>
                  </TabsList>

                  <TabsContent value="description" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Job Description</h3>
                      <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
                    </div>

                    {job.responsibilities && job.responsibilities.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Responsibilities</h3>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                          {job.responsibilities.map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="requirements" className="space-y-4">
                    {job.requirements && job.requirements.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Requirements</h3>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                          {job.requirements.map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {job.skills && job.skills.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="bg-gray-100">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="benefits" className="space-y-4">
                    {job.benefits && job.benefits.length > 0 ? (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Benefits</h3>
                        <ul className="space-y-2 text-gray-700">
                          {job.benefits.map((benefit: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-gray-500">No benefits information provided.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">Job Overview</h3>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <Briefcase className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Job Type</p>
                      <p className="font-medium">{job.type}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <GraduationCap className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Education</p>
                      <p className="font-medium">{job.education}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Experience</p>
                      <p className="font-medium">{job.experience}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Users className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Applications</p>
                      <p className="font-medium">{job.applicationCount} candidates</p>
                    </div>
                  </div>
                </div>

               
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">About the Company</h3>
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center text-lg font-bold mr-3">
                    {job.company.charAt(0)}
                  </div>
                  <div>
                    <Link href={`/employer/${job.companyId}`} className="font-medium hover:text-yellow-500">
                      {job.company}
                    </Link>
                    <div className="flex items-center mt-1">
                      <EmployerRating
                        employerId={job.companyId}
                        employerName={job.company}
                        initialRating={job.employerRating}
                        showRatingButton={false}
                        size="sm"
                      />
                      {job.employerRating > 0 && <span className="text-xs text-gray-400 ml-1">({job.employerReviewCount})</span>}
                    </div>
                  </div>
                </div>
                <Link href={`/employer/${job.companyId}`}>
                  <Button variant="outline" className="w-full">
                    View Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Job Reviews Section */}
        <div className="mt-8">
          <JobReviews 
            jobId={job.id} 
            jobTitle={job.title}
            employerId={job.companyId}
            companyName={job.company}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
