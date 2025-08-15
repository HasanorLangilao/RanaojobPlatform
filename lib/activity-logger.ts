import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore"
import { addEmployerActivity, addJobseekerActivity } from "@/lib/notifications"

export async function recordActivity(
  userId: string,
  type: string,
  description: string,
  metadata: Record<string, any> = {}
) {
  try {
    const activityData = {
      userId,
      type,
      description,
      metadata,
      timestamp: serverTimestamp()
    }

    // Add to activity_log_all collection
    await addDoc(collection(db, "activity_log_all"), activityData)
    
    console.log("Activity recorded successfully:", activityData)

    // Record in userActivities collection
    await addDoc(collection(db, "userActivities"), {
      userId,
      type,
      description,
      timestamp: serverTimestamp(),
      metadata
    })

    // Check if this is a jobseeker activity and record in activity_jobseek collection
    const userDoc = await getDoc(doc(db, "users", userId))
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const userRole = metadata.activeRole || userData.activeRole || userData.role;
      
      // If user is a jobseeker or multi-role acting as jobseeker, record in activity_jobseek
      if (userRole === "jobseeker") {
        await addDoc(collection(db, "activity_jobseek"), {
          userId,
          type,
          description,
          timestamp: serverTimestamp(),
          metadata: {
            ...metadata,
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            email: userData.email || ""
          }
        });

        // For login and logout, also record in activity_js collection for the activity feed
        if (type === "login" || type === "logout") {
          await addJobseekerActivity(
            userId, 
            type, 
            type === "login" ? "Logged in to account" : "Logged out of account",
            {
              timestamp: new Date().toISOString()
            }
          );
        }
      }
      
      // If user is an employer or multi-role acting as employer, record employer-specific activity
      if (userRole === "employer") {
        // For login and logout, also record in activity_emp collection for the activity feed
        if (type === "login" || type === "logout") {
          await addEmployerActivity(
            userId, 
            type, 
            type === "login" ? "Logged in to account" : "Logged out of account",
            {
              timestamp: new Date().toISOString()
            }
          );
        }
      }
      
      // If the user is an admin, also record in all_admin collection
      if (userData.role === "admin") {
        await addDoc(collection(db, "all_admin"), {
          userId,
          type,
          description,
          timestamp: serverTimestamp(),
          metadata,
          adminName: userData.firstName + " " + userData.lastName,
          adminEmail: userData.email
        })
      }
    }
  } catch (error) {
    console.error("Error recording activity:", error)
  }
}

/**
 * Logs a login activity specifically for the user's role-based activity feed
 * @param userId User ID
 * @param role User role (employer, jobseeker, admin)
 * @param activeRole Active role for multi-role users
 */
export async function logLoginActivity(userId: string, role: string, activeRole?: string) {
  try {
    const effectiveRole = activeRole || role;
    
    // General activity logging
    await recordActivity(
      userId,
      "login",
      `${effectiveRole === "employer" ? "Employer" : effectiveRole === "jobseeker" ? "Jobseeker" : "User"} logged in`,
      {
        role,
        activeRole: effectiveRole,
      }
    );
    
    console.log(`Login activity recorded for ${effectiveRole} user ${userId}`);
  } catch (error) {
    console.error("Error logging login activity:", error);
  }
}

/**
 * Logs a logout activity specifically for the user's role-based activity feed
 * @param userId User ID
 * @param role User role (employer, jobseeker, admin)
 * @param activeRole Active role for multi-role users
 */
export async function logLogoutActivity(userId: string, role: string, activeRole?: string) {
  try {
    const effectiveRole = activeRole || role;
    
    // General activity logging
    await recordActivity(
      userId,
      "logout",
      `${effectiveRole === "employer" ? "Employer" : effectiveRole === "jobseeker" ? "Jobseeker" : "User"} logged out`,
      {
        role,
        activeRole: effectiveRole,
      }
    );
    
    console.log(`Logout activity recorded for ${effectiveRole} user ${userId}`);
  } catch (error) {
    console.error("Error logging logout activity:", error);
  }
} 