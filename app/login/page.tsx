"use client"

import { LoginForm } from "@/components/login-form"
import Link from "next/link"
import { recordActivity } from "@/lib/activity-logger"
import { signInWithEmailAndPassword } from "firebase/auth"
import { getDoc, doc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { auth, db } from "@/lib/firebase"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const userData = userDoc.data()

      // Store user data in localStorage
      const userToStore = {
        id: user.uid,
        email: user.email,
        role: userData?.role || "jobseeker",
        firstName: userData?.firstName || "",
        lastName: userData?.lastName || "",
        activeRole: userData?.role || "jobseeker"
      }
      localStorage.setItem("ranaojobs_user", JSON.stringify(userToStore))

      // Record login activity
      await recordActivity(
        user.uid,
        "login",
        "User logged in",
        {
          role: userData?.role,
          email: user.email
        }
      )

      // Redirect based on role
      if (userData?.role === "admin") {
        router.push("/admin")
      } else if (userData?.role === "employer") {
        router.push("/employer-home")
      } else {
        router.push("/jobseeker-home")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="text-2xl font-bold">
            RANAO<span className="text-yellow-500">Jobs</span>
          </span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}
