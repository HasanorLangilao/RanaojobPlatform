"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, PhilippinePeso, Briefcase, Clock, Calendar, Building, Mail, Plus, X, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { addJobPosting, updateJobPosting, JobPosting } from "@/lib/jobs"
import { useToast } from "@/components/ui/use-toast"
import { addAdminNotification } from "@/lib/notifications"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { addEmployerActivity } from "@/lib/notifications"
import { getProvinces, getCitiesByProvince, getBarangaysByCity } from "@/lib/location-data"
import dynamic from 'next/dynamic'
import { LatLngExpression } from 'leaflet'
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

// Dynamically import the Map component to avoid SSR issues
const Map = dynamic(() => import('@/components/map'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-gray-100 rounded-md animate-pulse" />
})

// Philippine cities with coordinates
const philippineCities = [
  { name: "Manila", coordinates: [14.5995, 120.9842] },
  { name: "Quezon city", coordinates: [14.676, 121.0437] },
  { name: "Davao city", coordinates: [7.1907, 125.4553] },
  { name: "Cebu city", coordinates: [10.3157, 123.8854] },
  { name: "Zamboanga city", coordinates: [6.9214, 122.079] },
  { name: "Taguig", coordinates: [14.5176, 121.0509] },
  { name: "Pasig", coordinates: [14.5764, 121.0851] },
  { name: "Cagayan de Oro", coordinates: [8.4542, 124.6319] },
  { name: "Parañaque", coordinates: [14.4793, 121.0198] },
  { name: "Dasmariñas", coordinates: [14.3294, 120.9367] },
  { name: "General Santos", coordinates: [6.1164, 125.1716] },
  { name: "Bacoor", coordinates: [14.4624, 120.9645] },
  { name: "Bacolod", coordinates: [10.6713, 122.9511] },
  { name: "Makati", coordinates: [14.5547, 121.0244] },
  { name: "Baguio", coordinates: [16.4023, 120.596] },
  { name: "Iloilo city", coordinates: [10.7202, 122.5621] },
  { name: "Marawi city", coordinates: [8.0, 124.3] },
  { name: "Cotabato city", coordinates: [7.2167, 124.25] },
  { name: "Butuan", coordinates: [8.9475, 125.5406] },
  { name: "Iligan", coordinates: [8.228, 124.2452] },
]

interface JobPostingFormProps {
  initialData?: JobPosting;
  isEdit?: boolean;
  userData?: any;
}

export function JobPostingForm({ initialData, isEdit = false, userData: userDataProp }: JobPostingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [userData, setUserData] = useState<any>(userDataProp || null)
  const [isVerified, setIsVerified] = useState<boolean>(userDataProp?.isVerified || false)
  const [formData, setFormData] = useState<{
    title: string;
    company: string;
    location: string;
    city: string;
    coordinates: [number, number];
    type: string;
    category: string;
    salary: string;
    description: string;
    requirements: string[];
    benefits: string;
    applicationDeadline: string;
    contactEmail: string;
    contactPhone: string;
    remote: boolean;
    featured: boolean;
    urgent: boolean;
  }>({
    title: initialData?.title || "",
    company: initialData?.company || "",
    location: initialData?.location || "",
    city: initialData?.city || "",
    coordinates: initialData?.coordinates || [0, 0],
    type: initialData?.type || "",
    category: initialData?.category || "",
    salary: initialData?.salary || "",
    description: initialData?.description || "",
    requirements: Array.isArray(initialData?.requirements)
      ? initialData.requirements
      : initialData?.requirements
        ? [initialData.requirements]
        : [],
    benefits: initialData?.benefits || "",
    applicationDeadline: initialData?.applicationDeadline || "",
    contactEmail: initialData?.contactEmail || "",
    contactPhone: initialData?.contactPhone || "",
    remote: initialData?.remote || false,
    featured: initialData?.featured || false,
    urgent: initialData?.urgent || false,
  })

  // Add state for company address
  const [companyAddress, setCompanyAddress] = useState({
    province: "",
    city: "",
    barangay: "",
    street: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [selectedLocation, setSelectedLocation] = useState<{
    coordinates: [number, number];
    address: string;
  }>({
    coordinates: initialData?.coordinates || [8.0004, 124.2928], // Default to Marawi City
    address: initialData?.location || ""
  })

  const [newRequirement, setNewRequirement] = useState("")
  const [searchAddress, setSearchAddress] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Load user data and company address from localStorage if not provided as prop
  useEffect(() => {
    const loadUserData = async () => {
      // If userData was provided as prop, no need to fetch from localStorage
      if (userDataProp) {
        // Get fresh verification status from Firestore
        try {
          const userRef = doc(db, "users", userDataProp.id)
          const userDoc = await getDoc(userRef)
          
          if (userDoc.exists()) {
            const firestoreData = userDoc.data()
            setIsVerified(firestoreData.isVerified || false)
          } else {
            setIsVerified(userDataProp.isVerified || false)
          }
        } catch (err) {
          console.error("Error fetching verification status:", err)
          // Fallback to prop data if Firestore fetch fails
          setIsVerified(userDataProp.isVerified || false)
        }
        
        // Set form data based on user data
        setFormData(prev => ({
          ...prev,
          company: userDataProp.companyName || prev.company,
          contactEmail: userDataProp.email || prev.contactEmail,
          city: userDataProp.city || prev.city,
          location: `${userDataProp.city || ""}, ${userDataProp.province || ""}, Philippines`
        }))

        // Set company address
        setCompanyAddress({
          province: userDataProp.province || "",
          city: userDataProp.city || "",
          barangay: userDataProp.barangay || "",
          street: userDataProp.street || ""
        })
        return
      }

      const storedUser = localStorage.getItem("ranaojobs_user")
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setUserData(parsedUser)
        
        // Get fresh verification status from Firestore
        try {
          const userRef = doc(db, "users", parsedUser.id)
          const userDoc = await getDoc(userRef)
          
          if (userDoc.exists()) {
            const firestoreData = userDoc.data()
            setIsVerified(firestoreData.isVerified || false)
          } else {
            setIsVerified(parsedUser.isVerified || false)
          }
        } catch (err) {
          console.error("Error fetching verification status:", err)
          // Fallback to localStorage data if Firestore fetch fails
          setIsVerified(parsedUser.isVerified || false)
        }

        // Auto-populate company name, contact email, and location from user data
        setFormData(prev => ({
          ...prev,
          company: parsedUser.companyName || prev.company,
          contactEmail: parsedUser.email || prev.contactEmail,
          city: parsedUser.city || prev.city,
          location: `${parsedUser.city || ""}, ${parsedUser.province || ""}, Philippines`
        }))

        // Set company address
        setCompanyAddress({
          province: parsedUser.province || "",
          city: parsedUser.city || "",
          barangay: parsedUser.barangay || "",
          street: parsedUser.street || ""
        })
      }
    }
    
    loadUserData()
  }, [userDataProp])

  // When remote is toggled, reset selectedLocation if switching to non-remote
  useEffect(() => {
    if (!formData.remote) {
      // If switching to non-remote, reset to last known or default coordinates
      setSelectedLocation(prev => ({
        coordinates: prev.coordinates[0] !== 0 ? prev.coordinates : [8.0004, 124.2928],
        address: prev.address || ""
      }))
    }
  }, [formData.remote])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // If city is selected, update coordinates
    if (name === "city") {
      const selectedcity = philippineCities.find((city) => city.name === value)
      if (selectedcity) {
        setFormData((prev) => ({
          ...prev,
          location: value + ", Philippines",
          coordinates: selectedcity.coordinates as [number, number],
        }))
      }
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleAddRequirement = () => {
    if (newRequirement.trim() && !formData.requirements.includes(newRequirement.trim())) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }))
      setNewRequirement("")
    }
  }

  const handleRemoveRequirement = (requirement: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((r: string) => r !== requirement)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddRequirement()
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) newErrors.title = "Job title is required"
    if (!formData.company.trim()) newErrors.company = "Company name is required"
    if (!formData.city) newErrors.city = "city is required"
    if (!formData.type) newErrors.type = "Job type is required"
    if (!formData.category) newErrors.category = "Job category is required"
    if (!formData.description.trim()) newErrors.description = "Job description is required"
    if (formData.requirements.length === 0) newErrors.requirements = "At least one skill requirement is required"
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = "Contact email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = "Please enter a valid email city"
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get fresh verification status from Firestore before posting
    if (!isEdit && userData) {
      try {
        const userRef = doc(db, "users", userData.id)
        const userDoc = await getDoc(userRef)
        
        if (userDoc.exists()) {
          const firestoreData = userDoc.data()
          const isCurrentlyVerified = firestoreData.isVerified || false
          
          if (!isCurrentlyVerified) {
            toast({
              variant: "destructive",
              title: "Verification Required",
              description: "Your account must be verified by an admin before you can post jobs.",
            })
            return
          }
        }
      } catch (err) {
        console.error("Error fetching verification status:", err)
        // Continue with existing isVerified state if fetch fails
        if (!isVerified) {
          toast({
            variant: "destructive",
            title: "Verification Required",
            description: "Your account must be verified by an admin before you can post jobs.",
          })
          return
        }
      }
    }
    
    // Validate form inputs
    const formErrors = validateForm()
    setErrors(formErrors)
    
    if (Object.keys(formErrors).length > 0) {
      toast({
        variant: "destructive",
        title: "Form Error",
        description: "Please fix the errors in the form."
      })
      return
    }
    
    if (!userData) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to post jobs."
      })
      return
    }
    
    setIsSubmitting(true)

    try {
      // Get company name from user data or form input
      const companyName = userData.companyName || formData.company

      // Determine location and coordinates
      let location, coordinates
      if (formData.remote) {
        // Use company address
        location = `${userData.city || ""}, ${userData.province || ""}, Philippines`
        coordinates = userData.coordinates || [0, 0]
      } else {
        // Use selected map location
        location = selectedLocation.address
        coordinates = selectedLocation.coordinates
      }

      const jobData = {
        ...formData,
        employerId: userData.id,
        companyName: companyName,
        company: companyName,
        location,
        coordinates,
        requirements: formData.requirements.join(", ") // Convert array to string for storage
      }

      let jobId: string

      if (isEdit && initialData?.id) {
        // Update existing job
        await updateJobPosting(initialData.id, jobData)
        jobId = initialData.id
        toast({
          title: "Success",
          description: "Job posting updated successfully",
          variant: "default",
        })

        // Add activity for the employer when a job is edited
        if (userData?.id) {
          await addEmployerActivity(
            userData.id,
            "job_edit",
            `You updated your job posting: ${formData.title}`
          );
        }
      } else {
        // Create new job
        jobId = await addJobPosting(jobData)

        // Create admin notification for new job
        await addAdminNotification(
          "New Job Posted",
          `${companyName} posted a new job: ${formData.title}`,
          "info",
          "all",
          `/admin/jobs/${jobId}`,
          "employer",
          userData.id
        )

        // Add activity for the employer
        if (userData?.id) {
          await addEmployerActivity(
            userData.id,
            "job_post",
            `You posted a new job: ${formData.title}`
          )
        }

        toast({
          title: "Success",
          description: "Job posted successfully and is now live.",
          variant: "default",
        })
      }

      // Redirect to jobs page
      router.push("/employer/jobs")
    } catch (error) {
      console.error("Error posting job:", error)
      toast({
        title: "Error",
        description: "Failed to post job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMapClick = async (latlng: LatLngExpression) => {
    if (Array.isArray(latlng) && latlng.length === 2) {
      const [lat, lng] = latlng

      try {
        // Use Nominatim for reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        )
        const data = await response.json()

        if (data.display_name) {
          setSelectedLocation({
            coordinates: [lat, lng],
            address: data.display_name
          })

          // Update form data with new location
          setFormData(prev => ({
            ...prev,
            location: data.display_name,
            coordinates: [lat, lng]
          }))
        }
      } catch (error) {
        console.error('Error in reverse geocoding:', error)
        toast({
          title: "Error",
          description: "Failed to get address details. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleAddressSearch = async () => {
    if (searchAddress.trim()) {
      setIsSearching(true);
      try {
        // Use Nominatim for geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&addressdetails=1`
        )
        const data = await response.json()

        if (data.length > 0) {
          const result = data[0]
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);

          setSelectedLocation({
            coordinates: [lat, lon],
            address: result.display_name
          })

          // Update form data with new location
          setFormData(prev => ({
            ...prev,
            location: result.display_name,
            coordinates: [lat, lon]
          }))

          // Clear the search input after successful search
          setSearchAddress("")

          toast({
            title: "Location Found",
            description: "Map has been updated with the searched location.",
          })
        } else {
          toast({
            title: "No Results",
            description: "No locations found for that search. Try a more specific address.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error in geocoding:', error)
        toast({
          title: "Error",
          description: "Failed to get location details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSearching(false);
      }
    }
  }

  // If not verified and not in edit mode, show verification required message
  if (!isVerified && !isEdit && userData) {
    return (
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
    )
  }

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-6">


        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Briefcase className="mr-2 h-5 w-5 text-yellow-500" />
              Job Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Job Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Senior Software Engineer"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary" className="flex items-center">
                  <PhilippinePeso className="mr-1 h-4 w-4 text-gray-500" />
                  Salary Range
                </Label>
                <Input
                  id="salary"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  placeholder="e.g. ₱30,000 - ₱40,000 per month"
                />
              </div>

            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="flex items-center">
                  <Clock className="mr-1 h-4 w-4 text-gray-500" />
                  Job Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                  <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-red-500 text-sm">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center">
                  <Building className="mr-1 h-4 w-4 text-gray-500" />
                  Job Category <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select job category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Customer Service">Customer Service</SelectItem>
                    <SelectItem value="Administrative">Administrative</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Information Technology">Information Technology</SelectItem>
                    <SelectItem value="Data Science">Data Science</SelectItem>
                    <SelectItem value="Skilled Labor">Skilled Labor</SelectItem>
                    <SelectItem value="Manual Labor">Manual Labor</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Job Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide a detailed description of the job role and responsibilities"
                className={`min-h-[120px] ${errors.description ? "border-red-500" : ""}`}
              />
              {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">
                Skill Requirements <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="newRequirement"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a skill requirement (press Enter to add)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddRequirement}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {errors.requirements && <p className="text-red-500 text-sm">{errors.requirements}</p>}

                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.requirements.map((requirement, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{requirement}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(requirement)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits & Perks</Label>
              <Textarea
                id="benefits"
                name="benefits"
                value={formData.benefits}
                onChange={handleChange}
                placeholder="Describe the benefits and perks offered with this position"
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-yellow-500" />
              Application Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicationDeadline">Application Deadline</Label>
                <Input
                  id="applicationDeadline"
                  name="applicationDeadline"
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="e.g. +63 912 345 6789"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Job Visibility Options</h2>

            <div className="flex flex-col space-y-2">
              <div className="flex items-center">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleCheckboxChange("featured", checked === true)}
                />
                <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                  Feature this job (highlighted in search results)
                </label>
              </div>

              <div className="flex items-center">
                <Checkbox
                  id="urgent"
                  checked={formData.urgent}
                  onCheckedChange={(checked) => handleCheckboxChange("urgent", checked === true)}
                />
                <label htmlFor="urgent" className="ml-2 text-sm text-gray-700">
                  Mark as urgent (displays an urgent tag)
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Job Location
              </Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remote"
                  checked={formData.remote}
                  onCheckedChange={(checked) => handleCheckboxChange("remote", checked === true)}
                />
                <label htmlFor="remote" className="text-sm text-gray-700">
                  This is a remote position
                </label>
              </div>
            </div>

            {!formData.remote && (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for address"
                    id="addressSearch"
                    onChange={(e) => setSearchAddress(e.target.value)}
                    value={searchAddress}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddressSearch();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddressSearch}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Searching...
                      </>
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>

                <div className="h-[300px] rounded-md overflow-hidden border">
                  <Map
                    key={selectedLocation.coordinates.join(",")}
                    center={selectedLocation.coordinates}
                    zoom={13}
                    onMapClick={handleMapClick}
                    markers={[
                      {
                        position: selectedLocation.coordinates,
                        popup: selectedLocation.address
                      }
                    ]}
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-md border">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Selected Location:</span> {selectedLocation.address}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Search for an address above or click directly on the map to set the job location.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Posting Job...
                </>
              ) : (
                "Post Job"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


