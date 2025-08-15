// This script can be used to add sample notifications to the Firestore database
// Run with: node app/lib/scripts/jobseeker-sample-notifications.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Initialize Firebase (replace with your config)
const firebaseConfig = {
  // Your firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample data - replace jobseekerId with actual ID from your database
async function addSampleJobseekerNotifications() {
  try {
    // Application status notification
    await addDoc(collection(db, "jobseekernotifications"), {
      jobseekerId: "REPLACE_WITH_YOUR_JOBSEEKER_ID", // Replace with actual jobseeker ID
      title: "Your application has been reviewed",
      message: "Tech Solutions Inc. has reviewed your application for the Senior Frontend Developer position.",
      createdAt: serverTimestamp(),
      isRead: false,
      type: "application",
      applicationId: "sample-application-id-456", // Replace with actual application ID
      applicationStatus: "Under Review",
      relatedJob: {
        id: "sample-job-id-123", // Replace with actual job ID
        title: "Senior Frontend Developer"
      }
    });
    
    // Job recommendation notification
    await addDoc(collection(db, "jobseekernotifications"), {
      jobseekerId: "REPLACE_WITH_YOUR_JOBSEEKER_ID", // Replace with actual jobseeker ID
      title: "New job match found",
      message: "We found a job that matches your skills: React Developer at Digital Innovations.",
      createdAt: serverTimestamp(),
      isRead: false,
      type: "job",
      relatedJob: {
        id: "sample-job-id-789", // Replace with actual job ID
        title: "React Developer"
      }
    });
    
    // Profile notification
    await addDoc(collection(db, "jobseekernotifications"), {
      jobseekerId: "REPLACE_WITH_YOUR_JOBSEEKER_ID", // Replace with actual jobseeker ID
      title: "Complete your profile",
      message: "Your profile is 70% complete. Add your education details to improve visibility to employers.",
      createdAt: serverTimestamp(),
      isRead: false,
      type: "profile",
      link: "/jobseeker/profile"
    });
    
    // Alert notification
    await addDoc(collection(db, "jobseekernotifications"), {
      jobseekerId: "REPLACE_WITH_YOUR_JOBSEEKER_ID", // Replace with actual jobseeker ID
      title: "Interview invitation",
      message: "You've been invited for an interview with Tech Solutions Inc. for the Senior Frontend Developer position.",
      createdAt: serverTimestamp(),
      isRead: false,
      type: "alert",
      applicationId: "sample-application-id-456", // Replace with actual application ID
      relatedJob: {
        id: "sample-job-id-123", // Replace with actual job ID
        title: "Senior Frontend Developer"
      }
    });
    
    // System notification
    await addDoc(collection(db, "jobseekernotifications"), {
      jobseekerId: "REPLACE_WITH_YOUR_JOBSEEKER_ID", // Replace with actual jobseeker ID
      title: "Welcome to RanaoJobs",
      message: "Thank you for joining RanaoJobs. Complete your profile to start your job search journey.",
      createdAt: serverTimestamp(),
      isRead: false,
      type: "system",
      link: "/jobseeker/profile"
    });

    console.log("Sample jobseeker notifications added successfully!");
  } catch (error) {
    console.error("Error adding notifications:", error);
  }
}

// Run the function
addSampleJobseekerNotifications(); 