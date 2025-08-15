import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { Search, MapPin, X, Briefcase, Mail, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EnhancedApplicantFilters } from "@/components/enhanced-applicant-filters"

export default function FindCandidatesPage() {
  // Mock candidate data
  const candidates = [
    {
      id: "1",
      name: "John Doe",
      title: "Senior Frontend Developer",
      location: "Marawi City",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
      experience: "5 years",
      education: "BS Computer Science, Mindanao State University",
      availability: "Immediate",
      profileCompletion: 95,
    },
    {
      id: "2",
      name: "Sarah Williams",
      title: "UX Designer",
      location: "Iligan City",
      skills: ["UI/UX", "Figma", "Adobe XD", "User Research"],
      experience: "3 years",
      education: "BS Information Technology, MSU-IIT",
      availability: "2 weeks",
      profileCompletion: 85,
    },
    {
      id: "3",
      name: "Michael Johnson",
      title: "Full Stack Developer",
      location: "Remote",
      skills: ["JavaScript", "Node.js", "React", "MongoDB", "Express"],
      experience: "4 years",
      education: "BS Computer Engineering, Ateneo de Davao",
      availability: "1 month",
      profileCompletion: 90,
    },
    {
      id: "4",
      name: "Emily Chen",
      title: "Project Manager",
      location: "Cagayan de Oro",
      skills: ["Agile", "Scrum", "JIRA", "Team Leadership", "Budgeting"],
      experience: "7 years",
      education: "MBA, Xavier University",
      availability: "Immediate",
      profileCompletion: 100,
    },
    {
      id: "5",
      name: "David Kim",
      title: "Backend Developer",
      location: "Davao City",
      skills: ["Python", "Django", "PostgreSQL", "Docker", "AWS"],
      experience: "6 years",
      education: "BS Computer Science, University of the Philippines",
      availability: "2 weeks",
      profileCompletion: 80,
    },
    {
      id: "6",
      name: "Lisa Garcia",
      title: "Marketing Specialist",
      location: "Marawi City",
      skills: ["Digital Marketing", "SEO", "Content Creation", "Social Media"],
      experience: "3 years",
      education: "BS Marketing, Mindanao State University",
      availability: "Immediate",
      profileCompletion: 75,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />

      {/* Page Header */}
      <section className="pt-24 pb-10 px-4 bg-gray-900 text-white dark:bg-gray-950">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Find Qualified Candidates</h1>
            <p className="text-lg text-gray-300 max-w-3xl mb-8">
              Browse through our database of skilled professionals in Marawi City and beyond
            </p>

            {/* Search Bar */}
            <div className="w-full max-w-4xl flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input type="text" placeholder="Job title, skills, or qualifications" className="pl-10 h-12" />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input type="text" placeholder="City, state, or remote" className="pl-10 h-12" />
              </div>
              <Button className="h-12 px-6 bg-yellow-500 hover:bg-yellow-600 text-black font-medium">
                Search Candidates
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 px-4 bg-gray-50 flex-grow dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <div className="w-full lg:w-1/4">
              <EnhancedApplicantFilters className="sticky top-24" />
            </div>

            {/* Candidate Listings */}
            <div className="w-full lg:w-3/4">
              <div className="bg-white rounded-lg shadow-sm p-5 mb-6 dark:bg-gray-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">128 Candidates Found</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Based on your search criteria</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700">
                      React
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1">
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700">
                      3+ years experience
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1">
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700">
                      Marawi City
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1">
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  </div>

                  <div className="flex items-center">
                    <Select defaultValue="relevance">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="experience-high">Experience: High to Low</SelectItem>
                        <SelectItem value="experience-low">Experience: Low to High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {candidates.map((candidate) => (
                  <Card key={candidate.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <CardContent className="p-6 flex-1">
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xl dark:bg-gray-700">
                            {candidate.name.charAt(0)}
                          </div>

                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                              <h3 className="text-lg font-bold hover:text-yellow-500">{candidate.name}</h3>
                              <Badge
                                variant="outline"
                                className="w-fit bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                              >
                                {candidate.availability} Availability
                              </Badge>
                            </div>

                            <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                              <Briefcase className="h-4 w-4 mr-1" />
                              <span className="text-sm">{candidate.title}</span>
                            </div>

                            <div className="flex items-center text-gray-500 dark:text-gray-400 mb-3">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span className="text-sm">{candidate.location}</span>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {candidate.skills.map((skill, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <Briefcase className="h-4 w-4 mr-2" />
                                <span>{candidate.experience} experience</span>
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                <span>{candidate.education}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      <div className="p-6 md:p-4 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 flex md:flex-col justify-between gap-3 md:w-48 md:min-w-48">
                        <Button variant="outline" size="sm" className="flex-1 md:w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                        <Button className="flex-1 md:w-full bg-yellow-500 hover:bg-yellow-600 text-black" size="sm">
                          <Mail className="h-4 w-4 mr-2" />
                          Contact
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center mt-10">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="icon" disabled>
                    &lt;
                  </Button>
                  <Button variant="outline" size="sm" className="bg-yellow-500 text-black border-yellow-500">
                    1
                  </Button>
                  <Button variant="outline" size="sm">
                    2
                  </Button>
                  <Button variant="outline" size="sm">
                    3
                  </Button>
                  <Button variant="outline" size="sm">
                    4
                  </Button>
                  <Button variant="outline" size="sm">
                    5
                  </Button>
                  <Button variant="outline" size="icon">
                    &gt;
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
