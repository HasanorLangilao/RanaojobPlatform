import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4 w-full">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-white">
              RANAO<span className="text-yellow-500">Jobs</span>
            </h3>
            <p className="mb-4 text-sm">
              Connecting talented professionals with their dream careers and helping employers find the perfect
              candidates.
            </p>
          </div>

          {/* For Job Seekers */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">For Job Seekers</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-400">
                Create Profile
              </li>
              <li className="text-gray-400">
                Browse Jobs
              </li>
              <li className="text-gray-400">
                Apply Jobs
              </li>
            </ul>
          </div>

          {/* For Employers */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">For Employers</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-400">
                Create Profile
              </li>
              <li className="text-gray-400">
                Post a Job
              </li>
              <li className="text-gray-400">
                Browse Candidates
              </li>
              <li className="text-gray-400">
                Accept Applications
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-yellow-500">
                  About Us
                </Link>
              </li>
           
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col items-center md:items-start">
            <p className="text-sm">&copy; {new Date().getFullYear()} RANAOJobs. All rights reserved.</p>
            <p className="text-sm mt-1">Mindanao State University</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button variant="link" className="text-gray-400 hover:text-yellow-500 text-xs">
              Privacy Policy
            </Button>
            <Button variant="link" className="text-gray-400 hover:text-yellow-500 text-xs">
              Terms of Service
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
