"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, X } from "lucide-react"

interface EnhancedApplicantFiltersProps {
  className?: string
  onFiltersChange?: (filters: any) => void
}

export function EnhancedApplicantFilters({ className, onFiltersChange }: EnhancedApplicantFiltersProps) {
  const [filters, setFilters] = useState({
    search: "",
    educationLevels: [] as string[],
    skills: [] as string[],
    experienceRange: [0, 15] as [number, number],
    locations: [] as string[],
    availability: "",
    willingToRelocate: false,
  })

  const [skillInput, setSkillInput] = useState("")
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const applyFilters = () => {
    const active: string[] = []

    if (filters.search) active.push("search")
    if (filters.educationLevels.length > 0) active.push("educationLevels")
    if (filters.skills.length > 0) active.push("skills")
    if (filters.experienceRange[0] > 0 || filters.experienceRange[1] < 15) active.push("experienceRange")
    if (filters.locations.length > 0) active.push("locations")
    if (filters.availability) active.push("availability")
    if (filters.willingToRelocate) active.push("willingToRelocate")

    setActiveFilters(active)

    if (onFiltersChange) {
      onFiltersChange(filters)
    }
  }

  const resetFilters = () => {
    setFilters({
      search: "",
      educationLevels: [],
      skills: [],
      experienceRange: [0, 15],
      locations: [],
      availability: "",
      willingToRelocate: false,
    })

    setActiveFilters([])

    if (onFiltersChange) {
      onFiltersChange({})
    }
  }

  const removeFilter = (filter: string) => {
    switch (filter) {
      case "search":
        setFilters((prev) => ({ ...prev, search: "" }))
        break
      case "educationLevels":
        setFilters((prev) => ({ ...prev, educationLevels: [] }))
        break
      case "skills":
        setFilters((prev) => ({ ...prev, skills: [] }))
        break
      case "experienceRange":
        setFilters((prev) => ({ ...prev, experienceRange: [0, 15] }))
        break
      case "locations":
        setFilters((prev) => ({ ...prev, locations: [] }))
        break
      case "availability":
        setFilters((prev) => ({ ...prev, availability: "" }))
        break
      case "willingToRelocate":
        setFilters((prev) => ({ ...prev, willingToRelocate: false }))
        break
    }

    setActiveFilters((prev) => prev.filter((f) => f !== filter))
  }

  const toggleEducationLevel = (level: string) => {
    setFilters((prev) => {
      const updatedLevels = prev.educationLevels.includes(level)
        ? prev.educationLevels.filter((l) => l !== level)
        : [...prev.educationLevels, level]

      return { ...prev, educationLevels: updatedLevels }
    })
  }

  const toggleLocation = (location: string) => {
    setFilters((prev) => {
      const updatedLocations = prev.locations.includes(location)
        ? prev.locations.filter((l) => l !== location)
        : [...prev.locations, location]

      return { ...prev, locations: updatedLocations }
    })
  }

  const addSkill = () => {
    if (skillInput.trim() && !filters.skills.includes(skillInput.trim())) {
      setFilters((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }))
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Filter Applicants</span>
          {activeFilters.length > 0 && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map((filter) => {
              let label = ""
              switch (filter) {
                case "search":
                  label = `Search: ${filters.search}`
                  break
                case "educationLevels":
                  label = `Education: ${filters.educationLevels.length}`
                  break
                case "skills":
                  label = `Skills: ${filters.skills.length}`
                  break
                case "experienceRange":
                  label = `Experience: ${filters.experienceRange[0]}-${filters.experienceRange[1]} years`
                  break
                case "locations":
                  label = `Locations: ${filters.locations.length}`
                  break
                case "availability":
                  label = `Availability: ${filters.availability}`
                  break
                case "willingToRelocate":
                  label = "Willing to Relocate"
                  break
              }

              return (
                <Badge key={filter} variant="outline" className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800">
                  {label}
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => removeFilter(filter)}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        )}

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="applicant-search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="applicant-search"
              placeholder="Name, skills, or qualifications"
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        {/* Education Level */}
        <div className="space-y-2">
          <Label>Education Level</Label>
          <div className="grid grid-cols-2 gap-2">
            {["High School", "Associate's", "Bachelor's", "Master's", "Doctorate", "Professional"].map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox
                  id={`edu-level-${level.toLowerCase().replace("'", "").replace(".", "")}`}
                  checked={filters.educationLevels.includes(level)}
                  onCheckedChange={() => toggleEducationLevel(level)}
                />
                <Label
                  htmlFor={`edu-level-${level.toLowerCase().replace("'", "").replace(".", "")}`}
                  className="text-sm font-normal"
                >
                  {level}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <Label>Skills</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addSkill()
                }
              }}
            />
            <Button variant="outline" onClick={addSkill}>
              Add
            </Button>
          </div>

          {filters.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => removeSkill(skill)}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Experience Range */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Years of Experience</Label>
            <span className="text-sm text-gray-500">
              {filters.experienceRange[0]} - {filters.experienceRange[1]} years
            </span>
          </div>
          <Slider
            defaultValue={[0, 15]}
            min={0}
            max={15}
            step={1}
            value={filters.experienceRange}
            onValueChange={(value) => setFilters({ ...filters, experienceRange: value as [number, number] })}
            className="py-4"
          />
        </div>

        {/* Locations */}
        <div className="space-y-2">
          <Label>Locations</Label>
          <div className="grid grid-cols-2 gap-2">
            {["Marawi City", "Iligan City", "Cagayan de Oro", "Davao City", "Remote"].map((location) => (
              <div key={location} className="flex items-center space-x-2">
                <Checkbox
                  id={`location-${location.toLowerCase().replace(" ", "-")}`}
                  checked={filters.locations.includes(location)}
                  onCheckedChange={() => toggleLocation(location)}
                />
                <Label htmlFor={`location-${location.toLowerCase().replace(" ", "-")}`} className="text-sm font-normal">
                  {location}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-2">
          <Label htmlFor="availability">Availability</Label>
          <Select
            value={filters.availability}
            onValueChange={(value) => setFilters({ ...filters, availability: value })}
          >
            <SelectTrigger id="availability">
              <SelectValue placeholder="Select availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="Immediate">Immediate</SelectItem>
              <SelectItem value="1 Week">1 Week</SelectItem>
              <SelectItem value="2 Weeks">2 Weeks</SelectItem>
              <SelectItem value="1 Month">1 Month</SelectItem>
              <SelectItem value="3 Months">3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Willing to Relocate */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="willing-to-relocate"
            checked={filters.willingToRelocate}
            onCheckedChange={(checked) => setFilters({ ...filters, willingToRelocate: checked as boolean })}
          />
          <Label htmlFor="willing-to-relocate" className="font-normal">
            Willing to relocate
          </Label>
        </div>

        {/* Apply Filters Button */}
        <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" onClick={applyFilters}>
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters
        </Button>
      </CardContent>
    </Card>
  )
}
