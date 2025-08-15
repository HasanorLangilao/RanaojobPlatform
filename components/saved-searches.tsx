"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Briefcase, MapPin, PhilippinePeso, Search, Edit, Trash2, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

export interface SavedSearch {
  id: string
  name: string
  filters: {
    keywords?: string
    location?: string
    category?: string
    jobType?: string[]
    salary?: string
    datePosted?: string
  }
  createdAt: string
}

interface SavedSearchesProps {
  className?: string
}

export function SavedSearches({ className }: SavedSearchesProps) {
  const router = useRouter()
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load saved searches from localStorage
    const loadSavedSearches = () => {
      setIsLoading(true)
      try {
        const storedSearches = localStorage.getItem("ranaojobs_saved_searches")

        if (storedSearches) {
          setSavedSearches(JSON.parse(storedSearches))
        } else {
          // If no saved searches exist, set mock data for demonstration
          const mockSearches: SavedSearch[] = [
            {
              id: "1",
              name: "Frontend Developer Jobs",
              filters: {
                keywords: "Frontend Developer",
                location: "Marawi City",
                category: "Technology",
                jobType: ["Full-time", "Remote"],
                salary: "₱50,000 - ₱80,000",
                datePosted: "Last week",
              },
              createdAt: "2023-05-15",
            },
            {
              id: "2",
              name: "Remote Design Jobs",
              filters: {
                keywords: "UX Designer",
                location: "Remote",
                category: "Design",
                jobType: ["Remote"],
                salary: "₱40,000 - ₱70,000",
                datePosted: "Last month",
              },
              createdAt: "2023-05-10",
            },
            {
              id: "3",
              name: "Part-time Marketing",
              filters: {
                keywords: "Marketing",
                location: "Iligan City",
                category: "Marketing",
                jobType: ["Part-time"],
                salary: "₱20,000 - ₱35,000",
                datePosted: "Any time",
              },
              createdAt: "2023-05-05",
            },
          ]
          setSavedSearches(mockSearches)
          localStorage.setItem("ranaojobs_saved_searches", JSON.stringify(mockSearches))
        }
      } catch (error) {
        console.error("Error loading saved searches:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSavedSearches()
  }, [])

  const applySearch = (search: SavedSearch) => {
    // In a real app, this would apply the filters and navigate to the search results
    const queryParams = new URLSearchParams()

    if (search.filters.keywords) queryParams.append("q", search.filters.keywords)
    if (search.filters.location) queryParams.append("location", search.filters.location)
    if (search.filters.category) queryParams.append("category", search.filters.category)
    if (search.filters.jobType && search.filters.jobType.length > 0) {
      search.filters.jobType.forEach((type) => queryParams.append("jobType", type))
    }
    if (search.filters.salary) queryParams.append("salary", search.filters.salary)
    if (search.filters.datePosted) queryParams.append("datePosted", search.filters.datePosted)

    router.push(`/find-jobs?${queryParams.toString()}`)
  }

  const deleteSearch = (id: string) => {
    const updatedSearches = savedSearches.filter((search) => search.id !== id)
    setSavedSearches(updatedSearches)
    localStorage.setItem("ranaojobs_saved_searches", JSON.stringify(updatedSearches))
  }

  const editSearch = (id: string) => {
    const search = savedSearches.find((s) => s.id === id)
    if (search) {
      const queryParams = new URLSearchParams()

      if (search.filters.keywords) queryParams.append("q", search.filters.keywords)
      if (search.filters.location) queryParams.append("location", search.filters.location)
      if (search.filters.category) queryParams.append("category", search.filters.category)
      if (search.filters.jobType && search.filters.jobType.length > 0) {
        search.filters.jobType.forEach((type) => queryParams.append("jobType", type))
      }
      if (search.filters.salary) queryParams.append("salary", search.filters.salary)
      if (search.filters.datePosted) queryParams.append("datePosted", search.filters.datePosted)

      router.push(`/find-jobs?${queryParams.toString()}&edit=true`)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Saved Searches</CardTitle>
          <CardDescription>Your saved job search filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (savedSearches.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Saved Searches</CardTitle>
          <CardDescription>Your saved job search filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No saved searches yet</h3>
            <p className="text-gray-500 mb-4">Save your search filters to quickly find relevant jobs</p>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => router.push("/find-jobs")}>
              Start searching
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Saved Searches</CardTitle>
        <CardDescription>Your saved job search filters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedSearches.map((search) => (
          <div key={search.id} className="border rounded-lg p-4 hover:border-yellow-500 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-medium">{search.name}</h3>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-yellow-500"
                  onClick={() => editSearch(search.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-red-500"
                  onClick={() => deleteSearch(search.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {search.filters.keywords && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  <Search className="h-3 w-3 mr-1" />
                  {search.filters.keywords}
                </Badge>
              )}
              {search.filters.location && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  {search.filters.location}
                </Badge>
              )}
              {search.filters.category && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                >
                  <Briefcase className="h-3 w-3 mr-1" />
                  {search.filters.category}
                </Badge>
              )}
              {search.filters.salary && (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                >
                  <PhilippinePeso className="h-3 w-3 mr-1" />
                  {search.filters.salary}
                </Badge>
              )}
              {search.filters.datePosted && (
                <Badge
                  variant="outline"
                  className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {search.filters.datePosted}
                </Badge>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Created: {search.createdAt}</span>
              <Button
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={() => applySearch(search)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
