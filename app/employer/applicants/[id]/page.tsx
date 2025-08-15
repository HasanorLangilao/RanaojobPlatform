"use client"

import { useEffect, useState } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { ApplicantProfile } from "@/components/applicant-profile"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { NavBar } from "@/components/nav-bar"  
import { Footer } from "@/components/footer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { User, AlertCircle } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export default function ApplicantProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  // Use React.use() to unwrap the params promise
  const unwrappedParams = React.use(params)
  const applicationId = unwrappedParams.id // Extract the application ID from params
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [applicationExists, setApplicationExists] = useState(true)

  useEffect(() => {
    // Log the application ID for debugging
    console.log(`Viewing application ID: ${applicationId}`)
    
    const checkApplication = async () => {
      try {
        // First check if the application exists
        const applicationRef = doc(db, "applications", applicationId);
        const applicationSnapshot = await getDoc(applicationRef);
        
        if (!applicationSnapshot.exists()) {
          console.error(`Application ${applicationId} not found`);
          setApplicationExists(false);
          setErrorMessage(`Application ID ${applicationId} not found in database`);
          setIsLoading(false);
          return;
        }
        
        console.log("Application found in database");
      } catch (error) {
        console.error("Error checking application:", error);
        setErrorMessage("Error checking application");
        setIsLoading(false);
        return;
      }
    };
    
    // Check if user is logged in
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      setIsAuthModalOpen(true)
      return
    }

    const user = JSON.parse(storedUser)
    console.log("User data:", user)

    // Check if user has employer role
    if (user.role !== "employer" && user.role !== "multi") {
      router.push("/jobseeker-dashboard")
      return
    }

    // If multi-role, ensure active role is employer
    if (user.role === "multi" && user.activeRole !== "employer") {
      user.activeRole = "employer"
      localStorage.setItem("ranaojobs_user", JSON.stringify(user))
    }

    // Check if the application exists
    checkApplication();
    
    setUserData(user)
    setIsLoading(false)
  }, [router, applicationId])

  if (isLoading && !isAuthModalOpen) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <NavBar />
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500 mb-4"></div>
            <p>Loading applicant data...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }
  
  if (!applicationExists && errorMessage) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <NavBar />
        <main className="flex-grow pt-20 pb-10 px-4">
          <div className="container mx-auto max-w-6xl">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Application not found</h3>
              <p className="mt-2 text-gray-500">The application you're looking for doesn't exist in the database.</p>
              <Button className="mt-4" variant="outline" onClick={() => router.push("/employer/applicants")}>
                Back to Applicants
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <NavBar />
      
      <main className="flex-grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-6xl">
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <ApplicantProfile applicantId={applicationId} />
          
          <AuthCheckModal
            isOpen={isAuthModalOpen}
            onClose={() => router.push("/")}
            title="Employer Account Required"
            message="You need to login or register as an employer to view applicant profiles."
          />
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
