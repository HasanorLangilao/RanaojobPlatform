import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, doc, deleteDoc, updateDoc, Timestamp, limit } from "firebase/firestore"
import { emailConfig } from "@/lib/config"

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  adminId: string;
  isRead: boolean;
  createdAt: any; // Firestore Timestamp
  link?: string;
  activityType?: 'jobseeker' | 'employer' | 'admin' | 'system';
  relatedUserId?: string;
}

// Define interface for Notifications related to Employers stored in adminNotifications
export interface EmployerRelatedNotification {
  id: string; // Document ID
  title: string;
  message: string;
  type: string; // Use string to be flexible with notification types
  createdAt: any; // Firestore Timestamp
  link?: string;
  relatedUserId: string; // The employer's user ID
  isRead: boolean; // Added isRead property
  // Include other fields from adminNotifications if needed
}

// Define interface for Employer Notifications to match the structure stored
export interface EmployerNotification {
  id?: string;
  employerId: string;
  title: string;
  message: string;
  type: EmployerNotificationType;
  isRead: boolean;
  createdAt: Timestamp;
  link?: string; // Optional link to related page
  jobId?: string; // Optional reference to related job
  applicationId?: string; // Optional reference to related application
}

// Define interface for Jobseeker Notifications
export interface JobseekerNotification {
  id: string;
  jobseekerId: string;
  title: string;
  message: string;
  type: string;
  createdAt: any; // Firestore Timestamp
  isRead: boolean;
  link?: string;
  applicationId?: string;
  applicationStatus?: string;
  relatedJob?: {
    id: string;
    title: string;
  };
}

// Enhanced employer notification types
export type EmployerNotificationType =
  | "job_verification"
  | "new_application"
  | "applicant_update"
  | "system_alert"
  | "announcement"
  | "job_post"
  | "login"
  | "job_edit"
  | "profile_update";

// Enhanced employer notification interface
export interface EnhancedEmployerNotification {
  id: string;
  employerId: string;
  title: string;
  message: string;
  type: EmployerNotificationType;
  createdAt: any; // Firestore Timestamp
  isRead: boolean;
  link?: string;
  relatedId?: string; // jobId, applicationId, etc.
  relatedData?: Record<string, any>; // Additional data related to the notification
}

/**
 * Add a notification for admin users
 * @param title Title of the notification
 * @param message Message content
 * @param type Type of notification (info, warning, success, error)
 * @param targetAdminId Specific admin ID or "all" for all admins
 * @param link Optional URL to navigate to when clicking the notification
 * @param activityType Type of activity being tracked
 * @param relatedUserId ID of the user related to this activity
 */
export const addAdminNotification = async (
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info',
  targetAdminId: string = 'all',
  link?: string,
  activityType?: 'jobseeker' | 'employer' | 'admin' | 'system',
  relatedUserId?: string
) => {
  try {
    await addDoc(collection(db, "adminNotifications"), {
      title,
      message,
      type,
      adminId: targetAdminId,
      isRead: false,
      createdAt: serverTimestamp(),
      link,
      activityType: activityType || 'admin',
      relatedUserId
    })
    return true
  } catch (error) {
    console.error("Error adding notification:", error)
    return false
  }
}

// EMPLOYER ACTIVITIES

/**
 * Create a notification when a new employer registers
 * @param employerName Name of the employer
 * @param employerId ID of the employer
 */
export const notifyNewEmployerRegistration = async (employerName: string, employerId: string) => {
  return addAdminNotification(
    "New Employer Registration",
    `${employerName} has registered as an employer and needs verification.`,
    "info",
    "all",
    `/admin/users/${employerId}`,
    'employer',
    employerId
  )
}

/**
 * Create a notification when a job is posted
 * @param jobTitle Title of the job
 * @param companyName Company that posted the job
 * @param jobId ID of the job
 * @param employerId ID of the employer
 */
export const notifyNewJobPosted = async (jobTitle: string, companyName: string, jobId: string, employerId: string) => {
  return addAdminNotification(
    "New Job Posted",
    `${companyName} posted a new job: ${jobTitle}`,
    "info",
    "all",
    `/admin/jobs/${jobId}`,
    'employer',
    employerId
  )
}

/**
 * Create a notification when an employer updates their profile
 * @param employerName Name of the employer
 * @param employerId ID of the employer
 */
export const notifyEmployerProfileUpdate = async (employerName: string, employerId: string) => {
  return addAdminNotification(
    "Employer Profile Updated",
    `${employerName} has updated their profile information.`,
    "info",
    "all",
    `/admin/users/${employerId}`,
    'employer',
    employerId
  )
}

/**
 * Create a notification when an employer uploads business documents
 * @param employerName Name of the employer
 * @param employerId ID of the employer
 */
export const notifyEmployerDocumentUpload = async (employerName: string, employerId: string) => {
  return addAdminNotification(
    "Business Verification Documents Uploaded",
    `${employerName} has uploaded business verification documents.`,
    "info",
    "all",
    `/admin/users/${employerId}`,
    'employer',
    employerId
  )
}

// JOBSEEKER ACTIVITIES

/**
 * Create a notification when a new jobseeker registers
 * @param jobseekerName Name of the jobseeker
 * @param jobseekerId ID of the jobseeker
 */
export const notifyNewJobseekerRegistration = async (jobseekerName: string, jobseekerId: string) => {
  return addAdminNotification(
    "New Jobseeker Registration",
    `${jobseekerName} has registered as a jobseeker.`,
    "info",
    "all",
    `/admin/users/${jobseekerId}`,
    'jobseeker',
    jobseekerId
  )
}

/**
 * Create a notification when a jobseeker applies for a job
 * @param jobseekerName Name of the jobseeker
 * @param jobseekerId ID of the jobseeker
 * @param jobTitle Title of the job
 * @param jobId ID of the job
 */
export const notifyNewJobApplication = async (
  jobseekerName: string,
  jobseekerId: string,
  jobTitle: string,
  jobId: string
) => {
  return addAdminNotification(
    "New Job Application",
    `${jobseekerName} has applied for the job: ${jobTitle}`,
    "info",
    "all",
    `/admin/users/${jobseekerId}`,
    'jobseeker',
    jobseekerId
  )
}

/**
 * Create a notification when a jobseeker uploads a resume
 * @param jobseekerName Name of the jobseeker
 * @param jobseekerId ID of the jobseeker
 */
export const notifyResumeUpload = async (jobseekerName: string, jobseekerId: string) => {
  return addAdminNotification(
    "Resume Uploaded",
    `${jobseekerName} has uploaded a new resume.`,
    "info",
    "all",
    `/admin/users/${jobseekerId}`,
    'jobseeker',
    jobseekerId
  )
}

/**
 * Create a notification when a jobseeker updates their profile
 * @param jobseekerName Name of the jobseeker
 * @param jobseekerId ID of the jobseeker
 */
export const notifyJobseekerProfileUpdate = async (jobseekerName: string, jobseekerId: string) => {
  return addAdminNotification(
    "Jobseeker Profile Updated",
    `${jobseekerName} has updated their profile information.`,
    "info",
    "all",
    `/admin/users/${jobseekerId}`,
    'jobseeker',
    jobseekerId
  )
}

// SYSTEM NOTIFICATIONS

/**
 * Create a notification for system alerts
 * @param title Alert title
 * @param message Alert message
 */
export const notifySystemAlert = async (title: string, message: string) => {
  return addAdminNotification(
    title,
    message,
    "warning",
    "all",
    undefined,
    'system'
  )
}

/**
 * Send an email notification using the server API
 * @param to Email recipient
 * @param subject Email subject
 * @param message Email message
 * @param link Optional link to include
 * @param from Optional sender email
 * @returns Promise resolving to true if successful
 */
async function sendEmailViaAPI(
  to: string,
  subject: string,
  message: string,
  link?: string,
  from?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, message, link, from })
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error sending email via API:", error);
    return false;
  }
}

/**
 * Add a notification for an employer
 * @param employerId ID of the employer
 * @param title Title of the notification
 * @param message Notification message
 * @param type Type of notification
 * @param link Optional link to navigate to
 * @param relatedId Optional ID related to the notification (job, application, etc.)
 * @param relatedData Optional additional data related to the notification
 * @returns True if successful, false otherwise
 */
export const addEmployerNotification = async (
  employerId: string,
  title: string,
  message: string,
  type: EmployerNotificationType = "system_alert",
  link?: string,
  relatedId?: string,
  relatedData: Record<string, any> = {}
): Promise<boolean> => {
  try {
    // Add notification to the database
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title,
      message,
      type,
      isRead: false,
      createdAt: serverTimestamp(),
      link,
      relatedId,
      relatedData
    });

    // Try to get employer's email from Firestore
    try {
      const employerSnap = await getDocs(query(collection(db, "users"), where("id", "==", employerId)));

      if (!employerSnap.empty) {
        const employerData = employerSnap.docs[0].data();
        const employerEmail = employerData.email;

        if (employerEmail) {
          // Get absolute URL for the link if relative path provided
          let fullLink = link;
          if (link && link.startsWith('/')) {
            // Use the website base URL from our config
            fullLink = `${emailConfig.websiteUrl}${link}`;
          }

          // Send email notification via API (non-blocking)
          sendEmailViaAPI(employerEmail, title, message, fullLink, employerEmail)
            .then(result => {
              if (result) {
                console.log(`Email notification sent to employer ${employerId} at ${employerEmail}`);
              } else {
                console.error(`Failed to send email notification to employer ${employerId} at ${employerEmail}`);
              }
            })
            .catch(error => {
              console.error("Error sending email notification:", error);
            });
        }
      }
    } catch (emailError) {
      console.error("Error sending email notification:", emailError);
      // Continue execution even if email sending fails
    }

    return true;
  } catch (error) {
    console.error("Error adding employer notification:", error);
    return false;
  }
}

/**
 * Add a notification for a jobseeker
 * @param jobseekerId The ID of the jobseeker
 * @param title Title of the notification
 * @param message Message content
 * @param type Type of notification (application, job, profile, alert, system)
 * @param link Optional link to redirect when clicking the notification
 * @param additionalData Additional data to include in the notification
 * @returns Promise<boolean> indicating success or failure
 */
export const addJobseekerNotification = async (
  jobseekerId: string,
  title: string,
  message: string,
  type: string = "system",
  link?: string | null,
  additionalData: Record<string, any> = {}
) => {
  try {
    if (!jobseekerId) {
      console.error("Error: jobseekerId is required for addJobseekerNotification");
      return false;
    }

    // Create notification document with required fields
    const notificationData: Record<string, any> = {
      jobseekerId,
      title,
      message,
      type,
      isRead: false,
      createdAt: serverTimestamp(),
    };

    // Only add the link field if it's not undefined or null
    if (link !== undefined && link !== null) {
      notificationData.link = link;
    }

    // Filter out any undefined values in additionalData
    const filteredAdditionalData: Record<string, any> = {};
    for (const [key, value] of Object.entries(additionalData)) {
      if (value !== undefined) {
        filteredAdditionalData[key] = value;
      }
    }

    console.log("Creating jobseeker notification with data:", {
      ...notificationData,
      ...filteredAdditionalData
    });

    // Ensure the collection exists and add the document
    const jobseekerNotificationsRef = collection(db, "jobseekernotifications");
    const docRef = await addDoc(jobseekerNotificationsRef, {
      ...notificationData,
      ...filteredAdditionalData
    });

    console.log(`Successfully created notification with ID: ${docRef.id}`);

    return true;
  } catch (error) {
    console.error("Error adding jobseeker notification:", error);
    // Return false instead of throwing to prevent cascading errors
    return false;
  }
}

/**
 * Adds an activity log entry for an employer
 * @param employerId The employer's ID
 * @param type The type of activity
 * @param message A descriptive message about the activity
 * @param metadata Additional metadata about the activity
 * @returns True if successful, false otherwise
 */
export const addEmployerActivity = async (employerId: string, type: string, message: string, metadata: Record<string, any> = {}) => {
  try {
    // Add to activities collection (for admin view)
    await addDoc(collection(db, "activities"), {
      userId: employerId,
      type,
      message,
      timestamp: serverTimestamp(),
      metadata: {
        role: "employer"
      }
    })

    // Add to activity_emp collection
    await addDoc(collection(db, "activity_emp"), {
      employerId,
      type,
      message,
      createdAt: serverTimestamp(),
      metadata
    })

    // If this is a job application, also create a notification
    if (type === "application") {
      // Extract job info from metadata if available
      const jobId = metadata.jobId || "";
      const applicantId = metadata.applicantId || "";
      const applicantName = metadata.applicantName || "A candidate";
      const jobTitle = metadata.jobTitle || "a job position";

      // Create a clean set of additional data
      const additionalData: Record<string, any> = {};

      // Only add applicationId if it exists
      if (metadata.applicationId) {
        additionalData.applicationId = metadata.applicationId;
      }

      // Only add relatedJob if jobId exists
      if (jobId) {
        additionalData.relatedJob = {
          id: jobId,
          title: jobTitle
        };
      }

      // Create notification in employernotifications collection with proper link handling
      await addEmployerNotification(
        employerId,
        "New Application Received",
        `${applicantName} has applied for the position: ${jobTitle}`,
        "application",
        jobId ? `/employer/applications/${jobId}` : null,  // Use null instead of undefined
        additionalData
      );
    }

    return true
  } catch (error) {
    console.error("Error adding employer activity:", error)
    return false
  }
}

/**
 * Adds an activity log entry for a jobseeker
 * @param jobseekerId The jobseeker's ID
 * @param type The type of activity
 * @param message A descriptive message about the activity
 * @param metadata Additional metadata about the activity
 * @returns True if successful, false otherwise
 */
export const addJobseekerActivity = async (jobseekerId: string, type: string, message: string, metadata: Record<string, any> = {}) => {
  try {
    // Add to activities collection (for admin view)
    await addDoc(collection(db, "activities"), {
      userId: jobseekerId,
      type,
      message,
      timestamp: serverTimestamp(),
      metadata: {
        role: "jobseeker"
      }
    })

    // Add to activity_js collection (jobseeker-specific activities)
    await addDoc(collection(db, "activity_js"), {
      jobseekerId,
      type,
      message,
      createdAt: serverTimestamp(),
      metadata
    })

    return true
  } catch (error) {
    console.error("Error adding jobseeker activity:", error)
    return false
  }
}

/**
 * Notify a jobseeker that their application has been accepted/shortlisted
 * @param jobseekerId The ID of the jobseeker
 * @param applicationId The ID of the application
 * @param jobTitle The title of the job
 * @param companyName The name of the company
 * @param jobId The ID of the job
 */
export const notifyJobseekerApplicationAccepted = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string
) => {
  console.log(`Creating acceptance notification for jobseeker ${jobseekerId} for job ${jobTitle}`);

  if (!jobseekerId) {
    console.error("Error: jobseekerId is required for acceptance notification");
    return false;
  }

  try {
    const result = await addJobseekerNotification(
      jobseekerId,
      "Application Shortlisted",
      `${companyName} has shortlisted your application for the ${jobTitle} position.`,
      "application",
      `/jobseeker/applications`,
      {
        applicationId,
        applicationStatus: "Shortlisted",
        relatedJob: {
          id: jobId,
          title: jobTitle
        }
      }
    );
    console.log("Acceptance notification created successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to create acceptance notification:", error);
    return false;
  }
}

/**
 * Notify a jobseeker that their application has been rejected
 * @param jobseekerId The ID of the jobseeker
 * @param applicationId The ID of the application
 * @param jobTitle The title of the job
 * @param companyName The name of the company
 * @param jobId The ID of the job
 * @param reason Optional reason for rejection
 */
export const notifyJobseekerApplicationRejected = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string,
  reason?: string
) => {
  console.log(`Creating rejection notification for jobseeker ${jobseekerId} for job ${jobTitle}`);

  if (!jobseekerId) {
    console.error("Error: jobseekerId is required for rejection notification");
    return false;
  }

  const message = reason
    ? `${companyName} has declined your application for the ${jobTitle} position. Reason: ${reason}`
    : `${companyName} has declined your application for the ${jobTitle} position.`;

  try {
    const result = await addJobseekerNotification(
      jobseekerId,
      "Application Not Selected",
      message,
      "application",
      `/jobseeker/applications`,
      {
        applicationId,
        applicationStatus: "Rejected",
        relatedJob: {
          id: jobId,
          title: jobTitle
        }
      }
    );
    console.log("Rejection notification created successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to create rejection notification:", error);
    return false;
  }
}

/**
 * Notify a jobseeker that they have been scheduled for an interview
 * @param jobseekerId The ID of the jobseeker
 * @param applicationId The ID of the application
 * @param jobTitle The title of the job
 * @param companyName The name of the company
 * @param jobId The ID of the job
 * @param interviewDate The scheduled interview date
 */
export const notifyJobseekerInterviewScheduled = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string,
  interviewDate: string
) => {
  console.log(`Creating interview notification for jobseeker ${jobseekerId} for job ${jobTitle}`);

  if (!jobseekerId) {
    console.error("Error: jobseekerId is required for interview notification");
    return false;
  }

  try {
    const result = await addJobseekerNotification(
      jobseekerId,
      "Interview Scheduled",
      `${companyName} has scheduled an interview with you for the ${jobTitle} position on ${interviewDate}.`,
      "alert",
      `/jobseeker/applications`,
      {
        applicationId,
        applicationStatus: "To be Interviewed",
        relatedJob: {
          id: jobId,
          title: jobTitle
        }
      }
    );
    console.log("Interview notification created successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to create interview notification:", error);
    return false;
  }
}

/**
 * Notify a jobseeker that they have been hired
 * @param jobseekerId The ID of the jobseeker
 * @param applicationId The ID of the application
 * @param jobTitle The title of the job
 * @param companyName The name of the company
 * @param jobId The ID of the job
 */
export const notifyJobseekerHired = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string
) => {
  console.log(`Creating hired notification for jobseeker ${jobseekerId} for job ${jobTitle}`);

  if (!jobseekerId) {
    console.error("Error: jobseekerId is required for hired notification");
    return false;
  }

  try {
    const result = await addJobseekerNotification(
      jobseekerId,
      "Congratulations! You've been hired",
      `${companyName} has decided to hire you for the ${jobTitle} position.`,
      "success",
      `/jobseeker/applications`,
      {
        applicationId,
        applicationStatus: "Hired",
        relatedJob: {
          id: jobId,
          title: jobTitle
        }
      }
    );
    console.log("Hired notification created successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to create hired notification:", error);
    return false;
  }
}

/**
 * Notify a jobseeker that they have received an email from an employer
 * @param jobseekerId The ID of the jobseeker
 * @param applicationId The ID of the application
 * @param jobTitle The title of the job
 * @param companyName The name of the company
 * @param jobId The ID of the job
 * @param emailSubject The subject of the email
 */
export const notifyJobseekerEmailSent = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string,
  emailSubject: string
) => {
  console.log(`Creating email notification for jobseeker ${jobseekerId} for job ${jobTitle}`);

  if (!jobseekerId) {
    console.error("Error: jobseekerId is required for email notification");
    return false;
  }

  try {
    // Try to get employer information from localStorage (client-side) or from our context
    let employerEmail = null;
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        employerEmail = user.email;
      }
    }

    const result = await addJobseekerNotification(
      jobseekerId,
      "New Message from Employer",
      `${companyName} has sent you an email regarding your application for the ${jobTitle} position: "${emailSubject}"`,
      "alert",
      null,
      {
        applicationId,
        relatedJob: {
          id: jobId,
          title: jobTitle
        },
        employerEmail: employerEmail // Pass the employer email in the additional data
      }
    );
    console.log("Email notification created successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to create email notification:", error);
    return false;
  }
}

/**
 * Get all notifications for an employer
 * @param employerId ID of the employer
 * @param limit Maximum number of notifications to return
 * @returns Array of employer notifications
 */
export const getEmployerNotifications = async (
  employerId: string,
  limit: number = 50
): Promise<EnhancedEmployerNotification[]> => {
  try {
    const notificationsQuery = query(
      collection(db, "employernotifications"),
      where("employerId", "==", employerId),
      orderBy("createdAt", "desc")
    );

    const notificationsSnapshot = await getDocs(notificationsQuery);

    // Apply limit after fetching
    const limitedDocs = notificationsSnapshot.docs.slice(0, limit);

    return limitedDocs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EnhancedEmployerNotification));
  } catch (error) {
    console.error("Error fetching employer notifications:", error);
    return [];
  }
}

/**
 * Direct function to create a notification in Firestore
 */
export const createDirectNotification = async (
  jobseekerId: string,
  status: string,
  jobTitle: string = "Job Position",
  companyName: string = "Company"
) => {
  console.log(`Creating direct ${status} notification for jobseeker ${jobseekerId}`);

  if (!jobseekerId) {
    console.error("Error: jobseekerId is required for direct notification");
    return false;
  }

  let title = "";
  let message = "";
  let type = "application";

  switch (status) {
    case "To be Interviewed":
      title = "Interview Scheduled";
      message = `${companyName} has scheduled an interview with you for the ${jobTitle} position.`;
      type = "alert";
      break;
    case "Hired":
      title = "Congratulations! You've been hired";
      message = `${companyName} has decided to hire you for the ${jobTitle} position.`;
      type = "success";
      break;
    case "Rejected":
      title = "Application Not Selected";
      message = `${companyName} has declined your application for the ${jobTitle} position.`;
      type = "application";
      break;
    default:
      title = status;
      message = `Status update: ${status}`;
  }

  try {
    // Create the notification document directly in Firestore
    const jobseekerNotificationsRef = collection(db, "jobseekernotifications");
    const docRef = await addDoc(jobseekerNotificationsRef, {
      jobseekerId,
      title,
      message,
      type,
      isRead: false,
      createdAt: serverTimestamp(),
      applicationStatus: status,
      link: "/jobseeker/applications"
    });

    console.log(`Successfully created direct ${status} notification with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`Error creating direct ${status} notification:`, error);
    return false;
  }
}

/**
 * Test function to check if notifications are working properly
 * @param jobseekerId The ID of the jobseeker to send the test notification to
 */
export const testNotificationSystem = async (jobseekerId: string) => {
  console.log("Testing notification system...");

  try {
    // Test direct notification creation
    const directResult = await createDirectNotification(
      jobseekerId,
      "Test",
      "Test Job Position",
      "Test Company"
    );

    console.log("Direct notification test result:", directResult);

    // Test addJobseekerNotification
    const notificationResult = await addJobseekerNotification(
      jobseekerId,
      "Test Notification",
      "This is a test notification to verify the system is working.",
      "system",
      null,
      {
        testField: "test value"
      }
    );

    console.log("Regular notification test result:", notificationResult);

    return {
      success: Boolean(directResult && notificationResult),
      directResult,
      notificationResult
    };
  } catch (error) {
    console.error("Test notification failed:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Debug function to verify Firestore connectivity and permissions
 * This function attempts to write a test document to Firestore
 */
export const debugFirestoreConnection = async () => {
  console.log("Testing Firestore connection...");

  try {
    // Test if we can write to Firestore
    const testCollection = collection(db, "debug_test");
    const testDoc = await addDoc(testCollection, {
      test: true,
      message: "Firestore connection test",
      timestamp: serverTimestamp()
    });

    console.log(`Successfully wrote test document with ID: ${testDoc.id}`);

    return {
      success: true,
      docId: testDoc.id
    };
  } catch (error) {
    console.error("Firestore connection test failed:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Direct function to store interview scheduling notification in Firestore
 * This bypasses the regular notification system for debugging
 */
export const directStoreInterviewNotification = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  interviewDate: string
) => {
  console.log(`[DIRECT] Creating interview notification for jobseeker ${jobseekerId}`);

  if (!jobseekerId) {
    console.error("[DIRECT] Error: jobseekerId is required");
    return false;
  }

  try {
    // Create the notification document directly in Firestore
    const jobseekerNotificationsRef = collection(db, "jobseekernotifications");

    // Log the collection reference to ensure it's valid
    console.log("[DIRECT] Collection reference:", jobseekerNotificationsRef);

    const notificationData = {
      jobseekerId,
      title: "Interview Scheduled",
      message: `${companyName} has scheduled an interview with you for the ${jobTitle} position on ${interviewDate}.`,
      type: "alert",
      isRead: false,
      createdAt: serverTimestamp(),
      applicationStatus: "To be Interviewed",
      link: "/jobseeker/applications",
      applicationId,
      relatedJob: {
        title: jobTitle
      }
    };

    // Log the data being written
    console.log("[DIRECT] Writing notification data:", notificationData);

    // Try to add the document
    const docRef = await addDoc(jobseekerNotificationsRef, notificationData);

    console.log(`[DIRECT] Successfully created notification with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`[DIRECT] Error creating notification:`, error);
    return false;
  }
}

/**
 * Direct function to store hire notification in Firestore
 * This bypasses the regular notification system for debugging
 */
export const directStoreHireNotification = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string
) => {
  console.log(`[DIRECT] Creating hire notification for jobseeker ${jobseekerId}`);

  if (!jobseekerId) {
    console.error("[DIRECT] Error: jobseekerId is required");
    return false;
  }

  if (!applicationId) {
    console.error("[DIRECT] Warning: applicationId is missing");
    // Continue anyway since jobseekerId is the critical part
  }

  try {
    // Create the notification document directly in Firestore
    const jobseekerNotificationsRef = collection(db, "jobseekernotifications");

    // Log the collection reference to ensure it's valid
    console.log("[DIRECT] Collection reference:", jobseekerNotificationsRef);

    const notificationData = {
      jobseekerId,
      title: "Congratulations! You've been hired",
      message: `${companyName} has decided to hire you for the ${jobTitle} position.`,
      type: "success",
      isRead: false,
      createdAt: serverTimestamp(),
      applicationStatus: "Hired",
      link: "/jobseeker/applications",
      applicationId,
      relatedJob: {
        title: jobTitle
      }
    };

    // Log the data being written
    console.log("[DIRECT] Writing notification data:", notificationData);

    // Try to add the document
    const docRef = await addDoc(jobseekerNotificationsRef, notificationData);

    console.log(`[DIRECT] Successfully created hire notification with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`[DIRECT] Error creating hire notification:`, error);
    // Additional debugging
    if (error instanceof Error) {
      console.error(`[DIRECT] Error message: ${error.message}`);
      console.error(`[DIRECT] Error stack: ${error.stack}`);
    }
    return false;
  }
}

/**
 * Direct function to store rejection notification in Firestore
 * This bypasses the regular notification system for debugging
 */
export const directStoreRejectionNotification = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  reason?: string
) => {
  console.log(`[DIRECT] Creating rejection notification for jobseeker ${jobseekerId}`);

  if (!jobseekerId) {
    console.error("[DIRECT] Error: jobseekerId is required");
    return false;
  }

  if (!applicationId) {
    console.error("[DIRECT] Warning: applicationId is missing");
    // Continue anyway since jobseekerId is the critical part
  }

  try {
    // Create the notification document directly in Firestore
    const jobseekerNotificationsRef = collection(db, "jobseekernotifications");

    // Log the collection reference to ensure it's valid
    console.log("[DIRECT] Collection reference:", jobseekerNotificationsRef);

    const message = reason
      ? `${companyName} has declined your application for the ${jobTitle} position. Reason: ${reason}`
      : `${companyName} has declined your application for the ${jobTitle} position.`;

    const notificationData = {
      jobseekerId,
      title: "Application Not Selected",
      message,
      type: "application",
      isRead: false,
      createdAt: serverTimestamp(),
      applicationStatus: "Rejected",
      link: "/jobseeker/applications",
      applicationId,
      relatedJob: {
        title: jobTitle
      }
    };

    // Log the data being written
    console.log("[DIRECT] Writing notification data:", notificationData);

    // Try to add the document
    const docRef = await addDoc(jobseekerNotificationsRef, notificationData);

    console.log(`[DIRECT] Successfully created rejection notification with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`[DIRECT] Error creating rejection notification:`, error);
    // Additional debugging
    if (error instanceof Error) {
      console.error(`[DIRECT] Error message: ${error.message}`);
      console.error(`[DIRECT] Error stack: ${error.stack}`);
    }
    return false;
  }
}

/**
 * Combined function to send interview notifications using all available methods
 * This function tries multiple methods to ensure the notification is sent
 * @param jobseekerId The ID of the jobseeker
 * @param applicationId The ID of the application
 * @param jobTitle The title of the job
 * @param companyName The name of the company
 * @param jobId The ID of the job
 * @param interviewDate The scheduled interview date
 * @returns Promise<boolean> indicating if any notification method succeeded
 */
export const sendJobseekerInterviewNotification = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string,
  interviewDate: string
): Promise<boolean> => {
  console.log(`[COMBINED] Sending interview notification to jobseeker ${jobseekerId} for job ${jobTitle}`);

  if (!jobseekerId) {
    console.error("[COMBINED] Error: jobseekerId is required for interview notification");
    return false;
  }

  let success = false;

  // Method 1: Try direct store method first (most reliable)
  try {
    console.log("[COMBINED] Trying directStoreInterviewNotification method");
    const directResult = await directStoreInterviewNotification(
      jobseekerId,
      applicationId,
      jobTitle,
      companyName,
      interviewDate
    );

    if (directResult) {
      console.log("[COMBINED] Successfully created notification using directStoreInterviewNotification");
      success = true;
    }
  } catch (error) {
    console.error("[COMBINED] Error using directStoreInterviewNotification:", error);
  }

  // If direct store failed, try the standard notification method
  if (!success) {
    try {
      console.log("[COMBINED] Trying notifyJobseekerInterviewScheduled method");
      const result = await notifyJobseekerInterviewScheduled(
        jobseekerId,
        applicationId,
        jobTitle,
        companyName,
        jobId,
        interviewDate
      );

      if (result) {
        console.log("[COMBINED] Successfully created notification using notifyJobseekerInterviewScheduled");
        success = true;
      }
    } catch (error) {
      console.error("[COMBINED] Error using notifyJobseekerInterviewScheduled:", error);
    }
  }

  // If both methods failed, try the simple direct notification method
  if (!success) {
    try {
      console.log("[COMBINED] Trying createDirectNotification method");
      const result = await createDirectNotification(
        jobseekerId,
        "To be Interviewed",
        jobTitle,
        companyName
      );

      if (result) {
        console.log("[COMBINED] Successfully created notification using createDirectNotification");
        success = true;
      }
    } catch (error) {
      console.error("[COMBINED] Error using createDirectNotification:", error);
    }
  }

  // Last resort: Try to directly add a document to the collection
  if (!success) {
    try {
      console.log("[COMBINED] Trying direct Firestore document creation");
      const jobseekerNotificationsRef = collection(db, "jobseekernotifications");

      const notificationData = {
        jobseekerId,
        title: "Interview Scheduled",
        message: `${companyName} has scheduled an interview with you for the ${jobTitle} position on ${interviewDate}.`,
        type: "alert",
        isRead: false,
        createdAt: serverTimestamp(),
        applicationStatus: "To be Interviewed",
        link: "/jobseeker/applications",
        applicationId
      };

      const docRef = await addDoc(jobseekerNotificationsRef, notificationData);
      console.log(`[COMBINED] Successfully created notification with ID: ${docRef.id}`);
      success = true;
    } catch (error) {
      console.error("[COMBINED] Error with direct Firestore document creation:", error);
    }
  }

  if (success) {
    console.log(`[COMBINED] Successfully sent interview notification to jobseeker ${jobseekerId}`);
  } else {
    console.error(`[COMBINED] All notification methods failed for jobseeker ${jobseekerId}`);
  }

  return success;
}

/**
 * Combined function to send hire notifications using all available methods
 * This function tries multiple methods to ensure the notification is sent
 * @param jobseekerId The ID of the jobseeker
 * @param applicationId The ID of the application
 * @param jobTitle The title of the job
 * @param companyName The name of the company
 * @param jobId The ID of the job
 * @returns Promise<boolean> indicating if any notification method succeeded
 */
export const sendJobseekerHireNotification = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string
): Promise<boolean> => {
  console.log(`[COMBINED] Sending hire notification to jobseeker ${jobseekerId} for job ${jobTitle}`);

  if (!jobseekerId) {
    console.error("[COMBINED] Error: jobseekerId is required for hire notification");
    return false;
  }

  let success = false;

  // Method 1: Try direct store method first (most reliable)
  try {
    console.log("[COMBINED] Trying directStoreHireNotification method");
    const directResult = await directStoreHireNotification(
      jobseekerId,
      applicationId,
      jobTitle,
      companyName
    );

    if (directResult) {
      console.log("[COMBINED] Successfully created notification using directStoreHireNotification");
      success = true;
    }
  } catch (error) {
    console.error("[COMBINED] Error using directStoreHireNotification:", error);
  }

  // If direct store failed, try the standard notification method
  if (!success) {
    try {
      console.log("[COMBINED] Trying notifyJobseekerHired method");
      const result = await notifyJobseekerHired(
        jobseekerId,
        applicationId,
        jobTitle,
        companyName,
        jobId
      );

      if (result) {
        console.log("[COMBINED] Successfully created notification using notifyJobseekerHired");
        success = true;
      }
    } catch (error) {
      console.error("[COMBINED] Error using notifyJobseekerHired:", error);
    }
  }

  // If both methods failed, try the simple direct notification method
  if (!success) {
    try {
      console.log("[COMBINED] Trying createDirectNotification method");
      const result = await createDirectNotification(
        jobseekerId,
        "Hired",
        jobTitle,
        companyName
      );

      if (result) {
        console.log("[COMBINED] Successfully created notification using createDirectNotification");
        success = true;
      }
    } catch (error) {
      console.error("[COMBINED] Error using createDirectNotification:", error);
    }
  }

  // Last resort: Try to directly add a document to the collection
  if (!success) {
    try {
      console.log("[COMBINED] Trying direct Firestore document creation");
      const jobseekerNotificationsRef = collection(db, "jobseekernotifications");

      const notificationData = {
        jobseekerId,
        title: "Congratulations! You've been hired",
        message: `${companyName} has decided to hire you for the ${jobTitle} position.`,
        type: "success",
        isRead: false,
        createdAt: serverTimestamp(),
        applicationStatus: "Hired",
        link: "/jobseeker/applications",
        applicationId
      };

      const docRef = await addDoc(jobseekerNotificationsRef, notificationData);
      console.log(`[COMBINED] Successfully created notification with ID: ${docRef.id}`);
      success = true;
    } catch (error) {
      console.error("[COMBINED] Error with direct Firestore document creation:", error);
    }
  }

  if (success) {
    console.log(`[COMBINED] Successfully sent hire notification to jobseeker ${jobseekerId}`);
  } else {
    console.error(`[COMBINED] All notification methods failed for jobseeker ${jobseekerId}`);
  }

  return success;
}

/**
 * Create a job verification notification for an employer
 * @param employerId ID of the employer
 * @param jobId ID of the job
 * @param jobTitle Title of the job
 * @param status Verification status (approved, rejected, pending)
 * @returns True if successful, false otherwise
 */
export const notifyJobVerification = async (
  employerId: string,
  jobId: string,
  jobTitle: string,
  status: "approved" | "rejected" | "pending"
): Promise<boolean> => {
  let title = "";
  let message = "";
  let link = `/employer-dashboard/jobs/${jobId}`;

  switch (status) {
    case "approved":
      title = "Job Posting Approved";
      message = `Your job posting "${jobTitle}" has been approved and is now live.`;
      break;
    case "rejected":
      title = "Job Posting Rejected";
      message = `Your job posting "${jobTitle}" has been rejected. Please review and resubmit.`;
      break;
    case "pending":
      title = "Job Posting Under Review";
      message = `Your job posting "${jobTitle}" is being reviewed by our team.`;
      break;
  }

  return addEmployerNotification(
    employerId,
    title,
    message,
    "job_verification",
    link,
    jobId,
    { status, jobTitle }
  );
}

/**
 * Create a new application notification for an employer
 * @param employerId ID of the employer
 * @param jobId ID of the job
 * @param jobTitle Title of the job
 * @param applicantId ID of the applicant
 * @param applicantName Name of the applicant
 * @param applicationId ID of the application
 * @returns True if successful, false otherwise
 */
export const notifyNewApplication = async (
  employerId: string,
  jobId: string,
  jobTitle: string,
  applicantId: string,
  applicantName: string,
  applicationId: string
): Promise<boolean> => {
  return addEmployerNotification(
    employerId,
    "New Job Application",
    `${applicantName} has applied for your job: "${jobTitle}"`,
    "new_application",
    `/employer/applicants/${applicationId}`,
    applicationId,
    {
      jobId,
      jobTitle,
      applicantId,
      applicantName
    }
  );
}

/**
 * Create a system announcement notification for employers
 * @param title Title of the announcement
 * @param message Announcement message
 * @param targetEmployerId Specific employer ID or "all" for all employers
 * @param link Optional link to navigate to
 * @returns True if successful, false otherwise
 */
export const createEmployerAnnouncement = async (
  title: string,
  message: string,
  targetEmployerId: string = "all",
  link?: string
): Promise<boolean> => {
  try {
    if (targetEmployerId === "all") {
      // Get all employers
      const employersQuery = query(
        collection(db, "users"),
        where("role", "in", ["employer", "multi"])
      );

      const employersSnapshot = await getDocs(employersQuery);

      const promises = employersSnapshot.docs.map(doc => {
        const userData = doc.data();
        if (userData.role === "employer" || (userData.role === "multi")) {
          return addEmployerNotification(
            doc.id,
            title,
            message,
            "announcement",
            link
          );
        }
        return Promise.resolve(true);
      });

      await Promise.all(promises);
      return true;
    } else {
      return addEmployerNotification(
        targetEmployerId,
        title,
        message,
        "announcement",
        link
      );
    }
  } catch (error) {
    console.error("Error creating employer announcement:", error);
    return false;
  }
}

/**
 * Delete an employer notification
 * @param notificationId ID of the notification to delete
 * @returns True if successful, false otherwise
 */
export const deleteEmployerNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationRef = doc(db, "employernotifications", notificationId);
    await deleteDoc(notificationRef);
    return true;
  } catch (error) {
    console.error("Error deleting employer notification:", error);
    return false;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, "employernotifications", notificationId)
    await updateDoc(notificationRef, {
      isRead: true
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw new Error("Failed to mark notification as read")
  }
}

/**
 * Mark all notifications as read for an employer
 */
export async function markAllNotificationsAsRead(employerId: string): Promise<void> {
  try {
    const notifications = await getEmployerNotifications(employerId)
    const unreadNotifications = notifications.filter(n => !n.isRead)

    const updatePromises = unreadNotifications.map(notification =>
      markNotificationAsRead(notification.id!)
    )

    await Promise.all(updatePromises)
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw new Error("Failed to mark all notifications as read")
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, "employernotifications", notificationId)
    await deleteDoc(notificationRef)
  } catch (error) {
    console.error("Error deleting notification:", error)
    throw new Error("Failed to delete notification")
  }
} 