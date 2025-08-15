"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { AdminDataTable } from "@/components/admin-data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAdminToast } from "@/components/admin-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, query, where, orderBy, Timestamp } from "firebase/firestore"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { approveMultiRoleUpgrade, rejectMultiRoleUpgrade } from "@/lib/users"
import { format } from "date-fns"

// Request interface
interface MultiRoleRequest {
  id: string
  companyName: string
  firstName: string
  lastName: string
  email: string
  professionalTitle: string
  aboutMe: string
  requestedAt: string
  status: string
}

export default function MultiRoleRequestsPage() {
  const router = useRouter()
  const { success, error } = useAdminToast()
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [requestToReject, setRequestToReject] = useState<MultiRoleRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rejectionReason, setRejectionReason] = useState("")
  
  // State for request data
  const [pendingRequests, setPendingRequests] = useState<MultiRoleRequest[]>([])
  const [approvedRequests, setApprovedRequests] = useState<MultiRoleRequest[]>([])
  const [rejectedRequests, setRejectedRequests] = useState<MultiRoleRequest[]>([])

  // Load request data from Firestore
  useEffect(() => {
    const loadRequests = async () => {
      setIsLoading(true)
      try {
        // Get current admin user
        const userData = localStorage.getItem("ranaojobs_user")
        if (!userData) {
          router.push("/admin/login")
          return
        }
        
        const admin = JSON.parse(userData)
        
        // Get all employers with multiRoleRequested flag or role='multi-role'
        const pendingQuery = query(
          collection(db, "users"),
          where("role", "==", "multi-role")
        )
        
        const pendingDocs = await getDocs(pendingQuery)
        const pendingData = pendingDocs.docs.map(doc => {
          const data = doc.data()
          
          return {
            id: doc.id,
            companyName: data.companyName || "Unknown Company",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            professionalTitle: data.professionalTitle || "",
            aboutMe: data.aboutMe || "",
            requestedAt: formatTimestamp(data.multiRoleRequestDate),
            status: "pending"
          } as MultiRoleRequest
        })
        
        // Also check for legacy requests that might have multiRoleRequested flag
        const legacyPendingQuery = query(
          collection(db, "users"),
          where("multiRoleRequested", "==", true)
        )
        
        const legacyPendingDocs = await getDocs(legacyPendingQuery)
        const legacyPendingData = legacyPendingDocs.docs
          .filter(doc => doc.data().role !== "multi-role") // Avoid duplicates
          .map(doc => {
            const data = doc.data()
            
            return {
              id: doc.id,
              companyName: data.companyName || "Unknown Company",
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || "",
              professionalTitle: data.professionalTitle || "",
              aboutMe: data.aboutMe || "",
              requestedAt: formatTimestamp(data.multiRoleRequestDate),
              status: "pending (legacy)"
            } as MultiRoleRequest
          })
        
        // Combine both sets of results
        setPendingRequests([...pendingData, ...legacyPendingData])
        
        // Get approved requests
        const approvedQuery = query(
          collection(db, "users"),
          where("multiRoleApproved", "==", true),
          orderBy("multiRoleApprovedDate", "desc")
        )
        
        const approvedDocs = await getDocs(approvedQuery)
        const approvedData = approvedDocs.docs.map(doc => {
          const data = doc.data()
          
          return {
            id: doc.id,
            companyName: data.companyName || "Unknown Company",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            professionalTitle: data.professionalTitle || "",
            aboutMe: data.aboutMe || "",
            requestedAt: formatTimestamp(data.multiRoleRequestDate),
            status: "approved"
          } as MultiRoleRequest
        })
        setApprovedRequests(approvedData)
        
        // Get rejected requests
        const rejectedQuery = query(
          collection(db, "users"),
          where("multiRoleRejected", "==", true),
          orderBy("multiRoleRejectionDate", "desc")
        )
        
        const rejectedDocs = await getDocs(rejectedQuery)
        const rejectedData = rejectedDocs.docs.map(doc => {
          const data = doc.data()
          
          return {
            id: doc.id,
            companyName: data.companyName || "Unknown Company",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            professionalTitle: data.professionalTitle || "",
            aboutMe: data.aboutMe || "",
            requestedAt: formatTimestamp(data.multiRoleRequestDate),
            status: "rejected"
          } as MultiRoleRequest
        })
        setRejectedRequests(rejectedData)
        
      } catch (err) {
        console.error("Error loading multi-role requests:", err)
        error("Failed to load multi-role requests data")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadRequests()
  }, [router, error])
  
  // Format timestamps for display
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "Unknown"
    
    if (timestamp.toDate) {
      return format(timestamp.toDate(), "MMM d, yyyy")
    }
    
    return "Unknown"
  }

  const handleApproveRequest = async (request: MultiRoleRequest) => {
    setIsLoading(true)
    try {
      // Get current admin user
      const userData = localStorage.getItem("ranaojobs_user")
      if (!userData) {
        router.push("/admin/login")
        return
      }
      
      const admin = JSON.parse(userData)
      
      // Call approve function
      await approveMultiRoleUpgrade(request.id, admin.id)
      
      // Remove from pending list
      setPendingRequests(current => 
        current.filter(item => item.id !== request.id)
      )
      
      // Add to approved list
      const approvedRequest = {
        ...request,
        status: 'approved'
      }
      setApprovedRequests(current => [approvedRequest, ...current])
      
      // Show success message
      success(`Multi-role request for ${request.companyName} has been approved`)
    } catch (err) {
      console.error("Error approving multi-role request:", err)
      error(`Failed to approve request for ${request.companyName}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenRejectDialog = (request: MultiRoleRequest) => {
    setRequestToReject(request)
    setRejectionReason("")
    setIsRejectDialogOpen(true)
  }

  const confirmRejectRequest = async () => {
    if (!requestToReject) return
    if (!rejectionReason.trim()) {
      error("Please provide a reason for rejection")
      return
    }
    
    setIsLoading(true)
    try {
      // Get current admin user
      const userData = localStorage.getItem("ranaojobs_user")
      if (!userData) {
        router.push("/admin/login")
        return
      }
      
      const admin = JSON.parse(userData)
      
      // Call reject function
      await rejectMultiRoleUpgrade(requestToReject.id, admin.id, rejectionReason)
      
      // Remove from pending list
      setPendingRequests(current => 
        current.filter(item => item.id !== requestToReject.id)
      )
      
      // Add to rejected list
      const rejectedRequest = {
        ...requestToReject,
        status: 'rejected'
      }
      setRejectedRequests(current => [rejectedRequest, ...current])
      
      // Show success message
      error(`Multi-role request for ${requestToReject.companyName} has been rejected`)
      
      // Close dialog
      setIsRejectDialogOpen(false)
      setRequestToReject(null)
    } catch (err) {
      console.error("Error rejecting multi-role request:", err)
      error(`Failed to reject request for ${requestToReject.companyName}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminLayout title="Multi-Role Upgrade Requests">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Multi-Role Upgrade Requests</CardTitle>
            <CardDescription>Review and manage multi-role account upgrade requests from employers</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({approvedRequests.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedRequests.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {isLoading && !isRejectDialogOpen ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No pending multi-role requests</p>
                  </div>
                ) : (
                  <AdminDataTable
                    columns={[
                      { key: "companyName", title: "Company" },
                      { 
                        key: "requestedBy", 
                        title: "Requested By",
                        render: (_, row) => `${row.firstName} ${row.lastName}`
                      },
                      { key: "email", title: "Email" },
                      { key: "professionalTitle", title: "Professional Title" },
                      { key: "requestedAt", title: "Requested" },
                    ]}
                    data={pendingRequests}
                    searchable={true}
                    actions={[
                      {
                        label: "View Profile",
                        onClick: (row) => router.push(`/admin/users/${row.id}`),
                      },
                      {
                        label: "Approve",
                        onClick: handleApproveRequest,
                      },
                      {
                        label: "Reject",
                        onClick: handleOpenRejectDialog,
                      },
                    ]}
                    onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
                  />
                )}
              </TabsContent>

              <TabsContent value="approved">
                {approvedRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No approved multi-role requests</p>
                  </div>
                ) : (
                  <AdminDataTable
                    columns={[
                      { key: "companyName", title: "Company" },
                      { 
                        key: "requestedBy", 
                        title: "Requested By",
                        render: (_, row) => `${row.firstName} ${row.lastName}`
                      },
                      { key: "email", title: "Email" },
                      { key: "professionalTitle", title: "Professional Title" },
                      { key: "requestedAt", title: "Requested" },
                    ]}
                    data={approvedRequests}
                    searchable={true}
                    actions={[
                      {
                        label: "View Profile",
                        onClick: (row) => router.push(`/admin/users/${row.id}`),
                      },
                    ]}
                    onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
                  />
                )}
              </TabsContent>

              <TabsContent value="rejected">
                {rejectedRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No rejected multi-role requests</p>
                  </div>
                ) : (
                  <AdminDataTable
                    columns={[
                      { key: "companyName", title: "Company" },
                      { 
                        key: "requestedBy", 
                        title: "Requested By",
                        render: (_, row) => `${row.firstName} ${row.lastName}`
                      },
                      { key: "email", title: "Email" },
                      { key: "professionalTitle", title: "Professional Title" },
                      { key: "requestedAt", title: "Requested" },
                    ]}
                    data={rejectedRequests}
                    searchable={true}
                    actions={[
                      {
                        label: "View Profile",
                        onClick: (row) => router.push(`/admin/users/${row.id}`),
                      },
                    ]}
                    onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
                  />
                )}
              </TabsContent>
            </Tabs>
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
            <Button variant="destructive" onClick={confirmRejectRequest} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
} 