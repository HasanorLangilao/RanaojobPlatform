"use client";
import { RegistrationForm } from "@/components/registration-form"
import Link from "next/link"

export default function RegisterPage() {
  // This function will be empty to ensure no automatic redirects happen
  const handleRegisterSuccess = () => {}

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="text-2xl font-bold">
            RANAO<span className="text-yellow-500">Jobs</span>
          </span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <RegistrationForm onRegisterSuccess={handleRegisterSuccess} />
      </div>
    </div>
  )
}
