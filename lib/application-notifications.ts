import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addJobseekerNotification } from "@/lib/notifications";

/**
 * Send a notification to a jobseeker about an application status change
 * @param jobseekerId The ID of the jobseeker
 * @param applicationId The ID of the application
 * @param jobTitle The title of the job
 * @param companyName The name of the company
 * @param jobId The ID of the job
 * @param status The new status of the application
 * @param additionalInfo Optional additional information (e.g., interview date, rejection reason)
 * @returns Promise<boolean> indicating if the notification was sent successfully
 */
export const notifyJobseekerApplicationStatusChange = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string,
  status: string,
  additionalInfo?: string
): Promise<boolean> => {
  console.log(`Creating ${status} notification for jobseeker ${jobseekerId} for job ${jobTitle}`);

  if (!jobseekerId) {
    console.error(`Error: jobseekerId is required for ${status} notification`);
    return false;
  }

  try {
    let title = "";
    let message = "";
    let type = "application";
    let applicationStatus = status;

    // Configure notification based on status
    switch (status.toLowerCase()) {
      case "shortlisted":
        title = "Application Shortlisted";
        message = `${companyName} has shortlisted your application for the ${jobTitle} position.`;
        break;
      case "to be interviewed":
      case "interview":
        title = "Interview Scheduled";
        message = additionalInfo 
          ? `${companyName} has scheduled an interview with you for the ${jobTitle} position on ${additionalInfo}.` 
          : `${companyName} has scheduled an interview with you for the ${jobTitle} position.`;
        type = "alert";
        applicationStatus = "To be Interviewed";
        break;
      case "hired":
        title = "Congratulations! You've been hired";
        message = `${companyName} has decided to hire you for the ${jobTitle} position.`;
        type = "success";
        break;
      case "rejected":
        title = "Application Not Selected";
        message = additionalInfo
          ? `${companyName} has declined your application for the ${jobTitle} position. Reason: ${additionalInfo}`
          : `${companyName} has declined your application for the ${jobTitle} position.`;
        break;
      default:
        title = `Application ${status}`;
        message = `${companyName} has updated your application status for the ${jobTitle} position to ${status}.`;
    }

    // Try to create notification using the standard method
    try {
      const result = await addJobseekerNotification(
        jobseekerId,
        title,
        message,
        type,
        `/jobseeker/applications`,
        {
          applicationId,
          applicationStatus,
          relatedJob: {
            id: jobId,
            title: jobTitle
          }
        }
      );
      
      if (result) {
        console.log(`Successfully created ${status} notification using standard method`);
        return true;
      }
    } catch (error) {
      console.error(`Error creating ${status} notification using standard method:`, error);
    }

    // If the standard method fails, try direct Firestore document creation
    try {
      console.log(`Trying direct Firestore document creation for ${status} notification`);
      const jobseekerNotificationsRef = collection(db, "jobseekernotifications");

      const notificationData = {
        jobseekerId,
        title,
        message,
        type,
        isRead: false,
        createdAt: serverTimestamp(),
        applicationStatus,
        link: "/jobseeker/applications",
        applicationId,
        relatedJob: {
          id: jobId,
          title: jobTitle
        }
      };

      const docRef = await addDoc(jobseekerNotificationsRef, notificationData);
      console.log(`Successfully created ${status} notification with ID: ${docRef.id}`);
      return true;
    } catch (error) {
      console.error(`Error with direct Firestore creation for ${status} notification:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Failed to create ${status} notification:`, error);
    return false;
  }
};

/**
 * Notify a jobseeker that their application has been shortlisted
 */
export const notifyJobseekerShortlisted = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string
): Promise<boolean> => {
  return notifyJobseekerApplicationStatusChange(
    jobseekerId,
    applicationId,
    jobTitle,
    companyName,
    jobId,
    "shortlisted"
  );
};

/**
 * Notify a jobseeker that their application has been rejected
 */
export const notifyJobseekerRejected = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string,
  reason?: string
): Promise<boolean> => {
  return notifyJobseekerApplicationStatusChange(
    jobseekerId,
    applicationId,
    jobTitle,
    companyName,
    jobId,
    "rejected",
    reason
  );
};

/**
 * Notify a jobseeker that they have been scheduled for an interview
 */
export const notifyJobseekerInterview = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string,
  interviewDate: string
): Promise<boolean> => {
  return notifyJobseekerApplicationStatusChange(
    jobseekerId,
    applicationId,
    jobTitle,
    companyName,
    jobId,
    "to be interviewed",
    interviewDate
  );
};

/**
 * Notify a jobseeker that they have been hired
 */
export const notifyJobseekerHired = async (
  jobseekerId: string,
  applicationId: string,
  jobTitle: string,
  companyName: string,
  jobId: string
): Promise<boolean> => {
  return notifyJobseekerApplicationStatusChange(
    jobseekerId,
    applicationId,
    jobTitle,
    companyName,
    jobId,
    "hired"
  );
}; 