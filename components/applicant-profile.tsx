"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Briefcase,
  Calendar as CalendarIcon,
  Download,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ThumbsDown,
  ThumbsUp,
  User,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react"
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, addDoc, Timestamp,db } from "@/config/firebase"
import { format, parseISO, formatDistanceToNow, isValid, isPast } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { addEmployerActivity, notifyJobseekerEmailSent } from "@/lib/notifications"
import { decrementJobApplicationsCount } from "@/lib/jobs"
import { notifyJobseekerShortlisted, notifyJobseekerRejected, notifyJobseekerInterview, notifyJobseekerHired } from "@/lib/application-notifications"

// Utility function to log application data
const logApplicationData = (data: any, id: string) => {
  console.group(`Application Data (ID: ${id})`)
  console.log('Raw data:', data)
  console.log('Job ID:', data.jobId)
  console.log('Job Title:', data.jobTitle)
  console.log('Applicant ID:', data.jobseekerId || data.userId)
  console.log('Status:', data.status)
  console.log('Applied At:', data.appliedAt)
  console.log('Phone Number:', data.phoneNumber)
  console.log('Email:', data.email)
  console.log('Applicant Name:', data.applicantName)
  console.groupEnd()
}

// Helper function to fetch user data
const fetchUserDetails = async (userId: string) => {
  try {
    console.log(`Fetching user details for ID: ${userId} from "users" collection`);
    const userDoc = await getDoc(doc(db, "users", userId))

    if (userDoc.exists()) {
      console.log("User data found in 'users' collection");
      return userDoc.data();
    } else {
      console.warn(`User with ID ${userId} not found in 'users' collection`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching user data for ${userId}:`, error);
    return null;
  }
}

// Helper function to safely dispatch events in browser environment
const safeDispatchEvent = (eventName: string) => {
  if (typeof window !== 'undefined') {
    console.log(`Dispatching ${eventName} event`);
    window.dispatchEvent(new Event(eventName));
  }
};

// Helper function to safely get user data from localStorage
const getUserFromLocalStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedUser = window.localStorage.getItem("ranaojobs_user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
  }
  return null;
};

interface ApplicantProfileProps {
  applicantId: string
}

export function ApplicantProfile({ applicantId }: ApplicantProfileProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [applicant, setApplicant] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showContactDialog, setShowContactDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showInterviewDialog, setShowInterviewDialog] = useState(false)
  const [interviewDate, setInterviewDate] = useState<Date>()
  const [isInterviewExpired, setIsInterviewExpired] = useState(false)

  useEffect(() => {
    // Get user data from localStorage for current user (employer)
    const user = getUserFromLocalStorage();
    if (!user) {
      setError("Authentication required")
      setIsLoading(false)
      return
    }

    const fetchApplicantData = async () => {
      try {
        // Fetch application data by ID
        console.log(`Fetching application with ID: ${applicantId} from 'applications' collection`)
        const applicationRef = doc(db, "applications", applicantId)
        const applicationSnapshot = await getDoc(applicationRef)

        if (!applicationSnapshot.exists()) {
          console.error(`Application with ID ${applicantId} not found in Firestore "applications" collection`)
          setError(`Application with ID ${applicantId} not found`)
          setIsLoading(false)
          return
        }

        const applicationData = applicationSnapshot.data()
        console.log("Application data retrieved:", applicationData)

        // Log detailed application data
        logApplicationData(applicationData, applicantId)

        // Security check: verify this application belongs to the current employer
        if (applicationData.employerId !== user.id) {
          setError("You don't have permission to view this application")
          setIsLoading(false)
          return
        }

        // Get job details
        let jobTitle = "Unknown Job"
        let jobData = null
        if (applicationData.jobId) {
          const jobDoc = await getDoc(doc(db, "jobs", applicationData.jobId))
          if (jobDoc.exists()) {
            jobData = jobDoc.data()
            jobTitle = jobData.title || "Unknown Job"
          }
        }

        // Get applicant user details
        let userData = {
          name: applicationData.applicantName || "Unknown Applicant",
          email: applicationData.email || "No email provided",
          phone: applicationData.phoneNumber || applicationData.phone || "No phone provided",
          location: applicationData.location || "Unknown Location",
          profilePhoto: null,
          experience: [],
          education: [],
          skills: [],
          languages: [],
          resumeUrl: applicationData.resumeUrl || null,
          portfolioUrl: null,
          linkedinUrl: null,
          githubUrl: null
        }

        // Get applicant profile from users collection
        const userId = applicationData.userId || applicationData.jobseekerId;

        if (userId) {
          // Fetch user details from users collection
          const userProfile = await fetchUserDetails(userId);

          if (userProfile) {
            // Use user profile data as the primary source of information
            userData = {
              name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.name || applicationData.applicantName || "Unknown Applicant",
              email: userProfile.email || applicationData.email || "No email provided",
              phone: userProfile.phone || applicationData.phoneNumber || "No phone provided",
              location: userProfile.location || applicationData.location || "Unknown Location",
              profilePhoto: userProfile.profilePhoto || userProfile.avatar || null,
              experience: userProfile.experience || [],
              education: userProfile.education || [],
              skills: userProfile.skills || applicationData.skills || [],
              languages: userProfile.languages || [],
              resumeUrl: applicationData.resumeUrl || userProfile.resume || null,
              portfolioUrl: userProfile.portfolioUrl || userProfile.website || null,
              linkedinUrl: userProfile.linkedinUrl || userProfile.linkedin || null,
              githubUrl: userProfile.githubUrl || userProfile.github || null
            }
            console.log("Combined user data:", userData);
          }
        } else {
          console.warn("No userId found in application data, using application data only");
        }

        // Format the date
        let formattedDate = "Unknown date"
        let appliedDate = null
        if (applicationData.createdAt) {
          if (applicationData.createdAt instanceof Timestamp) {
            appliedDate = applicationData.createdAt.toDate()
            formattedDate = format(appliedDate, 'MMMM d, yyyy')
          } else if (typeof applicationData.createdAt === 'string' && isValid(parseISO(applicationData.createdAt))) {
            appliedDate = parseISO(applicationData.createdAt)
            formattedDate = format(appliedDate, 'MMMM d, yyyy')
          }
        }

        // Combine all data
        const applicantData = {
          id: applicationSnapshot.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          location: userData.location,
          profilePhoto: userData.profilePhoto,
          jobTitle: jobTitle,
          jobId: applicationData.jobId,
          employerId: applicationData.employerId,
          userId: applicationData.userId,
          appliedDate: formattedDate,
          appliedDateRaw: appliedDate,
          status: applicationData.status || "new",
          resume: userData.resumeUrl,
          coverLetter: applicationData.coverLetter || "No cover letter provided",
          experience: userData.experience,
          education: userData.education,
          skills: userData.skills,
          languages: userData.languages,
          portfolioUrl: userData.portfolioUrl,
          linkedinUrl: userData.linkedinUrl,
          githubUrl: userData.githubUrl,
          notes: applicationData.notes || "",
          rejectionReason: applicationData.rejectionReason || "",
          interviewDate: applicationData.interviewDate || null
        }

        // Check if interview date is in the past
        if (applicantData.interviewDate && applicantData.status === "interviewed") {
          try {
            const interviewDateObj = parseISO(applicantData.interviewDate);
            if (isValid(interviewDateObj) && isPast(interviewDateObj)) {
              setIsInterviewExpired(true);
            }
          } catch (error) {
            console.error("Error parsing interview date:", error);
          }
        }

        setApplicant(applicantData)
      } catch (error) {
        console.error("Error fetching applicant data:", error)
        setError("Failed to load applicant data. Please try again later.")
        toast({
          title: "Error",
          description: "Failed to load applicant data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchApplicantData()
  }, [applicantId, toast])

  const handleShortlistApplicant = async () => {
    if (!applicant) return

    try {
      console.log(`Updating application ${applicant.id} status to "shortlisted"`)

      // Update application status in Firestore
      const applicationRef = doc(db, "applications", applicant.id)
      await updateDoc(applicationRef, {
        status: "shortlisted",
        updatedAt: serverTimestamp()
      })

      console.log(`Application ${applicant.id} successfully shortlisted`)

      // Update local state
      setApplicant({
        ...applicant,
        status: "shortlisted"
      })

      // Send notification to the jobseeker
      if (applicant.userId) {
        // Get company name from localStorage
        const user = getUserFromLocalStorage() || {};
        const companyName = user.companyName || "An employer"

        await notifyJobseekerShortlisted(
          applicant.userId,
          applicant.id,
          applicant.jobTitle,
          companyName,
          applicant.jobId
        )
        console.log(`Notification sent to jobseeker ${applicant.userId} about application shortlisting`)
      }

      toast({
        title: "Application shortlisted",
        description: "The applicant has been shortlisted successfully",
      })
    } catch (error) {
      console.error("Error shortlisting applicant:", error)
      toast({
        title: "Error",
        description: "Failed to shortlist the applicant",
        variant: "destructive",
      })
    }
  }

  const handleRejectApplicant = () => {
    setShowRejectDialog(true)
  }

  const confirmRejectApplicant = async () => {
    if (!applicant) return

    try {
      console.log(`Updating application ${applicant.id} status to "rejected"`)

      // Update application status in Firestore
      const applicationRef = doc(db, "applications", applicant.id)
      await updateDoc(applicationRef, {
        status: "rejected",
        rejectionReason: rejectionReason,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log(`Application ${applicant.id} successfully rejected`)

      // Update local state
      setApplicant({
        ...applicant,
        status: "rejected",
        rejectionReason
      })

      // Decrement the application count for the job
      if (applicant.jobId) {
        await decrementJobApplicationsCount(applicant.jobId)
      }

      // Send notification to the jobseeker
      if (applicant.userId) {
        // Get company name from localStorage
        const user = getUserFromLocalStorage() || {};
        const companyName = user.companyName || "An employer"

        await notifyJobseekerRejected(
          applicant.userId,
          applicant.id,
          applicant.jobTitle,
          companyName,
          applicant.jobId,
          rejectionReason
        )
        console.log(`Notification sent to jobseeker ${applicant.userId} about application rejection`)
      }

      // Close dialog
      setShowRejectDialog(false)
      setRejectionReason("")

      toast({
        title: "Application rejected",
        description: "The application has been marked as rejected",
      })
    } catch (error) {
      console.error("Error rejecting application:", error)
      toast({
        title: "Error",
        description: "Failed to reject the application",
        variant: "destructive",
      })
    }
  }

  const saveApplicantNotes = async (notes: string) => {
    if (!applicant) return

    try {
      // Update notes in Firestore
      const applicationRef = doc(db, "applications", applicant.id)
      await updateDoc(applicationRef, {
        notes: notes,
        updatedAt: serverTimestamp()
      })

      // Update local state
      setApplicant({
        ...applicant,
        notes: notes
      })

      toast({
        title: "Notes saved",
        description: "Your notes have been saved successfully",
      })
    } catch (error) {
      console.error("Error saving notes:", error)
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800">New</Badge>
      case "reviewed":
        return <Badge className="bg-yellow-100 text-yellow-800">Reviewed</Badge>
      case "shortlisted":
        return <Badge className="bg-green-100 text-green-800">Shortlisted</Badge>
      case "to be interviewed":
        return <Badge className="bg-purple-100 text-purple-800">To be Interviewed</Badge>
      case "interviewed":
        return isInterviewExpired
          ? <Badge className="bg-orange-100 text-orange-800">Interview Expired</Badge>
          : <Badge className="bg-purple-100 text-purple-800">To be Interviewed</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case "hired":
        return <Badge className="bg-green-100 text-green-800">Hired</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const scheduleInterview = async () => {
    if (!interviewDate) {
      toast({
        title: "No date selected",
        description: "Please select a date for the interview.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)

      // Format the interview date
      const formattedInterviewDate = format(interviewDate, "MMMM dd, yyyy")

      console.log(`Scheduling interview for applicant ${applicantId} on ${formattedInterviewDate}`)

      // Update application with interview date
      const applicationRef = doc(db, "applications", applicantId)
      await updateDoc(applicationRef, {
        status: "to be interviewed",
        interviewDate: formattedInterviewDate,
        interviewScheduledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log(`Updated application ${applicantId} status to "to be interviewed"`)

      // Update our local state
      setApplicant({
        ...applicant,
        status: "to be interviewed",
        interviewDate: formattedInterviewDate
      })

      // Send notification to the jobseeker
      if (applicant.userId) {
        // Get company name from localStorage
        const user = getUserFromLocalStorage() || {};
        const companyName = user.companyName || "An employer"

        console.log(`Sending interview notification to jobseeker ${applicant.userId}`)

        try {
          const notificationSent = await notifyJobseekerInterview(
            applicant.userId,
            applicant.id,
            applicant.jobTitle,
            companyName,
            applicant.jobId,
            formattedInterviewDate
          );

          if (notificationSent) {
            console.log(`Successfully sent interview notification to jobseeker ${applicant.userId}`);
            // Dispatch notification update event
            safeDispatchEvent("userStateChange");
          } else {
            console.error(`Failed to send interview notification to jobseeker ${applicant.userId}`);
          }
        } catch (error) {
          console.error("Error sending interview notification:", error);
        }
      }

      // Close dialog
      setShowInterviewDialog(false)

      toast({
        title: "Interview scheduled",
        description: `Interview scheduled with ${applicant.name} for ${formattedInterviewDate}.`,
        variant: "default"
      })
    } catch (error) {
      console.error("Error scheduling interview:", error)
      toast({
        title: "Failed to schedule interview",
        description: "An error occurred while scheduling the interview. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleHireApplicant = async () => {
    if (!applicant) return

    try {
      setIsLoading(true)
      console.log(`Updating application ${applicant.id} status to "hired"`)

      // Update application status in Firestore
      const applicationRef = doc(db, "applications", applicant.id)
      await updateDoc(applicationRef, {
        status: "hired",
        hiredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log(`Application ${applicant.id} successfully marked as hired`)

      // Update local state
      setApplicant({
        ...applicant,
        status: "hired"
      })

      // Send notification to the jobseeker
      if (applicant.userId) {
        // Get company name from localStorage
        const user = getUserFromLocalStorage() || {};
        const companyName = user.companyName || "An employer"

        console.log(`Sending hired notification to jobseeker ${applicant.userId}`)
        console.log("Applicant data for notification:", {
          userId: applicant.userId,
          applicationId: applicant.id,
          jobTitle: applicant.jobTitle,
          companyName,
          jobId: applicant.jobId
        });

        try {
          await notifyJobseekerHired(
            applicant.userId,
            applicant.id,
            applicant.jobTitle,
            companyName,
            applicant.jobId
          );
          console.log(`Successfully sent hired notification to jobseeker ${applicant.userId}`);
          // Dispatch notification update event
          safeDispatchEvent("userStateChange");
        } catch (error) {
          console.error("Error sending hired notification:", error);
        }
      }

      toast({
        title: "Applicant hired",
        description: "The applicant has been marked as hired",
      })
    } catch (error) {
      console.error("Error hiring applicant:", error)
      toast({
        title: "Error",
        description: "Failed to hire the applicant",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium">Unable to load applicant</h3>
        <p className="mt-2 text-gray-500">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/employer/applicants")}>
          Back to Applicants
        </Button>
      </div>
    )
  }

  if (!applicant) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium">Applicant not found</h3>
        <p className="mt-2 text-gray-500">The applicant you're looking for doesn't exist or has been removed.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/employer/applicants")}>
          Back to Applicants
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{applicant.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500">Applied for {applicant.jobTitle}</p>
            {getStatusBadge(applicant.status)}
          </div>
          {applicant.interviewDate && applicant.status === "interviewed" && (
            <div className="flex items-center text-sm mt-1">
              <CalendarIcon className="h-4 w-4 mr-1 text-purple-600" />
              <span>Interview scheduled for {applicant.interviewDate}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button
            onClick={async () => {
              if (applicant?.email) {
                // Get employer email from localStorage
                const user = getUserFromLocalStorage() || {};
                const employerEmail = user.email;
                const companyName = user.companyName || "An employer";

                if (typeof window !== 'undefined') {
                  const subject = `Regarding your application for ${applicant.jobTitle}`;
                  const body = `Dear ${applicant.name},\n\nThank you for your application for the ${applicant.jobTitle} position.\n\nBest regards,\n${companyName}`;

                  // Show instructions to the employer for using their specific email
                  toast({
                    title: "Important Email Instructions",
                    description: `Please ensure you're logged in as ${employerEmail} in Gmail before proceeding.`,
                    duration: 6000,
                  });

                  // Short delay to let them read the instructions
                  setTimeout(() => {
                    // Direct to Gmail with clear parameters
                    const gmailUrl = `https://mail.google.com/mail/u/${encodeURIComponent(employerEmail)}/?view=cm&fs=1&to=${encodeURIComponent(applicant.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.open(gmailUrl, "_blank");
                  }, 1500);
                }

                // Send notification to jobseeker
                try {
                  if (applicant.userId) {
                    const notificationSent = await notifyJobseekerEmailSent(
                      applicant.userId,
                      applicant.id,
                      applicant.jobTitle,
                      companyName,
                      applicant.jobId,
                      `Regarding your application for ${applicant.jobTitle}`
                    );

                    if (notificationSent) {
                      toast({
                        title: "Notification sent",
                        description: "The jobseeker has been notified about your email.",
                        variant: "default"
                      });
                    } else {
                      console.warn("Failed to send email notification to jobseeker");
                    }
                  }
                } catch (error) {
                  console.error("Error sending notification:", error);
                }
              }
            }}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact via Email
          </Button>
          {applicant.status !== "shortlisted" && applicant.status !== "rejected" && applicant.status !== "interviewed" && applicant.status !== "to be interviewed" && applicant.status !== "hired" ? (
            <>
              <Button variant="outline" className="text-green-600" onClick={handleShortlistApplicant}>
                <ThumbsUp className="mr-2 h-4 w-4" />
                Shortlist
              </Button>
              <Button variant="outline" className="text-red-600" onClick={handleRejectApplicant}>
                <ThumbsDown className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          ) : applicant.status === "shortlisted" ? (
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setShowInterviewDialog(true)}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Schedule Interview
            </Button>
          ) : applicant.status === "to be interviewed" ? (
            <>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleHireApplicant}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Hire
              </Button>
              <Button
                variant="outline"
                className="text-red-600"
                onClick={handleRejectApplicant}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Applicant Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Applicant Information</CardTitle>
            <CardDescription>Contact details and basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {applicant.profilePhoto ? (
                  <img
                    src={applicant.profilePhoto}
                    alt={`${applicant.name}'s profile photo`}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <User className="h-12 w-12 text-gray-500" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{applicant.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p>{applicant.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p>{applicant.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Applied On</p>
                  <p>{applicant.appliedDate}</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm font-medium mb-2">Resume</p>
              <Button
                variant="outline"
                className="w-full"
                disabled={!applicant.resume}
                onClick={() => {
                  if (applicant.resume) {
                    window.open(applicant.resume, '_blank');
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                {applicant.resume ? "Download Resume" : "No Resume Available (Resume Uploads Disabled)"}
              </Button>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {applicant.skills && Array.isArray(applicant.skills) && applicant.skills.length > 0 ? (
                  applicant.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary" className="bg-gray-100">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No skills specified</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Languages</p>
              <div className="flex flex-wrap gap-2">
                {applicant.languages && Array.isArray(applicant.languages) && applicant.languages.length > 0 ? (
                  applicant.languages.map((language: string, index: number) => (
                    <Badge key={index} variant="secondary" className="bg-gray-100">
                      {language}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No languages specified</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Links</p>
              <div className="space-y-2">
                {applicant.portfolioUrl && (
                  <Button variant="link" className="p-0 h-auto text-blue-600" asChild>
                    <a href={applicant.portfolioUrl} target="_blank" rel="noopener noreferrer">
                      Portfolio
                    </a>
                  </Button>
                )}
                {applicant.linkedinUrl && (
                  <Button variant="link" className="p-0 h-auto text-blue-600" asChild>
                    <a href={applicant.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                  </Button>
                )}
                {applicant.githubUrl && (
                  <Button variant="link" className="p-0 h-auto text-blue-600" asChild>
                    <a href={applicant.githubUrl} target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applicant Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
            <CardDescription>Resume, cover letter, and other details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cover-letter">
              <TabsList className="mb-4">
                <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="cover-letter" className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="whitespace-pre-line">{applicant.coverLetter}</p>
                </div>
              </TabsContent>

              <TabsContent value="experience" className="space-y-4">
                {applicant.experience && applicant.experience.length > 0 ? (
                  applicant.experience.map((exp: any, index: number) => (
                    <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <h3 className="font-medium">{exp.title}</h3>
                          <p className="text-sm text-gray-500">
                            {exp.company} {exp.location ? `• ${exp.location}` : ''}
                          </p>
                          <p className="text-sm text-gray-500">
                            {exp.startDate || ''} {exp.endDate ? `- ${exp.endDate}` : (exp.startDate ? '- Present' : '')}
                          </p>
                          <p className="mt-2 text-sm">{exp.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="text-gray-500 italic">No experience information provided.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="education" className="space-y-4">
                {applicant.education && applicant.education.length > 0 ? (
                  applicant.education.map((edu: any, index: number) => (
                    <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <h3 className="font-medium">{edu.degree}</h3>
                          <p className="text-sm text-gray-500">
                            {edu.institution} {edu.location ? `• ${edu.location}` : ''}
                          </p>
                          <p className="text-sm text-gray-500">
                            {edu.startDate || ''} {edu.endDate ? `- ${edu.endDate}` : ''}
                          </p>
                          {edu.description && <p className="mt-2 text-sm">{edu.description}</p>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="text-gray-500 italic">No education information provided.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className={applicant.notes ? "whitespace-pre-line" : "text-gray-500 italic"}>
                    {applicant.notes || "No notes added yet."}
                  </p>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Add Notes
                  </label>
                  <textarea
                    id="notes"
                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
                    rows={4}
                    placeholder="Add private notes about this applicant..."
                    defaultValue={applicant.notes}
                  ></textarea>
                  <div className="mt-2 flex justify-end">
                    <Button
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      onClick={() => {
                        const notesElement = document.getElementById('notes') as HTMLTextAreaElement;
                        if (notesElement) {
                          saveApplicantNotes(notesElement.value);
                        }
                      }}
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="outline" onClick={() => router.push(`/employer/jobs/${applicant.jobId}/applicants`)}>
              View All Applicants
            </Button>
            <div className="flex gap-3">
              {applicant.status !== "shortlisted" && applicant.status !== "rejected" && applicant.status !== "interviewed" && applicant.status !== "to be interviewed" && applicant.status !== "hired" ? (
                <>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleShortlistApplicant}>
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Shortlist
                  </Button>
                  <Button variant="outline" className="text-red-600" onClick={handleRejectApplicant}>
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </>
              ) : applicant.status === "shortlisted" ? (
                <Button
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  onClick={() => setShowInterviewDialog(true)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Schedule Interview
                </Button>
              ) : applicant.status === "to be interviewed" ? (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleHireApplicant}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Hire
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600"
                    onClick={handleRejectApplicant}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </>
              ) : null}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Applicant</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {applicant.name}? This action will mark the application as rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason (Optional)
            </label>
            <textarea
              id="rejection-reason"
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
              rows={3}
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            ></textarea>
            <p className="text-xs text-gray-500 mt-1">
              This is for your internal records only and will not be sent to the applicant.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRejectApplicant}>
              Reject Applicant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Applicant</DialogTitle>
            <DialogDescription>Send a message to {applicant.name} regarding their application.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  id="subject"
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                  placeholder="e.g. Your application for Senior Frontend Developer"
                  defaultValue={`Your application for ${applicant.jobTitle}`}
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                  rows={6}
                  placeholder="Enter your message..."
                  defaultValue={`Dear ${applicant.name},\n\nThank you for your application for the ${applicant.jobTitle} position at our company. We have reviewed your application and would like to discuss it further with you.\n\nBest regards,\nRANAOJobs Employer`}
                ></textarea>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setShowContactDialog(false)}
            >
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Scheduling Dialog */}
      <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Select a date to schedule an interview with {applicant?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Interview Date</Label>
              <div className="flex justify-center">
                <div className="border rounded-md p-3 w-fit">
                  <Calendar
                    mode="single"
                    selected={interviewDate}
                    onSelect={setInterviewDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                The applicant will be notified about the scheduled interview date.
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setShowInterviewDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={scheduleInterview}
              disabled={!interviewDate}
            >
              Schedule Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
