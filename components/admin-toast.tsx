"use client"

import { createContext, useContext, useCallback, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"

interface AdminToastContextType {
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const AdminToastContext = createContext<AdminToastContextType | undefined>(undefined)

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()

  const success = useCallback(
    (message: string) => {
      toast({
        title: "Success",
        description: message,
        variant: "default",
      })
    },
    [toast],
  )

  const error = useCallback(
    (message: string) => {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    },
    [toast],
  )

  const warning = useCallback(
    (message: string) => {
      toast({
        title: "Warning",
        description: message,
        variant: "default",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800",
      })
    },
    [toast],
  )

  const info = useCallback(
    (message: string) => {
      toast({
        title: "Information",
        description: message,
        variant: "default",
        className: "bg-blue-50 border-blue-200 text-blue-800",
      })
    },
    [toast],
  )

  return <AdminToastContext.Provider value={{ success, error, warning, info }}>{children}</AdminToastContext.Provider>
}

export function useAdminToast() {
  const context = useContext(AdminToastContext)
  if (context === undefined) {
    throw new Error("useAdminToast must be used within an AdminToastProvider")
  }
  return context
}
