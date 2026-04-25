"use client"

import { useState, useEffect } from "react"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { BackButton } from "@/components/back-button"
import { JobMap } from "@/components/job-map"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Search, MapPin, Briefcase } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { collection, getDocs, db } from "@/config/firebase"
import { getUserProfile } from "@/lib/users"

// Use same Job interface as the component for compatibility
interface Job {
  id: string
  title: string
  company: string
  category: string
  location: string
  coordinates: [number, number]
  salary?: string
  type: string
  postedAt: string
  deadline?: string
  description?: string
}

// Extended job type for internal use with skill matching
interface JobWithMatching extends Job {
  requirements?: string[] | string
  match?: number
  hasMatch?: boolean
}

export default function JobMapPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [jobsWithMatchData, setJobsWithMatchData] = useState<JobWithMatching[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapZoom, setMapZoom] = useState(10)
  const [mounted, setMounted] = useState(false)
  const [userSkills, setUserSkills] = useState<string[]>([])
  const [showingSkillMatches, setShowingSkillMatches] = useState(false)

  // Mark component as mounted on client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get user's location
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
        },
        // ✅ Fix 2: Renamed error param to avoid shadowing outer `error` state
        (_geoError) => {
          console.warn("Could not get user location, using default location (Marawi City)")
          setUserLocation([8.0, 124.3])
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } else {
      console.warn("Geolocation not supported, using default location (Marawi City)")
      setUserLocation([8.0, 124.3])
    }
  }, [])

  // Check authentication status and fetch user skills if jobseeker
  useEffect(() => {
    const checkAuthAndFetchSkills = async () => {
      const userData = localStorage.getItem("ranaojobs_user")
      if (userData) {
        try {
          const user = JSON.parse(userData)
          setIsLoggedIn(true)
          const role = user.activeRole || user.role
          setUserRole(role)

          // Redirect if user is an employer
          if (role === "employer" || (user.role === "employer" && !user.activeRole)) {
            router.push("/find-jobs")
          }

          // If user is a jobseeker, fetch their skills for job matching
          if (role === "jobseeker" || (user.role === "multi" && user.activeRole === "jobseeker")) {
            try {
              const profileData = await getUserProfile(user.id)
              const skills = profileData.skills || []
              setUserSkills(skills)
              console.log("Jobseeker skills:", skills)
            } catch (err) {
              console.error("Error fetching user profile:", err)
            }
          }
        } catch (err) {
          console.error("Error parsing user data:", err)
        }
      }
    }

    checkAuthAndFetchSkills()
  }, [router])

  // Convert street address to coordinates for jobs that only have addresses
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const addressMap: Record<string, [number, number]> = {
        'manila': [14.5995, 120.9842],
        'cebu': [10.3157, 123.8854],
        'davao': [7.1907, 125.4553],
        'quezon': [14.6760, 121.0437],
        'makati': [14.5547, 121.0244],
        'marawi': [8.0, 124.3],
        'iligan': [8.2289, 124.2444],
        'cagayan': [8.4542, 124.6319],
        'zamboanga': [6.9214, 122.0790]
      }

      const lowerAddress = address.toLowerCase()

      for (const [city, coords] of Object.entries(addressMap)) {
        if (lowerAddress.includes(city)) {
          return coords
        }
      }

      return [12.8797, 121.774]
    } catch (err) {
      console.error(`Error geocoding address: ${address}`, err)
      return null
    }
  }

  // Match jobs with user skills
  const matchJobWithSkills = (job: JobWithMatching, skills: string[]): { hasMatch: boolean, matchScore: number } => {
    if (!skills || skills.length === 0) {
      return { hasMatch: false, matchScore: 0 }
    }

    const requirements = Array.isArray(job.requirements)
      ? job.requirements
      : typeof job.requirements === 'string'
        ? job.requirements.split(',').map(r => r.trim())
        : []

    const reqText = requirements.length === 0 && job.description
      ? job.description.toLowerCase()
      : ""

    const normalizedUserSkills = skills.map(skill => skill.toLowerCase().trim())
    const normalizedRequirements = requirements.map(req => req.toLowerCase().trim())

    const matchedReqSet = new Set<string>()
    let hasMatch = false

    normalizedUserSkills.forEach(skill => {
      if (normalizedRequirements.length > 0) {
        normalizedRequirements.forEach((req, reqIndex) => {
          if (req === skill) {
            matchedReqSet.add(reqIndex.toString())
            hasMatch = true
          } else if (req.includes(skill) || skill.includes(req)) {
            matchedReqSet.add(reqIndex.toString())
            hasMatch = true
          } else {
            const skillWords = skill.split(/\s+/)
            const reqWords = req.split(/\s+/)

            const wordMatch = skillWords.some(skillWord => {
              if (skillWord.length > 2) {
                return reqWords.some(reqWord => {
                  return reqWord.length > 2 && (reqWord.includes(skillWord) || skillWord.includes(reqWord))
                })
              }
              return false
            })

            if (wordMatch) {
              matchedReqSet.add(reqIndex.toString())
              hasMatch = true
            }
          }
        })
      } else if (reqText) {
        if (reqText.includes(skill.toLowerCase())) {
          hasMatch = true
        }
      }
    })

    let matchScore = 0
    if (normalizedRequirements.length > 0) {
      matchScore = Math.round((matchedReqSet.size / normalizedRequirements.length) * 100)
    } else if (hasMatch) {
      matchScore = 50
    }

    return { hasMatch, matchScore }
  }

  // ✅ Helper to convert JobWithMatching to standard Job
  const toStandardJob = (job: JobWithMatching): Job => ({
    id: job.id,
    title: job.title,
    company: job.company,
    category: job.category,
    location: job.location,
    coordinates: job.coordinates,
    salary: job.salary,
    type: job.type,
    postedAt: job.postedAt,
    // ✅ Fix 3: Safe deadline conversion
    deadline: typeof job.deadline === 'object' && (job.deadline as any)?.toDate
      ? (job.deadline as any).toDate().toISOString()
      : job.deadline as string | undefined,
    description: job.description
  })

  // Fetch jobs from Firestore
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true)

        const jobsCollection = collection(db, "jobs")
        const jobsSnapshot = await getDocs(jobsCollection)

        if (jobsSnapshot.empty) {
          setError("No jobs found in the database.")
          setJobs([])
          setFilteredJobs([])
          setIsLoading(false)
          return
        }

        const jobsList: JobWithMatching[] = []

        // ✅ Fix 4: Renamed loop variable from `doc` to `jobDoc` to avoid
        //           shadowing the Firebase `doc` import
        for (const jobDoc of jobsSnapshot.docs) {
          const jobData = jobDoc.data()

          if (!jobData.title || !jobData.company || !jobData.location) {
            console.warn(`Job ${jobDoc.id} missing required fields, skipping`)
            continue
          }

          // Skip expired jobs
          if (jobData.deadline) {
            let deadlineDate: Date
            try {
              if (jobData.deadline.toDate) {
                deadlineDate = jobData.deadline.toDate()
              } else if (jobData.deadline instanceof Date) {
                deadlineDate = jobData.deadline
              } else {
                deadlineDate = new Date(jobData.deadline)
              }

              if (deadlineDate <= new Date()) {
                console.warn(`Job ${jobDoc.id} has expired deadline, skipping`)
                continue
              }
            } catch (err) {
              console.warn(`Error parsing deadline for job ${jobDoc.id}`, err)
            }
          }

          const job: JobWithMatching = {
            id: jobDoc.id,
            title: jobData.title,
            company: jobData.company,
            category: jobData.category || "General",
            location: jobData.location,
            type: jobData.type || "Full-time",
            salary: jobData.salary,
            // ✅ Fix 5: Ensure postedAt is always a string
            postedAt: jobData.postedAt?.toDate
              ? jobData.postedAt.toDate().toISOString()
              : typeof jobData.postedAt === 'string'
                ? jobData.postedAt
                : new Date().toISOString(),
            deadline: jobData.deadline?.toDate?.() || jobData.deadline,
            description: jobData.description,
            requirements: jobData.requirements || "",
            coordinates: [0, 0], // placeholder, set below
          }

          if (
            jobData.coordinates &&
            Array.isArray(jobData.coordinates) &&
            jobData.coordinates.length === 2
          ) {
            job.coordinates = [jobData.coordinates[0], jobData.coordinates[1]] as [number, number]
          } else {
            const coords = await geocodeAddress(jobData.location)
            if (coords) {
              job.coordinates = coords
            } else {
              console.warn(`Could not geocode location for job ${jobDoc.id}, skipping`)
              continue
            }
          }

          jobsList.push(job)
        }

        setJobsWithMatchData(jobsList)

        if (userRole === "jobseeker" && userSkills.length > 0) {
          const jobsWithMatches = jobsList.map(job => {
            const { hasMatch, matchScore } = matchJobWithSkills(job, userSkills)
            return { ...job, match: matchScore, hasMatch }
          })

          const matchedJobs = jobsWithMatches.filter(job => job.hasMatch)

          if (matchedJobs.length > 0) {
            matchedJobs.sort((a, b) => (b.match || 0) - (a.match || 0))
            const standardJobs = matchedJobs.map(toStandardJob)
            setJobs(standardJobs)
            setFilteredJobs(standardJobs)
            setShowingSkillMatches(true)
          } else {
            const standardJobs = jobsList.map(toStandardJob)
            setJobs(standardJobs)
            setFilteredJobs(standardJobs)
            setShowingSkillMatches(false)
          }
        } else {
          const standardJobs = jobsList.map(toStandardJob)
          setJobs(standardJobs)
          setFilteredJobs(standardJobs)
          setShowingSkillMatches(false)
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching jobs:", err)
        setError("Failed to load job listings. Please try again later.")
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [userRole, userSkills])

  // Filter jobs based on search term and filters
  useEffect(() => {
    let result = [...jobs]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(term) ||
          job.company.toLowerCase().includes(term) ||
          job.description?.toLowerCase().includes(term),
      )
    }

    if (categoryFilter && categoryFilter !== "all") {
      result = result.filter((job) => job.category === categoryFilter)
    }

    if (locationFilter && locationFilter !== "all") {
      result = result.filter((job) => job.location.includes(locationFilter))
    }

    setFilteredJobs(result)
  }, [jobs, searchTerm, categoryFilter, locationFilter])

  // Get unique categories and locations for filters
  const categories = [...new Set(jobs.map((job) => job.category).filter(Boolean))]
  const locations = [...new Set(jobs.map((job) => {
    const parts = job.location.split(",")
    return parts.length > 0 ? parts[0].trim() : job.location
  }))]

  // Show all jobs again
  const showAllJobs = () => {
    if (jobsWithMatchData.length === 0) return
    const standardJobs = jobsWithMatchData.map(toStandardJob)
    setJobs(standardJobs)
    setFilteredJobs(standardJobs)
    setShowingSkillMatches(false)
  }

  // Show only matching jobs
  const showMatchingJobs = () => {
    if (userSkills.length === 0 || jobsWithMatchData.length === 0) return

    const jobsWithMatches = jobsWithMatchData.map(job => {
      const { hasMatch, matchScore } = matchJobWithSkills(job, userSkills)
      return { ...job, match: matchScore, hasMatch }
    })

    const matchedJobs = jobsWithMatches.filter(job => job.hasMatch)

    if (matchedJobs.length > 0) {
      matchedJobs.sort((a, b) => (b.match || 0) - (a.match || 0))
      const standardJobs = matchedJobs.map(toStandardJob)
      setJobs(standardJobs)
      setFilteredJobs(standardJobs)
      setShowingSkillMatches(true)
    }
  }

  if (!mounted) return null

  return (
    <>
      <NavBar />
      <main className="container mx-auto max-w-7xl p-4 pt-24 pb-12">
        <div className="flex justify-between items-center mb-4">
          <BackButton />
          <h1 className="text-2xl font-bold">Explore Jobs</h1>
          <div className="w-10"></div>
        </div>

        {/* Filter toolbar */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search jobs..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <div className="flex items-center">
                <Briefcase className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Job Category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <div className="flex items-center">
                <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Location" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {userRole === "jobseeker" && userSkills.length > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row gap-2 justify-between items-center bg-yellow-50 p-3 rounded-md border border-yellow-200">
            <div className="text-sm text-yellow-800">
              {showingSkillMatches ? (
                <>Showing jobs matching your skills. ({filteredJobs.length} jobs)</>
              ) : (
                <>Showing all available jobs. Filter to see jobs matching your skills.</>
              )}
            </div>
            <div>
              {showingSkillMatches ? (
                <Button
                  variant="outline"
                  className="text-sm h-8 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  onClick={showAllJobs}
                >
                  Show All Jobs
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="text-sm h-8 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  onClick={showMatchingJobs}
                >
                  Show Only Matching Jobs
                </Button>
              )}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Map section */}
        <div className="border rounded-lg overflow-hidden shadow-md">
          {isLoading ? (
            <div className="bg-gray-100 h-125 flex items-center justify-center">
              <div className="text-center">
                <Skeleton className="h-8 w-32 mb-4 mx-auto" />
                <Skeleton className="h-100 w-full max-w-3xl mx-auto rounded-md" />
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-gray-100 h-125 flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-6">
                <h3 className="text-lg font-medium mb-2">No Jobs Found</h3>
                <p className="text-gray-500 mb-4">
                  {showingSkillMatches
                    ? "No jobs match your skills with the current filters. Try broadening your search or view all jobs."
                    : "There are no jobs matching your search criteria. Try adjusting your filters."}
                </p>
                {showingSkillMatches && (
                  <Button variant="outline" onClick={showAllJobs}>
                    Show All Jobs
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <JobMap
              jobs={filteredJobs}
              height="600px"
              initialCenter={userLocation || undefined}
              initialZoom={mapZoom}
            />
          )}
        </div>

        {/* Job count footer */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
          {searchTerm || categoryFilter !== "" || locationFilter !== "" ? " with current filters" : ""}
        </div>
      </main>
      <Footer />
    </>
  )
}