"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, AlertCircle, Building2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function EmployerProfileForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: "",
    companyDescription: "",
    industry: "",
    companySize: "",
    foundedYear: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    city: "Marawi City",
    barangay: "",
    profilePicture: null as File | null,
    businessPermit: null as File | null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [permitPreview, setPermitPreview] = useState<string | null>(null)

  const industries = [
    "Technology",
    "Healthcare",
    "Education",
    "Finance",
    "Marketing",
    "Retail",
    "Manufacturing",
    "Construction",
    "Hospitality",
    "Transportation",
    "Media",
    "Agriculture",
    "Energy",
    "Real Estate",
    "Legal Services",
    "Consulting",
    "Non-profit",
    "Government",
    "Entertainment",
    "Other",
  ]

  const companySizes = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-500 employees",
    "501-1000 employees",
    "1001+ employees",
  ]

  const marawiBarangays = [
    "Amito Marantao",
    "Bacong",
    "Banggolo",
    "Barionaga Punod",
    "Basak Malutlut",
    "Bubong",
    "Buadi Itowa",
    "Bubonga Lilod",
    "Bubonga Ranao",
    "Cadayonan",
    "Cabingan",
    "Daguduban",
    "Dansalan",
    "Datu Naga",
    "Datu sa Dansalan",
    "East Basak",
    "Fort",
    "Gadongan",
    "Kapantaran",
    "Kilala",
    "Lilod Madaya",
    "Lilod Saduc",
    "Lumbaca Madaya",
    "Lumbac Toros",
    "Lumbatan",
    "Marinaut East",
    "Marinaut West",
    "Matampay",
    "Moncado Colony",
    "Moncado Kadingilan",
    "Norhaya Village",
    "Pagalamatan",
    "Panggao Saduc",
    "Pantaon",
    "Papandayan",
    "Pugaan",
    "Rapasun MSU",
    "Raya Madaya I",
    "Raya Madaya II",
    "Raya Saduc",
    "Sabala Amanao",
    "Sabala Manao",
    "Saber",
    "Sangkay",
    "South Madaya",
    "Timbangalan",
    "Tuca",
    "Tolali",
    "Wawalayan Calocan",
    "Wawalayan Marinaut",
  ]

  useEffect(() => {
    // In a real app, this would be an API call to fetch employer profile data
    // For now, we'll use mock data
    setTimeout(() => {
      setFormData({
        companyName: "Tech Solutions Inc.",
        companyDescription:
          "Tech Solutions Inc. is a leading technology company specializing in web and mobile application development. We work with clients across various industries to deliver innovative digital solutions.",
        industry: "Technology",
        companySize: "11-50 employees",
        foundedYear: "2015",
        website: "https://techsolutions.example.com",
        email: "contact@techsolutions.example.com",
        phone: "+63 123 456 7890",
        address: "123 Main Street",
        city: "Marawi City",
        barangay: "Banggolo",
        profilePicture: null,
        businessPermit: null,
      })
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
    // Clear error when user selects
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFormData({ ...formData, profilePicture: file })

      // Create preview URL
      const reader = new FileReader()
      reader.onload = () => {
        setProfilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBusinessPermitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFormData({ ...formData, businessPermit: file })

      // Create preview URL
      const reader = new FileReader()
      reader.onload = () => {
        setPermitPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required"
    }

    if (!formData.companyDescription.trim()) {
      newErrors.companyDescription = "Company description is required"
    }

    if (!formData.industry) {
      newErrors.industry = "Industry is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      setIsSubmitting(true)

      // Simulate API call
      setTimeout(() => {
        setIsSubmitting(false)
        setShowSuccessDialog(true)
      }, 1500)
    }
  }

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false)
    router.push("/employer-home")
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Company Profile</h1>
          <p className="text-gray-500">Manage your company information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic information about your company</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 flex flex-col items-center">
                <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-4">
                  {profilePreview ? (
                    <img
                      src={profilePreview || "/placeholder.svg"}
                      alt="Company Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-20 w-20 text-gray-400" />
                  )}
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="profilePicture">Company Logo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="profilePicture"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("profilePicture")?.click()}
                      className="w-full justify-center"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Recommended: 300x300px JPG or PNG</p>
                </div>
              </div>

              <div className="md:w-2/3 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className={errors.companyName ? "border-red-500" : ""}
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.companyName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">
                      Industry <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.industry} onValueChange={(value) => handleSelectChange("industry", value)}>
                      <SelectTrigger id="industry" className={errors.industry ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.industry && (
                      <p className="text-red-500 text-sm flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.industry}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size</Label>
                    <Select
                      value={formData.companySize}
                      onValueChange={(value) => handleSelectChange("companySize", value)}
                    >
                      <SelectTrigger id="companySize">
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="foundedYear">Founded Year</Label>
                    <Input
                      id="foundedYear"
                      name="foundedYear"
                      value={formData.foundedYear}
                      onChange={handleInputChange}
                      placeholder="e.g. 2015"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="e.g. https://example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyDescription">
                    Company Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="companyDescription"
                    name="companyDescription"
                    value={formData.companyDescription}
                    onChange={handleInputChange}
                    className={`min-h-[150px] ${errors.companyDescription ? "border-red-500" : ""}`}
                  />
                  {errors.companyDescription && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.companyDescription}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>How job seekers can reach your company</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleInputChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barangay">Barangay</Label>
                <Select value={formData.barangay} onValueChange={(value) => handleSelectChange("barangay", value)}>
                  <SelectTrigger id="barangay">
                    <SelectValue placeholder="Select barangay" />
                  </SelectTrigger>
                  <SelectContent>
                    {marawiBarangays.map((barangay) => (
                      <SelectItem key={barangay} value={barangay}>
                        {barangay}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Verification</CardTitle>
            <CardDescription>Upload documents to verify your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessPermit">Business Permit</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="businessPermit"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleBusinessPermitChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("businessPermit")?.click()}
                    className="w-full justify-start"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {formData.businessPermit ? (formData.businessPermit as File).name : "Upload business permit"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Upload a scanned copy of your business permit (PDF, JPG, or PNG)
                </p>
              </div>

              {permitPreview && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <div className="border rounded-md p-4 bg-gray-50">
                    <img src={permitPreview || "/placeholder.svg"} alt="Business Permit" className="max-h-40 mx-auto" />
                  </div>
                </div>
              )}

              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your business permit will be reviewed by our team for verification purposes. This helps us maintain a
                  trusted platform for all users.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.push("/employer-dashboard")}>
              Cancel
            </Button>
            <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-white rounded-full"></span>
                  Saving...
                </span>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Updated Successfully</DialogTitle>
            <DialogDescription>
              Your company profile has been updated successfully. These changes will be reflected across the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={handleSuccessDialogClose}>
              Return to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
