"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAdminToast } from "@/components/admin-toast"
import { Loader2, User, Mail, Building, Calendar, CheckCircle, XCircle, ArrowLeft, Briefcase } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { approveMultiRoleUpgrade, rejectMultiRoleUpgrade } from "@/lib/users"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserData {
  id: string
  companyName: string
  firstName: string
  lastName: string
  email: string
  professionalTitle: string
  aboutMe: string
  role: string
  multiRoleRequestDate: any
  multiRoleRequested: boolean
  multiRoleApproved?: boolean
  multiRoleApprovedDate?: any
  multiRoleRejected?: boolean
  multiRoleRejectionDate?: any
  multiRoleRejectionReason?: string
}

export default function MultiRoleRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params)
  const userId = unwrappedParams.id
  const router = useRouter()
  const { success, error } = useAdminToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true)
      try {
        // Get user document from Firestore
        const userDoc = await getDoc(doc(db, "users", userId))
        
        if (!userDoc.exists()) {
          error("User not found")
          router.push("/admin/multirole-requests")
          return
        }
        
        const user = {
          id: userDoc.id,
          ...userDoc.data(),
        } as UserData
        
        // If user has no multi-role request, redirect back
        if (user.role !== "multi-role" && !user.multiRoleRequested && !user.multiRoleApproved && !user.multiRoleRejected) {
          error("This user has no multi-role request")
          router.push("/admin/multirole-requests")
          return
        }
        
        setUserData(user)
      } catch (err) {
        console.error("Error fetching user data:", err)
        error("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [userId, router, error])

  const handleApproveRequest = async () => {
    if (!userData) return
    
    setIsActionLoading(true)
    try {
      // Get current admin user
      const storedUser = localStorage.getItem("ranaojobs_user")
      if (!storedUser) {
        router.push("/admin/login")
        return
      }
      
      const admin = JSON.parse(storedUser)
      
      // Approve multi-role request
      await approveMultiRoleUpgrade(userData.id, admin.id)
      
      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        multiRoleRequested: false,
        multiRoleApproved: true
      } : null)
      
      // Show success message
      success(`Request for ${userData.companyName} has been approved`)
      
      // Redirect back after a delay
      setTimeout(() => {
        router.push("/admin/multirole-requests")
      }, 1500)
    } catch (err) {
      console.error("Error approving request:", err)
      error("Failed to approve request")
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleOpenRejectDialog = () => {
    setIsRejectDialogOpen(true)
  }

  const handleRejectRequest = async () => {
    if (!userData) return
    
    if (!rejectionReason.trim()) {
      error("Please provide a reason for rejection")
      return
    }

    setIsActionLoading(true)
    try {
      // Get current admin user
      const storedUser = localStorage.getItem("ranaojobs_user")
      if (!storedUser) {
        router.push("/admin/login")
        return
      }
      
      const admin = JSON.parse(storedUser)
      
      // Reject multi-role request
      await rejectMultiRoleUpgrade(userData.id, admin.id, rejectionReason)
      
      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        multiRoleRequested: false,
        multiRoleRejected: true,
        multiRoleRejectionReason: rejectionReason
      } : null)
      
      // Show success message
      error(`Request for ${userData.companyName} has been rejected`)
      
      // Close dialog
      setIsRejectDialogOpen(false)
      
      // Redirect back after a delay
      setTimeout(() => {
        router.push("/admin/multirole-requests")
      }, 1500)
    } catch (err) {
      console.error("Error rejecting request:", err)
      error("Failed to reject request")
    } finally {
      setIsActionLoading(false)
    }
  }
  
  // Determine request status
  const getRequestStatus = (): string => {
    if (!userData) return "unknown"
    if (userData.multiRoleApproved || userData.role === "multi") return "approved"
    if (userData.multiRoleRejected) return "rejected"
    if (userData.role === "multi-role" || userData.multiRoleRequested) return "pending"
    return "unknown"
  }
  
  // Format date for display
  const formatDate = (date: any): string => {
    if (!date) return "Unknown"
    
    if (date.toDate) {
      return format(date.toDate(), "MMM d, yyyy")
    }
    
    return "Unknown"
  }

  if (isLoading) {
    return (
      <AdminLayout title="Multi-Role Request Details">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      </AdminLayout>
    )
  }

  const status = getRequestStatus()

  return (
    <AdminLayout title="Multi-Role Request Details">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            Multi-Role Request: {userData?.companyName}
          </h2>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/admin/multirole-requests")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
            {status === "pending" && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={handleOpenRejectDialog}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={handleApproveRequest}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Request Details */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              <div className="flex items-center mt-1 gap-2">
                <span>Status:</span>
                {status === "pending" && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Pending Approval
                  </span>
                )}
                {status === "approved" && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Approved
                  </span>
                )}
                {status === "rejected" && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    Rejected
                  </span>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-gray-100 p-2">
                    <Building className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Company</p>
                    <p className="text-sm text-gray-500">{userData?.companyName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-gray-100 p-2">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Contact Person</p>
                    <p className="text-sm text-gray-500">
                      {userData?.firstName} {userData?.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-gray-100 p-2">
                    <Mail className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-gray-500">
                      {userData?.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-gray-100 p-2">
                    <Briefcase className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Professional Title</p>
                    <p className="text-sm text-gray-500">
                      {userData?.professionalTitle || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-gray-100 p-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Request Date</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(userData?.multiRoleRequestDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Me Section */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-medium">About Me</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {userData?.aboutMe || "No information provided"}
              </p>
            </div>

            {/* Request Status History */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-medium">Request Status</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Request submitted</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(userData?.multiRoleRequestDate)}
                    </p>
                  </div>
                </div>
                
                {userData?.multiRoleApproved && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 p-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Request approved</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(userData?.multiRoleApprovedDate)}
                      </p>
                    </div>
                  </div>
                )}
                
                {userData?.multiRoleRejected && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-red-100 p-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">Request rejected</p>
                      <p className="text-sm text-gray-500">
                        Reason: {userData?.multiRoleRejectionReason || "No reason provided"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(userData?.multiRoleRejectionDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Confirmation Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Multi-Role Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this multi-role account request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest} disabled={isActionLoading}>
              {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
} 