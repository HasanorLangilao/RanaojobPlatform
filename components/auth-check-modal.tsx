"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { AuthModal } from "@/components/auth-modal"
import { useRouter } from "next/navigation"

interface AuthCheckModalProps {
  isOpen: boolean
  onClose: () => void
  message?: string
  title?: string
  requiredRole?: "admin" | "employer" | "jobseeker" | string
  redirectPath?: string
}

export function AuthCheckModal({ isOpen, onClose, message, title, requiredRole, redirectPath }: AuthCheckModalProps) {
  const router = useRouter()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalView, setAuthModalView] = useState<"login" | "register">("login")
  const [hasCheckedRole, setHasCheckedRole] = useState(false)

  useEffect(() => {
    if (isOpen && requiredRole) {
      const userData = localStorage.getItem("ranaojobs_user")
      if (userData) {
        const user = JSON.parse(userData)
        const userRole = user.activeRole || user.role

        // If user is logged in but doesn't have the required role
        if (userRole !== requiredRole && userRole !== "admin" && userRole !== "multi") {
          setHasCheckedRole(true)
        } else {
          // User has the required role, close modal and redirect if needed
          onClose()
          if (redirectPath) {
            router.push(redirectPath)
          }
        }
      }
    }
  }, [isOpen, requiredRole, redirectPath, router, onClose])

  const openLoginModal = () => {
    onClose()
    setAuthModalView("login")
    setAuthModalOpen(true)
  }

  const openRegisterModal = () => {
    onClose()
    setAuthModalView("register")
    setAuthModalOpen(true)
  }

  const handleAuthModalClose = () => {
    setAuthModalOpen(false)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title || "Authentication Required"}</DialogTitle>
            <DialogDescription>
              {hasCheckedRole
                ? `You need ${requiredRole} access to perform this action.`
                : message || "You need to be logged in to perform this action."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={openLoginModal}>
              Login
            </Button>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={openRegisterModal}>
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuthModal isOpen={authModalOpen} onClose={handleAuthModalClose} defaultView={authModalView} />
    </>
  )
}
