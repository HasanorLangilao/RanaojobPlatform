// Script to add sample jobseeker activities to the database
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to add a jobseeker activity
async function addJobseekerActivity(jobseekerId, type, message, metadata = {}) {
  try {
    // Add to activity_js collection
    const activityRef = await addDoc(collection(db, "activity_js"), {
      jobseekerId,
      type,
      message,
      createdAt: serverTimestamp(),
      metadata
    });
    
    console.log(`Activity added with ID: ${activityRef.id}`);
    return activityRef.id;
  } catch (error) {
    console.error("Error adding jobseeker activity:", error);
    return null;
  }
}

// Main function to add sample activities
async function createSampleActivities() {
  // Replace with actual jobseeker IDs from your database
  // You can get these IDs by running a query on your users collection
  const jobseekerIds = [
    process.env.JOBSEEKER_ID_1 || "sample-jobseeker-id-1",
    process.env.JOBSEEKER_ID_2 || "sample-jobseeker-id-2"
  ];
  
  for (const jobseekerId of jobseekerIds) {
    console.log(`Adding activities for jobseeker: ${jobseekerId}`);
    
    // Login activity
    await addJobseekerActivity(
      jobseekerId,
      "login",
      "Logged in to account"
    );
    
    // Profile update activity
    await addJobseekerActivity(
      jobseekerId,
      "profile_update",
      "Updated profile information",
      {
        changes: {
          skills: ["JavaScript", "React", "Node.js"],
          education: "Added new education record"
        }
      }
    );
    
    // Resume upload activity
    await addJobseekerActivity(
      jobseekerId,
      "resume_upload",
      "Uploaded new resume"
    );
    
    // Job application activity
    await addJobseekerActivity(
      jobseekerId,
      "application",
      "Applied for Web Developer position at Tech Company",
      {
        jobId: "sample-job-id-1",
        jobTitle: "Web Developer",
        companyName: "Tech Company"
      }
    );
    
    // Interview scheduled activity
    await addJobseekerActivity(
      jobseekerId,
      "interview",
      "Interview scheduled for Marketing Specialist position at Marketing Agency",
      {
        jobId: "sample-job-id-2",
        jobTitle: "Marketing Specialist",
        companyName: "Marketing Agency",
        interviewDate: "2023-07-15T10:00:00"
      }
    );
    
    // Job offer activity
    await addJobseekerActivity(
      jobseekerId,
      "offer",
      "Received job offer for Data Analyst position at Finance Corp",
      {
        jobId: "sample-job-id-3",
        jobTitle: "Data Analyst",
        companyName: "Finance Corp"
      }
    );
    
    // Application rejection activity
    await addJobseekerActivity(
      jobseekerId,
      "rejection",
      "Application for Software Engineer position at Software Inc was not selected",
      {
        jobId: "sample-job-id-4",
        jobTitle: "Software Engineer",
        companyName: "Software Inc",
        reason: "Position has been filled"
      }
    );
  }
  
  console.log("Sample jobseeker activities created successfully!");
  process.exit(0);
}

// Run the script
createSampleActivities().catch(error => {
  console.error("Error creating sample activities:", error);
  process.exit(1);
}); 