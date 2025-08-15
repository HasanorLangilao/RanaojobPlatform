"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { addJobPosting } from "@/lib/jobs"
import { recordActivity } from "@/lib/activity-logger"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { BackButton } from "@/components/back-button"

export default function PostJobPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("")
  const [location, setLocation] = useState("")
  const [city, setCity] = useState("")
  const [type, setType] = useState("Full-time")
  const [category, setCategory] = useState("Development")
  const [salary, setSalary] = useState("")
  const [description, setDescription] = useState("")
  const [requirements, setRequirements] = useState("")
  const [benefits, setBenefits] = useState("")
  const [applicationDeadline, setApplicationDeadline] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [remote, setRemote] = useState(false)
  const [featured, setFeatured] = useState(false)
  const [urgent, setUrgent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<any>(null)
  const [isVerified, setIsVerified] = useState<boolean>(false)

  useEffect(() => {
    const loadUserData = async () => {
      // Get user data from localStorage
      const userData = localStorage.getItem("ranaojobs_user")
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        
        // Get fresh verification status from Firestore
        try {
          const userRef = doc(db, "users", parsedUser.id)
          const userDoc = await getDoc(userRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setIsVerified(userData.isVerified || false)
          } else {
            setIsVerified(false)
          }
        } catch (err) {
          console.error("Error fetching verification status:", err)
          // Fallback to localStorage data if Firestore fetch fails
          setIsVerified(parsedUser.isVerified || false)
        }
      }
    }
    
    loadUserData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (!user) {
        throw new Error("Please log in to post jobs")
      }

      // Get fresh verification status from Firestore before posting
      const userRef = doc(db, "users", user.id)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const isCurrentlyVerified = userData.isVerified || false
        
        if (!isCurrentlyVerified) {
          throw new Error("Your account needs to be verified by an admin before you can post jobs")
        }
      } else {
        throw new Error("User data not found")
      }
      
      // Default coordinates for now - in a real app you would use a geocoding service
      const coordinates: [number, number] = [14.5995, 120.9842] // Default to Manila coordinates
      
      const jobData = {
        title,
        company: company || user.companyName, // Use company name from form or user data
        location,
        city,
        coordinates,
        type,
        category,
        salary,
        description,
        requirements,
        benefits,
        applicationDeadline,
        contactEmail,
        contactPhone,
        remote,
        featured,
        urgent,
        employerId: user.id,
        companyName: user.companyName
      }

      // Add job to Firestore using the proper function
      const jobId = await addJobPosting(jobData)

      // Record job posting activity
      await recordActivity(
        user.id,
        "job_post",
        "Posted new job",
        {
          jobId,
          jobTitle: title,
          companyName: user.companyName
        }
      )

      router.push("/employer-home")
    } catch (err: any) {
      setError(err.message)
      console.error("Error posting job:", err)
      // Optionally log the error to an external service
    } finally {
      setIsLoading(false)
    }
  }

  if (!isVerified && user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton href="/employer-home" />
        <Card>
          <CardHeader>
            <CardTitle>Account Verification Required</CardTitle>
            <CardDescription>Your account needs to be verified before you can post jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Required</AlertTitle>
              <AlertDescription>
                Your employer account needs to be verified by an administrator before you can post jobs. 
                This helps maintain the quality of job postings on our platform.
              </AlertDescription>
            </Alert>
            <p className="mb-4">
              Please make sure you have submitted all required verification documents. Once your account is verified, 
              you will be able to post jobs.
            </p>
            <p className="mb-2">
              If you have already submitted your documents, please wait for the admin to review them. This usually takes 1-2 business days.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button asChild variant="default">
                <Link href="/employer-home">
                  Return to Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/employer/profile">
                  Go to Profile Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton href="/employer-home" />
      <Card>
        <CardHeader>
          <CardTitle>Post a New Job</CardTitle>
          <CardDescription>Fill in the details to post a new job listing</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter job title"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter company name (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter job location"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Customer Service">Customer Service</SelectItem>
                    <SelectItem value="Skilled Labor">Skilled Labor</SelectItem>
                    <SelectItem value="Manual Labor">Manual Labor</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Salary</label>
              <Input
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Enter salary range"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter job description"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Requirements</label>
              <Textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Enter job requirements"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Benefits</label>
              <Textarea
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder="Enter job benefits"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Application Deadline</label>
                <Input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Email</label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Enter contact email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Phone</label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Enter contact phone"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="remote"
                  checked={remote}
                  onCheckedChange={setRemote}
                />
                <Label htmlFor="remote">Remote Work Available</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={featured}
                  onCheckedChange={setFeatured}
                />
                <Label htmlFor="featured">Featured Job</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="urgent"
                  checked={urgent}
                  onCheckedChange={setUrgent}
                />
                <Label htmlFor="urgent">Urgent Hiring</Label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Posting..." : "Post Job"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 