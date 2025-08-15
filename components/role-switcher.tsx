"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Briefcase, ChevronDown, User, Clock } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type UserData = {
  email: string
  role: string
  activeRole: "employer" | "jobseeker" | string
  firstName?: string
  lastName?: string
}

export function RoleSwitcher() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      console.log("RoleSwitcher - User data loaded:", parsedUser)
      setUserData(parsedUser)
    }
  }, [])

  // Listen for user state changes
  useEffect(() => {
    const handleUserStateChange = () => {
      const storedUser = localStorage.getItem("ranaojobs_user")
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        console.log("RoleSwitcher - User state changed:", parsedUser)
        setUserData(parsedUser)
      }
    }

    window.addEventListener("userStateChange", handleUserStateChange)
    return () => {
      window.removeEventListener("userStateChange", handleUserStateChange)
    }
  }, [])

  // Only render for multi-role accounts
  if (!isClient || !userData) {
    console.log("RoleSwitcher - Not rendering: Client or user data not ready")
    return null
  }

  // For pending multi-role requests
  if (userData.role === "multi-role") {
    console.log("RoleSwitcher - Rendering pending approval state")
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 cursor-not-allowed opacity-70">
              <Clock className="h-4 w-4" />
              Pending Approval
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Your multi-role account is pending admin approval</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Only show for multi-role accounts
  if (userData.role !== "multi") {
    console.log("RoleSwitcher - Not rendering: User is not a multi-role account", { role: userData.role })
    return null
  }

  console.log("RoleSwitcher - Rendering switcher for multi-role user with active role:", userData.activeRole)

  const switchRole = (newRole: string) => {
    console.log("RoleSwitcher - Switching role to:", newRole)
    const updatedUserData = { ...userData, activeRole: newRole }
    localStorage.setItem("ranaojobs_user", JSON.stringify(updatedUserData))
    setUserData(updatedUserData)

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("userStateChange"))

    // Redirect to appropriate dashboard
    if (newRole === "employer") {
      router.push("/employer-home")
    } else {
      router.push("/jobseeker-home")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          {userData.activeRole === "employer" ? <Briefcase className="h-4 w-4" /> : <User className="h-4 w-4" />}
          {userData.activeRole === "employer" ? "Employer" : "Jobseeker"}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => switchRole("jobseeker")}
          className={userData.activeRole === "jobseeker" ? "bg-yellow-100 dark:bg-yellow-900" : ""}
        >
          <User className="h-4 w-4 mr-2" />
          Jobseeker
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchRole("employer")}
          className={userData.activeRole === "employer" ? "bg-yellow-100 dark:bg-yellow-900" : ""}
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Employer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
