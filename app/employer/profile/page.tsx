"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { AuthCheckModal } from "@/components/auth-check-modal"
import { Upload, Save, Loader2, Clock } from "lucide-react"
import Image from "next/image"
import { BackButton } from "@/components/back-button"
import { RoleSwitcher } from "@/components/role-switcher"
import { getUserProfile, updateCompanyProfile, requestMultiRoleUpgrade } from "@/lib/users"
import { useToast } from "@/components/ui/use-toast"
import { uploadEmployerLogo, uploadEmployerCoverImage } from "@/lib/fileUpload"
import { addEmployerActivity } from "@/lib/notifications"
import { getProvinces, getCitiesByProvince, getBarangaysByCity } from "@/lib/location-data"

export default function EmployerProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isMultiRole, setIsMultiRole] = useState(false)
  const [wantsToUpgrade, setWantsToUpgrade] = useState(false)
  const [multiRoleRequestStatus, setMultiRoleRequestStatus] = useState<string | null>(null)
  const [customIndustry, setCustomIndustry] = useState<string>("")
  const [profileData, setProfileData] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    founded: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    country: "Philippines",
    postalCode: "",
    description: "",
    benefits: [] as string[],
    socialMedia: {
      linkedin: "",
      facebook: "",
      twitter: "",
    },
    logo: "/placeholder.svg?height=200&width=200",
    coverImage: "/placeholder.svg?height=400&width=1200",
    receiveApplications: true,
    notifyNewApplicants: true,
    publicProfile: true,
    barangay: "",
    street: "",
  })

  // Add new state for unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [previewData, setPreviewData] = useState({
    logo: "/placeholder.svg?height=200&width=200",
    coverImage: "/placeholder.svg?height=400&width=1200",
  })
  // Add file state to store uploaded files
  const [uploadedFiles, setUploadedFiles] = useState<{
    logo: File | null,
    coverImage: File | null
  }>({
    logo: null,
    coverImage: null
  })

  // Add state to track initial form values for comparison
  const [initialProfileData, setInitialProfileData] = useState({ ...profileData })

  const [jobseekerData, setJobseekerData] = useState({
    firstName: "",
    lastName: "",
    professionalTitle: "",
    aboutMe: "",
  })

  const [isLogoUploading, setIsLogoUploading] = useState(false)
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverImageInputRef = useRef<HTMLInputElement>(null)

  // Add state for available cities and barangays
  const [availableCities, setAvailableCities] = useState<{ name: string; barangays: string[] }[]>([])
  const [availableBarangays, setAvailableBarangays] = useState<string[]>([])

  // Update available cities when province changes
  useEffect(() => {
    if (profileData.province) {
      const cities = getCitiesByProvince(profileData.province)
      setAvailableCities(cities)

      // Reset city and barangay if province changes
      if (!cities.some(city => city.name === profileData.city)) {
        setProfileData(prev => ({ ...prev, city: "", barangay: "" }))
      }
    }
  }, [profileData.province])

  // Update available barangays when city changes
  useEffect(() => {
    if (profileData.province && profileData.city) {
      const barangays = getBarangaysByCity(profileData.province, profileData.city)
      setAvailableBarangays(barangays)

      // Reset barangay if city changes
      if (!barangays.includes(profileData.barangay)) {
        setProfileData(prev => ({ ...prev, barangay: "" }))
      }
    }
  }, [profileData.province, profileData.city])

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (!storedUser) {
      setIsAuthModalOpen(true)
      return
    }

    const user = JSON.parse(storedUser)

    // Check if user has employer role
    if (user.role !== "employer" && user.role !== "multi") {
      router.push("/jobseeker-home")
      return
    }

    // If multi-role, ensure active role is employer
    if (user.role === "multi" && user.activeRole !== "employer") {
      user.activeRole = "employer"
      localStorage.setItem("ranaojobs_user", JSON.stringify(user))
    }

    setIsMultiRole(user.role === "multi")
    setUserData(user)

    // Fetch user profile from Firestore
    const fetchUserProfile = async () => {
      try {
        const profile = await getUserProfile(user.id)

        // Check for multi-role status
        if (profile.role === "multi") {
          setIsMultiRole(true)
        } else if (profile.role === "multi-role" || profile.multiRoleRequested) {
          // Handle pending state - either from role="multi-role" or from multiRoleRequested flag
          setMultiRoleRequestStatus("pending")
        } else if (profile.multiRoleRejected) {
          setMultiRoleRequestStatus("rejected")
        }

        // Update profile data with user's data from Firestore
        const updatedProfileData = {
          companyName: profile.companyName || profileData.companyName,
          industry: profile.industry || profileData.industry,
          companySize: profile.companySize || profileData.companySize,
          founded: profile.founded || profileData.founded,
          website: profile.website || profileData.website,
          email: profile.email || profileData.email,
          phone: profile.phone || profileData.phone,
          // Directly use the address field from Firestore
          address: profile.address || profileData.address,
          // Use barangay field from Firestore
          barangay: profile.barangay || profileData.barangay,
          // Keep these fields to avoid type errors even though we don't use them
          city: profile.city || profileData.city,
          province: profile.province || profileData.province,
          street: profile.street || profileData.street,
          country: profile.country || profileData.country,
          postalCode: profile.postalCode || profileData.postalCode,
          description: profile.description || profileData.description,
          benefits: profile.benefits || profileData.benefits,
          socialMedia: {
            linkedin: profile.socialMedia?.linkedin || profileData.socialMedia.linkedin,
            facebook: profile.socialMedia?.facebook || profileData.socialMedia.facebook,
            twitter: profile.socialMedia?.twitter || profileData.socialMedia.twitter,
          },
          logo: profile.logo || profileData.logo,
          coverImage: profile.coverImage || profileData.coverImage,
          receiveApplications: profile.receiveApplications !== undefined
            ? profile.receiveApplications
            : profileData.receiveApplications,
          notifyNewApplicants: profile.notifyNewApplicants !== undefined
            ? profile.notifyNewApplicants
            : profileData.notifyNewApplicants,
          publicProfile: profile.publicProfile !== undefined
            ? profile.publicProfile
            : profileData.publicProfile,
        };

        setProfileData(updatedProfileData);
        // Also store the initial data for comparison
        setInitialProfileData(updatedProfileData);

        // Check if industry is a custom value (not in the predefined list)
        const predefinedIndustries = [
          "Information Technology", "Healthcare", "Finance", 
          "Education", "Retail", "Manufacturing", "Telecommunications",
          "Skilled Labor", "Manual Labor", "Other"
        ];
        
        if (profile.industry && !predefinedIndustries.includes(profile.industry)) {
          setCustomIndustry(profile.industry);
          setProfileData(prev => ({ ...prev, industry: "Other" }));
        }

        // Initialize preview data with current saved data
        setPreviewData({
          logo: profile.logo || "/placeholder.svg?height=200&width=200",
          coverImage: profile.coverImage || "/placeholder.svg?height=400&width=1200",
        })

        // If user has multi-role, populate jobseeker data
        if (profile.role === "multi") {
          setJobseekerData({
            firstName: profile.firstName || "",
            lastName: profile.lastName || "",
            professionalTitle: profile.professionalTitle || "",
            aboutMe: profile.aboutMe || "",
          })
        }

      } catch (error) {
        console.error("Error fetching user profile:", error)
        toast({
          title: "Error",
          description: "Failed to load your profile data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [router, toast])

  // Add an event listener to refresh user data when role is updated by admin
  useEffect(() => {
    const handleUserRoleUpdate = async () => {
      if (!userData) return;

      try {
        // Re-fetch the user profile to get updated role info
        const updatedProfile = await getUserProfile(userData.id);

        if (updatedProfile.role === "multi") {
          // If role is now "multi", update UI to show multi-role features
          setIsMultiRole(true);
          setMultiRoleRequestStatus(null);

          // Update local user data
          const storedUser = localStorage.getItem("ranaojobs_user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            user.role = "multi";
            localStorage.setItem("ranaojobs_user", JSON.stringify(user));
            setUserData(user);
          }

          // Refresh the page to show multi-role features
          window.location.reload();
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    };

    window.addEventListener("userRoleUpdated", handleUserRoleUpdate);

    return () => {
      window.removeEventListener("userRoleUpdated", handleUserRoleUpdate);
    };
  }, [userData]);

  // Add effect to track changes in form data
  useEffect(() => {
    // Skip the initial render
    if (isLoading) return;

    // If there are uploaded files, we already know there are unsaved changes
    if (uploadedFiles.logo || uploadedFiles.coverImage) {
      setHasUnsavedChanges(true);
      return;
    }

    // Compare current profile data with initial data to detect changes
    const hasChanges =
      profileData.companyName !== initialProfileData.companyName ||
      profileData.industry !== initialProfileData.industry ||
      profileData.companySize !== initialProfileData.companySize ||
      profileData.founded !== initialProfileData.founded ||
      profileData.website !== initialProfileData.website ||
      profileData.phone !== initialProfileData.phone ||
      profileData.address !== initialProfileData.address ||
      profileData.barangay !== initialProfileData.barangay ||
      profileData.description !== initialProfileData.description ||
      profileData.receiveApplications !== initialProfileData.receiveApplications ||
      profileData.notifyNewApplicants !== initialProfileData.notifyNewApplicants ||
      profileData.publicProfile !== initialProfileData.publicProfile ||
      JSON.stringify(profileData.benefits) !== JSON.stringify(initialProfileData.benefits) ||
      profileData.socialMedia.linkedin !== initialProfileData.socialMedia.linkedin ||
      profileData.socialMedia.facebook !== initialProfileData.socialMedia.facebook ||
      profileData.socialMedia.twitter !== initialProfileData.socialMedia.twitter;

    setHasUnsavedChanges(hasChanges);

  }, [
    isLoading,
    uploadedFiles,
    profileData,
    initialProfileData
  ]);

  // Add effect to handle window beforeunload event for unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Add effect to reset hasUnsavedChanges when profile is first loaded
  useEffect(() => {
    if (!isLoading) {
      setHasUnsavedChanges(false);
    }
  }, [isLoading]);

  // Handle saving the employer profile
  const handleSaveProfile = async () => {
    if (!userData || isSaving) return;

    setIsSaving(true);

    try {
      // Determine the final industry value (use customIndustry if "Other" is selected)
      const finalIndustry = profileData.industry === "Other" && customIndustry 
        ? customIndustry 
        : profileData.industry;

      const updatedData: any = {
        companyName: profileData.companyName,
        industry: finalIndustry,
        companySize: profileData.companySize,
        founded: profileData.founded,
        website: profileData.website,
        email: profileData.email,
        phone: profileData.phone,
        // Save address and barangay fields
        address: profileData.address,
        barangay: profileData.barangay,
        // Include these for type compatibility but we don't actively use them
        province: profileData.province,
        city: profileData.city,
        street: profileData.street,
        description: profileData.description,
        benefits: profileData.benefits,
        socialMedia: profileData.socialMedia,
        receiveApplications: profileData.receiveApplications,
        notifyNewApplicants: profileData.notifyNewApplicants,
        publicProfile: profileData.publicProfile,
      };

      // Only include logo and coverImage in update if files were uploaded
      if (uploadedFiles.logo && previewData.logo !== initialProfileData.logo) {
        // Assuming upload function returns the URL
        const logoUrl = await uploadEmployerLogo(uploadedFiles.logo, userData.id);
        updatedData.logo = logoUrl;
      }

      if (uploadedFiles.coverImage && previewData.coverImage !== initialProfileData.coverImage) {
        // Assuming upload function returns the URL
        const coverImageUrl = await uploadEmployerCoverImage(uploadedFiles.coverImage, userData.id);
        updatedData.coverImage = coverImageUrl;
      }

      await updateCompanyProfile(userData.id, updatedData);

      // Identify changes for activity logging
      const changes: Record<string, any> = {};
      // Compare current profileData with initialProfileData to find changes
      for (const key in profileData) {
        if (Object.prototype.hasOwnProperty.call(profileData, key)) {
          const current = (profileData as any)[key];
          const initial = (initialProfileData as any)[key];

          // Handle different types of data
          if (key === 'socialMedia') {
            // Compare social media objects
            const socialMediaChanges: Record<string, string> = {};
            if (current.linkedin !== initial.linkedin) socialMediaChanges.linkedin = current.linkedin;
            if (current.facebook !== initial.facebook) socialMediaChanges.facebook = current.facebook;
            if (current.twitter !== initial.twitter) socialMediaChanges.twitter = current.twitter;
            if (Object.keys(socialMediaChanges).length > 0) changes[key] = socialMediaChanges;
          } else if (Array.isArray(current)) {
            // Simple array comparison (checks if content is different)
            if (JSON.stringify(current) !== JSON.stringify(initial)) {
              changes[key] = current;
            }
          } else if (current !== initial) {
            // Compare primitive types
            changes[key] = current;
          }
        }
      }

      // Include changes from uploaded files if they resulted in URL updates
      if (updatedData.logo && updatedData.logo !== initialProfileData.logo) {
        changes.logo = updatedData.logo;
      }
      if (updatedData.coverImage && updatedData.coverImage !== initialProfileData.coverImage) {
        changes.coverImage = updatedData.coverImage;
      }

      // After successful update, record activity
      // Only log activity if there were actual changes
      if (Object.keys(changes).length > 0) {
        await addEmployerActivity(
          userData.id,
          "profile_update",
          `Employer ${userData.firstName || ''} ${userData.lastName || ''} updated their company profile`,
          {
            companyName: updatedData.companyName,
            email: userData.email,
            changes: changes
          }
        );
      }

      toast({
        title: "Success",
        description: "Profile updated successfully.",
        variant: "default",
      });

      // Reset unsaved changes state and update initial data
      setHasUnsavedChanges(false);
      setInitialProfileData(profileData);
      setUploadedFiles({
        logo: null,
        coverImage: null
      });

    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestMultiRole = async () => {
    if (!userData) return

    setIsSaving(true)
    try {
      // Request multi-role upgrade in Firestore
      await requestMultiRoleUpgrade(userData.id, {
        firstName: jobseekerData.firstName,
        lastName: jobseekerData.lastName,
        professionalTitle: jobseekerData.professionalTitle,
        aboutMe: jobseekerData.aboutMe,
      })

      // Update local state for UI
      setMultiRoleRequestStatus("pending")
      setWantsToUpgrade(false)

      toast({
        title: "Request Submitted",
        description: "Your multi-role account request has been submitted for admin approval.",
      })
    } catch (error) {
      console.error("Error requesting account upgrade:", error)
      toast({
        title: "Error",
        description: "Failed to submit your upgrade request",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userData) return

    try {
      setIsLogoUploading(true)
      const file = e.target.files[0]

      // Validate file type
      if (!file.type.includes('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (PNG, JPG)",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo image must be under 2MB",
          variant: "destructive",
        })
        return
      }

      // Create preview URL
      const reader = new FileReader()
      reader.onload = () => {
        const previewUrl = reader.result as string

        // Update preview only (don't save to server yet)
        setPreviewData(prev => ({
          ...prev,
          logo: previewUrl
        }))

        // Store the file for later upload when Save Changes is clicked
        setUploadedFiles(prev => ({
          ...prev,
          logo: file
        }))

        // Set flag for unsaved changes
        setHasUnsavedChanges(true)
      }
      reader.readAsDataURL(file)

      toast({
        title: "Logo preview ready",
        description: "Click Save Changes to apply your new logo",
      })
    } catch (error) {
      console.error("Error processing logo:", error)
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your logo",
        variant: "destructive",
      })
    } finally {
      setIsLogoUploading(false)
    }
  }

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userData) return

    try {
      setIsCoverImageUploading(true)
      const file = e.target.files[0]

      // Validate file type
      if (!file.type.includes('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (PNG, JPG)",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Cover image must be under 5MB",
          variant: "destructive",
        })
        return
      }

      // Create preview URL
      const reader = new FileReader()
      reader.onload = () => {
        const previewUrl = reader.result as string

        // Update preview only (don't save to server yet)
        setPreviewData(prev => ({
          ...prev,
          coverImage: previewUrl
        }))

        // Store the file for later upload when Save Changes is clicked
        setUploadedFiles(prev => ({
          ...prev,
          coverImage: file
        }))

        // Set flag for unsaved changes
        setHasUnsavedChanges(true)
      }
      reader.readAsDataURL(file)

      toast({
        title: "Cover image preview ready",
        description: "Click Save Changes to apply your new cover image",
      })
    } catch (error) {
      console.error("Error processing cover image:", error)
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your cover image",
        variant: "destructive",
      })
    } finally {
      setIsCoverImageUploading(false)
    }
  }

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />

      <main className="flex-grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <BackButton className="mb-4" href="/employer-home" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Company Profile</h1>
              <p className="text-gray-600">Manage your company information and preferences</p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              {isMultiRole && (
                <div className="mr-2">
                  <RoleSwitcher />
                </div>
              )}
              {hasUnsavedChanges && (
                <p className="text-amber-600 text-xs md:text-sm flex items-center">
                  <span className="hidden md:inline mr-1">You have unsaved changes!</span>
                  <span className="md:hidden mr-1">Unsaved changes</span>
                </p>
              )}
              <Button
                className={`${hasUnsavedChanges ? 'bg-yellow-500 animate-pulse' : 'bg-yellow-500'} hover:bg-yellow-600 text-black`}
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>

          {/* MultiRole Upgrade Card */}
          {!isMultiRole && !wantsToUpgrade && multiRoleRequestStatus !== "pending" && (
            <Card className="mb-6 border-yellow-500">
              <CardHeader className="bg-yellow-50">
                <CardTitle className="text-lg">Upgrade to MultiRole Account</CardTitle>
                <CardDescription>
                  Want to apply for jobs as a jobseeker while maintaining your employer profile? Upgrade to a MultiRole
                  account!
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  With a MultiRole account, you can easily switch between Employer and Jobseeker modes, allowing you to
                  both post job listings and apply for jobs. {multiRoleRequestStatus === "rejected" && (
                    <span className="text-red-600 font-medium">Your previous request was rejected. You may submit a new request.</span>
                  )}
                </p>
                <Button
                  variant="outline"
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  onClick={() => setWantsToUpgrade(true)}
                >
                  Request Upgrade
                </Button>
              </CardContent>
            </Card>
          )}

          {/* MultiRole Pending Approval Card */}
          {!isMultiRole && multiRoleRequestStatus === "pending" && (
            <Card className="mb-6 border-blue-500">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg">MultiRole Account Request Pending</CardTitle>
                <CardDescription>
                  Your request to upgrade to a MultiRole account is currently being reviewed by admins.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  Once approved, you'll be able to switch between Employer and Jobseeker modes. We'll notify you when your request has been processed.
                </p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600 text-sm font-medium">Pending Admin Approval</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* MultiRole Upgrade Form */}
          {!isMultiRole && wantsToUpgrade && (
            <Card className="mb-6 border-yellow-500">
              <CardHeader className="bg-yellow-50">
                <CardTitle className="text-lg">Complete Your Jobseeker Profile</CardTitle>
                <CardDescription>
                  Please provide the following information to request a MultiRole account
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Your first name"
                      value={jobseekerData.firstName}
                      onChange={(e) => setJobseekerData({ ...jobseekerData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Your last name"
                      value={jobseekerData.lastName}
                      onChange={(e) => setJobseekerData({ ...jobseekerData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="professionalTitle">Professional Title</Label>
                  <Input
                    id="professionalTitle"
                    placeholder="e.g. Software Engineer"
                    value={jobseekerData.professionalTitle}
                    onChange={(e) => setJobseekerData({ ...jobseekerData, professionalTitle: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aboutMe">About Me</Label>
                  <Textarea
                    id="aboutMe"
                    placeholder="Brief description about yourself and your professional background"
                    rows={3}
                    value={jobseekerData.aboutMe}
                    onChange={(e) => setJobseekerData({ ...jobseekerData, aboutMe: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <Button variant="outline" onClick={() => setWantsToUpgrade(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={handleRequestMultiRole}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="company" className="space-y-6">
            <TabsList className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <TabsTrigger value="company">Company Info</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
            </TabsList>

            {/* Company Information Tab */}
            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Update your company details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={profileData.companyName}
                        onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select
                        value={profileData.industry}
                        onValueChange={(value) => setProfileData({ ...profileData, industry: value })}
                      >
                        <SelectTrigger id="industry">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Information Technology">Information Technology</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                          <SelectItem value="Skilled Labor">Skilled Labor (e.g. Electricians, Plumbers, Carpenters)</SelectItem>
                          <SelectItem value="Manual Labor">Manual Labor (e.g. Construction, Farm Workers, Factory Workers)</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {profileData.industry === "Other" && (
                        <Input
                          className="mt-2"
                          placeholder="Please specify your industry"
                          value={customIndustry}
                          onChange={(e) => setCustomIndustry(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="companySize">Company Size</Label>
                      <Select
                        value={profileData.companySize}
                        onValueChange={(value) => setProfileData({ ...profileData, companySize: value })}
                      >
                        <SelectTrigger id="companySize">
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501-1000">501-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="founded">Year Founded</Label>
                      <Input
                        id="founded"
                        value={profileData.founded}
                        onChange={(e) => setProfileData({ ...profileData, founded: e.target.value })}
                        placeholder="e.g., 2010"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={profileData.website}
                        onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Contact Email</Label>
                      <Input
                        id="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+63 912 345 6789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      value={profileData.description}
                      onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                      rows={5}
                      placeholder="Describe your company, its mission, values, and what makes it unique..."
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Location</h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          placeholder="Full address"
                          rows={3}
                        />
                      </div>


                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Social Media</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input
                          id="linkedin"
                          value={profileData.socialMedia.linkedin}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              socialMedia: { ...profileData.socialMedia, linkedin: e.target.value },
                            })
                          }
                          placeholder="https://linkedin.com/company/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="facebook">Facebook</Label>
                        <Input
                          id="facebook"
                          value={profileData.socialMedia.facebook}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              socialMedia: { ...profileData.socialMedia, facebook: e.target.value },
                            })
                          }
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="twitter">Twitter</Label>
                        <Input
                          id="twitter"
                          value={profileData.socialMedia.twitter}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              socialMedia: { ...profileData.socialMedia, twitter: e.target.value },
                            })
                          }
                          placeholder="https://twitter.com/..."
                        />
                      </div>
                    </div>
                  </div>


                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Company Branding</CardTitle>
                  <CardDescription>Upload your company logo and customize your profile appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Company Logo</Label>
                    <div className="flex flex-col items-center p-6 border rounded-lg">
                      <div className="relative w-32 h-32 mb-4 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={previewData.logo || "/placeholder.svg"}
                          alt="Company Logo"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Upload a square logo (PNG, JPG). Recommended size: 200x200px
                      </p>
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                        id="logo-upload"
                      />
                      <div className="flex flex-col gap-2 w-full">
                        <Button
                          variant="outline"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isLogoUploading}
                        >
                          {isLogoUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Logo
                            </>
                          )}
                        </Button>
                        {uploadedFiles.logo && (
                          <p className="text-xs text-amber-600 text-center">
                            Changes will be applied after clicking "Save Changes"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Cover Image</Label>
                    <div className="flex flex-col items-center p-6 border rounded-lg">
                      <div className="relative w-full h-40 mb-4 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={previewData.coverImage || "/placeholder.svg"}
                          alt="Cover Image"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Upload a cover image (PNG, JPG). Recommended size: 1200x400px
                      </p>
                      <input
                        type="file"
                        ref={coverImageInputRef}
                        onChange={handleCoverImageUpload}
                        accept="image/*"
                        className="hidden"
                        id="cover-image-upload"
                      />
                      <div className="flex flex-col gap-2 w-full">
                        <Button
                          variant="outline"
                          onClick={() => coverImageInputRef.current?.click()}
                          disabled={isCoverImageUploading}
                        >
                          {isCoverImageUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Cover Image
                            </>
                          )}
                        </Button>
                        {uploadedFiles.coverImage && (
                          <p className="text-xs text-amber-600 text-center">
                            Changes will be applied after clicking "Save Changes"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Benefits</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                      {profileData.benefits.map((benefit, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700"
                        >
                          {benefit}
                          <button
                            className="ml-2 text-gray-500 hover:text-gray-700"
                            onClick={() => {
                              const newBenefits = [...profileData.benefits]
                              newBenefits.splice(index, 1)
                              setProfileData({ ...profileData, benefits: newBenefits })
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <Input
                        className="flex-1 min-w-[150px] border-0 p-0 h-7 focus-visible:ring-0"
                        placeholder="Add a benefit..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value) {
                            e.preventDefault()
                            setProfileData({
                              ...profileData,
                              benefits: [...profileData.benefits, e.currentTarget.value],
                            })
                            e.currentTarget.value = ""
                          }
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      <AuthCheckModal
        isOpen={isAuthModalOpen}
        onClose={() => router.push("/")}
        title="Employer Account Required"
        message="You need to login or register as an employer to access this page."
      />
    </div>
  )
}
