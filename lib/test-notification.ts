import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

/**
 * Simple test function to directly add a notification to the jobseekernotifications collection
 * @param jobseekerId The ID of the jobseeker
 * @returns Promise<string | false> Document ID if successful, false otherwise
 */
export const testAddNotification = async (jobseekerId: string): Promise<string | false> => {
  console.log(`[TEST] Attempting to add test notification for jobseeker ${jobseekerId}`);
  
  if (!jobseekerId) {
    console.error("[TEST] Error: jobseekerId is required");
    return false;
  }
  
  try {
    // Create the notification document directly in Firestore
    const jobseekerNotificationsRef = collection(db, "jobseekernotifications");
    
    // Log the collection reference to ensure it's valid
    console.log("[TEST] Collection reference:", jobseekerNotificationsRef);
    
    const notificationData = {
      jobseekerId,
      title: "Test Notification",
      message: "This is a test notification to verify the system is working.",
      type: "system",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/jobseeker/applications"
    };
    
    // Log the data being written
    console.log("[TEST] Writing notification data:", notificationData);
    
    // Try to add the document
    const docRef = await addDoc(jobseekerNotificationsRef, notificationData);
    
    console.log(`[TEST] Successfully created test notification with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`[TEST] Error creating test notification:`, error);
    return false;
  }
} 