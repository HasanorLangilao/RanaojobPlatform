import { Skeleton } from "@/components/ui/skeleton"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />

      {/* Page Header Skeleton */}
      <section className="pt-24 pb-10 px-4 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-full max-w-3xl mb-8" />

            {/* Search Bar Skeleton */}
            <div className="w-full max-w-4xl flex flex-col md:flex-row gap-3 mb-6">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Skeleton */}
      <section className="py-10 px-4 bg-gray-50 flex-grow">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar Skeleton */}
            <div className="w-full lg:w-1/4">
              <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>

            {/* Job Listings Skeleton */}
            <div className="w-full lg:w-3/4">
              <Skeleton className="h-24 w-full rounded-lg mb-6" />

              <div className="space-y-6">
                {[...Array(5)].map((_, index) => (
                  <Skeleton key={index} className="h-48 w-full rounded-lg" />
                ))}
              </div>

              {/* Pagination Skeleton */}
              <div className="flex justify-center mt-10">
                <Skeleton className="h-10 w-64" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
