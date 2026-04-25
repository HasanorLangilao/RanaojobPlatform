"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Upload, Eye, EyeOff, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { v4 as uuidv4 } from 'uuid'
import { auth, db,createUserWithEmailAndPassword,doc, setDoc  } from "@/config/firebase"


// List of Barangays in Marawi City
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

interface RegistrationFormProps {
  onLoginClick?: () => void
  onRegisterSuccess?: () => void
}

export function RegistrationForm({ onLoginClick, onRegisterSuccess }: RegistrationFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "jobseeker", // Default role
    isMultiRole: false,
    // Address fields (for both jobseeker and employer)
    barangay: "",
    street: "",
    city: "Marawi City", // Default for jobseeker
    province: "Lanao del Sur", // Default for jobseeker
    // Custom location for employers
    customLocation: false,
    // Employer fields
    companyName: "",
    businessPermit: null as File | null,
    // Other
    agreeToTerms: false,
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // Add success modal related state and handlers
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Reset form function
  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "jobseeker",
      isMultiRole: false,
      barangay: "",
      street: "",
      city: "Marawi City",
      province: "Lanao del Sur",
      customLocation: false,
      companyName: "",
      businessPermit: null,
      agreeToTerms: false,
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear error if editing email
    if (name === "email" && error) setError("")
  }

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value })
  }

  const handleMultiRoleChange = (checked: boolean) => {
    setFormData({ ...formData, isMultiRole: checked })
  }

  const handleBarangayChange = (value: string) => {
    setFormData({ ...formData, barangay: value })
  }

  const handleCustomLocationChange = (checked: boolean) => {
    setFormData({ ...formData, customLocation: checked })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, businessPermit: e.target.files[0] })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!formData.agreeToTerms) {
      setError("You must agree to the terms and conditions")
      return
    }

    // Role-specific validation
    if ((formData.role === "employer" || formData.isMultiRole) && !formData.companyName) {
      setError("Company name is required for employer accounts")
      return
    }

    if ((formData.role === "employer" || formData.isMultiRole) && !formData.businessPermit) {
      setError("Business permit is required for employer accounts")
      return
    }

    setIsLoading(true)

    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // Handle business permit file if provided
      let businessPermitPath = null
      if (formData.businessPermit && (formData.role === "employer" || formData.isMultiRole)) {
        try {
          // Create FormData for file upload
          const uploadData = new FormData()
          uploadData.append('file', formData.businessPermit)

          // Upload file using the API route
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: uploadData,
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Failed to upload business permit')
          }

          businessPermitPath = result.path
        } catch (error) {
          console.error('Error uploading business permit:', error)
          setError('Failed to upload business permit. Please try again.')
          return
        }
      }

      // Prepare user data for Firestore
      const userData = {
        // Only include first/last name for jobseeker or multi-role
        ...(formData.role === "jobseeker" || formData.isMultiRole
          ? { firstName: formData.firstName, lastName: formData.lastName }
          : {}),
        email: formData.email,
        role: formData.isMultiRole ? "multi" : formData.role,
        activeRole: formData.role,
        createdAt: new Date().toISOString(),
        // Address data for both roles
        barangay: formData.barangay,
        street: formData.street,
        city: formData.city,
        province: formData.province,
        address: `${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.province}`,
        // Employer-specific data
        ...(formData.role === "employer" || formData.isMultiRole
          ? {
            companyName: formData.companyName,
            businessPermitPath: businessPermitPath,
            isVerified: false,
          }
          : {}),
      }

      // Add user data to Firestore
      await setDoc(doc(db, "users", user.uid), userData)

      // Call success callback if provided
      if (onRegisterSuccess) {
        onRegisterSuccess()
      }

      // Reset form
      resetForm()
      
      // Show success modal instead of redirecting
      setShowSuccessModal(true)
    } catch (err: any) {
      console.error(err)
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use. Please try another email or login.")
        // Focus email field and scroll to error
        setTimeout(() => {
          emailInputRef.current?.focus()
          emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 100)
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.")
      } else {
        setError("An error occurred during registration: " + err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle navigating to login
  const handleGoToLogin = () => {
    setShowSuccessModal(false)
    if (onLoginClick) {
      onLoginClick()
    } else {
      router.push("/login")
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* First Name and Last Name only for jobseeker or multi-role */}
        {(formData.role === "jobseeker" || formData.isMultiRole) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required={formData.role === "jobseeker" || formData.isMultiRole} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required={formData.role === "jobseeker" || formData.isMultiRole} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            ref={emailInputRef}
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Account Type</Label>
          <RadioGroup value={formData.role} onValueChange={handleRoleChange} className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="jobseeker" id="jobseeker" />
              <Label htmlFor="jobseeker" className="font-normal">
                Jobseeker
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="employer" id="employer" />
              <Label htmlFor="employer" className="font-normal">
                Employer
              </Label>
            </div>
          </RadioGroup>

          {/* <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="multiRole"
              checked={formData.isMultiRole}
              onCheckedChange={(checked) => handleMultiRoleChange(checked as boolean)}
            />
            <Label htmlFor="multiRole" className="font-normal">
              Enable Multi-Role Account (access both Jobseeker and Employer features)
            </Label>
          </div> */}
        </div>

        {/* Address fields for all users */}
        <div className="space-y-4 p-4 border rounded-md bg-gray-50">
          <h3 className="font-medium">Address</h3>

          <div className="space-y-4">
            {(formData.role === "employer" || formData.isMultiRole) && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="customLocation"
                  checked={formData.customLocation}
                  onCheckedChange={(checked) => handleCustomLocationChange(checked as boolean)}
                />
                <Label htmlFor="customLocation" className="font-normal">
                  Enter custom location (outside Marawi City)
                </Label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                {(formData.role === "employer" || formData.isMultiRole) && formData.customLocation ? (
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="Enter province"
                  />
                ) : (
                  <Input id="province" value="Lanao del Sur" disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                {(formData.role === "employer" || formData.isMultiRole) && formData.customLocation ? (
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city/municipality"
                  />
                ) : (
                  <Input id="city" value="Marawi City" disabled />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barangay">Barangay</Label>
              {(formData.role === "employer" || formData.isMultiRole) && formData.customLocation ? (
                <Input
                  id="barangay"
                  value={formData.barangay}
                  onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                  placeholder="Enter barangay"
                />
              ) : (
                <Select value={formData.barangay} onValueChange={handleBarangayChange}>
                  <SelectTrigger>
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
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street / House No. / Building</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Enter street address"
              />
            </div>
          </div>
        </div>

        {(formData.role === "employer" || formData.isMultiRole) && (
          <div className="space-y-4 p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium">Employer Information</h3>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleInputChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessPermit">Business Permit</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="businessPermit"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("businessPermit")?.click()}
                  className="w-full justify-start"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {formData.businessPermit ? formData.businessPermit.name : "Upload business permit"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">Upload a scanned copy of your business permit (PDF, JPG, or PNG)</p>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked as boolean })}
          />
          <Label htmlFor="terms" className="text-sm font-normal">
            I agree to the{" "}
            <Link href="/terms" className="text-yellow-600 hover:text-yellow-700">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-yellow-600 hover:text-yellow-700">
              Privacy Policy
            </Link>
          </Label>
        </div>

        <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => !open && setShowSuccessModal(false)}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Registration Successful
            </DialogTitle>
            <DialogDescription>
              Your account has been created successfully! You can now log in to your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleGoToLogin} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
              Go to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6 text-center text-sm">
        Already have an account?{" "}
        {onLoginClick ? (
          <Button variant="link" className="p-0 text-yellow-600 hover:text-yellow-700" onClick={onLoginClick}>
            Login
          </Button>
        ) : (
          <Link href="/login" className="text-yellow-600 hover:text-yellow-700 font-medium">
            Login
          </Link>
        )}
      </div>
    </div>
  )
}
