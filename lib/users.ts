import { db } from "@/lib/firebase"
import { 
  doc, 
  getDoc,
  updateDoc, 
  serverTimestamp
} from "firebase/firestore"

/**
 * Get a user profile from Firestore
 * @param userId The ID of the user to retrieve
 * @returns The user profile data
 */
export async function getUserProfile(userId: string): Promise<any> {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      throw new Error("User not found")
    }
    
    return {
      id: userDoc.id,
      ...userDoc.data()
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    throw new Error("Failed to get user profile")
  }
}

/**
 * Update a user profile in Firestore
 * @param userId The ID of the user to update
 * @param profileData The updated profile data
 */
export async function updateUserProfile(userId: string, profileData: any): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)
    
    // Add updated timestamp
    const updatedData = {
      ...profileData,
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(userRef, updatedData)
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw new Error("Failed to update user profile")
  }
}

/**
 * Update company profile in Firestore
 * @param userId The ID of the employer to update
 * @param companyData The updated company data
 */
export async function updateCompanyProfile(userId: string, companyData: any): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)
    
    // Add updated timestamp
    const updatedData = {
      ...companyData,
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(userRef, updatedData)
    
    // Update local storage
    const storedUser = localStorage.getItem("ranaojobs_user")
    if (storedUser) {
      const user = JSON.parse(storedUser)
      const updatedUser = { ...user, ...companyData }
      localStorage.setItem("ranaojobs_user", JSON.stringify(updatedUser))
    }
  } catch (error) {
    console.error("Error updating company profile:", error)
    throw new Error("Failed to update company profile")
  }
}

/**
 * Request to upgrade user to multi-role (requires admin approval)
 * @param userId The ID of the user requesting the upgrade
 * @param jobseekerData The jobseeker profile data
 */
export async function requestMultiRoleUpgrade(userId: string, additionalData: any, isJobseeker: boolean = true): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)
    
    // Add updated timestamp, set request flag and role to 'multi-role' (pending verification)
    const updatedData = {
      ...additionalData,
      role: "multi-role", // Change role to multi-role (pending verification)
      multiRoleRequested: true,
      multiRoleRequestDate: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(userRef, updatedData)
    
    // Import here to avoid circular dependency
    const { addAdminNotification } = await import("@/lib/notifications")
    
    // Notify admins about the request
    const sourceRole = isJobseeker ? "jobseeker" : "employer"
    const message = isJobseeker ? 
      `A jobseeker has requested to upgrade to a multi-role account.` :
      `An employer has requested to upgrade to a multi-role account.`
      
    await addAdminNotification(
      "Multi-Role Upgrade Request",
      message,
      "info",
      "all",
      `/admin/multirole-requests/${userId}`,
      sourceRole,
      userId
    )
  } catch (error) {
    console.error("Error requesting multi-role upgrade:", error)
    throw new Error("Failed to request multi-role upgrade")
  }
}

/**
 * Admin function to approve multi-role upgrade request
 * @param userId The ID of the user to upgrade
 * @param adminId The ID of the admin who approved the request
 */
export async function approveMultiRoleUpgrade(userId: string, adminId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      throw new Error("User not found")
    }
    
    const userData = userDoc.data()
    
    // Update the user's role from multi-role to multi and remove request flags
    await updateDoc(userRef, {
      role: "multi", // Change from 'multi-role' to 'multi' after verification
      activeRole: userData.activeRole || "employer",
      multiRoleRequested: false,
      multiRoleApproved: true,
      multiRoleApprovedDate: serverTimestamp(),
      multiRoleApprovedBy: adminId,
      updatedAt: serverTimestamp()
    })
    
    // Update localStorage if this is the logged-in user
    try {
      // Trigger an event that can be listened to by components to refresh user data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event("userRoleUpdated"))
      }
    } catch (e) {
      // Ignore errors during client-side updates
      console.warn("Unable to update client-side state:", e)
    }
  } catch (error) {
    console.error("Error approving multi-role upgrade:", error)
    throw new Error("Failed to approve multi-role upgrade")
  }
}

/**
 * Admin function to reject multi-role upgrade request
 * @param userId The ID of the user to reject
 * @param adminId The ID of the admin who rejected the request
 * @param reason The reason for rejection
 */
export async function rejectMultiRoleUpgrade(userId: string, adminId: string, reason: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)
    
    // Update user record with rejection information
    await updateDoc(userRef, {
      multiRoleRequested: false,
      multiRoleRejected: true,
      multiRoleRejectionDate: serverTimestamp(),
      multiRoleRejectedBy: adminId,
      multiRoleRejectionReason: reason,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error("Error rejecting multi-role upgrade:", error)
    throw new Error("Failed to reject multi-role upgrade")
  }
} 