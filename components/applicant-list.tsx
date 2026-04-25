"use client"

import { useState, useEffect } from "react"
import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  MoreVertical,
  Search,
  ThumbsDown,
  ThumbsUp,
  User,
  Mail,
  MapPin,
  Phone,
  FileText,
  XCircle
} from "lucide-react"
import { doc, getDoc,db, updateDoc, serverTimestamp, collection, query, where, getDocs, orderBy, Timestamp } from "@/config/firebase"
import { format, parseISO, isValid } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { addEmployerActivity, notifyJobseekerApplicationAccepted, notifyJobseekerApplicationRejected, sendJobseekerInterviewNotification, sendJobseekerHireNotification } from "@/lib/notifications"
import { decrementJobApplicationsCount } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import { Calendar as DateCalendar } from "@/components/ui/calendar"
import { notifyJobseekerShortlisted, notifyJobseekerRejected, notifyJobseekerInterview } from "@/lib/application-notifications"

// Safe window.open function
const safeWindowOpen = (url: string, target: string = '_blank') => {
  try {
    if (typeof window !== 'undefined') {
      window.open(url, target);
    }
  } catch (error) {
    console.error("Error opening window:", error);
  }
}

// Helper function to fetch user details
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

interface ApplicantListProps {
  jobId?: string
}

export function ApplicantList({ jobId }: ApplicantListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [applicants, setApplicants] = useState<any[]>([])
  const [filteredApplicants, setFilteredApplicants] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [jobTitle, setJobTitle] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [showInterviewDialog, setShowInterviewDialog] = useState(false)
  const [interviewDate, setInterviewDate] = useState<Date>()
  const [isInterviewExpired, setIsInterviewExpired] = useState(false)
  

  useEffect(() => {
    // Get filter parameter from URL if it exists
    const filterParam = searchParams?.get('filter')
    if (filterParam) {
      setStatusFilter(filterParam)
    }
  }, [searchParams])

  useEffect(() => {
    // Get user data from localStorage
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      setIsLoading(false)
      return
    }

    const user = JSON.parse(storedUser)
    console.log("Current employer ID for filtering:", user.id);
    
    // Fetch applications from Firestore
    const fetchApplications = async () => {
      try {
        console.log("Fetching applications with jobId:", jobId);
        console.log("Current user ID:", user.id);
        
        let applicationsQuery;
        let applicationsSnapshot;
        let applicationsFound = false;
        
        if (jobId) {
          // Fetch job details first
          const jobDoc = await getDoc(doc(db, "jobs", jobId));
          const jobData = jobDoc.exists() ? jobDoc.data() : null;
          
          // Check if the job belongs to the current employer
          if (jobDoc.exists() && jobData?.employerId !== user.id) {
            console.log("This job does not belong to the current employer");
            setApplicants([]);
            setFilteredApplicants([]);
            setIsLoading(false);
            return;
          }
          
          if (jobDoc.exists()) {
            setJobTitle(jobData?.title || "Unknown Job");
            console.log("Found job:", jobData?.title);
          } else {
            console.log("Job document not found for ID:", jobId);
          }
          
          // First try: Standard query for applications in the main collection
          try {
            console.log("Attempting to query main applications collection");
            applicationsQuery = query(
              collection(db, "applications"),
              where("jobId", "==", jobId),
              where("employerId", "==", user.id)
            );
            
            applicationsSnapshot = await getDocs(applicationsQuery);
            console.log(`Found ${applicationsSnapshot.size} applications in main collection`);
            
            if (!applicationsSnapshot.empty) {
              applicationsFound = true;
            }
          } catch (error) {
            console.error("Error querying main applications collection:", error);
          }
          
          // Second try: Check if applications are stored in a subcollection of the job
          if (!applicationsFound) {
            try {
              console.log("Checking for applications in job subcollection");
              const jobApplicantsRef = collection(db, "jobs", jobId, "applications");
              // We need to filter by employerId after getting the collection
              const jobApplicantsQuery = query(
                jobApplicantsRef,
                where("employerId", "==", user.id)
              );
              const jobApplicantsSnapshot = await getDocs(jobApplicantsQuery);
              
              console.log(`Found ${jobApplicantsSnapshot.size} applications in job subcollection`);
              
              if (!jobApplicantsSnapshot.empty) {
                applicationsSnapshot = jobApplicantsSnapshot;
                applicationsFound = true;
              }
            } catch (error) {
              console.error("Error querying job subcollection:", error);
            }
          }
          
          // Third try: Check if applications are stored with a different field name
          if (!applicationsFound) {
            try {
              console.log("Checking for applications with alternate field names");
              const altQueries = [
                query(collection(db, "applications"), where("job", "==", jobId), where("employerId", "==", user.id)),
                query(collection(db, "applications"), where("jobID", "==", jobId), where("employerId", "==", user.id)),
                query(collection(db, "applications"), where("job_id", "==", jobId), where("employerId", "==", user.id))
              ];
              
              for (const q of altQueries) {
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                  console.log(`Found ${snapshot.size} applications using alternate field name`);
                  applicationsSnapshot = snapshot;
                  applicationsFound = true;
                  break;
                }
              }
            } catch (error) {
              console.error("Error querying with alternate field names:", error);
            }
          }
          
          if (!applicationsFound) {
            console.log("No applications found for this job through standard queries");
            
            // Check if we can find applications by userId in users collection
            try {
              const usersRef = collection(db, "users");
              const usersSnapshot = await getDocs(usersRef);
              
              const applicationDocs: any[] = [];
              
              for (const userDoc of usersSnapshot.docs) {
                try {
                  const appliedJobsRef = collection(db, "users", userDoc.id, "appliedJob");
                  const appliedJobsSnapshot = await getDocs(appliedJobsRef);
                  
                  for (const appliedJobDoc of appliedJobsSnapshot.docs) {
                    const appliedJobData = appliedJobDoc.data();
                    if (appliedJobData.jobId === jobId && appliedJobData.employerId === user.id) {
                      console.log(`Found application for job ${jobId} in user ${userDoc.id}'s appliedJob collection`);
                      applicationDocs.push({
                        id: appliedJobDoc.id,
                        userId: userDoc.id,
                        ...appliedJobData
                      });
                    }
                  }
                } catch (error) {
                  console.error(`Error checking applications for user ${userDoc.id}:`, error);
                }
              }
              
              if (applicationDocs.length > 0) {
                console.log(`Found ${applicationDocs.length} applications in users' collections`);
                
                // Process these applications directly instead of using Firestore snapshot
                const applicationsData = await Promise.all(
                  applicationDocs.map(async (applicationData) => {
                    // Rest of your processing code for each application
                    console.log(`Processing application:`, applicationData);
                    
                    // Get job details (we already have them)
                    const processedJobTitle = applicationData.jobTitle || "Unknown Job";
                    
                    // Get applicant details
                    let applicantInfo = { 
                      name: "Unknown Applicant",
                      email: applicationData.email || "No email provided",
                      phone: applicationData.phone || applicationData.phoneNumber || "No phone provided"
                    }
                    
                    // Try different user ID fields that might exist in the application document
                    const userId = applicationData.userId || applicationData.jobseekerId;
                    
                    // Initialize skills array
                    let skills = Array.isArray(applicationData.skills) ? [...applicationData.skills] : [];
                    
                    if (userId) {
                      const userData = await fetchUserDetails(userId);
                      if (userData) {
                        // Get name components from user data
                        applicantInfo = {
                          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || "Unknown Applicant",
                          email: userData.email || applicationData.email || "No email provided",
                          phone: userData.phone || userData.phoneNumber || applicationData.phone || "No phone provided"
                        }
                        
                        // Merge skills from user data if available
                        if (userData.skills && Array.isArray(userData.skills) && userData.skills.length > 0) {
                          console.log(`Found skills in user data for ${userId}:`, userData.skills);
                          
                          // Combine skills from both sources and remove duplicates
                          const combinedSkills = [...skills, ...userData.skills];
                          skills = [...new Set(combinedSkills)];
                          console.log("Combined skills:", skills);
                        }
                      } else {
                        console.warn(`Could not fetch user data for application ${applicationData.id}`);
                      }
                    } else if (applicationData.applicantName) {
                      // Use applicantName if it exists and no user ID is available
                      applicantInfo.name = applicationData.applicantName;
                    }
                    
                    // Format the date
                    let formattedDate = "Unknown date"
                    if (applicationData.createdAt) {
                      if (applicationData.createdAt instanceof Timestamp) {
                        formattedDate = format(applicationData.createdAt.toDate(), 'yyyy-MM-dd')
                      } else if (typeof applicationData.createdAt === 'string' && isValid(parseISO(applicationData.createdAt))) {
                        formattedDate = format(parseISO(applicationData.createdAt), 'yyyy-MM-dd')
                      }
                    }
                    
                    return {
                      id: applicationData.id,
                      name: applicantInfo.name,
                      email: applicantInfo.email,
                      phone: applicantInfo.phone,
                      jobTitle: processedJobTitle,
                      jobId: applicationData.jobId,
                      appliedDate: formattedDate,
                      status: applicationData.status === "pending" ? "new" : (applicationData.status || "new"),
                      resume: applicationData.resumeUrl || applicationData.resume || "",
                      coverLetter: applicationData.coverLetter || "No cover letter provided",
                      experience: applicationData.experience || applicationData.yearsOfExperience || "Not specified",
                      skills: skills,
                      userId: userId,
                      location: applicationData.location || "Not specified"
                    }
                  })
                );
                
                console.log("Processed applications data:", applicationsData);
                console.log(`Found ${applicationsData.length} applications for employer ID: ${user.id}`);
                setApplicants(applicationsData);
                setFilteredApplicants(applicationsData);
                setIsLoading(false);
                return;
              }
            } catch (error) {
              console.error("Error searching in users collection:", error);
            }
          }
        } else {
          // Fetch all applications for this employer
          applicationsQuery = query(
            collection(db, "applications"),
            where("employerId", "==", user.id),
            orderBy("createdAt", "desc")
          );
          
          applicationsSnapshot = await getDocs(applicationsQuery);
        }
        
        if (!applicationsSnapshot || applicationsSnapshot.empty) {
          console.log("No applications found using any method");
          setApplicants([]);
          setFilteredApplicants([]);
          setIsLoading(false);
          return;
        }
        
        // Process application data
        const applicationsData = await Promise.all(
          applicationsSnapshot.docs.map(async (applicationDoc) => {
            const applicationData = applicationDoc.data()
            console.log(`Processing application ${applicationDoc.id}:`, applicationData);
            
            // Get job details
            let jobTitle = "Unknown Job"
            if (applicationData.jobId) {
              const jobDoc = await getDoc(doc(db, "jobs", applicationData.jobId))
              if (jobDoc.exists()) {
                const jobData = jobDoc.data()
                jobTitle = jobData.title || "Unknown Job"
              }
            }
            
            // Get applicant details
            let applicantInfo = { 
              name: "Unknown Applicant",
              email: applicationData.email || "No email provided",
              phone: applicationData.phone || applicationData.phoneNumber || "No phone provided"
            }
            
            // Try different user ID fields that might exist in the application document
            const userId = applicationData.userId || applicationData.jobseekerId;
            
            // Initialize skills array
            let skills = Array.isArray(applicationData.skills) ? [...applicationData.skills] : [];
            
            if (userId) {
              const userData = await fetchUserDetails(userId);
              if (userData) {
                // Get name components from user data
                applicantInfo = {
                  name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || "Unknown Applicant",
                  email: userData.email || applicationData.email || "No email provided",
                  phone: userData.phone || userData.phoneNumber || applicationData.phone || "No phone provided"
                }
                
                // Merge skills from user data if available
                if (userData.skills && Array.isArray(userData.skills) && userData.skills.length > 0) {
                  console.log(`Found skills in user data for ${userId}:`, userData.skills);
                  
                  // Combine skills from both sources and remove duplicates
                  const combinedSkills = [...skills, ...userData.skills];
                  skills = [...new Set(combinedSkills)];
                  console.log("Combined skills:", skills);
                }
              } else {
                console.warn(`Could not fetch user data for application ${applicationDoc.id}`);
              }
            } else if (applicationData.applicantName) {
              // Use applicantName if it exists and no user ID is available
              applicantInfo.name = applicationData.applicantName;
            }
            
            // Format the date
            let formattedDate = "Unknown date"
            if (applicationData.createdAt) {
              if (applicationData.createdAt instanceof Timestamp) {
                formattedDate = format(applicationData.createdAt.toDate(), 'yyyy-MM-dd')
              } else if (typeof applicationData.createdAt === 'string' && isValid(parseISO(applicationData.createdAt))) {
                formattedDate = format(parseISO(applicationData.createdAt), 'yyyy-MM-dd')
              }
            }
            
            return {
              id: applicationDoc.id,
              name: applicantInfo.name,
              email: applicantInfo.email,
              phone: applicantInfo.phone,
              jobTitle: jobTitle,
              jobId: applicationData.jobId,
              appliedDate: formattedDate,
              status: applicationData.status === "pending" ? "new" : (applicationData.status || "new"),
              resume: applicationData.resumeUrl || applicationData.resume || "",
              coverLetter: applicationData.coverLetter || "No cover letter provided",
              experience: applicationData.experience || applicationData.yearsOfExperience || "Not specified",
              skills: skills,
              userId: userId || applicationData.userId || applicationData.jobseekerId,
              location: applicationData.location || "Not specified"
            }
          })
        )
        
        console.log("Processed applications data:", applicationsData);
        console.log(`Found ${applicationsData.length} applications for employer ID: ${user.id}`);
        setApplicants(applicationsData)
        setFilteredApplicants(applicationsData)
      } catch (error) {
        console.error("Error fetching applications:", error)
        toast({
          title: "Error",
          description: "Failed to load applications",
          variant: "destructive",
        })
      } finally {
      setIsLoading(false)
      }
    }
    
    fetchApplications()
  }, [jobId, toast])

  useEffect(() => {
    // Filter applicants based on search query and status filter
    let filtered = [...applicants]

    if (searchQuery) {
      filtered = filtered.filter(
        (applicant) =>
          applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          applicant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (applicant.skills && applicant.skills.some((skill: string) => skill.toLowerCase().includes(searchQuery.toLowerCase()))),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((applicant) => {
        // Handle special case where "pending" in database should be treated as "new" in UI
        if (statusFilter === "new") {
          return applicant.status === "new" || applicant.status === "pending";
        }
        // Handle special case where all non-pending applications should be shown as "reviewed"
        if (statusFilter === "reviewed") {
          return applicant.status !== "new" && applicant.status !== "pending";
        }
        return applicant.status === statusFilter;
      })
    }

    setFilteredApplicants(filtered)
  }, [searchQuery, statusFilter, applicants])

  const handleRejectApplicant = (applicant: any) => {
    setSelectedApplicant(applicant)
    setRejectionReason("")
    setShowRejectDialog(true)
  }

  const confirmRejectApplicant = async () => {
    if (!selectedApplicant) return
    
    setIsLoading(true)
    try {
      // Update application status in Firestore
      const applicationRef = doc(db, "applications", selectedApplicant.id)
      await updateDoc(applicationRef, {
        status: "rejected",
        rejectionReason: rejectionReason,
        updatedAt: serverTimestamp()
      })
      
      // Update local state
      setApplicants(applicants.map(a => 
        a.id === selectedApplicant.id 
          ? { ...a, status: "rejected" } 
          : a
      ))
      
      // Decrement the application count for the job
      if (jobId) {
        await decrementJobApplicationsCount(jobId)
      } else if (selectedApplicant.jobId) {
        await decrementJobApplicationsCount(selectedApplicant.jobId)
      }
      
      // Send notification to the jobseeker
      if (selectedApplicant.userId) {
        // Get company name from localStorage
        const storedUser = localStorage.getItem("ranaojobs_user")
        const user = storedUser ? JSON.parse(storedUser) : {}
        const companyName = user.companyName || "An employer"

        await notifyJobseekerRejected(
          selectedApplicant.userId,
          selectedApplicant.id,
          selectedApplicant.jobTitle,
          companyName,
          selectedApplicant.jobId || jobId,
          rejectionReason
        )
        console.log(`Notification sent to jobseeker ${selectedApplicant.userId} about application rejection`)
      }
      
      toast({
        title: "Application rejected",
        description: "The application has been marked as rejected",
      })
      
      setShowRejectDialog(false)
      setSelectedApplicant(null)
    } catch (error) {
      console.error("Error rejecting application:", error)
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleShortlistApplicant = async (applicant: any) => {
    setIsLoading(true)
    try {
      // Update application status in Firestore
      const applicationRef = doc(db, "applications", applicant.id)
      await updateDoc(applicationRef, {
        status: "shortlisted",
        updatedAt: serverTimestamp()
      })
      
      // Update local state
      setApplicants(applicants.map(a => 
        a.id === applicant.id 
          ? { ...a, status: "shortlisted" } 
          : a
      ))
      
      // Send notification to the jobseeker
      if (applicant.userId) {
        // Get company name from localStorage
        const storedUser = localStorage.getItem("ranaojobs_user")
        const user = storedUser ? JSON.parse(storedUser) : {}
        const companyName = user.companyName || "An employer"

        await notifyJobseekerShortlisted(
          applicant.userId,
          applicant.id,
          applicant.jobTitle,
          companyName,
          applicant.jobId || jobId
        )
        console.log(`Notification sent to jobseeker ${applicant.userId} about application shortlisting`)
      }
      
      toast({
        title: "Application shortlisted",
        description: "The application has been shortlisted",
      })
    } catch (error) {
      console.error("Error shortlisting application:", error)
      toast({
        title: "Error",
        description: "Failed to shortlist application",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleHireApplicant = async (applicant: any) => {
    setIsLoading(true)
    try {
      // Update application status in Firestore
      const applicationRef = doc(db, "applications", applicant.id)
      await updateDoc(applicationRef, {
        status: "hired",
        hiredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Update local state
      setApplicants(applicants.map(a => 
        a.id === applicant.id 
          ? { ...a, status: "hired" } 
          : a
      ))
      
      // Update filtered applicants as well
      setFilteredApplicants(filteredApplicants.map(a => 
        a.id === applicant.id 
          ? { ...a, status: "hired" } 
          : a
      ))

      // Send notification to the jobseeker
      if (applicant.userId) {
        // Get company name from localStorage
        const storedUser = localStorage.getItem("ranaojobs_user")
        const user = storedUser ? JSON.parse(storedUser) : {}
        const companyName = user.companyName || "An employer"

        console.log(`Sending hired notification to jobseeker ${applicant.userId}`)
        console.log("Applicant data for notification:", {
          userId: applicant.userId,
          applicationId: applicant.id,
          jobTitle: applicant.jobTitle,
          companyName,
          jobId: applicant.jobId || jobId
        });
        
        try {
          const notificationSent = await sendJobseekerHireNotification(
            applicant.userId,
            applicant.id,
            applicant.jobTitle,
            companyName,
            applicant.jobId || jobId
          );
          
          if (notificationSent) {
            console.log(`Successfully sent hire notification to jobseeker ${applicant.userId}`);
            toast({
              title: "Notification sent",
              description: "The jobseeker has been notified about being hired.",
              variant: "default"
            });
          } else {
            console.error(`Failed to send hire notification to jobseeker ${applicant.userId}`);
            toast({
              title: "Notification warning",
              description: "Could not send notification to the jobseeker. They may not see their updated status until they refresh.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error sending hire notification:", error);
          toast({
            title: "Notification error",
            description: "Failed to send notification to the jobseeker.",
            variant: "destructive"
          });
        }
      } else {
        console.warn("No userId found for applicant, cannot send notification");
        toast({
          title: "Notification warning",
          description: "Could not send notification to the jobseeker because user ID is missing.",
          variant: "destructive"
        });
      }
      
      toast({
        title: "Applicant hired",
        description: `${applicant.name} has been successfully hired.`,
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
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case "hired":
        return <Badge className="bg-green-100 text-green-800">Hired</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const handleSetInterview = (applicant: any) => {
    setSelectedApplicant(applicant);
    setShowInterviewDialog(true);
  };

  const scheduleInterview = async () => {
    if (!interviewDate || !selectedApplicant) {
      toast({
        title: "No date or applicant selected",
        description: "Please select a date for the interview and ensure an applicant is selected.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Format the interview date
      const formattedInterviewDate = format(interviewDate, "MMMM dd, yyyy")
      
      console.log(`Scheduling interview for applicant ${selectedApplicant.id} on ${formattedInterviewDate}`)
      
      // Update application with interview date
      const applicationRef = doc(db, "applications", selectedApplicant.id)
      await updateDoc(applicationRef, {
        status: "to be interviewed",
        interviewDate: formattedInterviewDate,
        interviewScheduledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      console.log(`Updated application ${selectedApplicant.id} status to "to be interviewed"`)

      // Try to send notification to jobseeker
      if (selectedApplicant.userId) {
        // Get company name from localStorage
        const storedUser = localStorage.getItem("ranaojobs_user")
        const user = storedUser ? JSON.parse(storedUser) : {}
        const companyName = user.companyName || "An employer"

        try {
          await notifyJobseekerInterview(
            selectedApplicant.userId,
            selectedApplicant.id,
            selectedApplicant.jobTitle,
            companyName,
            selectedApplicant.jobId || jobId || "",
            formattedInterviewDate
          )
          console.log(`Notification sent to jobseeker ${selectedApplicant.userId} about interview scheduling`)
        } catch (notificationError) {
          console.error("Error sending interview notification:", notificationError)
        }
      }

      // Update local state
      setApplicants(applicants.map(a => 
        a.id === selectedApplicant.id 
          ? { ...a, status: "to be interviewed", interviewDate: formattedInterviewDate } 
          : a
      ))
      
      // Update filtered applicants as well
      setFilteredApplicants(filteredApplicants.map(a => 
        a.id === selectedApplicant.id 
          ? { ...a, status: "to be interviewed", interviewDate: formattedInterviewDate } 
          : a
      ))
      
      // Close dialog
      setShowInterviewDialog(false)
      
      toast({
        title: "Interview scheduled",
        description: `Interview scheduled with ${selectedApplicant.name} for ${formattedInterviewDate}.`,
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{jobId ? `Applicants for ${jobTitle}` : "All Applicants"}</h1>
          <p className="text-gray-500">
            {jobId
              ? `Review candidates who applied for this position`
              : "Manage all job applications across your listings"}
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          {jobId && (
            <Link href={`/employer/jobs/${jobId}`}>
              <Button variant="outline">Back to Job</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="search"
            placeholder="Search applicants..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              const target = e.target as HTMLInputElement;
              setSearchQuery(target.value);
            }}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-45">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="to be interviewed">To be Interviewed</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="card" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="card">Card View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        {/* Card View */}
        <TabsContent value="card">
          {filteredApplicants.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No applicants found</h3>
              <p className="mt-2 text-gray-500">
                {applicants.length === 0
                  ? "You don't have any applicants yet."
                  : "No applicants match your current filters. Try adjusting your search criteria."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApplicants.map((applicant) => (
                <Card key={applicant.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{applicant.name}</h3>
                            <p className="text-sm text-gray-500">{applicant.jobTitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {getStatusBadge(applicant.status)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/employer/applicants/${applicant.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (applicant.resume) {
                                    safeWindowOpen(applicant.resume);
                                  }
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download Resume
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShortlistApplicant(applicant)}>
                                <ThumbsUp className="mr-2 h-4 w-4" />
                                Shortlist
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRejectApplicant(applicant)}
                                className="text-red-600"
                              >
                                <ThumbsDown className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center text-gray-500">
                          <Mail className="h-4 w-4 mr-2" />
                          <span>{applicant.email}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <User className="h-4 w-4 mr-2" />
                          <span>{applicant.phone}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Applied: {applicant.appliedDate}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Briefcase className="h-4 w-4 mr-2" />
                          <span>Experience: {applicant.experience}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>Location: {applicant.location}</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(applicant.skills) && applicant.skills.length > 0 ? (
                            applicant.skills.slice(0, 3).map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary" className="bg-gray-100">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No skills listed</span>
                          )}
                          {Array.isArray(applicant.skills) && applicant.skills.length > 3 && (
                            <Badge variant="secondary" className="bg-gray-100">
                              +{applicant.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 border-t flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/employer/applicants/${applicant.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </Button>
                      {
                        applicant.status === "shortlisted" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600"
                          onClick={() => handleSetInterview(applicant)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Set Interview
                        </Button>
                      ) : applicant.status === "to be interviewed" ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleHireApplicant(applicant)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Hire
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleRejectApplicant(applicant)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      ) : 
                      applicant.status !== "shortlisted" && applicant.status !== "rejected" && applicant.status !== "hired" && applicant.status !== "to be interviewed" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600"
                          onClick={() => handleShortlistApplicant(applicant)}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Shortlist
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              safeWindowOpen(
                                `https://mail.google.com/mail/?view=cm&fs=1&to=${applicant.email}&su=Regarding your application for ${applicant.jobTitle}`,
                                "_blank",
                              )
                            }
                          }}
                          variant="outline"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Contact via email
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table">
          {filteredApplicants.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No applicants found</h3>
              <p className="mt-2 text-gray-500">
                {applicants.length === 0
                  ? "You don't have any applicants yet."
                  : "No applicants match your current filters. Try adjusting your search criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-4">Applicant</th>
                    {!jobId && <th className="text-left p-4">Position</th>}
                    <th className="text-left p-4">Applied On</th>
                    <th className="text-left p-4">Experience</th>
                    <th className="text-left p-4">Skills</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicants.map((applicant) => (
                    <tr key={applicant.id} className="border-b">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{applicant.name}</p>
                            <p className="text-sm text-gray-500">{applicant.email}</p>
                          </div>
                        </div>
                      </td>
                      {!jobId && <td className="p-4">{applicant.jobTitle}</td>}
                      <td className="p-4">{applicant.appliedDate}</td>
                      <td className="p-4">{applicant.experience}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(applicant.skills) && applicant.skills.length > 0 ? (
                            applicant.skills.slice(0, 2).map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary" className="bg-gray-100">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">None</span>
                          )}
                          {Array.isArray(applicant.skills) && applicant.skills.length > 2 && (
                            <Badge variant="secondary" className="bg-gray-100">
                              +{applicant.skills.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(applicant.status)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/employer/applicants/${applicant.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            disabled={!applicant.resume}
                            onClick={() => {
                              if (applicant.resume) {
                                safeWindowOpen(applicant.resume);
                              }
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Resume
                          </Button>
                          {applicant.status !== "shortlisted" && applicant.status !== "rejected" && applicant.status !== "hired" && applicant.status !== "to be interviewed" && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleShortlistApplicant(applicant)}>
                                <ThumbsUp className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleRejectApplicant(applicant)}>
                                <ThumbsDown className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Applicant</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedApplicant?.name}? This action will mark the application as
              rejected.
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
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
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
        {/* Interview Scheduling Dialog */}
            <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
              <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                  <DialogTitle>Schedule Interview</DialogTitle>
                  <DialogDescription>
                    Select a date to schedule an interview with {selectedApplicant?.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Interview Date</Label>
                    <div className="flex justify-center">
                      <div className="border rounded-md p-3 w-fit">
                        <DateCalendar
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
