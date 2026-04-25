"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { collection, query, getDocs, where, DocumentData ,db} from "@/config/firebase"

// Define job types
const JOB_TYPES = ["Full-time", "Part-time", "Remote", "Contract", "Internship"]

export interface JobFilterProps {
  onFilterChange: (filters: JobFilterValues) => void
  className?: string
}

export interface JobFilterValues {
  jobTypes: string[]
  categories: string[]
  locations: string[]
}

export function JobFilter({ onFilterChange, className = "" }: JobFilterProps) {
  // State for selected filters
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  
  // State for available options (to be fetched from database)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableLocations, setAvailableLocations] = useState<string[]>([])
  const [filteredLocations, setFilteredLocations] = useState<string[]>([])
  const [locationSearchTerm, setLocationSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Helper function to extract city/province from full location
  const extractCityOrProvince = (fullLocation: string): string => {
    if (!fullLocation) return "";
    
    // Split by common separators
    const parts = fullLocation.split(/,|\s-\s|\//).map(part => part.trim());
    
    // If there's only one part or it's very short, return as is
    if (parts.length === 1 || fullLocation.length < 15) return fullLocation.trim();
    
    // Otherwise return the first significant part (likely city/province)
    // Skip very short parts that might be building numbers or abbreviations
    for (const part of parts) {
      if (part.length > 3) return part;
    }
    
    // Fallback to the first part if nothing else matches
    return parts[0];
  }

  // Fetch categories and locations from the database
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setIsLoading(true)
      try {
        // Get active jobs
        const jobsQuery = query(
          collection(db, "jobs"),
          where("isActive", "==", true)
        )
        
        const snapshot = await getDocs(jobsQuery)
        
        // Extract unique categories and locations
        const categories = new Set<string>()
        const locations = new Set<string>()
        
        snapshot.docs.forEach((doc: any) => {
          const data = doc.data()
          
          // Add category if it exists and is not empty
          if (data.category && typeof data.category === 'string' && data.category.trim() !== '') {
            categories.add(data.category.trim())
          }
          
          // Add location if it exists and is not empty - extract city/province only
          if (data.location && typeof data.location === 'string' && data.location.trim() !== '') {
            const cityOrProvince = extractCityOrProvince(data.location);
            if (cityOrProvince) {
              locations.add(cityOrProvince);
            }
          }
        })
        
        const sortedCategories = Array.from(categories).sort();
        const sortedLocations = Array.from(locations).sort();
        
        setAvailableCategories(sortedCategories)
        setAvailableLocations(sortedLocations)
        setFilteredLocations(sortedLocations)
      } catch (error) {
        console.error("Error fetching filter options:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchFilterOptions()
  }, [])

  // Filter locations based on search term
  useEffect(() => {
    if (locationSearchTerm.trim() === "") {
      setFilteredLocations(availableLocations);
    } else {
      const filtered = availableLocations.filter(location => 
        location.toLowerCase().includes(locationSearchTerm.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [locationSearchTerm, availableLocations]);

  // Handle job type selection
  const handleJobTypeChange = (type: string, checked: boolean) => {
    setSelectedJobTypes(prev => {
      if (checked) {
        return [...prev, type]
      } else {
        return prev.filter(t => t !== type)
      }
    })
  }
  
  // Handle category selection
  const handleCategoryChange = (category: string, checked: boolean) => {
    setSelectedCategories(prev => {
      if (checked) {
        return [...prev, category]
      } else {
        return prev.filter(c => c !== category)
      }
    })
  }
  
  // Handle location selection
  const handleLocationChange = (location: string, checked: boolean) => {
    setSelectedLocations(prev => {
      if (checked) {
        return [...prev, location]
      } else {
        return prev.filter(l => l !== location)
      }
    })
  }
  
  // Apply filters
  const applyFilters = () => {
    onFilterChange({
      jobTypes: selectedJobTypes,
      categories: selectedCategories,
      locations: selectedLocations
    })
  }
  
  // Reset all filters
  const resetFilters = () => {
    setSelectedJobTypes([])
    setSelectedCategories([])
    setSelectedLocations([])
    setLocationSearchTerm("")
    
    onFilterChange({
      jobTypes: [],
      categories: [],
      locations: []
    })
  }

  // Calculate if any filters are active
  const hasActiveFilters = selectedJobTypes.length > 0 || 
                          selectedCategories.length > 0 || 
                          selectedLocations.length > 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Filter Jobs</span>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-gray-500"
              onClick={resetFilters}
            >
              Reset All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedJobTypes.map((type) => (
              <Badge key={type} variant="outline" className="flex items-center gap-1 bg-gray-100">
                {type}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 p-0 ml-1" 
                  onClick={() => handleJobTypeChange(type, false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {selectedCategories.map((category) => (
              <Badge key={category} variant="outline" className="flex items-center gap-1 bg-gray-100">
                {category}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 p-0 ml-1" 
                  onClick={() => handleCategoryChange(category, false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {selectedLocations.map((location) => (
              <Badge key={location} variant="outline" className="flex items-center gap-1 bg-gray-100">
                {location}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 p-0 ml-1" 
                  onClick={() => handleLocationChange(location, false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Job Type Filter */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Job Type</Label>
          <div className="space-y-2">
            {JOB_TYPES.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={`job-type-${type.toLowerCase()}`}
                  checked={selectedJobTypes.includes(type)}
                  onCheckedChange={(checked) => handleJobTypeChange(type, checked === true)}
                />
                <label
                  htmlFor={`job-type-${type.toLowerCase()}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {type}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Job Category Filter */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Job Category</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading categories...</p>
            ) : availableCategories.length > 0 ? (
              availableCategories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`category-${category.toLowerCase().replace(/\s+/g, "-")}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => handleCategoryChange(category, checked === true)}
                  />
                  <label
                    htmlFor={`category-${category.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {category}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No categories available</p>
            )}
          </div>
        </div>

        {/* Location Filter */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Location</Label>
          
          {/* Location Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              type="text" 
              placeholder="Search locations..." 
              className="pl-8 h-9 text-sm"
              value={locationSearchTerm}
              onChange={(e) => setLocationSearchTerm(e.target.value)}
            />
            {locationSearchTerm && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0" 
                onClick={() => setLocationSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading locations...</p>
            ) : filteredLocations.length > 0 ? (
              filteredLocations.map((location) => (
                <div key={location} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`location-${location.toLowerCase().replace(/\s+/g, "-")}`}
                    checked={selectedLocations.includes(location)}
                    onCheckedChange={(checked) => handleLocationChange(location, checked === true)}
                  />
                  <label
                    htmlFor={`location-${location.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {location}
                  </label>
                </div>
              ))
            ) : locationSearchTerm ? (
              <p className="text-sm text-gray-500">No locations match your search</p>
            ) : (
              <p className="text-sm text-gray-500">No locations available</p>
            )}
          </div>
        </div>

        {/* Apply Filters Button */}
        <Button 
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
          onClick={applyFilters}
        >
          Apply Filters
        </Button>
      </CardContent>
    </Card>
  )
} 