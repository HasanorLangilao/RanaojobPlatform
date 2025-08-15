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
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, Timestamp, getDoc } from "firebase/firestore"

// Employer interface
interface Employer {
  id: string
  companyName: string
  contactName: string
  email: string
  location: string
  industry: string
  jobsPosted: number
  status: string
  registeredAt: string
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

export default function ManageEmployersPage() {
  const router = useRouter()
  const { success, error } = useAdminToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [employerToDelete, setEmployerToDelete] = useState<Employer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [employers, setEmployers] = useState<Employer[]>([])

  // Load employers from Firestore
  useEffect(() => {
    const loadEmployers = async () => {
      setIsLoading(true)
      try {
        // Get all users who are employers or multi-role
        const employersQuery = query(
          collection(db, "users"),
          where("role", "in", ["employer", "multi"])
        )
        
        const employersSnapshot = await getDocs(employersQuery)
        
        // Get job counts for each employer
        const employersWithJobCounts = await Promise.all(
          employersSnapshot.docs.map(async (docSnapshot) => {
            const userData = docSnapshot.data()
            
            // Count jobs posted by this employer
            const jobsQuery = query(
              collection(db, "jobs"),
              where("employerId", "==", docSnapshot.id)
            )
            const jobsSnapshot = await getDocs(jobsQuery)
            const jobsCount = jobsSnapshot.size
            
            // Get user's first and last name for contact person
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'No Contact Name'
            
            let status = 'pending';
            if (userData.isVerified) {
              status = 'verified';
            } else if (userData.status === 'rejected') {
              status = 'rejected';
            } else if (userData.isDisabled) {
              status = 'suspended';
            }
            return {
              id: docSnapshot.id,
              companyName: userData.companyName || 'Unnamed Company',
              contactName: fullName,
              email: userData.email || 'No Email',
              location: userData.city || 'Marawi City',
              industry: userData.industry || 'Not specified',
              jobsPosted: jobsCount,
              status,
              registeredAt: formatDate(userData.createdAt)
            }
          })
        )
        
        setEmployers(employersWithJobCounts)
      } catch (err) {
        console.error("Error loading employers:", err)
        error("Failed to load employer data")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadEmployers()
  }, [error])

  const handleDeleteEmployer = (employer: Employer) => {
    setEmployerToDelete(employer)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteEmployer = async () => {
    if (!employerToDelete) return
    
    setIsLoading(true)
    try {
      // Delete employer data from Firestore
      await deleteDoc(doc(db, "users", employerToDelete.id))
      
      // Update local state
      setEmployers(employers.filter(employer => employer.id !== employerToDelete.id))
      
      // Show success message
      success(`Employer ${employerToDelete.companyName} has been deleted`)
      setIsDeleteDialogOpen(false)
      setEmployerToDelete(null)
    } catch (err) {
      console.error("Error deleting employer:", err)
      error(`Failed to delete employer: ${employerToDelete.companyName}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuspendEmployer = async (employer: Employer) => {
    setIsLoading(true)
    try {
      // Update employer status in Firestore
      const userRef = doc(db, "users", employer.id)
      const newStatus = employer.status === "suspended" ? false : true
      await updateDoc(userRef, { isDisabled: newStatus })
      
      // Update local state
      setEmployers(employers.map(emp => 
        emp.id === employer.id 
          ? { 
              ...emp, 
              status: newStatus ? 'suspended' : (emp.status === 'suspended' ? 'pending' : emp.status) 
            }
          : emp
      ))
      
      // Show notification
      if (employer.status === "suspended") {
        success(`Employer ${employer.companyName} has been reactivated`)
      } else {
        success(`Employer ${employer.companyName} has been suspended`)
      }
    } catch (err) {
      console.error("Error updating employer status:", err)
      error(`Failed to update status for ${employer.companyName}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminLayout title="Manage Employers">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Employers</CardTitle>
            <CardDescription>Manage employer accounts on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !isDeleteDialogOpen ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            ) : employers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No employers found</p>
              </div>
            ) : (
              <AdminDataTable
                columns={[
                  { key: "companyName", title: "Company" },
                  { key: "contactName", title: "Contact Person" },
                  { key: "email", title: "Email" },
                  { key: "location", title: "Location" },
                  { key: "industry", title: "Industry" },
                  { key: "jobsPosted", title: "Jobs Posted" },
                  {
                    key: "status",
                    title: "Status",
                    render: (value) => (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          value === "verified"
                            ? "bg-green-100 text-green-800"
                            : value === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : value === "rejected"
                                ? "bg-orange-100 text-orange-800"
                                : value === "suspended"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {value}
                      </span>
                    ),
                  },
                  { key: "registeredAt", title: "Registered" },
                ]}
                data={employers}
                searchable={true}
                filterable={true}
                filterOptions={{
                  key: "status",
                  options: [
                    { label: "Verified", value: "verified" },
                    { label: "Pending", value: "pending" },
                    // { label: "Suspended", value: "suspended" },
                  ],
                }}
                actions={[
                  {
                    label: "View Profile",
                    onClick: (row) => router.push(`/admin/employers/${row.id}`),
                  },
                  /* {
                    label: (row) => (row.status === "suspended" ? "Reactivate Employer" : "Suspend Employer"),
                    onClick: handleSuspendEmployer,
                  }, */
                  {
                    label: "Delete Employer",
                    onClick: handleDeleteEmployer,
                  },
                ]}
                onRowClick={(row) => router.push(`/admin/employers/${row.id}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Employer Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the employer {employerToDelete?.companyName}? This action cannot be undone
              and will remove all associated job listings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteEmployer} disabled={isLoading} className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
              )}
              <span className={isLoading ? "opacity-0" : ""}>Delete Employer</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
