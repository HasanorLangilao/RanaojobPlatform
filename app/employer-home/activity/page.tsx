"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import { AuthCheckModal } from "@/components/auth-check-modal";
import { Users, CheckCircle2, Bell, ArrowLeft, LogIn, Edit, User, Briefcase, FileText, AlertTriangle, Clock, XCircle, Trash2, Loader2 } from "lucide-react";
import { collection, query, where, getDocs, orderBy, Timestamp, writeBatch, deleteDoc,db } from "@/config/firebase";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EmployerActivityPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  // Activity type icons mapping for employer activities
  const activityIcons: Record<string, any> = {
    login: <LogIn className="h-4 w-4 text-green-600" />,
    job_edit: <Edit className="h-4 w-4 text-orange-600" />,
    profile_update: <User className="h-4 w-4 text-blue-600" />,
    job_post: <Briefcase className="h-4 w-4 text-yellow-600" />,
    job_delete: <XCircle className="h-4 w-4 text-red-600" />,
    job_status_change: <Clock className="h-4 w-4 text-gray-500" />,

    approval: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    rejection: <XCircle className="h-4 w-4 text-red-600" />,
    // Add other employer-specific activity types here with appropriate icons
    info: <Bell className="h-4 w-4 text-purple-600" /> // Default or general info icon
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("ranaojobs_user");
    if (!storedUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const user = JSON.parse(storedUser);
    if (user.role !== "employer" && user.role !== "multi") {
      router.push("/jobseeker-home");
      return;
    }
    if (user.role === "multi" && user.activeRole !== "employer") {
      user.activeRole = "employer";
      localStorage.setItem("ranaojobs_user", JSON.stringify(user));
    }
    setUserData(user);

    fetchActivities(user);
  }, [router]);

  const fetchActivities = async (user: any) => {
    setIsLoading(true);
    try {
      // Fetch all activities for this employer from 'activity_emp'
      const activitiesQuery = query(
        collection(db, "activity_emp"),
        where("employerId", "==", user.id),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(activitiesQuery);
      console.log("Fetched activities:", snapshot.size);
      const activityList = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Activity data:", data);
        const createdTime = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(data.createdAt);
        return {
          id: doc.id,
          type: data.type || "info",
          message: data.message || "",
          time: format(createdTime, "MMM d, yyyy 'at' h:mm a"),
          relativeTime: formatDistanceToNow(createdTime, { addSuffix: true }),
          metadata: data.metadata || {}
        };
      });
      setActivities(activityList);
    } catch (err) {
      console.error("Error fetching activities:", err);
      toast.error("Failed to fetch activities");
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllActivities = async () => {
    if (!userData) return;
    
    setIsDeleting(true);
    try {
      // Query all activities for this employer
      const activitiesQuery = query(
        collection(db, "activity_emp"),
        where("employerId", "==", userData.id)
      );
      const snapshot = await getDocs(activitiesQuery);
      
      // Use batch write for better performance and atomicity
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setActivities([]);
      toast.success("All activities have been cleared");
    } catch (error) {
      console.error("Error clearing activities:", error);
      toast.error("Failed to clear activities");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <main className="grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <Button
            variant="ghost"
            className="mb-4 flex items-center gap-2"
            onClick={() => router.push('/employer-home')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>All Activity</CardTitle>
                  <CardDescription>All recent activities for your account</CardDescription>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={isDeleting || activities.length === 0}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear All
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all your activity records.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllActivities} className="bg-red-600 hover:bg-red-700">
                        Yes, clear all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4 max-h-150 overflow-y-auto pr-2">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50">
                      <div
                        className={`p-2 rounded-full shrink-0 
                        ${
                          activity.type === "application"
                            ? "bg-blue-100"
                            : activity.type === "approval"
                              ? "bg-green-100"
                              : "bg-purple-100"
                        }`}
                      >
                        {/* Use the mapped icon based on activity type */}
                        {activityIcons[activity.type] || activityIcons.info}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        {activity.metadata && activity.metadata.changes && Object.keys(activity.metadata.changes).length > 0 && (
                          <div className="mt-1 text-sm text-gray-500">
                             <p className="font-medium">Changes:</p>
                            {Object.entries(activity.metadata.changes).map(([key, value], index) => (
                              <p key={key + index} className="ml-2">
                                <span className="font-semibold">{key}:</span> {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No activities to display.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <AuthCheckModal
        isOpen={isAuthModalOpen}
        onClose={() => router.push("/")}
        title="Employer Account Required"
        message="You need to login or register as an employer to access this page."
      />
    </div>
  );
} 