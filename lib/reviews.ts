import { db } from "@/lib/firebase"
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc,
  getDocs,
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore"
import { addAdminNotification, addEmployerNotification } from "@/lib/notifications"

export interface JobReview {
  id?: string
  jobId: string
  jobseekerId: string
  employerId: string
  rating: number // 1-5 star rating
  review: string // Text review
  appliedToJob: boolean // Whether the reviewer applied for this job
  workedAtCompany: boolean // Whether the reviewer worked at the company
  status: 'active' | 'flagged' | 'removed' // Review status
  anonymous: boolean // Whether to show the reviewer's name
  helpful: number // Number of users who found this review helpful
  notHelpful: number // Number of users who did not find this review helpful
  createdAt?: any
  updatedAt?: any
}

/**
 * Add a job review to Firestore
 */
export async function addJobReview(reviewData: Omit<JobReview, "id" | "createdAt" | "updatedAt" | "helpful" | "notHelpful" | "status">): Promise<string> {
  try {
    // Get job details
    const jobRef = doc(db, "jobs", reviewData.jobId)
    const jobDoc = await getDoc(jobRef)
    
    if (!jobDoc.exists()) {
      throw new Error("Job not found")
    }
    
    const jobData = jobDoc.data()
    
    // Check if user has already reviewed this job
    const existingReviewQuery = query(
      collection(db, "jobreviews"),
      where("jobId", "==", reviewData.jobId),
      where("jobseekerId", "==", reviewData.jobseekerId)
    )
    
    const existingReviews = await getDocs(existingReviewQuery)
    
    if (!existingReviews.empty) {
      throw new Error("You have already reviewed this job")
    }
    
    // Add review with metadata
    const reviewWithMetadata = {
      ...reviewData,
      status: 'active' as const,
      helpful: 0,
      notHelpful: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, "jobreviews"), reviewWithMetadata)
    
    // Update average rating for the job
    await updateJobAverageRating(reviewData.jobId)
    
    // Notify employer
    await addEmployerNotification(
      reviewData.employerId,
      "New Job Review",
      `${reviewData.anonymous ? "A jobseeker" : "A jobseeker"} has left a ${reviewData.rating}-star review for your job: ${jobData.title}`,
      "job_review",
      reviewData.jobId
    )
    
    return docRef.id
  } catch (error) {
    console.error("Error adding job review:", error)
    throw error
  }
}

/**
 * Get reviews for a specific job
 */
export async function getJobReviews(jobId: string): Promise<JobReview[]> {
  try {
    const reviewsQuery = query(
      collection(db, "jobreviews"),
      where("jobId", "==", jobId),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    )
    
    const reviewsSnapshot = await getDocs(reviewsQuery)
    
    return reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as JobReview))
  } catch (error) {
    console.error("Error getting job reviews:", error)
    throw new Error("Failed to get job reviews")
  }
}

/**
 * Get a specific review by ID
 */
export async function getReviewById(reviewId: string): Promise<JobReview | null> {
  try {
    const reviewRef = doc(db, "jobreviews", reviewId)
    const reviewDoc = await getDoc(reviewRef)
    
    if (!reviewDoc.exists()) {
      return null
    }
    
    return {
      id: reviewDoc.id,
      ...reviewDoc.data()
    } as JobReview
  } catch (error) {
    console.error("Error getting review:", error)
    throw new Error("Failed to get review")
  }
}

/**
 * Delete a job review
 */
export async function deleteJobReview(reviewId: string, userId: string): Promise<void> {
  try {
    const reviewRef = doc(db, "jobreviews", reviewId)
    const reviewDoc = await getDoc(reviewRef)
    
    if (!reviewDoc.exists()) {
      throw new Error("Review not found")
    }
    
    const reviewData = reviewDoc.data()
    
    // Check if user is the author of the review
    if (reviewData.jobseekerId !== userId) {
      throw new Error("You are not authorized to delete this review")
    }
    
    // Delete the review
    await deleteDoc(reviewRef)
    
    // Update average rating for the job
    await updateJobAverageRating(reviewData.jobId)
  } catch (error) {
    console.error("Error deleting job review:", error)
    throw error
  }
}

/**
 * Update a job review
 */
export async function updateJobReview(reviewId: string, userId: string, updateData: Partial<JobReview>): Promise<void> {
  try {
    const reviewRef = doc(db, "jobreviews", reviewId)
    const reviewDoc = await getDoc(reviewRef)
    
    if (!reviewDoc.exists()) {
      throw new Error("Review not found")
    }
    
    const reviewData = reviewDoc.data()
    
    // Check if user is the author of the review
    if (reviewData.jobseekerId !== userId) {
      throw new Error("You are not authorized to update this review")
    }
    
    // Update allowed fields only
    const allowedFields = ["rating", "review", "anonymous", "appliedToJob", "workedAtCompany"]
    const filteredUpdateData: Record<string, any> = {}
    
    for (const field of allowedFields) {
      if (updateData[field as keyof JobReview] !== undefined) {
        filteredUpdateData[field] = updateData[field as keyof JobReview]
      }
    }
    
    // Add updated timestamp
    filteredUpdateData.updatedAt = serverTimestamp()
    
    // Update the review
    await updateDoc(reviewRef, filteredUpdateData)
    
    // If rating changed, update average rating for the job
    if (updateData.rating !== undefined && updateData.rating !== reviewData.rating) {
      await updateJobAverageRating(reviewData.jobId)
    }
  } catch (error) {
    console.error("Error updating job review:", error)
    throw error
  }
}

/**
 * Mark a review as helpful or not helpful
 */
export async function markReviewHelpfulness(reviewId: string, userId: string, isHelpful: boolean): Promise<void> {
  try {
    const reviewRef = doc(db, "jobreviews", reviewId)
    const reviewDoc = await getDoc(reviewRef)
    
    if (!reviewDoc.exists()) {
      throw new Error("Review not found")
    }
    
    const reviewData = reviewDoc.data()
    
    // Get user's current helpfulness rating for this review
    const helpfulnessRef = doc(db, "helpfulness", `${reviewId}_${userId}`)
    const helpfulnessDoc = await getDoc(helpfulnessRef)
    
    let updateData: Record<string, any> = {}
    
    if (helpfulnessDoc.exists()) {
      const currentRating = helpfulnessDoc.data()
      
      // If changing rating
      if (currentRating.isHelpful !== isHelpful) {
        // Decrement old rating
        if (currentRating.isHelpful) {
          updateData.helpful = reviewData.helpful - 1
        } else {
          updateData.notHelpful = reviewData.notHelpful - 1
        }
        
        // Increment new rating
        if (isHelpful) {
          updateData.helpful = (reviewData.helpful || 0) + 1
        } else {
          updateData.notHelpful = (reviewData.notHelpful || 0) + 1
        }
        
        // Update user's rating
        await setDoc(helpfulnessRef, { isHelpful, updatedAt: serverTimestamp() })
      }
      // If same rating, do nothing
    } else {
      // New rating
      if (isHelpful) {
        updateData.helpful = (reviewData.helpful || 0) + 1
      } else {
        updateData.notHelpful = (reviewData.notHelpful || 0) + 1
      }
      
      // Add user's rating
      await setDoc(helpfulnessRef, { 
        userId, 
        reviewId, 
        isHelpful, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }
    
    // Update the review if needed
    if (Object.keys(updateData).length > 0) {
      await updateDoc(reviewRef, updateData)
    }
  } catch (error) {
    console.error("Error marking review helpfulness:", error)
    throw error
  }
}

/**
 * Flag a review as inappropriate
 */
export async function flagReview(reviewId: string, userId: string, reason: string): Promise<void> {
  try {
    const reviewRef = doc(db, "jobreviews", reviewId)
    const reviewDoc = await getDoc(reviewRef)
    
    if (!reviewDoc.exists()) {
      throw new Error("Review not found")
    }
    
    // Add flag
    await addDoc(collection(db, "reviewflags"), {
      reviewId,
      userId,
      reason,
      status: "pending",
      createdAt: serverTimestamp()
    })
    
    // Notify admin
    await addAdminNotification(
      "Review Flagged",
      `A job review has been flagged as inappropriate.`,
      "warning",
      "all",
      `/admin/reviews/${reviewId}`,
      "jobseeker",
      userId
    )
  } catch (error) {
    console.error("Error flagging review:", error)
    throw error
  }
}

/**
 * Get reviews created by a specific jobseeker
 */
export async function getJobseekerReviews(jobseekerId: string): Promise<JobReview[]> {
  try {
    const reviewsQuery = query(
      collection(db, "jobreviews"),
      where("jobseekerId", "==", jobseekerId),
      orderBy("createdAt", "desc")
    )
    
    const reviewsSnapshot = await getDocs(reviewsQuery)
    
    return reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as JobReview))
  } catch (error) {
    console.error("Error getting jobseeker reviews:", error)
    throw new Error("Failed to get jobseeker reviews")
  }
}

/**
 * Update the average rating for a job
 */
async function updateJobAverageRating(jobId: string): Promise<void> {
  try {
    // Get all active reviews for the job
    const reviewsQuery = query(
      collection(db, "jobreviews"),
      where("jobId", "==", jobId),
      where("status", "==", "active")
    )
    
    const reviewsSnapshot = await getDocs(reviewsQuery)
    
    if (reviewsSnapshot.empty) {
      // No reviews - set default values
      const jobRef = doc(db, "jobs", jobId)
      await updateDoc(jobRef, {
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        },
        updatedAt: serverTimestamp()
      })
      return
    }
    
    // Calculate average rating and distribution
    let totalRating = 0
    let reviewCount = 0
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    }
    
    reviewsSnapshot.forEach(doc => {
      const reviewData = doc.data()
      const rating = reviewData.rating
      
      if (rating >= 1 && rating <= 5) {
        totalRating += rating
        reviewCount++
        ratingDistribution[rating as 1|2|3|4|5] += 1
      }
    })
    
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0
    
    // Update job with new rating data
    const jobRef = doc(db, "jobs", jobId)
    await updateDoc(jobRef, {
      averageRating,
      reviewCount,
      ratingDistribution,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error("Error updating average rating:", error)
    throw new Error("Failed to update average rating")
  }
}

/**
 * Check if a jobseeker has applied to a job
 * Used to verify eligibility for leaving a review
 */
export async function hasJobseekerAppliedToJob(jobseekerId: string, jobId: string): Promise<boolean> {
  try {
    // Check in applications collection
    const applicationsQuery = query(
      collection(db, "applications"),
      where("jobseekerId", "==", jobseekerId),
      where("jobId", "==", jobId),
      limit(1)
    )
    
    const applicationsSnapshot = await getDocs(applicationsQuery)
    
    return !applicationsSnapshot.empty
  } catch (error) {
    console.error("Error checking if jobseeker applied to job:", error)
    return false
  }
}

/**
 * Get job review statistics
 */
export async function getJobReviewStats(jobId: string): Promise<{
  averageRating: number;
  reviewCount: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}> {
  try {
    const jobRef = doc(db, "jobs", jobId)
    const jobDoc = await getDoc(jobRef)
    
    if (!jobDoc.exists()) {
      throw new Error("Job not found")
    }
    
    const jobData = jobDoc.data()
    
    return {
      averageRating: jobData.averageRating || 0,
      reviewCount: jobData.reviewCount || 0,
      ratingDistribution: jobData.ratingDistribution || {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      }
    }
  } catch (error) {
    console.error("Error getting job review stats:", error)
    throw new Error("Failed to get job review stats")
  }
} 