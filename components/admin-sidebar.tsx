"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Users, Briefcase, FileCheck, Building2, BarChart2, Settings, LogOut, X, Home, Activity, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { recordActivity, logLogoutActivity } from "@/lib/activity-logger"

interface AdminSidebarProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  currentPath?: string
}

export function AdminSidebar({ isOpen = false, setIsOpen, currentPath = "" }: AdminSidebarProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Fix hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

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
    window.dispatchEvent(new Event("userStateChange"))
    router.push("/")
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/users", label: "Manage Users", icon: Users },
    { href: "/admin/employers", label: "Manage Employers", icon: Building2 },
    { href: "/admin/jobs", label: "Manage Job Listings", icon: Briefcase },
    { href: "/admin/verifications", label: "Account Verifications", icon: FileCheck },
    { href: "/admin/multirole-requests", label: "Multi-Role Requests", icon: UserPlus },
    { href: "/admin/activity", label: "Activity Log", icon: Activity },
    { href: "/admin/reports", label: "View Reports", icon: BarChart2 },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ]

  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen?.(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white transition-transform duration-300 ease-in-out lg:relative lg:z-0 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Close button - mobile only */}
        <button
          className="absolute top-4 right-4 text-white lg:hidden"
          onClick={() => setIsOpen?.(false)}
          aria-label="Close sidebar"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Logo */}
        <div className="flex items-center p-6">
          <Link href="/admin" className="text-xl font-bold">
            RANAO<span className="text-yellow-500">Jobs</span> <span className="text-sm font-normal">Admin</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.href
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                      isActive
                        ? "bg-yellow-500 text-black font-medium"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white",
                    )}
                    onClick={() => setIsOpen?.(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-8 left-0 right-0 px-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:bg-gray-800 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </>
  )
}
