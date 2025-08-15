"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, MapPin, Search, User, MapIcon } from "lucide-react"
import { JobCard } from "@/components/job-card"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import Link from "next/link"
import Image from "next/image"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  const router = useRouter()
  const [featuredJobs, setFeaturedJobs] = useState<{id: string}[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [location, setLocation] = useState("")

  useEffect(() => {
    // Check if user is logged in and redirect to appropriate dashboard
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (storedUser) {
      const user = JSON.parse(storedUser)
      if (user.role === "employer" || (user.role === "multi" && user.activeRole === "employer")) {
        router.push("/employer-home")
      } else if (user.role === "jobseeker" || (user.role === "multi" && user.activeRole === "jobseeker")) {
        router.push("/jobseeker-home")
      } else if (user.role === "admin") {
        router.push("/admin")
      }
    }
  }, [router])

  // Fetch featured jobs
  useEffect(() => {
    const fetchFeaturedJobs = async () => {
      setIsLoading(true)
      try {
        // Get all jobs from the collection without any filtering
        const jobsCollection = collection(db, "jobs")
        const jobsSnapshot = await getDocs(jobsCollection)
        
        // Extract job IDs - we'll limit to 6 for the home page
        const jobs = jobsSnapshot.docs.map((doc: any) => ({ id: doc.id }))
        setFeaturedJobs(jobs.slice(0, 6)) // Only take up to 6 jobs
      } catch (error) {
        console.error("Error fetching featured jobs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedJobs()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/find-jobs?search=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Find Your Dream Job With <span className="text-white">RANAO</span>
              <span className="text-yellow-500">Jobs</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl mb-8">
              Connect with top employers and discover opportunities that match your skills and career goals.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full max-w-4xl flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  type="text" 
                  placeholder="Job title, keywords, or company" 
                  className="pl-10 h-12 text-black" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  type="text" 
                  placeholder="City, state, or remote" 
                  className="pl-10 h-12 text-black"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-12 px-6 bg-yellow-500 hover:bg-yellow-600 text-black font-medium">
                Search Jobs
              </Button>
            </form>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/find-jobs">
                <Button className="bg-gray-800 text-white border border-gray-700 hover:bg-gray-700">
                  <User className="mr-2 h-4 w-4" />
                  For Job Seekers
                </Button>
              </Link>
              <Link href="/post-job">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                  <Building2 className="mr-2 h-4 w-4" />
                  For Employers
                </Button>
              </Link>
              <Link href="/job-map">
                <Button variant="outline" className="text-yellow-500 border-yellow-500 hover:bg-gray-800">
                  <MapIcon className="mr-2 h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500">Explore Jobs on Map</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Job Openings */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 dark:text-gray-200">Latest Job Openings</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Browse through our most recent opportunities from top employers across various industries
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.length > 0 ? (
                featuredJobs.map((job) => (
                  <JobCard key={job.id} jobId={job.id} />
                ))
              ) : (
                <div className="col-span-3 text-center p-10 bg-white rounded-lg shadow">
                  <p className="text-gray-500">No jobs available at the moment. Check back soon!</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link href="/find-jobs">
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black px-8">View All Jobs</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How RANAOJobs Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform simplifies the job search process, connecting talented professionals with the right
              opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="rounded-lg overflow-hidden shadow-md order-2 lg:order-1">
              {/* Add error handling for image */}
              <div className="relative w-full h-[300px] md:h-[400px]">
                <Image
                  src="/images/job-search.png"
                  alt="Person searching for jobs online"
                  fill
                  className="object-cover"
                  priority
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.src = "/placeholder.svg?height=400&width=600"
                  }}
                />
              </div>
            </div>

            <div className="space-y-8 order-1 lg:order-2">
              {[
                {
                  step: 1,
                  title: "Registration",
                  description: "Sign up as a job seeker or employer in just a few clicks",
                },
                {
                  step: 2,
                  title: "Create Your Profile",
                  description: "Enter your skills, experience, and preferences to stand out",
                },
                {
                  step: 3,
                  title: "Explore Opportunities",
                  description: "Browse jobs or candidate profiles that match your criteria",
                },
                {
                  step: 4,
                  title: "Apply or Post Jobs",
                  description: "Submit applications or post new job openings with ease",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500 text-black flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
