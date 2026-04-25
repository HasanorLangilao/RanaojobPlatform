"use client"

import React, { useRef } from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Loader2, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { addEmployerActivity } from "@/lib/notifications"
import { incrementJobApplicationsCount } from "@/lib/jobs"
import { getDoc, doc, addDoc, collection, serverTimestamp,db } from "@/config/firebase"
import { getUserProfile } from "@/lib/users"
import { uploadJobseekerResume } from "@/lib/fileUpload"
import { useToast } from "@/components/ui/use-toast"

import { notifyNewApplication } from "@/lib/notifications"

export default function ApplyJobPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params)
  const jobId = unwrappedParams.id
  const router = useRouter()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    coverLetter: "",
    agreeToTerms: false,
  })
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [existingResumeUrl, setExistingResumeUrl] = useState<string | null>(null)
  const [existingResumeFileName, setExistingResumeFileName] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isResumeUploading, setIsResumeUploading] = useState(false)
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // State for real job data from Firestore
  const [job, setJob] = useState({
    id: jobId,
    title: "",
    company: "",
    location: "",
    description: "",
    employerId: "",
  })

  // Fetch real job data from Firestore
  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const jobDocRef = doc(db, "jobs", jobId);
        const jobSnapshot = await getDoc(jobDocRef);

        if (jobSnapshot.exists()) {
          const jobData = jobSnapshot.data();
          setJob({
            id: jobId,
            title: jobData.title || "",
            company: jobData.companyName || "",
            location: jobData.location || "",
            description: jobData.description || "",
            employerId: jobData.employerId || "",
          });
        } else {
          console.error("Job not found");
          setError("Job not found");
        }
      } catch (err) {
        console.error("Error fetching job data:", err);
        setError("Error loading job details");
      }
    };

    fetchJobData();
  }, [jobId]);

  // Check if user is logged in
  useEffect(() => {
    const checkUserAndFetchProfile = async () => {
      const userData = localStorage.getItem("ranaojobs_user")
      if (userData) {
        try {
          const user = JSON.parse(userData)
          console.log("User data found:", user) // Debug user data
          setIsLoggedIn(true)
          setUserRole(user.activeRole || user.role)

          // Ensure we have a userId - use uid OR id (depending on how firebase auth stores it)
          if (user.uid) {
            setUserId(user.uid)
          } else if (user.id) {
            setUserId(user.id)
          } else {
            console.error("No user ID found in user data")
            setUserId("temp-user-id") // Temporary fix to allow submissions
          }

          // Fetch user's resume if available
          if (user.id || user.uid) {
            const jobseekerId = user.id || user.uid
            const userProfile = await getUserProfile(jobseekerId)
            if (userProfile && userProfile.resume) {
              setExistingResumeUrl(userProfile.resume)
              setExistingResumeFileName(userProfile.resumeFileName || "Resume")
            }
          }

          // If user is an employer, redirect to job details
          if (user.role === "employer" || (user.role === "multi" && user.activeRole === "employer")) {
            router.push(`/job/${jobId}`)
          }
        } catch (error) {
          console.error("Error parsing user data:", error)
          setIsLoggedIn(false)
          setUserRole(null)
          setUserId(null)
          setIsAuthModalOpen(true)
        }
      } else {
        setIsLoggedIn(false)
        setUserRole(null)
        setUserId(null)
        setIsAuthModalOpen(true)
      }
    }

    checkUserAndFetchProfile()

    // Listen for login/logout events
    const handleUserStateChange = async () => {
      const userData = localStorage.getItem("ranaojobs_user")
      if (userData) {
        try {
          const user = JSON.parse(userData)
          console.log("User state changed:", user) // Debug user data
          setIsLoggedIn(true)
          setUserRole(user.activeRole || user.role)

          // Ensure we have a userId - use uid OR id (depending on how firebase auth stores it)
          if (user.uid) {
            setUserId(user.uid)
          } else if (user.id) {
            setUserId(user.id)
          } else {
            console.error("No user ID found in user data")
            setUserId("temp-user-id") // Temporary fix to allow submissions
          }

          // Fetch user's resume if available on state change
          if (user.id || user.uid) {
            const jobseekerId = user.id || user.uid
            const userProfile = await getUserProfile(jobseekerId)
            if (userProfile && userProfile.resume) {
              setExistingResumeUrl(userProfile.resume)
              setExistingResumeFileName(userProfile.resumeFileName || "Resume")
            }
          }

          setIsAuthModalOpen(false)

          // If user is an employer, redirect to job details
          if (user.role === "employer" || (user.role === "multi" && user.activeRole === "employer")) {
            router.push(`/job/${jobId}`)
          }
        } catch (error) {
          console.error("Error parsing user data:", error)
          setIsLoggedIn(false)
          setUserRole(null)
          setUserId(null)
          setIsAuthModalOpen(true)
        }
      } else {
        setIsLoggedIn(false)
        setUserRole(null)
        setUserId(null)
        setIsAuthModalOpen(true)
      }
    }

    window.addEventListener("userStateChange", handleUserStateChange)
    return () => {
      window.removeEventListener("userStateChange", handleUserStateChange)
    }
  }, [jobId, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")

    if (!formData.agreeToTerms) {
      setError("You must agree to the terms and conditions")
      return
    }

    // Use a fallback ID if needed - this ensures the form works even with login issues
    let applicantUserId: string = userId || "temp-user-id"

    // Make absolutely sure we have a string user ID
    if (!applicantUserId || typeof applicantUserId !== "string") {
      console.warn("User ID not found or invalid, using fallback ID")
      const tempData = localStorage.getItem("ranaojobs_user")
      if (tempData) {
        try {
          const tempUser = JSON.parse(tempData)
          applicantUserId = (tempUser.uid || tempUser.id || "temp-user-id") as string
        } catch (e) {
          applicantUserId = "temp-user-id"
        }
      } else {
        applicantUserId = "temp-user-id"
      }
    }

    setIsSubmitting(true)

    try {
      // Use the job data we already fetched - no need to query again
      const employerId = job.employerId

      if (!employerId) {
        throw new Error("Invalid employer information for this job")
      }

      // Get applicant profile data from Firestore if available
      let applicantName = "";
      let applicantEmail = "";

      try {
        const userProfileDoc = await getDoc(doc(db, "users", applicantUserId));
        if (userProfileDoc.exists()) {
          const userData = userProfileDoc.data();
          applicantName = userData.name || userData.displayName || "";
          applicantEmail = userData.email || "";
        }
      } catch (profileErr) {
        console.warn("Could not retrieve applicant profile", profileErr);
        // Continue with application - this is not critical
      }

      // Save application to Firestore
      const applicationData = {
        // Job information
        jobId,
        jobTitle: job.title,
        jobCompany: job.company,
        jobLocation: job.location,
        employerId,

        // Applicant information
        jobseekerId: applicantUserId,
        applicantName,
        applicantEmail,
        resumeUrl: existingResumeUrl,
        resumeFileName: existingResumeFileName,

        // Application details
        coverLetter: formData.coverLetter,

        // Status and timestamps
        status: "pending", // pending, reviewed, shortlisted, rejected
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        appliedAt: serverTimestamp()
      }

      // If a new resume file is selected, upload it
      if (resumeFile && userId) {
        const uploadedResumePath = await uploadJobseekerResume(resumeFile, userId)
        applicationData.resumeUrl = uploadedResumePath
        applicationData.resumeFileName = resumeFile.name
      } else if (!existingResumeUrl) {
        setError("Please upload a resume or ensure an existing one is available.")
        setIsSubmitting(false)
        return // Stop submission if no resume is available
      }

      // Create applications collection if it doesn't exist
      const applicationRef = await addDoc(collection(db, "applications"), applicationData)

      // Notify the employer about the new application
      await notifyNewApplication(
        employerId,
        jobId,
        job.title,
        applicantUserId,
        applicantName || "A candidate",
        applicationRef.id
      )

      // Add this job to the user's applied jobs collection for tracking
      const userDocRef = doc(db, "users", applicantUserId);
      await addDoc(collection(userDocRef, "appliedJobs"), {
        jobId,
        applicationId: applicationRef.id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        appliedAt: serverTimestamp(),
        status: "pending"
      })

      // Add reference to job's applications subcollection for employer convenience
      const jobDocRefForApplications = doc(db, "jobs", jobId);
      await addDoc(collection(jobDocRefForApplications, "applications"), {
        applicationId: applicationRef.id,
        jobseekerId: applicantUserId,
        appliedAt: serverTimestamp(),
        status: "pending"
      })

      // Update the job's application count
      await incrementJobApplicationsCount(jobId)

      setSuccessMessage("Your application has been submitted successfully!")

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/jobseeker/applications")
      }, 2000)

    } catch (err) {
      console.error("Application submission error:", err)
      setError("An error occurred while submitting your application. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userId) return

    try {
      setIsResumeUploading(true)
      const file = e.target.files[0]

      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, DOC, or DOCX file",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Resume must be under 5MB",
          variant: "destructive",
        })
        return
      }
      setResumeFile(file)
      setExistingResumeFileName(file.name)
      setExistingResumeUrl(null) // Clear existing URL if a new file is selected

      toast({
        title: "Resume selected",
        description: "Resume is ready for upload when you submit your application.",
      })
    } catch (error) {
      console.error("Error processing resume:", error)
      toast({
        title: "Error",
        description: "Failed to process resume file",
        variant: "destructive",
      })
    } finally {
      setIsResumeUploading(false)
    }
  }

  // If not logged in, show only the auth modal
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <div className="grow flex items-center justify-center">
          <p>Please log in to continue...</p>
        </div>
        <Footer />
        <AuthCheckModal
          isOpen={isAuthModalOpen}
          onClose={() => router.push(`/job/${jobId}`)}
          title="Login Required"
          message="You need to login or register as a jobseeker to apply for this job."
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="grow flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Apply for {job.title}</CardTitle>
            <CardDescription className="text-gray-500">
              Fill out the form below to submit your application for the {job.title} position at {job.company}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {successMessage && (
                <Alert className="bg-green-100 border-green-500 text-green-800">
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                <Textarea
                  id="coverLetter"
                  name="coverLetter"
                  value={formData.coverLetter}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Tell us why you're a great fit for this role..."
                />
              </div>

              <div className="space-y-4">
                <Label>Resume</Label>
                <div className="border rounded-lg p-4 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium mb-2">Upload or use existing resume</h3>
                  {existingResumeUrl ? (
                    <div className="mt-4 text-left bg-gray-50 p-3 rounded-md relative">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-blue-500" />
                        <div>
                          <p className="font-medium">{existingResumeFileName}</p>
                          <p className="text-xs text-gray-500">Using existing resume</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => window.open(existingResumeUrl, '_blank')}
                        disabled={!existingResumeUrl || (!existingResumeUrl.startsWith('http') && !existingResumeUrl.startsWith('/uploads/'))}
                      >
                        View Existing Resume
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">No resume found. Please upload one.</p>
                  )}

                  <input
                    type="file"
                    ref={resumeInputRef}
                    onChange={handleResumeUpload}
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    id="resume-upload"
                  />
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600 text-black mt-2"
                    onClick={() => resumeInputRef.current?.click()}
                    disabled={isResumeUploading}
                  >
                    {isResumeUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        {existingResumeUrl ? "Upload New Resume" : "Upload Resume"}
                      </>
                    )}
                  </Button>
                  {resumeFile && ( // Display selected file name if a new one is selected
                    <p className="text-sm text-gray-600 mt-2">Selected: {resumeFile.name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: !!checked })}
                />
                <Label htmlFor="agreeToTerms">
                  I agree to the <a href="/terms" className="text-blue-500 hover:underline">terms and conditions</a>
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || (!existingResumeUrl && !resumeFile)}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-sm text-gray-500">
            By submitting this application, you agree to share your information with {job.company}.
          </CardFooter>
        </Card>
      </main>
      <Footer />
      <AuthCheckModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  )
}
