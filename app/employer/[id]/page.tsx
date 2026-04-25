"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { EmployerRating } from "@/components/employer-rating"
import { MapPin, Globe, Mail, Phone, Calendar, Users, Briefcase, Star } from "lucide-react"
import { BackButton } from "@/components/back-button"
import { collection, getDocs, query, where, doc, getDoc, DocumentData, Timestamp, addDoc, updateDoc, increment,db } from "@/config/firebase"

interface Review {
  id: string;
  rating: number;
  feedback: string;
  userName: string | null;
  userId: string | null;
  isAnonymous: boolean;
  createdAt: Timestamp;
}

interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  postedAt: string;
  isActive: boolean;
  applicationDeadline: Timestamp | Date;
}



export default function EmployerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [employer, setEmployer] = useState<DocumentData | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasUserReviewed, setHasUserReviewed] = useState(false)
  const [currentEmployerId, setCurrentEmployerId] = useState<string>("")
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  const fetchData = async () => {
    try {
      // Start a timeout to show a message if loading takes too long
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 3000);
      
      // Get user role from localStorage
      const userData = localStorage.getItem("ranaojobs_user")
      if (userData) {
        const user = JSON.parse(userData)
        setUserRole(user.role)
        setUserId(user.id)
      }

      const id = unwrappedParams.id
      setCurrentEmployerId(id)

      // Check if we have cached employer data in sessionStorage
      let cachedEmployerData = null;
      try {
        const lastEmployerId = sessionStorage.getItem('lastViewedEmployerId');
        if (lastEmployerId === id) {
          const cachedData = sessionStorage.getItem('cachedEmployerData');
          if (cachedData) {
            cachedEmployerData = JSON.parse(cachedData);
            // Set employer data from cache for immediate display
            setEmployer(cachedEmployerData);
          }
        }
      } catch (e) {
        // Ignore sessionStorage errors
      }
    const employerRef = doc(db, "users", id)
    const employerSnap = await getDoc(employerRef)
      // Fetch employer data with timeout
      
      if (employerSnap && employerSnap.exists()) {
        const employerData = employerSnap.data();
        setEmployer(employerData);
        
        // Cache the employer data for future use
        try {
          sessionStorage.setItem('lastViewedEmployerId', id);
          sessionStorage.setItem('cachedEmployerData', JSON.stringify(employerData));
        } catch (e) {
          // Ignore sessionStorage errors
        }
      }

      // Fetch jobs with a limit to improve performance
      const jobsQuery = query(
        collection(db, "jobs"), 
        where("employerId", "==", id),
        where("isActive", "==", true)
      )
      const jobsSnap = await getDocs(jobsQuery)
      const jobsData = jobsSnap.docs.map((doc: any) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          applicationDeadline: data.applicationDeadline?.toDate?.() || new Date(data.applicationDeadline)
        } as Job
      })
      setJobs(jobsData)

      // Fetch only the most recent reviews (limit to 10)
      const reviewsQuery = query(
        collection(db, "companyRatings"), 
        where("employerId", "==", id)
      )
      const reviewsSnap = await getDocs(reviewsQuery)
      let reviewsData = reviewsSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as Review))

      // Sort reviews by date (newest first) and limit to 10
      reviewsData = reviewsData
        .sort((a: Review, b: Review) => {
          // Handle timestamp objects properly
          const getTime = (timestamp: any) => {
            if (timestamp?.toDate instanceof Function) {
              return timestamp.toDate().getTime();
            } else if (timestamp instanceof Date) {
              return timestamp.getTime();
            }
            // Fallback - try to parse the timestamp
            return new Date(timestamp || 0).getTime();
          };

          return getTime(b.createdAt) - getTime(a.createdAt);
        })
        .slice(0, 10);  // Only take the 10 most recent reviews

      setReviews(reviewsData)

      // Check if current user has already submitted a review
      if (userData) {
        const user = JSON.parse(userData)
        const userHasReview = reviewsData.some(
          (review: { userId?: string | null }) => review.userId === user.id
        )
        setHasUserReviewed(userHasReview)
      }

      // Clear the timeout since loading is complete
      clearTimeout(timeoutId);

    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Add a timeout to show a message if loading takes too long
    const timeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 3000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [unwrappedParams.id])

  const handleRatingSubmit = async (rating: number, feedback: string, anonymous: boolean) => {
    try {
      const userData = localStorage.getItem("ranaojobs_user")
      if (!userData) {
        throw new Error("User not logged in")
      }

      const user = JSON.parse(userData)

      // Check if user has already submitted a review
      const reviewsQuery = query(
        collection(db, "companyRatings"),
        where("employerId", "==", currentEmployerId),
        where("userId", "==", user.id)
      )
      const existingReviews = await getDocs(reviewsQuery)

      if (!existingReviews.empty && !anonymous) {
        // If non-anonymous review exists, update it instead of creating a new one
        const existingReview = existingReviews.docs[0]
        await updateDoc(doc(db, "companyRatings", existingReview.id), {
          rating,
          feedback,
          isAnonymous: anonymous,
          createdAt: new Date()
        })
      } else {
        // Create new review
        const ratingData = {
          employerId: currentEmployerId,
          employerName: employer?.companyName || employer?.name || "Company",
          rating,
          feedback,
          isAnonymous: anonymous,
          userId: anonymous ? null : user.id,
          userName: anonymous ? null : `${user.firstName} ${user.lastName || ''}`.trim(),
          createdAt: new Date()
        }

        await addDoc(collection(db, "companyRatings"), ratingData)
      }

      // Update employer's average rating
      const employerRef = doc(db, "users", currentEmployerId)
      await updateDoc(employerRef, {
        totalRatingSum: increment(rating),
        totalRatingCount: increment(1),
        averageRating: ((employer?.totalRatingSum || 0) + rating) / ((employer?.totalRatingCount || 0) + 1),
        updatedAt: new Date()
      })

      // Close the dialog if it's open
      setIsRatingDialogOpen(false)

      // Refresh data
      fetchData()
    } catch (error) {
      console.error("Error submitting rating:", error)
      alert("Failed to submit rating. Please try again.")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="container mx-auto max-w-6xl px-4 pt-20 pb-10">
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-4"></div>
            {loadingTimeout && (
              <div className="text-center">
                <p className="text-gray-600 mt-4">This is taking longer than expected...</p>
                <p className="text-sm text-gray-500 mt-1">
                  We're still trying to load the employer profile data.
                </p>
                <Button 
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </Button>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!employer) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="container mx-auto max-w-6xl px-4 pt-20 pb-10">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Default values for employer properties
  const companyName = employer.companyName || employer.name || "Company";
  const companyInitial = companyName ? companyName.charAt(0) : "C";
  const employerRating = employer.averageRating || 0;
  const reviewCount = employer.totalRatingCount || 0;
  const location = employer.address ? `${employer.address}, ${employer.city || 'Marawi City'}` : (employer.location || "Location not specified");
  const industry = employer.industry || "Industry not specified";
  const website = employer.website || "#";
  const email = employer.email || "contact@example.com";
  const phone = employer.phone || "Not specified";
  const foundedYear = employer.foundedYear || "Not specified";
  const employeeCount = employer.companySize || "Not specified";
  const socialMedia = employer.socialMedia || {};
  const description = employer.companyDescription || employer.description || "No description available for this company.";

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="container mx-auto max-w-6xl px-4 pt-20 pb-10">
        <BackButton className="mb-4" />

        {/* Employer Header */}
        <div className="bg-gray-900 text-white rounded-t-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-700 rounded-lg flex items-center justify-center text-2xl font-bold">
              {companyInitial}
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h1 className="text-2xl font-bold">{companyName}</h1>
                {employer.verified && <Badge className="bg-blue-500 text-white">Verified</Badge>}
              </div>

              <div className="flex items-center mt-1">
                <div className="flex items-center">
                  {Array(5).fill(0).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${i < Math.round(employerRating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-yellow-500 ml-1">{employerRating.toFixed(1)}</span>
                <span className="text-sm text-gray-300 ml-2">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                {reviewCount > 0 && employer?.actualAverageRating && (
                  <span className="text-xs text-gray-400 ml-2">(Raw avg: {employer.actualAverageRating.toFixed(1)})</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-300">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{location}</span>
                </div>
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  <span>{industry}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Company Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Website</p>
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {website.replace(/(^\w+:|^)\/\//, "")}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                        {email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p>{phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Founded</p>
                      <p>{foundedYear}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Company Size</p>
                      <p>{employeeCount}</p>
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-500 mb-2">Connect with {companyName}</p>
                  <div className="flex gap-2">
                    {Object.entries(socialMedia).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <span className="sr-only">{platform}</span>
                        {platform === "linkedin" && (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                          </svg>
                        )}
                        {platform === "facebook" && (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                          </svg>
                        )}
                        {platform === "twitter" && (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                          </svg>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate this Employer - Only visible to jobseekers */}
            {userRole === "jobseeker" && (
              <Card>
                <CardHeader>
                  <CardTitle>Rate this Employer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Share your experience with {companyName} to help other job seekers make informed decisions.
                  </p>
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => setIsRatingDialogOpen(true)}
                  >
                    Write a Review
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="about">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="jobs">Open Jobs</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About {companyName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{description}</p>
                  </CardContent>
                </Card>

                {/* {userRole === "jobseeker" && !hasUserReviewed && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Write a Review</CardTitle>
                      <CardDescription>Share your experience with {companyName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <EmployerRating
                            employerId={employer?.id || currentEmployerId}
                            employerName={companyName}
                            initialRating={0}
                            showRatingButton={false}
                            size="md"
                            directMode={true}
                            onRatingSubmit={(rating, feedback, anonymous) => {
                              handleRatingSubmit(rating, feedback, anonymous);
                              fetchData(); // Refresh data after submission
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )} */}

                {userRole === "jobseeker" && hasUserReviewed && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-green-600">
                        <p className="font-medium">Thank you for reviewing {companyName}!</p>
                        <p className="text-sm mt-1">Your review helps other job seekers make informed decisions.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {reviews.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Reviews ({reviews.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {reviews.map((review) => (
                          <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  {review.userName ? review.userName.charAt(0) : 'A'}
                                </div>
                                <div>
                                  <p className="font-medium">{review.isAnonymous ? 'Anonymous' : review.userName}</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(review.createdAt.toDate()).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {Array(5).fill(0).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={16}
                                    className={`${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.feedback && (
                              <p className="text-gray-700 mt-2">{review.feedback}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="jobs" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Job Openings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobs.filter(job => {
                      if (!job.isActive) return false;

                      // Handle deadline comparison based on type
                      if (job.applicationDeadline instanceof Date) {
                        return job.applicationDeadline > new Date();
                      }

                      // Try to convert Timestamp to Date safely
                      try {
                        if (typeof job.applicationDeadline?.toDate === 'function') {
                          return job.applicationDeadline.toDate() > new Date();
                        }
                        // Last resort - try to create a date from whatever we have
                        return new Date(job.applicationDeadline as any) > new Date();
                      } catch (e) {
                        console.error("Error comparing dates:", e);
                        return false;
                      }
                    }).length > 0 ? (
                      <div className="space-y-4">
                        {jobs
                          .filter(job => {
                            if (!job.isActive) return false;

                            // Handle deadline comparison based on type
                            if (job.applicationDeadline instanceof Date) {
                              return job.applicationDeadline > new Date();
                            }

                            // Try to convert Timestamp to Date safely
                            try {
                              if (typeof job.applicationDeadline?.toDate === 'function') {
                                return job.applicationDeadline.toDate() > new Date();
                              }
                              // Last resort - try to create a date from whatever we have
                              return new Date(job.applicationDeadline as any) > new Date();
                            } catch (e) {
                              console.error("Error comparing dates:", e);
                              return false;
                            }
                          })
                          .map((job) => (
                            <div key={job.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                              <h3 className="font-medium hover:text-yellow-500">
                                <a href={`/job/${job.id}`}>{job.title}</a>
                              </h3>
                              <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-gray-500 mt-1">
                                <div className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  <span>{job.location}</span>
                                </div>
                                <div className="flex items-center">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  <span>{job.type}</span>
                                </div>
                                <div className="flex items-center text-green-600 font-medium">
                                  <span>{job.salary}</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-gray-400">Posted {job.postedAt}</span>
                                <Button asChild size="sm" variant="outline">
                                  <a href={`/job/${job.id}`}>View Details</a>
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No active job openings available at the moment.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {reviews.length > 0 ? (
                        reviews.map((review) => (
                          <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  {review.userName ? review.userName.charAt(0) : 'A'}
                                </div>
                                <div>
                                  <p className="font-medium">{review.isAnonymous ? 'Anonymous' : review.userName}</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(review.createdAt.toDate()).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {Array(5).fill(0).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={16}
                                    className={`${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.feedback && (
                              <p className="text-gray-700 mt-2">{review.feedback}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No reviews yet. Be the first to review this company!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />

      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate this Employer</DialogTitle>
            <DialogDescription>
              Share your experience working with {companyName}
            </DialogDescription>
          </DialogHeader>

          <EmployerRating
            employerId={employer?.id || currentEmployerId}
            employerName={companyName}
            initialRating={0}
            showRatingButton={false}
            size="lg"
            directMode={true}
            onRatingSubmit={handleRatingSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
