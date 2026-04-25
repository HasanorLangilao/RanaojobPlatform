"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { Calendar, Clock, MapPin, Search, Filter, CheckCircle2, XCircle, Clock3, Trash2, Info } from "lucide-react"
import Link from "next/link"
import { BackButton } from "@/components/back-button"
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp,db } from "@/config/firebase"
import { format, parseISO, isValid } from "date-fns"


export default function JobseekerApplicationsPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [applications, setApplications] = useState<any[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)


  useEffect(() => {
    // Listen for notification updates
    const handleUserStateChange = () => {
      // Trigger a refresh of applications
      setRefreshTrigger(prev => prev + 1)
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener("userStateChange", handleUserStateChange)
      
      return () => {
        window.removeEventListener("userStateChange", handleUserStateChange)
      }
    }
    
    return undefined
  }, [])

  useEffect(() => {
    // Check if user is logged in
    try {
      const storedUser = localStorage.getItem("ranaojobs_user")
      if (!storedUser) {
        console.log("No user found in localStorage");
        setIsAuthModalOpen(true)
        setIsLoading(false);
        return
      }

      let user;
      try {
        user = JSON.parse(storedUser)
        console.log("User data retrieved from localStorage:", user);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        setIsAuthModalOpen(true);
        setIsLoading(false);
        return;
      }

      // Check if user has jobseeker role
      if (user.role !== "jobseeker" && user.role !== "multi") {
        console.log("User doesn't have jobseeker role, redirecting");
        router.push("/employer-home")
        return
      }

      // If multi-role, ensure active role is jobseeker
      if (user.role === "multi" && user.activeRole !== "jobseeker") {
        user.activeRole = "jobseeker"
        localStorage.setItem("ranaojobs_user", JSON.stringify(user))
      }

      setUserData(user)
      
      // Fetch applications from Firestore
      const fetchUserApplications = async () => {
        try {
          // Test Firestore connection first
          try {
            const testDoc = await getDocs(collection(db, "applications"));
            console.log("Firestore connection test:", testDoc.empty ? "empty applications collection" : `${testDoc.size} documents in applications collection`);
          } catch (error) {
            console.error("Firestore connection test failed:", error);
          }

          // Get user ID from the stored user data
          const userId = user.uid || user.id;
          if (!userId) {
            console.error("User ID not found");
            setIsLoading(false);
            return;
          }

          console.log("Fetching applications for user ID:", userId);

          // Check all possible application storage locations
          console.log("Checking all possible application storage locations");
          
          // Function to safely query a collection without throwing errors on missing fields
          const safeCollectionQuery = async (collectionPath: string, filterField: string, userId: string) => {
            try {
              console.log(`Querying collection: ${collectionPath} where ${filterField} == ${userId}`);
              const querySnapshot = await getDocs(
                query(collection(db, collectionPath), where(filterField, "==", userId))
              );
              console.log(`Found ${querySnapshot.size} documents in ${collectionPath}`);
              return querySnapshot.docs;
            } catch (error) {
              console.error(`Error querying ${collectionPath}:`, error);
              return [];
            }
          };
          
          // Try all possible paths and field combinations
          const queryResults = await Promise.all([
            // Direct subcollection
            getDocs(collection(db, "users", userId, "appliedJob")).catch(e => {
              console.error("Error querying subcollection:", e);
              return { docs: [] };
            }),
            // Top level applications collection with userId field
            safeCollectionQuery("applications", "userId", userId),
            // Top level applications collection with jobseekerId field
            safeCollectionQuery("applications", "jobseekerId", userId),
            // Top level applications collection with applicantId field
            safeCollectionQuery("applications", "applicantId", userId),
            // Top level applications collection with user field
            safeCollectionQuery("applications", "user", userId)
          ]);
          
          // Combine all results
          const allDocs = new Map();
          
          // Process results from each query
          queryResults.forEach((docs, index) => {
            const sourceNames = [
              "users/userId/appliedJob", 
              "applications (userId)",
              "applications (jobseekerId)",
              "applications (applicantId)",
              "applications (user)"
            ];
            
            console.log(`Processing ${Array.isArray(docs) ? docs.length : (docs.docs ? docs.docs.length : 0)} results from ${sourceNames[index]}`);
            
            // Handle QuerySnapshot or doc array
            const docsArray = Array.isArray(docs) ? docs : (docs.docs || []);
            
            docsArray.forEach(doc => {
              if (!allDocs.has(doc.id)) {
                allDocs.set(doc.id, { id: doc.id, ...doc.data(), source: sourceNames[index] });
              }
            });
          });
          
          // Convert to array
          let applicationDocs = Array.from(allDocs.values());
          console.log(`Combined ${applicationDocs.length} unique applications from all sources`);
          
          // One last fallback - check if applications exist directly attached to the user document
          if (applicationDocs.length === 0) {
            console.log("Checking if applications exist in user document");
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.applications && Array.isArray(userData.applications) && userData.applications.length > 0) {
                  console.log(`Found ${userData.applications.length} applications in user document`);
                  applicationDocs = userData.applications.map((app: any, index: number) => ({
                    id: `inline-application-${index}`,
                    ...app
                  }));
                }
              } else {
                console.log("User document does not exist or doesn't contain applications array");
              }
            } catch (error) {
              console.error("Error checking user document for applications:", error);
            }
          }
          
          if (applicationDocs.length === 0) {
            console.log("No applications found in any location");
            setApplications([]);
            setIsLoading(false);
            return;
          }
          
          console.log(`Processing ${applicationDocs.length} total applications`);

          // Process applications data
          const fetchedApplications = await Promise.all(
            applicationDocs.map(async (applicationData) => {
              console.log(`Processing application: ${applicationData.id}`, applicationData);
              
              // Format the date
              let formattedDate = "Unknown date";
              if (applicationData.createdAt) {
                if (applicationData.createdAt instanceof Timestamp) {
                  formattedDate = format(applicationData.createdAt.toDate(), 'MMM d, yyyy');
                } else if (typeof applicationData.createdAt === 'string') {
                  try {
                    const date = new Date(applicationData.createdAt);
                    if (!isNaN(date.getTime())) {
                      formattedDate = format(date, 'MMM d, yyyy');
                    }
                  } catch (e) {
                    console.error("Error parsing date string:", e);
                  }
                }
              } else if (applicationData.appliedAt) {
                if (applicationData.appliedAt instanceof Timestamp) {
                  formattedDate = format(applicationData.appliedAt.toDate(), 'MMM d, yyyy');
                }
              }

              // Get job details if not already in application data
              let jobTitle = applicationData.jobTitle || "Unknown Job";
              let company = applicationData.jobCompany || applicationData.company || "Unknown Company";
              let location = applicationData.jobLocation || applicationData.location || "Remote";
              
              // If we don't have job details but have jobId, try to fetch them
              if ((!jobTitle || jobTitle === "Unknown Job") && applicationData.jobId) {
                try {
                  const jobDoc = await getDoc(doc(db, "jobs", applicationData.jobId));
                  if (jobDoc.exists()) {
                    const jobData = jobDoc.data() as any;
                    jobTitle = jobData.title || jobTitle;
                    company = jobData.company || company;
                    location = jobData.location || location;
                  }
                } catch (e) {
                  console.error(`Error fetching job details for job ${applicationData.jobId}:`, e);
                }
              }

              // Map status from "pending", "reviewed", "shortlisted", "rejected" to UI friendly names
              let statusDisplay = "Application Submitted";
              let statusColor = "yellow";
              
              if (applicationData.status) {
                if (applicationData.status === "job_removed") {
                  statusDisplay = "Job Removed by Employer";
                  statusColor = "gray";
                } else if (applicationData.status === "reviewed" || applicationData.status === "seen") {
                  statusDisplay = "Application Reviewed";
                  statusColor = "blue";
                } else if (applicationData.status === "interviewing" || applicationData.status === "interview") {
                  statusDisplay = "To be Interviewed";
                  statusColor = "purple";
                } else if (applicationData.status === "shortlisted") {
                  statusDisplay = "Shortlisted";
                  statusColor = "green";
                } else if (applicationData.status === "rejected") {
                  statusDisplay = "Rejected";
                  statusColor = "red";
                } else if (applicationData.status === "hired" || applicationData.status === "accepted") {
                  statusDisplay = "Hired";
                  statusColor = "green";
                } else if (applicationData.status === "offer") {
                  statusDisplay = "Offer Received";
                  statusColor = "green";
                }
              }
              
              console.log(`Mapped status for application ${applicationData.id}: ${statusDisplay} (${statusColor})`);

              // Return formatted application data with all possible fields
              return {
                id: applicationData.id,
                jobId: applicationData.jobId,
                jobTitle: jobTitle,
                company: company,
                location: location,
                appliedDate: formattedDate,
                status: statusDisplay,
                statusColor: statusColor,
                interviewDate: applicationData.interviewDate || null,
                salary: applicationData.salary || applicationData.expectedSalary || "",
                coverLetter: applicationData.coverLetter || "",
                phoneNumber: applicationData.phoneNumber || applicationData.phone || "",
                originalData: applicationData // Keep original data for debugging
              };
            })
          );

          setApplications(fetchedApplications);
        } catch (error) {
          console.error("Error fetching applications:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserApplications();
    } catch (error) {
      console.error("Error in useEffect:", error);
      setIsLoading(false);
    }
  }, [router, refreshTrigger]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "To be Interviewed":
        return <Calendar className="h-5 w-5 text-purple-600" />
      case "Application Reviewed":
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />
      case "Application Submitted":
        return <Clock3 className="h-5 w-5 text-yellow-600" />
      case "Rejected":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "Offer Received":
        return <CheckCircle2 className="h-5 w-5 text-purple-600" />
      case "Shortlisted":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "Hired":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "Job Removed by Employer":
        return <Trash2 className="h-5 w-5 text-gray-600" />
      default:
        return <Clock3 className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusBadgeColor = (statusColor: string) => {
    switch (statusColor) {
      case "green":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "blue":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "yellow":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "red":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      case "purple":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />

      <main className="grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <BackButton className="mb-4" href="/jobseeker-home" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Applications</h1>
              <p className="text-gray-600">Track and manage your job applications</p>
            </div>
    
          </div>

          {applications.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-medium mb-2">No applications found</h3>
              <p className="text-gray-500 mb-6">You haven't applied for any jobs yet.</p>
              <Link href="/find-jobs">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">Browse Jobs</Button>
              </Link>
            </div>
          ) : (
          <Tabs defaultValue="all" className="space-y-9">
            <TabsList className="grid grid-cols-5 gap-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="interviews">Interviews</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="closed">Closed Jobs</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
                          <CardDescription>{application.company}</CardDescription>
                        </div>
                        <Badge className={getStatusBadgeColor(application.statusColor)}>{application.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{application.location}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>Applied on {application.appliedDate}</span>
                          </div>
                          <div className="flex items-center text-sm font-medium text-green-600">
                            {application.salary}
                          </div>
                        </div>

                        {application.interviewDate && (
                          <div className="flex items-center p-2 bg-green-50 rounded-md text-sm text-green-800">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Interview scheduled for {application.interviewDate}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center">
                            {getStatusIcon(application.status)}
                            <span className="ml-2 text-sm">{application.status}</span>
                          </div>
                          <div className="flex gap-2">
                              <Link href={`/job/${application.jobId}/details`}>
                              <Button variant="outline" size="sm">
                                View Job
                              </Button>
                            </Link>
                            {/* <Link href={`/jobseeker/applications/${application.id}`}>
                              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" size="sm">
                                Track Application
                              </Button>
                            </Link> */}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="active">
              <div className="space-y-4">
                {applications
                  .filter((app) => app.status !== "Rejected" && app.status !== "Job Removed by Employer")
                  .map((application) => (
                    <Card key={application.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
                            <CardDescription>{application.company}</CardDescription>
                          </div>
                          <Badge className={getStatusBadgeColor(application.statusColor)}>{application.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{application.location}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>Applied on {application.appliedDate}</span>
                            </div>
                            <div className="flex items-center text-sm font-medium text-green-600">
                              {application.salary}
                            </div>
                          </div>

                          {application.interviewDate && (
                            <div className="flex items-center p-2 bg-green-50 rounded-md text-sm text-green-800">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>Interview scheduled for {application.interviewDate}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2">
                            <div className="flex items-center">
                              {getStatusIcon(application.status)}
                              <span className="ml-2 text-sm">{application.status}</span>
                            </div>
                            <div className="flex gap-2">
                                <Link href={`/job/${application.jobId}/details`}>
                                <Button variant="outline" size="sm">
                                  View Job
                                </Button>
                              </Link>
                              {/* <Link href={`/jobseeker/applications/${application.id}`}>
                                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" size="sm">
                                  Track Application
                                </Button>
                              </Link> */}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="interviews">
              <div className="space-y-4">
                {applications
                  .filter((app) => app.status === "To be Interviewed")
                  .map((application) => (
                    <Card key={application.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
                            <CardDescription>{application.company}</CardDescription>
                          </div>
                          <Badge className={getStatusBadgeColor(application.statusColor)}>{application.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{application.location}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>Applied on {application.appliedDate}</span>
                            </div>
                            <div className="flex items-center text-sm font-medium text-green-600">
                              {application.salary}
                            </div>
                          </div>

                          {application.interviewDate && (
                            <div className="flex items-center p-2 bg-green-50 rounded-md text-sm text-green-800">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>Interview scheduled for {application.interviewDate}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2">
                            <div className="flex items-center">
                              {getStatusIcon(application.status)}
                              <span className="ml-2 text-sm">{application.status}</span>
                            </div>
                            <div className="flex gap-2">
                                <Link href={`/job/${application.jobId}`}>
                                <Button variant="outline" size="sm">
                                  View Job
                                </Button>
                              </Link>
                              {/* <Link href={`/jobseeker/applications/${application.id}`}>
                                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" size="sm">
                                  Track Application
                                </Button>
                              </Link> */}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            {/* <TabsContent value="offers">
              <div className="space-y-4">
                {applications
                  .filter((app) => app.status === "Offer Received")
                  .map((application) => (
                    <Card key={application.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
                            <CardDescription>{application.company}</CardDescription>
                          </div>
                          <Badge className={getStatusBadgeColor(application.statusColor)}>{application.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{application.location}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>Applied on {application.appliedDate}</span>
                            </div>
                            <div className="flex items-center text-sm font-medium text-green-600">
                              {application.salary}
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div className="flex items-center">
                              {getStatusIcon(application.status)}
                              <span className="ml-2 text-sm">{application.status}</span>
                            </div>
                            <div className="flex gap-2">
                                <Link href={`/job/${application.jobId}`}>
                                <Button variant="outline" size="sm">
                                  View Job
                                </Button>
                              </Link>
                              <Link href={`/jobseeker/applications/${application.id}`}>
                                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" size="sm">
                                  View Offer
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent> */}

            <TabsContent value="rejected">
              <div className="space-y-4">
                {applications
                  .filter((app) => app.status === "Rejected")
                  .map((application) => (
                    <Card key={application.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
                            <CardDescription>{application.company}</CardDescription>
                          </div>
                          <Badge className={getStatusBadgeColor(application.statusColor)}>{application.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{application.location}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>Applied on {application.appliedDate}</span>
                            </div>
                            <div className="flex items-center text-sm font-medium text-green-600">
                              {application.salary}
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div className="flex items-center">
                              {getStatusIcon(application.status)}
                              <span className="ml-2 text-sm">{application.status}</span>
                            </div>
                            <div className="flex gap-2">
                                <Link href={`/job/${application.jobId}`}>
                                <Button variant="outline" size="sm">
                                  View Job
                                </Button>
                              </Link>
                              <Link href={`/find-jobs`}>
                                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" size="sm">
                                  Find Similar Jobs
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="closed">
              <div className="space-y-4">
                {applications
                  .filter((app) => app.status === "Job Removed by Employer")
                  .map((application) => (
                    <Card key={application.id} className="overflow-hidden border-gray-300">
                      <CardHeader className="pb-2 bg-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
                            <CardDescription>{application.company}</CardDescription>
                          </div>
                          <Badge className={getStatusBadgeColor(application.statusColor)}>{application.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{application.location}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>Applied on {application.appliedDate}</span>
                            </div>
                          </div>

                          <div className="flex items-center p-2 bg-gray-50 rounded-md text-sm text-gray-700">
                            <Info className="h-4 w-4 mr-2" />
                            <span>This job post has been removed by the employer and is no longer active.</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                
                {applications.filter(app => app.status === "Job Removed by Employer").length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No closed jobs found</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </main>

      <Footer />

      <AuthCheckModal
        isOpen={isAuthModalOpen}
        onClose={() => router.push("/")}
        title="Jobseeker Account Required"
        message="You need to login or register as a jobseeker to access this page."
      />
    </div>
  )
}
