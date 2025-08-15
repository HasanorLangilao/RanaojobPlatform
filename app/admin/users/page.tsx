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
import { collection, getDocs, doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore"

// User interface
interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  location: string
  registeredAt: string
  lastActive: string
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

export default function ManageUsersPage() {
  const router = useRouter()
  const { success, error } = useAdminToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])

  // Load users from Firestore
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true)
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = usersSnapshot.docs.map(doc => {
          const data = doc.data()
          
          // Format user data
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'No Name'
          const location = data.role === 'jobseeker' || data.role === 'multi' 
            ? data.barangay || 'Marawi City'
            : 'Not Specified'
          
          return {
            id: doc.id,
            name: fullName,
            email: data.email || 'No Email',
            role: data.role || 'jobseeker',
            status: data.status || 'active',
            location,
            registeredAt: formatDate(data.createdAt),
            lastActive: formatDate(data.lastLogin || data.createdAt)
          }
        })
        setUsers(usersData)
      } catch (error) {
        console.error("Error loading users:", error)
        error("Failed to load users. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadUsers()
  }, [error])

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    
    setIsLoading(true)
    try {
      // Delete user from Firestore
      await deleteDoc(doc(db, "users", userToDelete.id))
      
      // Update local state
      setUsers(users.filter(user => user.id !== userToDelete.id))
      
      success(`User ${userToDelete.name} has been deleted`)
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (err) {
      console.error("Error deleting user:", err)
      error(`Failed to delete user: ${userToDelete.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuspendUser = async (user: User) => {
    setIsLoading(true)
    try {
      // Update user status in Firestore
      const userRef = doc(db, "users", user.id)
      const newStatus = user.status === "suspended" ? false : true
      await updateDoc(userRef, { isDisabled: newStatus })
      
      // Update local state
      setUsers(users.map(u => 
        u.id === user.id 
          ? { ...u, status: newStatus ? 'suspended' : 'active' }
          : u
      ))
      
      if (user.status === "suspended") {
        success(`User ${user.name} has been reactivated`)
      } else {
        success(`User ${user.name} has been suspended`)
      }
    } catch (err) {
      console.error("Error updating user status:", err)
      error(`Failed to update status for ${user.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminLayout title="Manage Users">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Manage jobseekers and employers on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <AdminDataTable
                columns={[
                  { key: "name", title: "Name" },
                  { key: "email", title: "Email" },
                  {
                    key: "role",
                    title: "Role",
                    render: (value) => (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          value === "employer" 
                            ? "bg-blue-100 text-blue-800" 
                            : value === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : value === "multi"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                        }`}
                      >
                        {value}
                      </span>
                    ),
                  },
                  { key: "location", title: "Location" },
                  {
                    key: "status",
                    title: "Status",
                    render: (value) => (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          value === "active"
                            ? "bg-green-100 text-green-800"
                            : value === "suspended"
                              ? "bg-red-100 text-red-800"
                              : value === "pending"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {value}
                      </span>
                    ),
                  },
                  { key: "registeredAt", title: "Registered" },
                  { key: "lastActive", title: "Last Active" },
                ]}
                data={users}
                searchable={true}
                filterable={true}
                filterOptions={{
                  key: "role",
                  options: [
                    { label: "Jobseeker", value: "jobseeker" },
                    { label: "Employer", value: "employer" },
                    { label: "Admin", value: "admin" },
                    { label: "Multi-Role", value: "multi" },
                  ],
                }}
                actions={[
                  {
                    label: "View Profile",
                    onClick: (row) => router.push(`/admin/users/${row.id}`),
                    // Hide action for admin users (don't allow admins to modify other admins)
                    isShown: (row) => row.role !== "admin",
                  },
                 /* {
                    label: (row) => row.status === "suspended" ? "Reactivate User" : "Suspend User",
                    onClick: handleSuspendUser,
                    // Hide action for admin users
                    isShown: (row) => row.role !== "admin",
                  }, */
                  {
                    label: "Delete User",
                    onClick: handleDeleteUser,
                    // Hide action for admin users
                    isShown: (row) => row.role !== "admin",
                  },
                ]}
                onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm User Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the user {userToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser} disabled={isLoading} className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
              )}
              <span className={isLoading ? "opacity-0" : ""}>Delete User</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
