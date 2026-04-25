"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { JobCard } from "@/components/job-card"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { Search, MapPin, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { db,collection, getDocs, query, where ,DocumentData } from "@/config/firebase"
 
import { JobFilter, JobFilterValues } from "@/components/job-filter"

export default function FindJobsPage() {
  // const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [jobs, setJobs] = useState<{id: string}[]>([])
  const [totalJobs, setTotalJobs] = useState(0)
  const [rawJobData, setRawJobData] = useState<DocumentData[]>([]) // For debugging
  const [showDebug, setShowDebug] = useState(false) // Toggle debug view
  const [searchTerm, setSearchTerm] = useState("")
  const [location, setLocation] = useState("")
  const [filteredJobs, setFilteredJobs] = useState<DocumentData[]>([])
  const [sortBy, setSortBy] = useState("relevance")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5) // Number of jobs per page
  
  // State for advanced filters
  const [activeFilters, setActiveFilters] = useState<JobFilterValues>({
    jobTypes: [],
    categories: [],
    locations: []
  })

  useEffect(() => {
    setMounted(true)
    fetchJobs()
    
    // Check for search parameters in the URL
    const searchQuery = searchParams?.get('search')
    const locationQuery = searchParams?.get('location')
    
    // If search parameters exist, update the state and apply filters
    if (searchQuery || locationQuery) {
      if (searchQuery) setSearchTerm(searchQuery)
      if (locationQuery) setLocation(locationQuery)
      // We'll apply filters after data is loaded
    }
  }, [searchParams])

  // Apply URL search params after data is loaded
  useEffect(() => {
    if (!isLoading && rawJobData.length > 0) {
      const searchQuery = searchParams?.get('search')
      const locationQuery = searchParams?.get('location')
      
      if (searchQuery || locationQuery) {
        applyFilters(searchQuery || '', locationQuery || '', activeFilters)
      }
    }
  }, [rawJobData, isLoading, searchParams, activeFilters])

  // Get current jobs for pagination
  const indexOfLastJob = currentPage * itemsPerPage
  const indexOfFirstJob = indexOfLastJob - itemsPerPage
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob)
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)


  console.log("Current Jobs:", filteredJobs)
  // Change page
  const paginate = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Fetch jobs from Firestore
  const fetchJobs = async () => {
    setIsLoading(true)
    try {
      // Get current date for deadline comparison
      const currentDate = new Date();
      
      // Create query for active jobs
      const jobsCollection = collection(db, "jobs");
      const jobsQuery = query(
        jobsCollection,
        where("isActive", "==", true)
      );
      
      console.log("Fetching active jobs from Firestore...")
      const snapshot = await getDocs(jobsQuery)
      console.log(`Found ${snapshot.size} active jobs in Firestore`)
      
      const jobsList = snapshot.docs.map((doc: any) => ({ id: doc.id }))
      
      // Store raw job data for filtering
      const rawData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })).filter((job: DocumentData) => {
        // Filter out jobs with expired deadlines
        if (job.applicationDeadline) {
          const deadlineDate = job.applicationDeadline.toDate ? 
            job.applicationDeadline.toDate() : new Date(job.applicationDeadline);
          return deadlineDate > currentDate;
        }
        return true; // Keep jobs without deadlines
      });
      
      setRawJobData(rawData)
      setFilteredJobs(rawData)
      
      setJobs(jobsList)
      setTotalJobs(rawData.length)
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching jobs:", error)
      setIsLoading(false)
      setJobs([])
    }
  }

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters(searchTerm, location, activeFilters)
  }

  // Handle filter changes
  const handleFilterChange = (filters: JobFilterValues) => {
    setActiveFilters(filters)
    console.log("Applying filters:", filters)
    applyFilters(searchTerm, location, filters)
  }

  // Apply filters to the job data
  const applyFilters = (searchKeyword: string, searchLocation: string, filters: JobFilterValues) => {
    setIsLoading(true)
    
    // Start with all raw job data
    let filtered = [...rawJobData]
    console.log("filtered job", filtered )
    
    // Apply search term filter
    if (searchKeyword) {
      const lowercaseSearch = searchKeyword.toLowerCase()
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(lowercaseSearch) || 
        job.company?.toLowerCase().includes(lowercaseSearch) ||
        job.tags?.some((tag: string) => tag.toLowerCase().includes(lowercaseSearch))
      )
    }
    
    // Apply location filter from search bar
    if (searchLocation) {
      const lowercaseLocation = searchLocation.toLowerCase()
      filtered = filtered.filter(job => 
        job.location?.toLowerCase().includes(lowercaseLocation)
      )
    }
    
    // Apply job type filter
    if (filters.jobTypes && filters.jobTypes.length > 0) {
      filtered = filtered.filter(job => 
        filters.jobTypes.includes(job.type)
      )
    }
    
    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(job => 
        filters.categories.includes(job.category)
      )
    }
    
    // Apply location filter from filter component
    if (filters.locations && filters.locations.length > 0) {
      filtered = filtered.filter(job => {
        if (!job.location) return false;
        
        // Extract city/province from the job location for comparison
        const extractCityOrProvince = (fullLocation: string): string => {
          if (!fullLocation) return "";
          
          // Split by common separators
          const parts = fullLocation.split(/,|\s-\s|\//).map(part => part.trim());
          
          // If there's only one part or it's very short, return as is
          if (parts.length === 1 || fullLocation.length < 15) return fullLocation.trim();
          
          // Otherwise return the first significant part (likely city/province)
          for (const part of parts) {
            if (part.length > 3) return part;
          }
          
          // Fallback to the first part if nothing else matches
          return parts[0];
        };
        
        const cityOrProvince = extractCityOrProvince(job.location);
        return filters.locations.includes(cityOrProvince);
      });
    }
    
    // Apply sorting
    if (sortBy === "recent") {
      filtered.sort((a, b) => {
        const dateA = a.postedAt?.seconds || 0
        const dateB = b.postedAt?.seconds || 0
        return dateB - dateA
      })
    } else if (sortBy === "salary-high") {
      filtered.sort((a, b) => {
        // Extract max salary for comparison
        const getMaxSalary = (job: DocumentData) => {
          if (typeof job.salaryMax === 'number') return job.salaryMax
          if (job.salary) {
            const match = job.salary.match(/₱([\d,]+)\s*-\s*₱([\d,]+)/)
            if (match) return parseInt(match[2].replace(/,/g, ''))
          }
          return 0
        }
        return getMaxSalary(b) - getMaxSalary(a)
      })
    } else if (sortBy === "salary-low") {
      filtered.sort((a, b) => {
        // Extract min salary for comparison
        const getMinSalary = (job: DocumentData) => {
          if (typeof job.salaryMin === 'number') return job.salaryMin
          if (job.salary) {
            const match = job.salary.match(/₱([\d,]+)\s*-\s*₱([\d,]+)/)
            if (match) return parseInt(match[1].replace(/,/g, ''))
          }
          return 0
        }
        return getMinSalary(a) - getMinSalary(b)
      })
    }
    
    // Update filtered jobs and count
    setFilteredJobs(filtered)
    setTotalJobs(filtered.length)
    // Reset to first page when filters change
    setCurrentPage(1)
    setIsLoading(false)
  }

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value)
    applyFilters(searchTerm, location, activeFilters)
  }

  // Don't render during SSR to prevent hydration mismatch
  if (!mounted) {
    return null
  }
  

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />

      {/* Page Header */}
      <section className="pt-24 pb-10 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Find Your Perfect Job</h1>
            <p className="text-lg text-gray-300 max-w-3xl mb-8">
              Browse through thousands of job opportunities in Marawi City and beyond
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full max-w-4xl flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  type="text" 
                  placeholder="Job title, keywords, or company" 
                  className="pl-10 h-12  text-white" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  type="text" 
                  placeholder="City, state, or remote" 
                  className="pl-10 h-12 text-white" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-12 px-6 bg-yellow-500 hover:bg-yellow-600 text-black font-medium">
                Search Jobs
              </Button>
            </form>
          </div>
        </div>
      </section>
      
      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-gray-100 border-t border-b border-gray-200 p-4">
          <div className="container mx-auto max-w-6xl">
            <h3 className="font-bold mb-2">Firestore Debug Data:</h3>
            <div className="bg-white p-4 rounded shadow-sm overflow-auto max-h-75">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(rawJobData, null, 2)}
              </pre>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchJobs()}>
                Refresh Job Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <section className="py-10 px-4 bg-gray-50 grow">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <JobFilter onFilterChange={handleFilterChange} className="sticky top-24" />
            </div>
            
            {/* Job Listings */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{totalJobs} Jobs Found</h2>
                    <p className="text-sm text-gray-500">
                      {filteredJobs.length > 0 
                        ? `Showing ${indexOfFirstJob + 1}-${Math.min(indexOfLastJob, filteredJobs.length)} of ${filteredJobs.length} jobs` 
                        : 'Based on your search criteria'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-gray-100">
                        Search: {searchTerm}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 p-0 ml-1" 
                          onClick={() => {
                            setSearchTerm("")
                            applyFilters("", location, activeFilters)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    
                    {location && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-gray-100">
                        Location: {location}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 p-0 ml-1" 
                          onClick={() => {
                            setLocation("")
                            applyFilters(searchTerm, "", activeFilters)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center">
                    <Select defaultValue={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-45">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="salary-high">Salary: High to Low</SelectItem>
                        <SelectItem value="salary-low">Salary: Low to High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {isLoading && jobs.length === 0 ? (
                <div className="space-y-6">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="bg-white rounded-lg p-6">
                      <Skeleton className="h-6 w-2/3 mb-4" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-1/3 mb-4" />
                      <div className="flex gap-2 mb-4">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
              
                  {jobs.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                      {filteredJobs.length > 0 ? (

                        currentJobs.map((job) => (
                          <JobCard key={job.id} variant="horizontal" jobId={job.id} />
                         
                        ))
                      ) : (
                        <div className="text-center p-10 bg-white rounded-lg">
                          <p className="text-gray-500">No jobs found. Please try a different search.</p>
                         
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-10 bg-white rounded-lg">
                      <p className="text-gray-500">No jobs available at the moment.</p>
                    </div>
                  )}
                </>
              )}

              {/* Pagination */}
              {filteredJobs.length > 0 && (
                <div className="flex justify-center mt-10">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      &lt;
                    </Button>
                    
                    {/* Generate pagination numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                      // Logic to show relevant page numbers around current page
                      let pageNum = 1;
                      if (totalPages <= 5) {
                        // If 5 or fewer pages, show all pages 1 through totalPages
                        pageNum = idx + 1;
                      } else if (currentPage <= 3) {
                        // If on pages 1-3, show pages 1-5
                        pageNum = idx + 1;
                      } else if (currentPage >= totalPages - 2) {
                        // If on last 3 pages, show last 5 pages
                        pageNum = totalPages - 4 + idx;
                      } else {
                        // Otherwise show current page and 2 pages before and after
                        pageNum = currentPage - 2 + idx;
                      }
                      
                      return (
                        <Button 
                          key={pageNum}
                          variant="outline" 
                          size="sm"
                          className={currentPage === pageNum ? "bg-yellow-500 text-black border-yellow-500" : ""}
                          onClick={() => paginate(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      &gt;
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
