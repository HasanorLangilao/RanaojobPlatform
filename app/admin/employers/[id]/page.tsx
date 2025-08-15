"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";

interface Employer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  location: string;
  industry: string;
  registeredAt: string | Date | Timestamp | null | undefined;
  status: string;
}

interface Job {
  id: string;
  title?: string;
  status?: string;
  verificationStatus?: string;
}

interface PageProps {
  params: { id: string };
}

const formatDate = (timestamp: string | Date | Timestamp | null | undefined): string => {
  if (!timestamp) return "N/A";
  if (typeof timestamp === "string") return new Date(timestamp).toLocaleDateString();
  // @ts-ignore
  if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
  return (timestamp as Date).toLocaleDateString();
};

export default function EmployerProfilePage({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    const fetchEmployer = async () => {
      setIsLoading(true);
      try {
        const userRef = doc(db, "users", id);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setEmployer(null);
          setIsLoading(false);
          return;
        }
        const data = userSnap.data();
        let status = "pending";
        if (
          data.verificationRejected === true ||
          data.verificationRejected === "true" ||
          data.verificationRejected === 1 ||
          data.status === "rejected"
        ) {
          status = "rejected";
        } else if (data.status) {
          status = data.status;
        }
        setEmployer({
          id: userSnap.id,
          companyName: data.companyName || "Unnamed Company",
          contactName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'No Contact Name',
          email: data.email || "No Email",
          location: data.city || data.barangay || "Marawi City",
          industry: data.industry || "Not specified",
          registeredAt: data.createdAt,
          status,
        });
        const jobsQuery = query(
          collection(db, "jobs"),
          where("employerId", "==", id)
        );
        const jobsSnap = await getDocs(jobsQuery);
        setJobs(jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      } catch (err) {
        setEmployer(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployer();
  }, [id]);

  if (isLoading) {
    return (
      <AdminLayout title="Employer Profile">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!employer) {
    return (
      <AdminLayout title="Employer Profile">
        <div className="flex justify-center items-center py-20">
          <p className="text-gray-500">Employer not found.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Verification Details">
        <div className="w-full space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{employer.companyName}</h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-xs rounded-full font-semibold capitalize ${
                employer.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : employer.status === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}>{employer.status}</span>
              <span className="text-sm text-gray-500">Submitted: {formatDate(employer.registeredAt)}</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.back()}>Back to List</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Details provided by the employer</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li><strong>Company Name:</strong> {employer.companyName}</li>
                <li><strong>Email:</strong> {employer.email}</li>
                <li><strong>Location:</strong> {employer.location}</li>
                <li><strong>Submitted:</strong> {formatDate(employer.registeredAt)}</li>
                <li><strong>Contact Person:</strong> {employer.contactName}</li>
                <li><strong>Industry:</strong> {employer.industry}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification Documents</CardTitle>
              <CardDescription>Review submitted documents</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">No documents found</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Notes</CardTitle>
            <CardDescription>Internal notes about this verification request</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[80px] border rounded p-2 text-sm"
              placeholder="Add notes about this verification request..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
            <Button className="mt-2">Save Notes</Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
