"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface ForgotPasswordFormProps {
  onBackToLogin: () => void
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please try again later")
      } else {
        setError("An error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Password reset email sent! Please check your inbox and follow the instructions to reset your password.
          </AlertDescription>
        </Alert>
      )}

      {!success ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" 
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Reset Password"}
          </Button>
        </>
      ) : (
        <Button 
          type="button"
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
          onClick={onBackToLogin}
        >
          Back to Login
        </Button>
      )}

      {!success && (
        <div className="text-center">
          <Button 
            variant="link" 
            className="p-0 h-auto text-yellow-500 hover:text-yellow-600" 
            onClick={onBackToLogin}
          >
            Back to Login
          </Button>
        </div>
      )}
    </form>
  )
} 