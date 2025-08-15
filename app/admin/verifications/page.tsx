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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, updateDoc, query, where, Timestamp, orderBy } from "firebase/firestore"
import Link from "next/link"

// Employer interface
interface Verification {
  id: string
  companyName: string
  contactName: string
  email: string
  location: string
  industry: string
  documents: string[]
  submittedAt: string
  approvedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  status: string
}

// Format date helper
const formatDate = (timestamp: Timestamp | string | null | undefined): string => {
  if (!timestamp) return "N/A"
  
  const date = timestamp instanceof Timestamp 
    ? timestamp.toDate() 
    : new Date(timestamp)
    
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function EmployerVerificationsPage() {
  const router = useRouter()
  const { success, error } = useAdminToast()
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [employerToReject, setEmployerToReject] = useState<Verification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rejectionReason, setRejectionReason] = useState("")
  
  // State for verification data
  const [pendingVerifications, setPendingVerifications] = useState<Verification[]>([])
  const [approvedVerifications, setApprovedVerifications] = useState<Verification[]>([])
  const [rejectedVerifications, setRejectedVerifications] = useState<Verification[]>([])
  const [jobseekers, setJobseekers] = useState<Verification[]>([])

  // Load verification data from Firestore
  useEffect(() => {
    const loadVerifications = async () => {
      setIsLoading(true)
      try {
        // Get all users who are employers or multi-role
        const employersQuery = query(
          collection(db, "users"),
          where("role", "in", ["employer", "multi"])
        )
        
        const employersSnapshot = await getDocs(employersQuery)
        
        const pendingData: Verification[] = []
        const approvedData: Verification[] = []
        const rejectedData: Verification[] = []
        
        // Process each employer and categorize them
        employersSnapshot.docs.forEach(doc => {
          const userData = doc.data()
          
          // Get user's first and last name for contact person
          const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'No Contact Name'
          
          // Create document list
          const documents = []
          if (userData.businessPermitUrl) documents.push('Business Permit')
          if (userData.otherDocumentsUrl) {
            if (Array.isArray(userData.otherDocumentsUrl)) {
              documents.push(...userData.otherDocumentsUrl.map((_, i) => `Additional Document ${i+1}`))
            } else {
              documents.push('Additional Document')
            }
          }
          
          // Create verification object
          const verification: Verification = {
            id: doc.id,
            companyName: userData.companyName || 'Unnamed Company',
            contactName: fullName,
            email: userData.email || 'No Email',
            location: userData.city || userData.barangay || 'Marawi City',
            industry: userData.industry || 'Not specified',
            documents: documents,
            submittedAt: formatDate(userData.createdAt),
            status: userData.isVerified ? 'approved' : userData.verificationRejected ? 'rejected' : 'pending'
          }
          
          // Add additional fields based on status
          if (userData.isVerified) {
            verification.approvedAt = formatDate(userData.verifiedAt || userData.updatedAt)
            approvedData.push(verification)
          } else if (userData.verificationRejected) {
            verification.rejectedAt = formatDate(userData.rejectedAt || userData.updatedAt)
            verification.rejectionReason = userData.rejectionReason || 'No reason provided'
            rejectedData.push(verification)
          } else {
            pendingData.push(verification)
          }
        })
        
        // Update state with categorized data
        setPendingVerifications(pendingData)
        setApprovedVerifications(approvedData)
        setRejectedVerifications(rejectedData)
        
        // Fetch jobseekers separately
        const jobseekersQuery = query(
          collection(db, "users"),
          where("role", "==", "jobseeker")
        )
        
        const jobseekersSnapshot = await getDocs(jobseekersQuery)
        const jobseekersData: Verification[] = [];
        
        jobseekersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          
          // Get user's first and last name
          const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'No Name';
          
          // Create verification object
          const verification: Verification = {
            id: doc.id,
            companyName: fullName, // Using name in company field for consistency
            contactName: fullName,
            email: userData.email || 'No Email',
            location: userData.city || userData.barangay || 'Not specified',
            industry: 'Jobseeker',
            documents: userData.resume ? ['Resume'] : [],
            submittedAt: formatDate(userData.createdAt),
            status: userData.isVerified ? 'approved' : 'pending'
          };
          
          jobseekersData.push(verification);
        });
        
        // Sort by creation date (newest first)
        jobseekersData.sort((a, b) => {
          // Simple string comparison for dates in format "MMM DD, YYYY"
          return b.submittedAt.localeCompare(a.submittedAt);
        });
        
        setJobseekers(jobseekersData)
      } catch (err) {
        console.error("Error loading verifications:", err)
        error("Failed to load verification data")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadVerifications()
  }, [error])

  const handleApproveVerification = async (employer: Verification) => {
    setIsLoading(true)
    try {
      // Update employer status in Firestore
      const userRef = doc(db, "users", employer.id)
      await updateDoc(userRef, { 
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      // Remove from pending list
      setPendingVerifications(current => 
        current.filter(item => item.id !== employer.id)
      )
      
      // Add to approved list
      const approvedEmployer = {
        ...employer,
        status: 'approved',
        approvedAt: formatDate(new Date().toISOString())
      }
      setApprovedVerifications(current => [...current, approvedEmployer])
      
      // Show success message
      success(`Employer ${employer.companyName} has been approved`)
    } catch (err) {
      console.error("Error approving verification:", err)
      error(`Failed to approve ${employer.companyName}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectVerification = (employer: Verification) => {
    setEmployerToReject(employer)
    setRejectionReason("")
    setIsRejectDialogOpen(true)
  }

  const confirmRejectVerification = async () => {
    if (!employerToReject) return
    
    if (!rejectionReason.trim()) {
      error("Please provide a reason for rejection")
      return
    }

    setIsLoading(true)
    try {
      // Update employer status in Firestore
      const userRef = doc(db, "users", employerToReject.id)
      await updateDoc(userRef, { 
        verificationRejected: true,
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason.trim(),
        updatedAt: new Date().toISOString(),
        status: 'rejected',
      })
      
      // Remove from pending list
      setPendingVerifications(current => 
        current.filter(item => item.id !== employerToReject.id)
      )
      
      // Add to rejected list
      const rejectedEmployer = {
        ...employerToReject,
        status: 'rejected',
        rejectedAt: formatDate(new Date().toISOString()),
        rejectionReason: rejectionReason.trim()
      }
      setRejectedVerifications(current => [...current, rejectedEmployer])
      
      // Show notification and clean up
      error(`Employer ${employerToReject.companyName} has been rejected`)
      setIsRejectDialogOpen(false)
      setEmployerToReject(null)
      setRejectionReason("")
    } catch (err) {
      console.error("Error rejecting verification:", err)
      error(`Failed to reject ${employerToReject.companyName}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle toggling jobseeker verification status
  const handleToggleJobseekerVerification = async (jobseeker: Verification) => {
    setIsLoading(true)
    try {
      const userRef = doc(db, "users", jobseeker.id)
      const newVerifiedStatus = jobseeker.status !== "approved"
      
      // Update user's verification status in Firestore
      await updateDoc(userRef, { 
        isVerified: newVerifiedStatus,
        verifiedAt: newVerifiedStatus ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      })
      
      // Update local state
      setJobseekers(current => 
        current.map(item => 
          item.id === jobseeker.id 
            ? {
                ...item,
                status: newVerifiedStatus ? "approved" : "pending"
              }
            : item
        )
      )
      
      // Show success message
      if (newVerifiedStatus) {
        success(`Jobseeker ${jobseeker.companyName} has been verified`)
      } else {
        success(`Jobseeker ${jobseeker.companyName}'s verification has been revoked`)
      }
    } catch (err) {
      console.error("Error updating jobseeker verification:", err)
      error(`Failed to update verification status for ${jobseeker.companyName}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminLayout title="Employer Verifications">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employer Verification Requests</CardTitle>
            <CardDescription>Review and manage employer verification requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Employers ({pendingVerifications.length})</TabsTrigger>
                <TabsTrigger value="approved">Verified ({approvedVerifications.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedVerifications.length})</TabsTrigger>
                <TabsTrigger value="jobseekers">Jobseekers</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {isLoading && !isRejectDialogOpen ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                  </div>
                ) : pendingVerifications.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No pending verification requests</p>
                  </div>
                ) : (
                  <AdminDataTable
                    columns={[
                      { key: "companyName", title: "Company" },
                      { key: "contactName", title: "Contact Person" },
                      { key: "email", title: "Email" },
                      { key: "location", title: "Location" },
                      { key: "industry", title: "Industry" },
                      {
                        key: "documents",
                        title: "Documents",
                        render: (value) => <span>{value.length} document(s)</span>,
                      },
                      { key: "submittedAt", title: "Submitted" },
                    ]}
                    data={pendingVerifications}
                    searchable={true}
                    actions={[
                      {
                        label: "View Details",
                        onClick: (row) => router.push(`/admin/verifications/${row.id}`),
                      },
                      {
                        label: "Approve",
                        onClick: handleApproveVerification,
                      },
                      {
                        label: "Reject",
                        onClick: handleRejectVerification,
                      },
                    ]}
                    onRowClick={(row) => router.push(`/admin/verifications/${row.id}`)}
                  />
                )}
              </TabsContent>

              <TabsContent value="approved">
                {approvedVerifications.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No approved verification requests</p>
                  </div>
                ) : (
                  <AdminDataTable
                    columns={[
                      { key: "companyName", title: "Company" },
                      { key: "contactName", title: "Contact Person" },
                      { key: "email", title: "Email" },
                      { key: "location", title: "Location" },
                      { key: "industry", title: "Industry" },
                      { key: "submittedAt", title: "Submitted" },
                      { key: "approvedAt", title: "Approved" },
                    ]}
                    data={approvedVerifications}
                    searchable={true}
                    actions={[
                      {
                        label: "View Details",
                        onClick: (row) => router.push(`/admin/verifications/${row.id}`),
                      },
                    ]}
                    onRowClick={(row) => router.push(`/admin/verifications/${row.id}`)}
                  />
                )}
              </TabsContent>

              <TabsContent value="rejected">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                  </div>
                ) : rejectedVerifications.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No rejected employer verifications</p>
                  </div>
                ) : (
                  <AdminDataTable
                    columns={[
                      { key: "companyName", title: "Company" },
                      { key: "contactName", title: "Contact Person" },
                      { key: "email", title: "Email" },
                      { key: "industry", title: "Industry" },
                      { key: "submittedAt", title: "Submitted" },
                      { key: "rejectedAt", title: "Rejected" },
                      { key: "rejectionReason", title: "Reason" },
                    ]}
                    data={rejectedVerifications}
                    searchable={true}
                  />
                )}
              </TabsContent>

              {/* Jobseekers Tab */}
              <TabsContent value="jobseekers">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                  </div>
                ) : jobseekers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No jobseekers found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md mb-4 text-sm text-blue-800 border border-blue-200">
                      <p>Manage jobseeker verification status. Verified jobseekers have full access to platform features.</p>
                    </div>
                    <AdminDataTable
                      columns={[
                        { key: "companyName", title: "Name" },
                        { key: "email", title: "Email" },
                        { key: "location", title: "Location" },
                        { key: "submittedAt", title: "Registered" },
                        {
                          key: "status",
                          title: "Status",
                          render: (value, row) => (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              value === "approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {value === "approved" ? "Verified" : "Unverified"}
                            </span>
                          ),
                        },
                        {
                          key: "documents",
                          title: "Resume",
                          render: (value) => (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              value.includes("Resume") ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {value.includes("Resume") ? "Uploaded" : "Not Uploaded"}
                            </span>
                          ),
                        },
                        {
                          key: "actions",
                          title: "Actions",
                          render: (_, row) => (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant={row.status === "approved" ? "destructive" : "default"}
                                size="sm"
                                onClick={() => handleToggleJobseekerVerification(row)}
                                disabled={isLoading}
                              >
                                {row.status === "approved" ? "Unverify" : "Verify"}
                              </Button>
                              <Link href={`/admin/users/${row.id}`}>
                                <Button variant="outline" size="sm">View</Button>
                              </Link>
                            </div>
                          ),
                        },
                      ]}
                      data={jobseekers}
                      searchable={true}
                    />
                  </div>
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
            <DialogTitle>Reject Verification Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the verification request from {employerToReject?.companyName}? Please
              provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason
            </label>
            <textarea
              id="rejection-reason"
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
              rows={3}
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            ></textarea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRejectVerification} disabled={isLoading} className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
              )}
              <span className={isLoading ? "opacity-0" : ""}>Reject Verification</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
