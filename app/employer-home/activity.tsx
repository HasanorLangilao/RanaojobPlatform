"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import { AuthCheckModal } from "@/components/auth-check-modal";
import { Users, CheckCircle2, Bell } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

export default function EmployerActivityPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

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

    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        // Fetch all activities for this employer from 'activity_emp'
        const activitiesQuery = query(
          collection(db, "activty_emp"),
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
            time: formatDistanceToNow(createdTime, { addSuffix: true })
          };
        });
        setActivities(activityList);
      } catch (err) {
        console.error("Error fetching activities:", err);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivities();
  }, [router]);

  if (isLoading && !isAuthModalOpen) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <main className="flex-grow pt-20 pb-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>All Activity</CardTitle>
              <CardDescription>All recent activities for your account</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50">
                      <div
                        className={`p-2 rounded-full flex-shrink-0 
                        ${
                          activity.type === "application"
                            ? "bg-blue-100"
                            : activity.type === "approval"
                              ? "bg-green-100"
                              : "bg-purple-100"
                        }`}
                      >
                        {activity.type === "application" ? (
                          <Users className={`h-4 w-4 text-blue-600`} />
                        ) : activity.type === "approval" ? (
                          <CheckCircle2 className={`h-4 w-4 text-green-600`} />
                        ) : (
                          <Bell className={`h-4 w-4 text-purple-600`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
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