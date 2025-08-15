import { db } from "@/lib/firebase"
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  limit,
  Timestamp,
  increment
} from "firebase/firestore"
import { addAdminNotification, addEmployerActivity, addJobseekerNotification } from "@/lib/notifications"

export interface JobPosting {
  id?: string
  title: string
  company: string
  location: string
  city: string
  coordinates: [number, number]
  type: string
  category: string
  salary: string
  description: string
  requirements: string
  benefits: string
  applicationDeadline: string
  contactEmail: string
  contactPhone: string
  remote: boolean
  featured: boolean
  urgent: boolean
  employerId: string
  companyName: string
  createdAt?: any
  updatedAt?: any
  isActive?: boolean
  isDeleted?: boolean
  deletedAt?: any
  isDeepArchived?: boolean
  applicationsCount?: number
}

/**
 * Add a new job posting to Firestore
 * @param jobData The job posting data
 * @returns The ID of the newly created job posting
 */
export async function addJobPosting(jobData: Omit<JobPosting, "id" | "createdAt" | "updatedAt" | "isActive" | "applicationsCount">): Promise<string> {
  try {
    // Add timestamp and status
    const jobWithMetadata = {
      ...jobData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true, // Immediately active
      applicationsCount: 0
    }
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, "jobs"), jobWithMetadata)
    
    return docRef.id
  } catch (error) {
    console.error("Error adding job posting:", error)
    throw new Error("Failed to add job posting")
  }
}

/**
 * Update an existing job posting
 * @param jobId The ID of the job posting to update
 * @param jobData The updated job data
 */
export async function updateJobPosting(jobId: string, jobData: Partial<JobPosting>): Promise<void> {
  try {
    const jobRef = doc(db, "jobs", jobId)
    
    // Add updated timestamp
    const updatedData = {
      ...jobData,
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(jobRef, updatedData)
  } catch (error) {
    console.error("Error updating job posting:", error)
    throw new Error("Failed to update job posting")
  }
}

/**
 * Soft delete a job posting by setting isDeleted flag to true
 * @param jobId The ID of the job posting to delete
 */
export async function deleteJobPosting(jobId: string): Promise<void> {
  try {
    // Get job data before soft deleting to get employerId, title, and other info
    const jobSnapshot = await getDoc(doc(db, "jobs", jobId));
    if (!jobSnapshot.exists()) {
      throw new Error("Job not found");
    }
    const jobData = jobSnapshot.data();
    const employerId = jobData.employerId;
    const jobTitle = jobData.title;

    // Instead of hard deleting, update the job with isDeleted flag
    const jobRef = doc(db, "jobs", jobId);
    await updateDoc(jobRef, {
      isDeleted: true,
      isActive: false, // Also mark as inactive
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Add activity for the employer
    if (employerId) {
      await addEmployerActivity(
        employerId,
        "job_deleted",
        `You moved job posting "${jobTitle}" to archive`
      );
    }
    
    // Notify applicants about the job deletion
    await notifyApplicantsAboutJobDeletion(jobId, jobTitle);

  } catch (error) {
    console.error("Error soft deleting job posting:", error);
    throw new Error("Failed to delete job posting")
  }
}

/**
 * Get a job posting by ID
 * @param jobId The ID of the job posting to retrieve
 * @param userRole Optional user role to check permissions
 * @returns The job posting data
 */
export async function getJobPosting(jobId: string, userRole?: string): Promise<JobPosting | null> {
  try {
    const jobRef = doc(db, "jobs", jobId)
    const jobDoc = await getDoc(jobRef)
    
    if (!jobDoc.exists()) {
      return null
    }
    
    const jobData = jobDoc.data()
    
    // If job is deleted and user is not admin/employer, don't allow access
    if (jobData.isDeleted && userRole && userRole !== "admin" && userRole !== "employer") {
      throw new Error("This job posting has been removed by the employer")
    }
    
    return {
      id: jobDoc.id,
      ...jobData
    } as JobPosting
  } catch (error) {
    console.error("Error getting job posting:", error)
    throw error
  }
}

/**
 * Get all job postings by an employer
 * @param employerId The ID of the employer
 * @returns An array of job postings
 */
export async function getEmployerJobPostings(employerId: string): Promise<JobPosting[]> {
  try {
    const jobsQuery = query(
      collection(db, "jobs"),
      where("employerId", "==", employerId),
      orderBy("createdAt", "desc")
    )
    
    const querySnapshot = await getDocs(jobsQuery)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as JobPosting))
  } catch (error) {
    console.error("Error getting employer job postings:", error)
    throw new Error("Failed to get employer job postings")
  }
}

/**
 * Toggle the active status of a job posting
 * @param jobId The ID of the job posting
 * @param isActive The new active status
 */
export async function toggleJobStatus(jobId: string, isActive: boolean): Promise<void> {
  try {
    const jobRef = doc(db, "jobs", jobId);

    // Get job data before updating to get employerId and title
    const jobSnapshot = await getDoc(doc(db, "jobs", jobId));
    if (!jobSnapshot.exists()) {
      throw new Error("Job not found");
    }
    const jobData = jobSnapshot.data();
    const employerId = jobData.employerId;
    const jobTitle = jobData.title;
    const status = isActive ? "activated" : "deactivated";

    await updateDoc(jobRef, {
      isActive,
      updatedAt: serverTimestamp()
    });

    // Add activity for the employer
    if (employerId) {
      await addEmployerActivity(
        employerId,
        "info", // Or perhaps a new type like "job_status_change"
        `Your job posting for ${jobTitle} has been ${status}.`
      );
    }

  } catch (error) {
    console.error("Error toggling job status:", error);
    throw new Error("Failed to toggle job status")
  }
}

/**
 * Get recent job postings
 * @param limitCount Number of job postings to retrieve
 * @returns An array of job postings
 */
export async function getRecentJobPostings(limitCount: number = 10): Promise<JobPosting[]> {
  try {
    const jobsQuery = query(
      collection(db, "jobs"),
      where("isActive", "==", true),
      where("isDeleted", "!=", true),
      where("verificationStatus", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(jobsQuery)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as JobPosting))
  } catch (error) {
    console.error("Error getting recent job postings:", error)
    throw new Error("Failed to get recent job postings")
  }
}

/**
 * Increment the applications count for a job posting
 * @param jobId The ID of the job posting
 */
export async function incrementJobApplicationsCount(jobId: string): Promise<void> {
  try {
    const jobRef = doc(db, "jobs", jobId)
    
    // Get the current job data
    const jobDoc = await getDoc(jobRef)
    if (!jobDoc.exists()) {
      throw new Error("Job posting not found")
    }
    
    const jobData = jobDoc.data()
    const currentCount = jobData.applicationsCount || 0
    
    // Increment the count
    await updateDoc(jobRef, {
      applicationsCount: currentCount + 1,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error("Error incrementing applications count:", error)
    throw new Error("Failed to increment applications count")
  }
}

/**
 * Decrement the applications count for a job posting
 * @param jobId The ID of the job posting
 */
export async function decrementJobApplicationsCount(jobId: string): Promise<void> {
  try {
    const jobRef = doc(db, "jobs", jobId)
    
    // Get the current job data
    const jobDoc = await getDoc(jobRef)
    if (!jobDoc.exists()) {
      throw new Error("Job posting not found")
    }
    
    const jobData = jobDoc.data()
    const currentCount = jobData.applicationsCount || 0
    
    // Ensure count doesn't go below zero
    const newCount = Math.max(0, currentCount - 1)
    
    // Decrement the count
    await updateDoc(jobRef, {
      applicationsCount: newCount,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error("Error decrementing applications count:", error)
    throw new Error("Failed to decrement applications count")
  }
}

/**
 * Create a new job posting
 * @param jobData The job posting data
 * @param employerId The ID of the employer creating the job
 * @returns The ID of the created job
 */
export async function createJob(jobData: any, employerId: string): Promise<string> {
  try {
    // Get employer info
    const employerRef = doc(db, "users", employerId)
    const employerSnap = await getDoc(employerRef)
    
    if (!employerSnap.exists()) {
      throw new Error("Employer not found")
    }
    
    const employerData = employerSnap.data()
    
    // Create job with verification status as pending
    const jobRef = await addDoc(collection(db, "jobs"), {
      ...jobData,
      employerId,
      companyName: employerData.companyName || "Unknown Company",
      companyLogo: employerData.logo || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "pending", // Jobs start as pending until approved by admin
      verificationStatus: "pending", // Add verification status
      applicationCount: 0,
      viewCount: 0,
      active: true,
    })
    
    // Increment job count for employer
    await updateDoc(employerRef, {
      jobCount: increment(1)
    })
    
    // Notify admin about new job posting requiring verification
    await addAdminNotification(
      "New Job Verification Required",
      `New job posting "${jobData.title}" by ${employerData.companyName} requires verification.`,
      "info",
      "all",
      `/admin/jobs/verification/${jobRef.id}`,
      "employer",
      employerId
    )

    // Add activity for the employer
    await addEmployerActivity(
      employerId,
      "job_post",
      `You posted a new job: ${jobData.title}`,
      {
        jobId: jobRef.id,
        jobTitle: jobData.title,
        jobType: jobData.type,
        jobCategory: jobData.category,
        salary: jobData.salary
      }
    )
    
    return jobRef.id
  } catch (error) {
    console.error("Error creating job:", error)
    throw new Error("Failed to create job posting")
  }
}

/**
 * Get a job posting by ID
 * @param jobId The ID of the job to retrieve
 * @param userRole Optional user role to check permissions
 * @returns The job posting data
 */
export async function getJob(jobId: string, userRole?: string): Promise<any> {
  try {
    const jobRef = doc(db, "jobs", jobId)
    const jobSnap = await getDoc(jobRef)
    
    if (!jobSnap.exists()) {
      throw new Error("Job not found")
    }
    
    const jobData = jobSnap.data()
    
    // If job is deleted and user is not admin/employer, don't allow access
    if (jobData.isDeleted && userRole && userRole !== "admin" && userRole !== "employer") {
      throw new Error("This job posting has been removed by the employer")
    }
    
    return {
      id: jobSnap.id,
      ...jobData,
    }
  } catch (error) {
    console.error("Error fetching job:", error)
    throw error
  }
}

/**
 * Admin function to approve a job posting
 * @param jobId The ID of the job to approve
 * @param adminId The ID of the admin who approved the job
 */
export async function approveJob(jobId: string, adminId: string): Promise<void> {
  try {
    const jobRef = doc(db, "jobs", jobId)
    const jobSnap = await getDoc(jobRef)
    
    if (!jobSnap.exists()) {
      throw new Error("Job not found")
    }
    
    const jobData = jobSnap.data()
    
    // Update job with approved status
    await updateDoc(jobRef, {
      verificationStatus: "approved",
      verifiedAt: serverTimestamp(),
      verifiedBy: adminId,
      updatedAt: serverTimestamp()
    })
    
    // Also notify the employer that their job was approved
    const employerRef = doc(db, "users", jobData.employerId)
    const employerSnap = await getDoc(employerRef)
    
    if (employerSnap.exists()) {
      // Get employer data for notification
      const employerData = employerSnap.data()
      
      // Add notification for the specific employer
      await addAdminNotification(
        "Job Posting Approved",
        `Your job posting "${jobData.title}" has been approved and is now visible to job seekers.`,
        "success",
        employerData.id,
        `/employer/jobs/${jobId}`,
        "admin",
        adminId
      )

      // Add activity for the employer's activity feed
      await addEmployerActivity(
        jobData.employerId,
        "approval",
        `Your job posting for ${jobData.title} has been approved.`
      )
    }
  } catch (error) {
    console.error("Error approving job:", error)
    throw new Error("Failed to approve job posting")
  }
}

/**
 * Admin function to reject a job posting
 * @param jobId The ID of the job to reject
 * @param adminId The ID of the admin who rejected the job
 * @param reason The reason for rejection
 */
export async function rejectJob(jobId: string, adminId: string, reason: string): Promise<void> {
  try {
    const jobRef = doc(db, "jobs", jobId)
    const jobSnap = await getDoc(jobRef)
    
    if (!jobSnap.exists()) {
      throw new Error("Job not found")
    }
    
    const jobData = jobSnap.data()
    
    // Update job with rejected status and reason
    await updateDoc(jobRef, {
      verificationStatus: "rejected",
      rejectedAt: serverTimestamp(),
      rejectedBy: adminId,
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
      active: false // Automatically deactivate rejected jobs
    })
    
    // Notify the employer that their job was rejected
    const employerRef = doc(db, "users", jobData.employerId)
    const employerSnap = await getDoc(employerRef)
    
    if (employerSnap.exists()) {
      // Get employer data for notification
      const employerData = employerSnap.data()
      
      // Add notification for the specific employer
      await addAdminNotification(
        "Job Posting Rejected",
        `Your job posting "${jobData.title}" has been rejected. Reason: ${reason}`,
        "error",
        employerData.id,
        `/employer/jobs/${jobId}`,
        "admin",
        adminId
      )
    }
  } catch (error) {
    console.error("Error rejecting job:", error)
    throw new Error("Failed to reject job posting")
  }
}

/**
 * Get all jobs that require verification by admin
 * @returns Array of pending job verifications
 */
export async function getPendingJobVerifications(): Promise<any[]> {
  try {
    const jobsQuery = query(
      collection(db, "jobs"),
      where("verificationStatus", "==", "pending"),
      orderBy("createdAt", "desc")
    )
    
    const jobsSnap = await getDocs(jobsQuery)
    return jobsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error("Error fetching pending job verifications:", error)
    throw new Error("Failed to fetch pending job verifications")
  }
}

/**
 * Get all verified jobs (approved and rejected)
 * @returns Array of verified job postings
 */
export async function getVerifiedJobs(status?: 'approved' | 'rejected'): Promise<any[]> {
  try {
    let jobsQuery;
    
    if (status) {
      // Filter by specific status (approved or rejected)
      jobsQuery = query(
        collection(db, "jobs"),
        where("verificationStatus", "==", status),
        orderBy("verifiedAt", "desc")
      )
    } else {
      // Get all verified jobs (both approved and rejected)
      jobsQuery = query(
        collection(db, "jobs"),
        where("verificationStatus", "in", ["approved", "rejected"]),
        orderBy("updatedAt", "desc")
      )
    }
    
    const jobsSnap = await getDocs(jobsQuery)
    return jobsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error("Error fetching verified jobs:", error)
    throw new Error("Failed to fetch verified jobs")
  }
}

/**
 * Search for job postings by keywords
 * @param searchQuery The search query
 * @param filters Optional filters (category, location, jobType)
 * @returns Array of matching job postings
 */
export async function searchJobs(
  searchQuery: string, 
  filters?: { 
    category?: string, 
    location?: string, 
    jobType?: string 
  }
): Promise<JobPosting[]> {
  try {
    // Create base query with active jobs only
    let queryConstraints: any[] = [
      where("isActive", "==", true),
      where("isDeleted", "!=", true),
      where("verificationStatus", "==", "approved")
    ];
    
    // Get all approved, active jobs
    const querySnapshot = await getDocs(query(collection(db, "jobs"), ...queryConstraints));
    
    // Perform client-side filtering for search query and other filters
    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as JobPosting[]
    
    // Filter by search query (search in title, description, company name)
    if (searchQuery && searchQuery.trim() !== '') {
      const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/)
      
      results = results.filter(job => {
        const titleMatches = searchTerms.some(term => 
          job.title?.toLowerCase().includes(term)
        )
        
        const descriptionMatches = searchTerms.some(term => 
          job.description?.toLowerCase().includes(term)
        )
        
        const companyMatches = searchTerms.some(term => 
          job.companyName?.toLowerCase().includes(term)
        )
        
        return titleMatches || descriptionMatches || companyMatches
      })
    }
    
    // Apply additional filters
    if (filters) {
      if (filters.category) {
        results = results.filter(job => job.category === filters.category)
      }
      
      if (filters.location) {
        results = results.filter(job => 
          job.location?.toLowerCase().includes(filters.location!.toLowerCase())
        )
      }
      
      if (filters.jobType) {
        results = results.filter(job => job.type === filters.jobType)
      }
    }
    
    return results
  } catch (error) {
    console.error("Error searching job postings:", error)
    throw new Error("Failed to search job postings")
  }
}

/**
 * Move a job to the deep archive (JobArchive collection)
 * @param jobId The ID of the job posting to archive
 */
export async function moveJobToArchive(jobId: string): Promise<void> {
  try {
    // Get the job data
    const jobSnapshot = await getDoc(doc(db, "jobs", jobId));
    if (!jobSnapshot.exists()) {
      throw new Error("Job not found");
    }
    
    const jobData = jobSnapshot.data();
    const jobWithId = { ...jobData, originalJobId: jobId };
    
    // Copy the job to the JobArchive collection
    await addDoc(collection(db, "jobArchive"), {
      ...jobWithId,
      archivedAt: serverTimestamp(),
    });
    
    // Mark the original job as deep archived
    await updateDoc(doc(db, "jobs", jobId), {
      isDeepArchived: true,
      updatedAt: serverTimestamp()
    });
    
    // Add activity for the employer
    if (jobData.employerId) {
      await addEmployerActivity(
        jobData.employerId,
        "job_archived",
        `Your job posting "${jobData.title}" has been Deleted`
      );
    }
    
  } catch (error) {
    console.error("Error moving job to archive:", error);
    throw new Error("Failed to archive job posting")
  }
}

/**
 * Restore a soft-deleted job
 * @param jobId The ID of the job posting to restore
 */
export async function restoreJobPosting(jobId: string): Promise<void> {
  try {
    const jobRef = doc(db, "jobs", jobId);
    
    // Get job data before restoring
    const jobSnapshot = await getDoc(jobRef);
    if (!jobSnapshot.exists()) {
      throw new Error("Job not found");
    }
    const jobData = jobSnapshot.data();
    
    // Update the job to remove isDeleted flag
    await updateDoc(jobRef, {
      isDeleted: false,
      isActive: true, // Also mark as active again
      updatedAt: serverTimestamp()
    });
    
    // Add activity for the employer
    if (jobData.employerId) {
      await addEmployerActivity(
        jobData.employerId,
        "job_restored",
        `Your job posting "${jobData.title}" has been restored from archive`
      );
    }
    
  } catch (error) {
    console.error("Error restoring job posting:", error);
    throw new Error("Failed to restore job posting")
  }
}

/**
 * Permanently delete a job from archive (admin only)
 * @param archiveId The ID of the job archive document to delete
 */
export async function permanentlyDeleteArchivedJob(archiveId: string): Promise<void> {
  try {
    const archiveRef = doc(db, "jobArchive", archiveId);
    await deleteDoc(archiveRef);
  } catch (error) {
    console.error("Error permanently deleting archived job:", error);
    throw new Error("Failed to permanently delete archived job")
  }
}

/**
 * Notify applicants about job deletion
 * @param jobId ID of the deleted job
 * @param jobTitle Title of the deleted job
 */
export async function notifyApplicantsAboutJobDeletion(jobId: string, jobTitle: string): Promise<void> {
  try {
    // Get all applications for this job
    const applicationsQuery = query(
      collection(db, "applications"),
      where("jobId", "==", jobId)
    );
    
    const applicationsSnapshot = await getDocs(applicationsQuery);
    
    // Update each application and notify each applicant
    const updatePromises = applicationsSnapshot.docs.map(async (applicationDoc) => {
      const applicationData = applicationDoc.data();
      const applicationId = applicationDoc.id;
      const jobseekerId = applicationData.jobseekerId || applicationData.userId || applicationData.applicantId;
      
      if (!jobseekerId) {
        console.error(`No jobseeker ID found for application ${applicationId}`);
        return;
      }
      
      // Update application status
      await updateDoc(doc(db, "applications", applicationId), {
        status: "job_removed",
        updatedAt: serverTimestamp()
      });
      
      // Notify jobseeker
      await addJobseekerNotification(
        jobseekerId,
        "job_removed",
        `The job post "${jobTitle}" you applied for has been removed by the employer and is no longer active.`
      );
    });
    
    await Promise.all(updatePromises);
    
  } catch (error) {
    console.error("Error notifying applicants about job deletion:", error);
  }
} 