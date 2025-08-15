// This script adds sample notifications to the employernotifications collection
// Run with: node scripts/sample-notification.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration copied from lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyDxaiAf_pHRfZIyBYLkDZLsodRNCkJqYh0",
  authDomain: "ranaojob.firebaseapp.com",
  projectId: "ranaojob",
  storageBucket: "ranaojob.appspot.com",
  messagingSenderId: "636345591279",
  appId: "1:636345591279:web:ae61c5efdfe54a2267421a",
  measurementId: "G-06LYFC8YDZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get employer ID from command line argument or use a default placeholder
const employerId = process.argv[2] || "YOUR_EMPLOYER_ID";

async function createSampleNotifications() {
  console.log(`Creating sample notifications for employer ID: ${employerId}`);
  
  try {
    // Create a sample job application notification
    const applicationNotification = await addDoc(collection(db, "employernotifications"), {
      employerId: employerId,
      title: "New Application Received",
      message: "John Doe has applied for the Senior Developer position",
      type: "application",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer/applications/sample-job-id",
      applicationId: "sample-application-id",
      relatedJob: {
        id: "sample-job-id",
        title: "Senior Developer"
      }
    });
    console.log("Created application notification with ID:", applicationNotification.id);
    
    // Create a sample system notification
    const systemNotification = await addDoc(collection(db, "employernotifications"), {
      employerId: employerId,
      title: "Profile Update Reminder",
      message: "Please complete your company profile to attract more job seekers",
      type: "system",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer/profile"
    });
    console.log("Created system notification with ID:", systemNotification.id);
    
    // Create a sample job posting notification
    const jobNotification = await addDoc(collection(db, "employernotifications"), {
      employerId: employerId,
      title: "Job Posting Approved",
      message: "Your job posting for Marketing Manager has been approved and is now live",
      type: "job",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer/jobs/sample-job-id-2",
      relatedJob: {
        id: "sample-job-id-2",
        title: "Marketing Manager"
      }
    });
    console.log("Created job notification with ID:", jobNotification.id);
    
    console.log("Sample notifications created successfully!");
  } catch (error) {
    console.error("Error creating sample notifications:", error);
  }
}

// Run the function
createSampleNotifications(); 