"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  directStoreInterviewNotification, 
  directStoreHireNotification, 
  directStoreRejectionNotification 
} from "@/lib/notifications";

export default function TestDirectNotifications() {
  const [jobseekerId, setJobseekerId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [jobTitle, setJobTitle] = useState("Test Job Position");
  const [companyName, setCompanyName] = useState("Test Company");
  const [interviewDate, setInterviewDate] = useState("June 1, 2023");
  const [rejectionReason, setRejectionReason] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const testInterviewNotification = async () => {
    if (!jobseekerId || !applicationId) {
      alert("Jobseeker ID and Application ID are required");
      return;
    }
    
    setLoading(true);
    try {
      const result = await directStoreInterviewNotification(
        jobseekerId,
        applicationId,
        jobTitle,
        companyName,
        interviewDate
      );
      
      setResult({
        type: "Interview Notification",
        success: Boolean(result),
        result
      });
    } catch (error) {
      console.error("Test failed:", error);
      setResult({ 
        type: "Interview Notification",
        success: false, 
        error: String(error) 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testHireNotification = async () => {
    if (!jobseekerId || !applicationId) {
      alert("Jobseeker ID and Application ID are required");
      return;
    }
    
    setLoading(true);
    try {
      const result = await directStoreHireNotification(
        jobseekerId,
        applicationId,
        jobTitle,
        companyName
      );
      
      setResult({
        type: "Hire Notification",
        success: Boolean(result),
        result
      });
    } catch (error) {
      console.error("Test failed:", error);
      setResult({ 
        type: "Hire Notification",
        success: false, 
        error: String(error) 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testRejectionNotification = async () => {
    if (!jobseekerId || !applicationId) {
      alert("Jobseeker ID and Application ID are required");
      return;
    }
    
    setLoading(true);
    try {
      const result = await directStoreRejectionNotification(
        jobseekerId,
        applicationId,
        jobTitle,
        companyName,
        rejectionReason || undefined
      );
      
      setResult({
        type: "Rejection Notification",
        success: Boolean(result),
        result
      });
    } catch (error) {
      console.error("Test failed:", error);
      setResult({ 
        type: "Rejection Notification",
        success: false, 
        error: String(error) 
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Test Direct Notification Functions</h1>
      
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-xl font-semibold mb-4">Required Information</h2>
        
        <div className="grid gap-4">
          <div>
            <label className="block mb-2">Jobseeker ID:</label>
            <Input 
              value={jobseekerId} 
              onChange={(e) => setJobseekerId(e.target.value)}
              placeholder="Enter jobseeker ID"
            />
          </div>
          
          <div>
            <label className="block mb-2">Application ID:</label>
            <Input 
              value={applicationId} 
              onChange={(e) => setApplicationId(e.target.value)}
              placeholder="Enter application ID"
            />
          </div>
          
          <div>
            <label className="block mb-2">Job Title:</label>
            <Input 
              value={jobTitle} 
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Enter job title"
            />
          </div>
          
          <div>
            <label className="block mb-2">Company Name:</label>
            <Input 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-xl font-semibold mb-4">Interview Notification</h2>
        
        <div className="mb-4">
          <label className="block mb-2">Interview Date:</label>
          <Input 
            value={interviewDate} 
            onChange={(e) => setInterviewDate(e.target.value)}
            placeholder="Enter interview date"
          />
        </div>
        
        <Button 
          onClick={testInterviewNotification}
          disabled={loading}
        >
          {loading ? "Testing..." : "Test Interview Notification"}
        </Button>
      </div>
      
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-xl font-semibold mb-4">Hire Notification</h2>
        
        <Button 
          onClick={testHireNotification}
          disabled={loading}
        >
          {loading ? "Testing..." : "Test Hire Notification"}
        </Button>
      </div>
      
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-xl font-semibold mb-4">Rejection Notification</h2>
        
        <div className="mb-4">
          <label className="block mb-2">Rejection Reason (Optional):</label>
          <Input 
            value={rejectionReason} 
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason"
          />
        </div>
        
        <Button 
          onClick={testRejectionNotification}
          disabled={loading}
        >
          {loading ? "Testing..." : "Test Rejection Notification"}
        </Button>
      </div>
      
      {result && (
        <div className="mt-6 p-4 border rounded-md">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <div className="bg-gray-100 p-4 rounded-md">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 