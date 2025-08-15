"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface EnhancedJobFiltersProps {
  className?: string
  onFilterChange?: (filters: any) => void
}

export interface JobFilters {
  keyword: string
  jobType: string[]
  experience: string
  locations: string[]
  industry: string[]
  salary: {
    min: number
    max: number
  }
}

// These should be fetched from your database or API in a real app
const jobTypes = ["Full-time", "Part-time", "Contract", "Internship", "Remote"]
const locations = ["Marawi City", "Iligan City", "Cagayan de Oro", "Davao City", "Remote"]
const industries = [
  "Technology",
  "Healthcare",
  "Education",
  "Finance",
  "Government",
  "Retail",
  "Manufacturing",
  "Agriculture",
]

export function EnhancedJobFilters({ className, onFilterChange }: EnhancedJobFiltersProps) {
  const [mounted, setMounted] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  
  // Filter states
  const [keywordFilter, setKeywordFilter] = useState("")
  const [jobTypeFilters, setJobTypeFilters] = useState<string[]>([])
  const [experienceFilter, setExperienceFilter] = useState("any")
  const [locationFilters, setLocationFilters] = useState<string[]>([])
  const [industryFilters, setIndustryFilters] = useState<string[]>([])
  const [salaryRange, setSalaryRange] = useState<[number, number]>([20000, 100000])
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  // Only run once on mount
  useEffect(() => {
    setMounted(true)
    setInitialLoad(false)
  }, [])

  // Update active filters whenever any filter changes
  useEffect(() => {
    const active: string[] = []
    
    if (keywordFilter) active.push("keyword")
    if (jobTypeFilters.length > 0) active.push("jobType")
    if (experienceFilter !== "any") active.push("experience")
    if (salaryRange[0] > 20000 || salaryRange[1] < 100000) active.push("salary")
    if (locationFilters.length > 0) active.push("locations")
    if (industryFilters.length > 0) active.push("industry")
    
    setActiveFilters(active)
  }, [keywordFilter, jobTypeFilters, experienceFilter, salaryRange, locationFilters, industryFilters])

  const formatSalary = (value: number) => {
    return `₱${value.toLocaleString()}`
  }

  const handleJobTypeChange = (type: string, checked: boolean) => {
    setJobTypeFilters(prev => {
      if (checked) {
        return [...prev, type]
      } else {
        return prev.filter(t => t !== type)
      }
    })
  }
  
  const handleLocationChange = (location: string, checked: boolean) => {
    setLocationFilters(prev => {
      if (checked) {
        return [...prev, location]
      } else {
        return prev.filter(l => l !== location)
      }
    })
  }
  
  const handleIndustryChange = (industry: string, checked: boolean) => {
    setIndustryFilters(prev => {
      if (checked) {
        return [...prev, industry]
      } else {
        return prev.filter(i => i !== industry)
      }
    })
  }
  
  const handleExperienceChange = (value: string) => {
    setExperienceFilter(value)
  }
  
  const handleKeywordSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const handleSalaryChange = (value: [number, number]) => {
    setSalaryRange(value)
  }
  
  const resetFilters = () => {
    setKeywordFilter("")
    setJobTypeFilters([])
    setExperienceFilter("any")
    setLocationFilters([])
    setIndustryFilters([])
    setSalaryRange([20000, 100000])
    
    // Apply the reset filters
    if (onFilterChange) {
      onFilterChange({
        keyword: "",
        jobType: [],
        experience: "any",
        locations: [],
        industry: [],
        salary: {
          min: 20000,
          max: 100000,
        },
      })
    }
  }

  const removeFilter = (filterType: string) => {
    switch (filterType) {
      case "keyword":
        setKeywordFilter("")
        break
      case "jobType":
        setJobTypeFilters([])
        break
      case "experience":
        setExperienceFilter("any")
        break
      case "salary":
        setSalaryRange([20000, 100000])
        break
      case "locations":
        setLocationFilters([])
        break
      case "industry":
        setIndustryFilters([])
        break
    }
    applyFilters()
  }

  const applyFilters = () => {
    if (onFilterChange) {
      const filters: JobFilters = {
        keyword: keywordFilter,
        jobType: jobTypeFilters,
        experience: experienceFilter,
        locations: locationFilters,
        industry: industryFilters,
        salary: {
          min: salaryRange[0],
          max: salaryRange[1],
        },
      }
      onFilterChange(filters)
    }
  }

  // Don't render during SSR to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Filters</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-gray-500"
              onClick={resetFilters}
            >
              Reset All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {activeFilters.map((filter) => {
                let label = ""
                switch (filter) {
                  case "keyword":
                    label = `Keywords: ${keywordFilter}`
                    break
                  case "jobType":
                    label = `Job Types: ${jobTypeFilters.length}`
                    break
                  case "experience":
                    label = `Experience: ${experienceFilter}`
                    break
                  case "salary":
                    label = `Salary: ${formatSalary(salaryRange[0])} - ${formatSalary(salaryRange[1])}`
                    break
                  case "locations":
                    label = `Locations: ${locationFilters.length}`
                    break
                  case "industry":
                    label = `Industries: ${industryFilters.length}`
                    break
                }

                return (
                  <Badge key={filter} variant="outline" className="flex items-center gap-1 bg-gray-100">
                    {label}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => removeFilter(filter)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Search Keywords */}
          <div className="space-y-2">
            <Label>Keywords</Label>
            <form onSubmit={handleKeywordSearch} className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Search job titles, skills..." 
                className="pl-8" 
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
              />
            </form>
          </div>

          {/* Job Type */}
          <div className="space-y-2">
            <Label>Job Type</Label>
            <div className="space-y-2">
              {jobTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`job-type-${type.toLowerCase()}`}
                    checked={jobTypeFilters.includes(type)}
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

          {/* Experience Level */}
          <div className="space-y-2">
            <Label>Experience Level</Label>
            <RadioGroup 
              value={experienceFilter} 
              onValueChange={handleExperienceChange}
            >
              {[
                { value: "any", label: "Any Experience" },
                { value: "entry", label: "Entry Level" },
                { value: "mid", label: "Mid Level" },
                { value: "senior", label: "Senior Level" },
                { value: "executive", label: "Executive Level" },
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`experience-${option.value}`} />
                  <label
                    htmlFor={`experience-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Salary Range */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Salary Range</Label>
              <span className="text-sm text-gray-500">
                {formatSalary(salaryRange[0])} - {formatSalary(salaryRange[1])}
              </span>
            </div>
            <Slider
              min={0}
              max={200000}
              step={5000}
              value={salaryRange}
              onValueChange={handleSalaryChange}
              className="py-4"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="space-y-2">
              {locations.map((location) => (
                <div key={location} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`location-${location.toLowerCase().replace(/\s+/g, "-")}`}
                    checked={locationFilters.includes(location)}
                    onCheckedChange={(checked) => handleLocationChange(location, checked === true)}
                  />
                  <label
                    htmlFor={`location-${location.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {location}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label>Industry</Label>
            <div className="space-y-2">
              {industries.map((industry) => (
                <div key={industry} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`industry-${industry.toLowerCase()}`}
                    checked={industryFilters.includes(industry)}
                    onCheckedChange={(checked) => handleIndustryChange(industry, checked === true)}
                  />
                  <label
                    htmlFor={`industry-${industry.toLowerCase()}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {industry}
                  </label>
                </div>
              ))}
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
    </div>
  )
}