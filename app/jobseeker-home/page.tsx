"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { Briefcase, MapPin, Upload, AlertCircle, MapIcon, User, Clock, Bell, CheckCircle2, LogIn, Edit, FileText, XCircle } from "lucide-react"
import Link from "next/link"
import { calculateJobseekerProfileCompletion } from "@/lib/profileCompletion"
import { getUserProfile } from "@/lib/users"
import { getRecentJobPostings } from "@/lib/jobs"
import { JobseekerNotificationDropdown } from "@/components/jobseeker-notification-dropdown"
import { db } from "@/lib/firebase"
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  // orderBy as firestoreOrderBy, 
  // limit as firestoreLimit,
  Timestamp as FirestoreTimestamp ,
  DocumentData,
  
} from "firebase/firestore"
import { format } from "date-fns"

interface Job {
  id?: string;
  title: string;
  companyName?: string;
  company?: string;
  location: string;
  type: string;
  createdAt?: any;
  salary: string;
  requirements: string[] | string;
  applicationDeadline?: any;
  isActive?: boolean;
  match?: number;
  hasMatch?: boolean;
}

interface FormattedJob {
  id: string;
  title: string;
  company: string;
  match: number;
  location: string;
  type: string;
  posted: string;
  salary: string;
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

export default function JobseekerHomePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [hasResume, setHasResume] = useState(false)
  const [suggestedJobs, setSuggestedJobs] = useState<FormattedJob[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [isVerified, setIsVerified] = useState<boolean | null>(null)

  // Activity type icons mapping for jobseeker activities
  const activityIcons: Record<string, any> = {
    login: <LogIn className="h-4 w-4 text-green-600" />,
    profile_update: <User className="h-4 w-4 text-blue-600" />,
    resume_upload: <Upload className="h-4 w-4 text-orange-600" />,
    application: <FileText className="h-4 w-4 text-purple-600" />,
    interview: <Bell className="h-4 w-4 text-yellow-600" />,
    offer: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    rejection: <XCircle className="h-4 w-4 text-red-600" />,
    info: <Bell className="h-4 w-4 text-purple-600" /> // Default or general info icon
  }

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      setIsAuthModalOpen(true)
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
    
    // Fetch profile data and calculate completion percentage
    const fetchProfileData = async () => {
      try {
        // Get the full profile data from Firestore
        const profileData = await getUserProfile(user.id);
        
        // Check if user has a resume
        setHasResume(!!profileData.resume);
        
        // Check verification status - default to false if not set
        setIsVerified(profileData.isVerified === true);
        
        // Calculate profile completion percentage
        const completionPercentage = await calculateJobseekerProfileCompletion(user.id);
        setProfileCompletion(completionPercentage);

        // Get user skills for job matching
        const userSkills = profileData.skills || [];
        
        if (userSkills.length > 0) {
          await fetchMatchingJobs(userSkills);
        } else {
          // Fallback to recent jobs if no skills are available
          await fetchRecentJobs();
        }
        
        // Fetch recent activities
        await fetchRecentActivities(user.id);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, [router])

  // Fetch jobs that match user skills
  const fetchMatchingJobs = async (userSkills: string[]) => {
    try {
      console.log("Jobseeker skills:", userSkills);
      
      // Get current date for deadline comparison
      const currentDate = new Date();
      
      // Create query for active jobs
      const jobsCollection = collection(db, "jobs");
      const jobsQuery = query(
        jobsCollection,
        where("isActive", "==", true)
      );
      
      const jobsSnapshot = await getDocs(jobsQuery);
      
      // Filter jobs with valid applicationDeadline
      const allJobs = jobsSnapshot.docs
        .map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        } as Job))
        .filter((job: Job) => {
          // Filter out jobs with expired deadlines
          if (job.applicationDeadline) {
            const deadlineDate = job.applicationDeadline.toDate ? 
              job.applicationDeadline.toDate() : new Date(job.applicationDeadline);
            return deadlineDate > currentDate;
          }
          return true; // Keep jobs without deadlines
        });

      console.log(`Found ${allJobs.length} active jobs`);
      
      if (userSkills.length === 0) {
        console.log("No user skills found, returning empty job list");
        setSuggestedJobs([]);
        return;
      }

      // Calculate match score for each job based on requirements vs user skills
      const jobsWithScores = allJobs.map((job: Job) => {
        // Parse job requirements (could be string or array)
        const requirements = Array.isArray(job.requirements) 
          ? job.requirements 
          : typeof job.requirements === 'string'
            ? job.requirements.split(',').map((r: string) => r.trim())
            : [];
        
        console.log(`Job: ${job.title}, Requirements:`, requirements);
        
        // Initialize match variables
        let matchScore = 0;
        let matchedRequirements = 0;
        let hasMatch = false; // Track if there's at least one skill match
        
        if (requirements.length > 0) {
          // Normalize skills and requirements for better matching
          const normalizedUserSkills = userSkills.map(skill => skill.toLowerCase().trim());
          const normalizedRequirements = requirements.map((req: string) => req.toLowerCase().trim());
          
          console.log("Normalized user skills:", normalizedUserSkills);
          console.log("Normalized job requirements:", normalizedRequirements);
          
          // Track matched requirements for more accurate percentage calculation
          const matchedReqSet = new Set<string>();
          
          // For each user skill, check if it matches any job requirement
          normalizedUserSkills.forEach(skill => {
            normalizedRequirements.forEach((req: string, reqIndex: number) => {
              // Exact match
              if (req === skill) {
                matchedReqSet.add(reqIndex.toString());
                hasMatch = true;
                console.log(`Exact match found: "${skill}" = "${req}"`);
              }
              // Partial match (skill is contained in requirement or vice versa)
              else if (req.includes(skill) || skill.includes(req)) {
                matchedReqSet.add(reqIndex.toString());
                hasMatch = true;
                console.log(`Partial match found: "${skill}" with "${req}"`);
              }
              // Word-level match (check if any word in the skill matches any word in the requirement)
              else {
                const skillWords = skill.split(/\s+/);
                const reqWords = req.split(/\s+/);
                
                // Check for any matching words between skill and requirement
                const wordMatch = skillWords.some(skillWord => {
                  if (skillWord.length > 2) { // Ignore very short words
                    return reqWords.some(reqWord => {
                      return reqWord.length > 2 && (reqWord.includes(skillWord) || skillWord.includes(reqWord));
                    });
                  }
                  return false;
                });
                
                if (wordMatch) {
                  matchedReqSet.add(reqIndex.toString());
                  hasMatch = true;
                  console.log(`Word-level match found for "${skill}" with "${req}"`);
                }
              }
            });
          });
          
          // Calculate match percentage based on number of matched requirements
          matchedRequirements = matchedReqSet.size;
          
          // Calculate match percentage (matched requirements / total requirements) * 100
          matchScore = Math.round((matchedRequirements / normalizedRequirements.length) * 100);
          
          console.log(`Job "${job.title}" match: ${matchedRequirements}/${normalizedRequirements.length} requirements (${matchScore}%)`);
        } else {
          console.log(`Job "${job.title}" has no requirements, skipping`);
          hasMatch = false; // Explicitly set no match for jobs without requirements
        }
        
        return {
          ...job,
          match: matchScore,
          hasMatch: hasMatch
        };
      });
      
      // Filter out jobs with no skill matches
      const matchedJobs = jobsWithScores.filter((job: Job) => job.hasMatch === true);
      console.log(`Found ${matchedJobs.length} jobs with at least one skill match`);
      
      // Sort by match score (highest first)
      matchedJobs.sort((a: Job, b: Job) => (b.match || 0) - (a.match || 0));
      
      // Take top 6 matches or all if less than 6
      const topMatches = matchedJobs.slice(0, 6);
      
      // Format jobs for display
      const formattedJobs: FormattedJob[] = topMatches.map((job: Job) => ({
        id: job.id || '',
        title: job.title,
        company: job.companyName || job.company || '',
        match: job.match || 0,
        location: job.location,
        type: job.type,
        posted: new Date(job.createdAt?.toDate?.() || job.createdAt || new Date()).toLocaleDateString(),
        salary: job.salary
      }));
      
      console.log("Final suggested jobs:", formattedJobs);
      setSuggestedJobs(formattedJobs);
      
      // If no matched jobs found, show a message instead of falling back to recent jobs
      if (formattedJobs.length === 0) {
        console.log("No matching jobs found for user skills");
      }
    } catch (error) {
      console.error("Error fetching matching jobs:", error);
      // Fallback to recent jobs if there's an error
      fetchRecentJobs();
    }
  };

  // Fallback function to fetch recent jobs
  const fetchRecentJobs = async () => {
    try {
      const recentJobs = await getRecentJobPostings(6); // Get 6 most recent jobs
      const formattedJobs = recentJobs.map(job => ({
        id: job.id || '',
        title: job.title,
        company: job.companyName || job.company,
        match: 0, // No match score for recent jobs
        location: job.location,
        type: job.type,
        posted: new Date(job.createdAt?.toDate?.() || job.createdAt || new Date()).toLocaleDateString(),
        salary: job.salary
      }));
      setSuggestedJobs(formattedJobs);
    } catch (error) {
      console.error("Error fetching recent jobs:", error);
      setSuggestedJobs([]);
    }
  };

  // Fetch recent activities for the jobseeker
  const fetchRecentActivities = async (jobseekerId: string) => {
    try {
      // Check if activity_js collection exists, if not, activity may not have been logged yet
      const recentActivitiesQuery = query(
        collection(db, "activity_js"),
        where("jobseekerId", "==", jobseekerId),
        // firestoreOrderBy("createdAt", "desc"),
        // firestoreLimit(5) // Limit to show only the most recent 5 activities
      );
      
      const recentActivitiesSnapshot = await getDocs(recentActivitiesQuery);
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
        
  
              
      
      // if (recentActivitiesSnapshot.empty) {
      //   console.log("No recent activities found for jobseeker");
      //   setRecentActivity([]);
      //   return;
      // }
      
      // const activityList = recentActivitiesSnapshot.docs.map(doc => {
      //   const data = doc.data();
      //   const createdTime = data.createdAt instanceof FirestoreTimestamp 
      //     ? data.createdAt.toDate() 
      //     : new Date(data.createdAt);
          
      //   return {
      //     id: doc.id,
      //     type: data.type || "info", // Use activity type from Firestore
      //     message: data.message || "",
      //     time: format(createdTime, "MMM d, yyyy 'at' h:mm a"), // Exact date and time
      //     exactTime: createdTime,
      //     metadata: data.metadata || {} // Include metadata field
      //   };
      // });
      
       activities = activities.slice(0, 5)
      setRecentActivity(activities);
    } catch (error) {
      console.error("Error fetching jobseeker activities:", error);
      setRecentActivity([]);
    }
  };

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <NavBar />

      <main className="flex-grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Welcome Banner */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Welcome, {userData?.firstName || "Jobseeker"}!
                </h1>
                <p className="text-gray-600">Complete your profile to increase your chances of getting hired.</p>
              </div>
              <Link href="/jobseeker/profile">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">Complete Profile</Button>
              </Link>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm font-medium">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
            </div>
          </div>

          {/* Verification Status Banner */}
          {/* {isVerified === false && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Unverified Account</AlertTitle>
              <AlertDescription>
                Your account is pending verification by an administrator. Some features may be limited until your account is verified.
              </AlertDescription>
            </Alert>
          )} */}

          {/* Resume Alert */}
          {!hasResume && (
            <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-600 dark:text-yellow-400">Resume Missing</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                You haven't uploaded your resume yet — Upload now to attract more employers.
              </AlertDescription>
            
            </Alert>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 dark:bg-gray-800">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <Link href="/jobseeker/applications">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                  <Briefcase className="mr-2 h-4 w-4" />
                  My Applications
                </Button>
              </Link>
              <Link href="/job-map">
                <Button variant="outline">
                  <MapIcon className="mr-2 h-4 w-4" />
                  Explore Job Map
                </Button>
              </Link>
              <Link href="/jobseeker/profile">
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
             
            </div>
          </div>

          {/* Suggested Jobs */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Jobs Matching Your Skills</h2>
              <Link href="/find-jobs">
                <Button variant="link" className="text-yellow-600 dark:text-yellow-400">
                  View All Jobs
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestedJobs.length > 0 ? (
                suggestedJobs.map((job) => (
                <Card key={job.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription>{job.company}</CardDescription>
                      </div>
                        {job.match > 0 ? (
                          <Badge className={`${job.match >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 
                                             job.match >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : 
                                             'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'} hover:bg-opacity-90`}>
                        {job.match}% Match
                      </Badge>
                        ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <Briefcase className="h-4 w-4 mr-2" />
                        <span>{job.type}</span>
                      </div>
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Posted {job.posted}</span>
                      </div>
                      <div className="flex items-center font-medium text-green-600 dark:text-green-400">
                        {job.salary}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Link href={`/job/${job.id}`} className="w-full">
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">View Job</Button>
                    </Link>
                  </CardFooter>
                </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500">No jobs match your current skills. Add or update your skills in your profile to see relevant job opportunities that match your expertise.</p>
                  <div className="mt-4">
                    <Link href="/jobseeker/profile">
                      <Button variant="outline" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950">
                        Update Skills
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest updates and activities</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div
                          className={`p-2 rounded-full flex-shrink-0 
                          ${
                            activity.type === "application"
                              ? "bg-blue-100 dark:bg-blue-900/20"
                              : activity.type === "offer"
                                ? "bg-green-100 dark:bg-green-900/20"
                                : "bg-purple-100 dark:bg-purple-900/20"
                          }`}
                        >
                          {/* Use the mapped icon based on activity type */}
                          {activityIcons[activity.type] || activityIcons.info}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm dark:text-gray-200">{activity.message}</p>
                          {activity.metadata && activity.metadata.changes && Object.keys(activity.metadata.changes).length > 0 && (
                            <div className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded-sm dark:bg-gray-800 dark:text-gray-400">
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
                                  <p className="ml-2 text-blue-500 dark:text-blue-400">+{Object.keys(activity.metadata.changes).length - 3} more changes</p>
                                )}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No recent activities to display.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
