"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, Building, MapPin, Clock, PhilippinePeso, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { JobMapComponent } from "./job-map-component"
import { AuthCheckModal } from "./auth-check-modal"

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

interface JobMapProps {
  jobs: Job[]
  height?: string
  initialCenter?: [number, number]
  initialZoom?: number
}

export function JobMap({ jobs, height = "500px", initialCenter, initialZoom }: JobMapProps) {
  const router = useRouter()
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Check authentication status
  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem("ranaojobs_user")
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setIsLoggedIn(true)
        setUserRole(user.activeRole || user.role)
      } catch (error) {
        console.error("Error parsing user data:", error)
        setIsLoggedIn(false)
        setUserRole(null)
      }
    } else {
      setIsLoggedIn(false)
      setUserRole(null)
    }
  }, [])

  const handleMarkerClick = (job: Job) => {
    setSelectedJob(job)
  }

  const handleApplyClick = () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true)
      return
    }

    if (userRole === "employer") {
      alert("Employers cannot apply for jobs. Please switch to Jobseeker mode.")
      return
    }

    // Navigate to job application page
    router.push(`/job/${selectedJob?.id}/apply`)
  }

  const handleViewDetailsClick = () => {
    router.push(`/job/${selectedJob?.id}`)
  }

  const handleCloseJobDetails = () => {
    setSelectedJob(null)
  }

  // Don't render during SSR to prevent hydration mismatch
  if (typeof window === "undefined" || !mounted) {
    return null
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <JobMapComponent 
        jobs={jobs} 
        onMarkerClick={handleMarkerClick} 
        initialCenter={initialCenter}
        initialZoom={initialZoom}
      />

      {selectedJob && (
        <Card className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white shadow-lg z-20">
          <CardContent className="p-4">
            <button
              onClick={handleCloseJobDetails}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              aria-label="Close job details"
            >
              ×
            </button>

            <h3 className="font-semibold text-lg mb-1 pr-6">{selectedJob.title}</h3>

            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Building className="h-3.5 w-3.5 mr-1 text-gray-500" />
              <span>{selectedJob.company}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-1">
              <MapPin className="h-3.5 w-3.5 mr-1 text-gray-500" />
              <span>{selectedJob.location}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Briefcase className="h-3.5 w-3.5 mr-1 text-gray-500" />
              <span>{selectedJob.category}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Clock className="h-3.5 w-3.5 mr-1 text-gray-500" />
              <span>{selectedJob.type}</span>
            </div>

            {selectedJob.salary && (
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <PhilippinePeso className="h-3.5 w-3.5 mr-1 text-gray-500" />
                <span>{selectedJob.salary}</span>
              </div>
            )}

            <div className="flex items-center text-sm text-gray-600 mb-3">
              <Calendar className="h-3.5 w-3.5 mr-1 text-gray-500" />
              <span>Posted: {new Date(selectedJob.postedAt).toLocaleDateString()}</span>
            </div>

            <div className="flex flex-col space-y-2">
              <Button onClick={handleViewDetailsClick} variant="outline" className="w-full">
                View Details
              </Button>

              {userRole !== "employer" && (
                <Button onClick={handleApplyClick} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
                  {isLoggedIn ? "Apply Now" : "Login to Apply"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AuthCheckModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        message="You need to login or register to apply for this job."
      />
    </div>
  )
}
