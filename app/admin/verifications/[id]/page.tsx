"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAdminToast } from "@/components/admin-toast"
import { Building2, Mail, MapPin, Calendar, FileText, Download, CheckCircle, XCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { doc, getDoc, updateDoc, Timestamp,db } from "@/config/firebase"

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

// Format file name to display it in a more readable way
const formatFileName = (url: string = ""): string => {
  if (!url) return "Unknown File"
  
  const urlParts = url.split('/')
  const fileName = urlParts[urlParts.length - 1]
  
  // Remove query parameters if they exist
  const cleanFileName = fileName.split('?')[0]
  
  // URL decode the file name
  return decodeURIComponent(cleanFileName)
}

interface UserData {
  id: string
  companyName?: string
  firstName?: string
  lastName?: string
  email?: string
  city?: string
  barangay?: string
  industry?: string
  description?: string
  businessPermitPath?: string
  otherDocumentsUrl?: string | string[]
  createdAt?: string | Timestamp
  updatedAt?: string | Timestamp
  isVerified?: boolean
  verificationRejected?: boolean
  verifiedAt?: string | Timestamp
  rejectedAt?: string | Timestamp
  rejectionReason?: string
}

export default function VerificationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params)
  const router = useRouter()
  const { success, error } = useAdminToast()
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [documents, setDocuments] = useState<{name: string, type: string, url: string, uploadedAt: string}[]>([])

  // Store employerId separately to fix the Next.js warning
  const employerId = unwrappedParams.id
  
  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true)
      try {
        const userDoc = await getDoc(doc(db, "users", employerId))
        
        if (!userDoc.exists()) {
          error("User not found")
          router.push("/admin/verifications")
          return
        }
        
        const data = {
          id: userDoc.id,
          ...userDoc.data()
        } as UserData
        
        setUserData(data)
        
        // Process documents
        const docs = []
        if (data.businessPermitPath) {
          docs.push({
            name: formatFileName(data.businessPermitPath),
            type: "Business Permit",
            url: data.businessPermitPath,
            uploadedAt: formatDate(data.createdAt)
          })
        }
        
        if (data.otherDocumentsUrl) {
          if (Array.isArray(data.otherDocumentsUrl)) {
            data.otherDocumentsUrl.forEach((url, index) => {
              docs.push({
                name: formatFileName(url),
                type: `Additional Document ${index + 1}`,
                url: url,
                uploadedAt: formatDate(data.createdAt)
              })
            })
          } else {
            docs.push({
              name: formatFileName(data.otherDocumentsUrl),
              type: "Additional Document",
              url: data.otherDocumentsUrl,
              uploadedAt: formatDate(data.createdAt)
            })
          }
        }
        
        setDocuments(docs)
      } catch (err) {
        console.error("Error fetching user data:", err)
        error("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [employerId, router, error])

  const handleApproveVerification = async () => {
    if (!userData) return
    
    setIsActionLoading(true)
    try {
      // Update user status in Firestore
      const userRef = doc(db, "users", userData.id)
      await updateDoc(userRef, { 
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        isVerified: true,
        verifiedAt: new Date().toISOString()
      } : null)
      
      // Show success message
      success(`Employer ${userData.companyName} has been approved`)
      
      // Redirect back to verifications list
      setTimeout(() => {
        router.push("/admin/verifications")
      }, 1500)
    } catch (err) {
      console.error("Error approving verification:", err)
      error(`Failed to approve ${userData.companyName}`)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleOpenRejectDialog = () => {
    setIsRejectDialogOpen(true)
  }

  const handleRejectVerification = async () => {
    if (!userData) return
    
    if (!rejectionReason.trim()) {
      error("Please provide a reason for rejection")
      return
    }

    setIsActionLoading(true)
    try {
      // Update user status in Firestore
      const userRef = doc(db, "users", userData.id)
      await updateDoc(userRef, { 
        verificationRejected: true,
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason.trim(),
        updatedAt: new Date().toISOString()
      })
      
      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        verificationRejected: true,
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason.trim()
      } : null)
      
      // Show notification
      error(`Employer ${userData.companyName} has been rejected`)
      setIsRejectDialogOpen(false)
      
      // Redirect back to verifications list
      setTimeout(() => {
        router.push("/admin/verifications")
      }, 1500)
    } catch (err) {
      console.error("Error rejecting verification:", err)
      error(`Failed to reject ${userData.companyName}`)
    } finally {
      setIsActionLoading(false)
    }
  }
  
  // Determine status label
  const getStatusLabel = (): string => {
    if (!userData) return "unknown"
    if (userData.isVerified) return "approved"
    if (userData.verificationRejected) return "rejected"
    return "pending"
  }

  if (isLoading) {
    return (
      <AdminLayout title="Verification Details">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      </AdminLayout>
    )
  }
  
  if (!userData) {
    return (
      <AdminLayout title="Verification Details">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-gray-500 mb-4">The employer you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push("/admin/verifications")}>Back to Verifications</Button>
        </div>
      </AdminLayout>
    )
  }

  const status = getStatusLabel()

  return (
    <AdminLayout title="Verification Details">
      <div className="space-y-6">
        {/* Verification Status Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border shadow-sm">
          <div>
            <h2 className="text-2xl font-bold">{userData.companyName || "Unnamed Company"}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className={
                  status === "approved"
                    ? "bg-green-100 text-green-800"
                    : status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }
              >
                {status}
              </Badge>
              <span className="text-sm text-gray-500">Submitted on {formatDate(userData.createdAt)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/admin/verifications")}>
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
                  onClick={handleApproveVerification}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Verification Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company Information */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Details provided by the employer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p>{userData.companyName || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p>{userData.email || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p>{userData.city || ""} {userData.barangay ? `, ${userData.barangay}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Submitted</p>
                    <p>{formatDate(userData.createdAt)}</p>
                  </div>
                </div>
              </div>

              {userData.description && (
                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-2">Company Description</p>
                  <p className="text-sm">{userData.description}</p>
                </div>
              )}
              
              <div className="pt-2">
                <p className="text-sm text-gray-500 mb-2">Contact Person</p>
                <p className="text-sm">{userData.firstName || ""} {userData.lastName || ""}</p>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-gray-500 mb-2">Industry</p>
                <p className="text-sm">{userData.industry || "Not specified"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Documents and Verification */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Verification Documents</CardTitle>
              <CardDescription>Review submitted documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="documents">
                <TabsList className="mb-4">
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="verification">Verification History</TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="space-y-4">
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No documents found</p>
                    </div>
                  ) : (
                    documents.map((doc, index) => (
                      <div key={index} className="flex flex-col gap-3 p-4 border rounded-md">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-gray-400" />
                          <div className="flex-1">
                            <p className="font-medium">{doc.name}</p>
                            <div className="flex items-center gap-4">
                              <p className="text-sm text-gray-500">{doc.type}</p>
                              <p className="text-sm text-gray-500">Uploaded on {doc.uploadedAt}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open(doc.url, '_blank')}>
                            <Download className="h-4 w-4 mr-2" />
                            View Full
                          </Button>
                        </div>
                        
                        {/* Document Preview */}
                        <div className="w-full h-125 border rounded-md overflow-hidden bg-gray-50">
                          {doc.url.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                              src={doc.url}
                              className="w-full h-full"
                              title={doc.name}
                            >
                              <p>Unable to display PDF. <a href={doc.url} target="_blank" rel="noopener noreferrer">Download</a> instead.</p>
                            </iframe>
                          ) : doc.url.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                            <img
                              src={doc.url}
                              alt={doc.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-gray-500">Preview not available for this file type</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="verification" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-blue-100 p-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Verification request submitted</p>
                        <p className="text-sm text-gray-500">
                          {userData.companyName || "Employer"} submitted verification documents
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(userData.createdAt)}</p>
                      </div>
                    </div>
                    
                    {userData.isVerified && (
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-green-100 p-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Verification approved</p>
                          <p className="text-sm text-gray-500">
                            {userData.companyName || "Employer"} verification was approved
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(userData.verifiedAt)}</p>
                        </div>
                      </div>
                    )}
                    
                    {userData.verificationRejected && (
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-red-100 p-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium">Verification rejected</p>
                          <p className="text-sm text-gray-500">
                            Reason: {userData.rejectionReason || "No reason provided"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(userData.rejectedAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Admin Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Notes</CardTitle>
            <CardDescription>Internal notes about this verification request</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea placeholder="Add notes about this verification request..." className="min-h-25" />
          </CardContent>
          <CardFooter>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">Save Notes</Button>
          </CardFooter>
        </Card>
      </div>

      {/* Reject Confirmation Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the verification request from {userData.companyName}? Please provide a
              reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason
            </label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full"
              rows={3}
              placeholder="Enter reason for rejection..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectVerification} disabled={isActionLoading} className="relative">
              {isActionLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
              )}
              <span className={isActionLoading ? "opacity-0" : ""}>Reject Verification</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
