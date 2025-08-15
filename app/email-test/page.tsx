"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function EmailTest() {
    const [email, setEmail] = useState("")
    const [subject, setSubject] = useState("Test Email from Ranao Jobs")
    const [message, setMessage] = useState("This is a test email to verify that the notification system is working correctly.")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [result, setResult] = useState<any>(null)

    const handleSendTest = async () => {
        if (!email) {
            alert("Please enter an email address")
            return
        }

        setStatus("loading")
        try {
            const response = await fetch(`/api/send-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    to: email,
                    subject,
                    message,
                    link: "http://localhost:3000/employer-dashboard/notifications"
                })
            })

            const data = await response.json()
            setResult(data)

            if (response.ok && data.success) {
                setStatus("success")
            } else {
                setStatus("error")
            }
        } catch (error) {
            console.error("Error sending test email:", error)
            setStatus("error")
            setResult({ error: String(error) })
        }
    }

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6">Email Notification Test</h1>

            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Test Email Notifications</CardTitle>
                    <CardDescription>
                        Use this page to test if the email notification system is working properly.
                        Make sure to configure your Gmail credentials in lib/config.ts first.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Recipient Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter recipient email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    {status === "success" && (
                        <Alert variant="default" className="bg-green-50 border-green-200">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <AlertTitle>Success!</AlertTitle>
                            <AlertDescription>
                                Email was sent successfully. Check the recipient's inbox.
                                {result?.messageId && (
                                    <div className="mt-2 text-xs">Message ID: {result.messageId}</div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === "error" && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-5 w-5" />
                            <AlertTitle>Failed to send email</AlertTitle>
                            <AlertDescription>
                                {result?.message || "An unknown error occurred"}
                                {result?.error && (
                                    <div className="mt-2 text-xs overflow-auto max-h-32">{result.error}</div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleSendTest}
                        disabled={status === "loading" || !email}
                        className="w-full"
                    >
                        {status === "loading" ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            "Send Test Email"
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <div className="mt-8 max-w-xl mx-auto">
                <h2 className="text-xl font-semibold mb-4">Gmail Setup Instructions</h2>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>
                        Enable 2-Step Verification for your Google account by visiting
                        <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
                            className="text-yellow-600 hover:text-yellow-700 ml-1">
                            Google Account Security
                        </a>
                    </li>
                    <li>
                        Generate an App Password by visiting
                        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                            className="text-yellow-600 hover:text-yellow-700 ml-1">
                            App Passwords
                        </a>
                    </li>
                    <li>Select "Other (Custom name)" from the app dropdown and give it a name like "Ranao Jobs"</li>
                    <li>Click "Generate" and Google will display a 16-character app password</li>
                    <li>Copy this password and update the emailPass field in lib/config.ts with this value</li>
                    <li>Update the emailUser field with your Gmail address</li>
                    <li>Update the emailFrom field with your Gmail address (keeping the "Ranao Jobs" display name)</li>
                </ol>
            </div>
        </div>
    )
} 