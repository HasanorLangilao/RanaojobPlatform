export default function Loading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 pt-20 pb-10">
      <div className="mb-6">
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2"></div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex justify-center items-center h-[600px] bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    </div>
  )
}
