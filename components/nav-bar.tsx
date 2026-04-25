"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { User, LogOut, Menu, X, ChevronDown, Briefcase, Users } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { JobseekerNotificationDropdown } from "@/components/jobseeker-notification-dropdown"
import { AuthModal } from "@/components/auth-modal"
import { RoleSwitcher } from "@/components/role-switcher"
import { recordActivity, logLogoutActivity } from "@/lib/activity-logger"

export function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalView, setAuthModalView] = useState<"login" | "register">("login")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [activeRole, setActiveRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [notificationRefresh, setNotificationRefresh] = useState(0)

  // Fix hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Listen for notification updates
  useEffect(() => {
    const handleUserStateChange = () => {
      // Trigger a refresh of notifications
      setNotificationRefresh(prev => prev + 1)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener("userStateChange", handleUserStateChange)

      return () => {
        window.removeEventListener("userStateChange", handleUserStateChange)
      }
    }

    return undefined
  }, [])

  // Check if user is logged in
  useEffect(() => {
    const checkLoginStatus = () => {
      const userData = localStorage.getItem("ranaojobs_user")
      if (userData) {
        try {
          const user = JSON.parse(userData)
          setIsLoggedIn(true)
          setUserRole(user.role)
          setActiveRole(user.activeRole || user.role)
          setUserName(user.firstName || user.companyName || user.email)

          // Log user role information for debugging
          console.log("NavBar - User role info:", { 
            role: user.role, 
            activeRole: user.activeRole || user.role,
            isMultiRole: user.role === "multi"
          })

          // Set logo and profile photo
          setLogo(user.logo || null)
          setProfilePhoto(user.profilePhoto || null)
        } catch (error) {
          console.error("Error parsing user data:", error)
          setIsLoggedIn(false)
          setUserRole(null)
          setActiveRole(null)
          setUserName(null)
          setLogo(null)
          setProfilePhoto(null)
        }
      } else {
        setIsLoggedIn(false)
        setUserRole(null)
        setActiveRole(null)
        setUserName(null)
        setLogo(null)
        setProfilePhoto(null)
      }
    }

    // Check on initial load
    checkLoginStatus()

    // Set up event listener for storage changes
    window.addEventListener("storage", checkLoginStatus)

    // Custom event for login/logout
    window.addEventListener("userStateChange", checkLoginStatus)

    return () => {
      window.removeEventListener("storage", checkLoginStatus)
      window.removeEventListener("userStateChange", checkLoginStatus)
    }
  }, [])

  const openLoginModal = () => {
    setAuthModalView("login")
    setAuthModalOpen(true)
  }

  const openRegisterModal = () => {
    setAuthModalView("register")
    setAuthModalOpen(true)
  }

  const handleLogout = async () => {
    const userData = localStorage.getItem("ranaojobs_user")
    if (userData) {
      const user = JSON.parse(userData)
      // Log logout activity using the specialized function
      await logLogoutActivity(
        user.id,
        user.role,
        user.activeRole || user.role
      )
    }

    localStorage.removeItem("ranaojobs_user")
    setIsLoggedIn(false)
    setUserRole(null)
    setActiveRole(null)

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("userStateChange"))

    // Redirect to home page
    router.push("/")
  }

  const isEmployer = activeRole === "employer"
  const isJobseeker = activeRole === "jobseeker"
  const isAdmin = userRole === "admin"
  const isMultiRole = userRole === "multi"

  // Function to handle navigation to Job Map
  const handleJobMapClick = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/job-map")
    if (isMenuOpen) {
      setIsMenuOpen(false)
    }
  }

  // Don't render anything during SSR to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-gray-900 shadow-sm z-50">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-1">
              <div className="w-18 h-18 relative">
                <Image 
                  src="/images/logo_icon.png" 
                  alt="RANAO Jobs Logo"
                  width={72}
                  height={72}
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-bold text-white">
                <span className="text-white">RANAO</span>
                <span className="text-yellow-500">Jobs</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {/* Only show Home for non-employers and non-jobseekers */}
              {(!isLoggedIn || (!isEmployer && !isJobseeker)) && (
                <Link
                  href="/"
                  className={`text-sm font-medium text-gray-300 hover:text-yellow-500 ${pathname === "/" ? "text-yellow-500" : ""}`}
                >
                  Home
                </Link>
              )}

              {/* Only show Find Jobs for non-employers */}
              {(!isLoggedIn || !isEmployer) && (
                <Link
                  href="/find-jobs"
                  className={`text-sm font-medium text-gray-300 hover:text-yellow-500 ${pathname === "/find-jobs" ? "text-yellow-500" : ""}`}
                >
                  Find Jobs
                </Link>
              )}

              {/* Show Job Map for jobseekers */}
              {(!isLoggedIn || isJobseeker) && (
                <a
                  href="/job-map"
                  onClick={handleJobMapClick}
                  className={`text-sm font-medium text-gray-300 hover:text-yellow-500 ${pathname === "/job-map" ? "text-yellow-500" : ""}`}
                >
                  Job Map
                </a>
              )}

              
              {!isLoggedIn && (
                <Link
                  href="/about"
                  className={`text-sm font-medium text-gray-300 hover:text-yellow-500 ${pathname === "/about" ? "text-yellow-500" : ""}`}
                >
                  about
                </Link>
              )}
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  {/* Role Switcher for multi-role accounts */}
                  {isMultiRole && <RoleSwitcher />}

                  {/* Notifications - use the right component based on role */}
                  {isEmployer ?
                    <NotificationDropdown key={`emp-${notificationRefresh}`} /> :
                    isJobseeker ?
                      <JobseekerNotificationDropdown key={`js-${notificationRefresh}`} /> :
                      null
                  }


                  {/* Theme Toggle */}
                  <ModeToggle />

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative flex items-center gap-2 text-gray-300">
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                            {isEmployer && !isMultiRole ? (
                              logo ? (
                                <div className="h-8 w-8 relative rounded-full overflow-hidden">
                                  <Image
                                    src={logo}
                                    alt="Company Logo"
                                    fill
                                    unoptimized={logo.startsWith('data:')}
                                    className="object-cover rounded-full"
                                  />
                                </div>
                              ) : (
                                <User className="h-4 w-4 text-white" />
                              )
                            ) : profilePhoto ? (
                              <div className="h-8 w-8 relative rounded-full overflow-hidden">
                                <Image
                                  src={profilePhoto}
                                  alt="Profile Photo"
                                  fill
                                  unoptimized={profilePhoto.startsWith('data:')}
                                  className="object-cover rounded-full"
                                />
                              </div>
                            ) : (
                              <User className="h-4 w-4 text-white" />
                            )}
                          </div>

                        <span className="max-w-25 truncate">{userName}</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isAdmin ? (
                        <DropdownMenuItem onClick={() => router.push("/admin")}>Admin Dashboard</DropdownMenuItem>
                      ) : isEmployer ? (
                        <DropdownMenuItem onClick={() => router.push("/employer-home")}>Employer Home</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => router.push("/jobseeker-home")}>
                          Jobseeker Home
                        </DropdownMenuItem>
                      )}

                      {isEmployer && (
                        <>
                          <DropdownMenuItem onClick={() => router.push("/employer/jobs")}>My Jobs</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push("/post-job")}>Post a Job</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push("/employer/profile")}>
                            Profile Settings
                          </DropdownMenuItem>
                        </>
                      )}

                      {isJobseeker && (
                        <>
                          <DropdownMenuItem onClick={() => router.push("/jobseeker/applications")}>
                            My Applications
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push("/jobseeker/profile")}>
                            Profile Settings
                          </DropdownMenuItem>
                        </>
                      )}

                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <>
                  <ModeToggle />
                  <Button size="sm"    className=" border border-input text-white" onClick={openLoginModal}>
                    Login
                  </Button>
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    size="sm"
                    onClick={openRegisterModal}
                  >
                    Register
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {/* Role Switcher for multi-role accounts */}
              {isLoggedIn && isMultiRole && <RoleSwitcher />}

              {/* Notifications for mobile */}
              {isLoggedIn && (
                isEmployer ?
                  <NotificationDropdown key={`emp-mobile-${notificationRefresh}`} /> :
                  isJobseeker ?
                    <JobseekerNotificationDropdown key={`js-mobile-${notificationRefresh}`} /> :
                    null
              )}


              <ModeToggle />
              <button className="text-white" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800">
            <div className="container mx-auto px-4 py-3 space-y-3">
              {/* Only show Home for non-employers and non-jobseekers */}
              {(!isLoggedIn || (!isEmployer && !isJobseeker)) && (
                <Link
                  href="/"
                  className={`block py-2 text-sm font-medium text-gray-300 hover:text-yellow-500 ${pathname === "/" ? "text-yellow-500" : ""}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
              )}

              {/* Only show Find Jobs for non-employers */}
              {(!isLoggedIn || !isEmployer) && (
                <Link
                  href="/find-jobs"
                  className={`block py-2 text-sm font-medium text-gray-300 hover:text-yellow-500 ${pathname === "/find-jobs" ? "text-yellow-500" : ""}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Find Jobs
                </Link>
              )}

              {/* Show Job Map for jobseekers */}
              {(!isLoggedIn || isJobseeker) && (
                <a
                  href="/job-map"
                  onClick={handleJobMapClick}
                  className={`block py-2 text-sm font-medium text-gray-300 hover:text-yellow-500 ${pathname === "/job-map" ? "text-yellow-500" : ""}`}
                >
                  Job Map
                </a>
              )}

              {/* About page - available to all users */}
              <Link
                href="/about"
                className={`block py-2 text-sm font-medium text-gray-300 hover:text-yellow-500 ${pathname === "/about" ? "text-yellow-500" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>

              <div className="pt-2 flex flex-col space-y-2">
                {isLoggedIn ? (
                  <>
                    <Link
                      href={isAdmin ? "/admin" : isEmployer ? "/employer-home" : "/jobseeker-home"}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Button variant="outline" className="w-full justify-center">
                        My Home
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-center text-gray-300"
                      onClick={() => {
                        setIsMenuOpen(false)
                        handleLogout()
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-center "
                      onClick={() => {
                        setIsMenuOpen(false)
                        openLoginModal()
                      }}
                    >
                      Login
                    </Button>
                    <Button
                      className="w-full justify-center bg-yellow-500 hover:bg-yellow-600 text-black"
                      onClick={() => {
                        setIsMenuOpen(false)
                        openRegisterModal()
                      }}
                    >
                      Register
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultView={authModalView} />
    </>
  )
}
