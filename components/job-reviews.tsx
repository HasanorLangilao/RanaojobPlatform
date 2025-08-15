"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { AlertCircle, Star, ThumbsUp, ThumbsDown, Flag, Calendar, MessageSquare, Briefcase, User } from "lucide-react"
import { format } from "date-fns"
import { JobReview, addJobReview, getJobReviews, getJobReviewStats, hasJobseekerAppliedToJob, markReviewHelpfulness, flagReview } from "@/lib/reviews"
import { getUserProfile } from "@/lib/users"
import { cn } from "@/lib/utils"

interface JobReviewsProps {
  jobId: string
  jobTitle: string
  employerId: string
  companyName: string
}

export function JobReviews({ jobId, jobTitle, employerId, companyName }: JobReviewsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<JobReview[]>([])
  const [stats, setStats] = useState({
    averageRating: 0,
    reviewCount: 0,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    }
  })
  const [canReview, setCanReview] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [userData, setUserData] = useState<{id: string, firstName: string, lastName: string, role: string} | null>(null)
  const [reviewFormData, setReviewFormData] = useState({
    rating: 0,
    review: "",
    anonymous: false,
    appliedToJob: false,
    workedAtCompany: false
  })
  const [flagDialogOpen, setFlagDialogOpen] = useState(false)
  const [flagReason, setFlagReason] = useState("")
  const [reviewToFlag, setReviewToFlag] = useState<string | null>(null)
  const [flagSubmitted, setFlagSubmitted] = useState(false)
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get user data from localStorage
        const storedUser = localStorage.getItem("ranaojobs_user")
        if (storedUser) {
          const user = JSON.parse(storedUser)
          setUserData({
            id: user.id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            role: user.role
          })
          
          // Check if user can review (only jobseekers can review)
          if (user.role === "jobseeker" || user.role === "multi") {
            // Check if user has already reviewed this job
            const reviewsData = await getJobReviews(jobId)
            const hasReviewed = reviewsData.some(review => review.jobseekerId === user.id)
            
            if (!hasReviewed) {
              // Check if user has applied to this job
              const hasApplied = await hasJobseekerAppliedToJob(user.id, jobId)
              setCanReview(hasApplied)
              
              // If user has applied, set the applied flag in the form
              if (hasApplied) {
                setReviewFormData(prev => ({
                  ...prev,
                  appliedToJob: true
                }))
              }
            }
          }
        }
        
        // Get job reviews
        const reviewsData = await getJobReviews(jobId)
        setReviews(reviewsData)
        
        // Get job review stats
        const statsData = await getJobReviewStats(jobId)
        setStats(statsData)
        
      } catch (err) {
        console.error("Error loading reviews:", err)
        setError("Failed to load reviews. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [jobId, reviewSubmitted])
  
  const handleRatingClick = (rating: number) => {
    setReviewFormData(prev => ({
      ...prev,
      rating
    }))
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setReviewFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setReviewFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }
  
  const handleSubmitReview = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!userData) {
        setError("You must be logged in to submit a review")
        return
      }
      
      if (reviewFormData.rating === 0) {
        setError("Please select a rating")
        return
      }
      
      if (reviewFormData.review.trim() === "") {
        setError("Please provide a review")
        return
      }
      
      await addJobReview({
        jobId,
        jobseekerId: userData.id,
        employerId,
        rating: reviewFormData.rating,
        review: reviewFormData.review,
        appliedToJob: reviewFormData.appliedToJob,
        workedAtCompany: reviewFormData.workedAtCompany,
        anonymous: reviewFormData.anonymous
      })
      
      // Reset form
      setReviewFormData({
        rating: 0,
        review: "",
        anonymous: false,
        appliedToJob: reviewFormData.appliedToJob,
        workedAtCompany: false
      })
      
      setShowReviewForm(false)
      setReviewSubmitted(!reviewSubmitted) // Toggle to trigger a refresh
      
    } catch (err: any) {
      console.error("Error submitting review:", err)
      setError(err.message || "Failed to submit review. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleHelpfulnessClick = async (reviewId: string, isHelpful: boolean) => {
    if (!userData) return
    
    try {
      await markReviewHelpfulness(reviewId, userData.id, isHelpful)
      
      // Update the UI optimistically
      setReviews(prevReviews => 
        prevReviews.map(review => {
          if (review.id === reviewId) {
            return {
              ...review,
              helpful: isHelpful ? review.helpful + 1 : review.helpful,
              notHelpful: !isHelpful ? review.notHelpful + 1 : review.notHelpful
            }
          }
          return review
        })
      )
    } catch (err) {
      console.error("Error marking helpfulness:", err)
    }
  }
  
  const handleFlagClick = (reviewId: string) => {
    setReviewToFlag(reviewId)
    setFlagDialogOpen(true)
  }
  
  const handleSubmitFlag = async () => {
    if (!userData || !reviewToFlag) return
    
    try {
      await flagReview(reviewToFlag, userData.id, flagReason)
      setFlagSubmitted(true)
    } catch (err) {
      console.error("Error flagging review:", err)
    }
  }
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date"
    
    let date
    if (timestamp.toDate) {
      // Firestore timestamp
      date = timestamp.toDate()
    } else if (timestamp.seconds) {
      // Firestore timestamp as object
      date = new Date(timestamp.seconds * 1000)
    } else {
      // Already a Date or a string
      date = new Date(timestamp)
    }
    
    return format(date, "MMM d, yyyy")
  }
  
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-5 w-5",
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
      </div>
    )
  }
  
  const renderRatingStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-6 w-6 cursor-pointer transition-colors",
              star <= reviewFormData.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-200"
            )}
            onClick={() => handleRatingClick(star)}
          />
        ))}
      </div>
    )
  }
  
  const renderReviewItem = (review: JobReview) => {
    return (
      <Card key={review.id} className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4">
              {!review.anonymous ? (
                <Avatar>
                  <AvatarFallback>{review.jobseekerId.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : (
                <Avatar>
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="font-semibold">{review.anonymous ? "Anonymous User" : `${review.jobseekerId.substring(0, 2).toUpperCase()}`}</p>
                <div className="flex items-center space-x-2">
                  {renderStars(review.rating)}
                  <span className="text-sm text-gray-500">• {formatDate(review.createdAt)}</span>
                </div>
                {review.appliedToJob && (
                  <Badge variant="outline" className="mt-1">
                    <Briefcase className="mr-1 h-3 w-3" /> Applied to job
                  </Badge>
                )}
                {review.workedAtCompany && (
                  <Badge variant="outline" className="mt-1 ml-2">
                    <User className="mr-1 h-3 w-3" /> Worked at company
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mb-4">{review.review}</p>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <button
                className="flex items-center text-gray-500 hover:text-green-600"
                onClick={() => handleHelpfulnessClick(review.id as string, true)}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                <span>Helpful ({review.helpful || 0})</span>
              </button>
              <button
                className="flex items-center text-gray-500 hover:text-red-600"
                onClick={() => handleHelpfulnessClick(review.id as string, false)}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                <span>Not helpful ({review.notHelpful || 0})</span>
              </button>
            </div>
            <button
              className="flex items-center text-gray-500 hover:text-red-600"
              onClick={() => handleFlagClick(review.id as string)}
            >
              <Flag className="h-4 w-4 mr-1" />
              <span>Report</span>
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const renderNoReviews = () => (
    <div className="text-center py-8">
      <MessageSquare className="h-12 w-12 mx-auto text-gray-300" />
      <p className="mt-2 text-gray-500">No reviews yet for this job</p>
      {canReview && (
        <Button
          className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
          onClick={() => setShowReviewForm(true)}
        >
          Be the first to review
        </Button>
      )}
    </div>
  )
  
  const renderRatingDistribution = () => {
    const totalReviews = stats.reviewCount || 0
    
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] || 0
          const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
          
          return (
            <div key={rating} className="flex items-center">
              <div className="w-16 text-sm text-gray-600">{rating} stars</div>
              <div className="flex-1 mx-2">
                <Progress value={percentage} className="h-2" />
              </div>
              <div className="w-10 text-xs text-gray-500">{count}</div>
            </div>
          )
        })}
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Reviews</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Job Reviews</CardTitle>
            <CardDescription>
              {stats.reviewCount} {stats.reviewCount === 1 ? "review" : "reviews"} for this job
            </CardDescription>
          </div>
          {canReview && !showReviewForm && (
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setShowReviewForm(true)}
            >
              Write a Review
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {showReviewForm && (
          <Card className="mb-6 border-yellow-200">
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
              <CardDescription>Share your experience with this job at {companyName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <div className="mt-1">{renderRatingStars()}</div>
                </div>
                
                <div>
                  <Label htmlFor="review">Your Review</Label>
                  <Textarea
                    id="review"
                    name="review"
                    placeholder="Share your experience with this job listing..."
                    className="mt-1"
                    rows={4}
                    value={reviewFormData.review}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="anonymous"
                    checked={reviewFormData.anonymous}
                    onCheckedChange={(checked) => handleSwitchChange("anonymous", checked)}
                  />
                  <Label htmlFor="anonymous">Post anonymously</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="appliedToJob"
                    checked={reviewFormData.appliedToJob}
                    onCheckedChange={(checked) => handleSwitchChange("appliedToJob", checked)}
                    disabled={reviewFormData.appliedToJob} // Cannot uncheck if verified applied
                  />
                  <Label htmlFor="appliedToJob">I applied to this job</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="workedAtCompany"
                    checked={reviewFormData.workedAtCompany}
                    onCheckedChange={(checked) => handleSwitchChange("workedAtCompany", checked)}
                  />
                  <Label htmlFor="workedAtCompany">I worked at this company</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                Cancel
              </Button>
              <Button
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={handleSubmitReview}
                disabled={isLoading}
              >
                {isLoading ? "Submitting..." : "Submit Review"}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {stats.reviewCount > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-4">
                <div className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <div>
                  <div className="flex">{renderStars(Math.round(stats.averageRating))}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.reviewCount} {stats.reviewCount === 1 ? "review" : "reviews"}
                  </p>
                </div>
              </div>
              
              <div>{renderRatingDistribution()}</div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Reviews</h3>
              {reviews.length > 0 ? (
                reviews.map(renderReviewItem)
              ) : (
                renderNoReviews()
              )}
            </div>
          </div>
        ) : (
          renderNoReviews()
        )}
      </CardContent>
      
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this review</DialogTitle>
            <DialogDescription>
              Please tell us why you're reporting this review. We take reports seriously and will review the content.
            </DialogDescription>
          </DialogHeader>
          
          {flagSubmitted ? (
            <div className="py-4">
              <Alert>
                <AlertTitle>Report submitted</AlertTitle>
                <AlertDescription>
                  Thank you for your report. We'll review this review shortly.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Please explain why you're reporting this review..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSubmitFlag}
                  disabled={!flagReason.trim()}
                >
                  Submit Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
} 