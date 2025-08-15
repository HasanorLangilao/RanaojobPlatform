// This script can be used to add sample notifications to the Firestore database
// Run with: node app/lib/scripts/sample-notification.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Initialize Firebase (replace with your config)
const firebaseConfig = {
  // Your firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample data - replace employerId with actual ID from your database
async function addSampleNotifications() {
  try {
    // New applicant notification
    await addDoc(collection(db, "employernotifications"), {
      employerId: "REPLACE_WITH_YOUR_EMPLOYER_ID", // Replace with actual employer ID
      title: "New Application Received",
      message: "A new applicant, John Doe, has applied for the Senior Developer position.",
      createdAt: serverTimestamp(),
      isRead: false,
      type: "application",
      applicationId: "sample-application-id-123", // Replace with actual application ID if needed
      relatedJob: {
        id: "sample-job-id-123", // Replace with actual job ID if needed
        title: "Senior Developer"
      }
    });
    
    // Job approval notification
    await addDoc(collection(db, "employernotifications"), {
      employerId: "REPLACE_WITH_YOUR_EMPLOYER_ID", // Replace with actual employer ID
      title: "Job Posting Approved",
      message: "Your job posting for Marketing Manager has been approved and is now live.",
      createdAt: serverTimestamp(),
      isRead: false,
      type: "job_related",
      relatedJob: {
        id: "sample-job-id-456", // Replace with actual job ID if needed
        title: "Marketing Manager"
      }
    });
    
    // System notification
    await addDoc(collection(db, "employernotifications"), {
      employerId: "REPLACE_WITH_YOUR_EMPLOYER_ID", // Replace with actual employer ID
      title: "Profile Incomplete",
      message: "Complete your company profile to increase visibility to potential applicants.",
      createdAt: serverTimestamp(),
      isRead: false,
      type: "system",
      link: "/employer/profile"
    });

    console.log("Sample notifications added successfully!");
  } catch (error) {
    console.error("Error adding notifications:", error);
  }
}

// Run the function
addSampleNotifications(); 