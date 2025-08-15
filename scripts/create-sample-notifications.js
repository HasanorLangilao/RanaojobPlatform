const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxaiAf_pHRfZIyBYLkDZLsodRNCkJqYh0",
  authDomain: "ranaojob.firebaseapp.com",
  projectId: "ranaojob",
  storageBucket: "ranaojob.firebasestorage.app",
  messagingSenderId: "636345591279",
  appId: "1:636345591279:web:ae61c5efdfe54a2267421a",
  measurementId: "G-06LYFC8YDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample employer ID - replace with an actual employer ID from your database
const employerId = "REPLACE_WITH_EMPLOYER_ID";

async function createSampleNotifications() {
  try {
    console.log("Creating sample employer notifications...");
    
    // Job verification notifications
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title: "Job Posting Approved",
      message: "Your job posting 'Frontend Developer' has been approved and is now live.",
      type: "job_verification",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer-dashboard/jobs/job123",
      relatedId: "job123",
      relatedData: { status: "approved", jobTitle: "Frontend Developer" }
    });
    
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title: "Job Posting Rejected",
      message: "Your job posting 'Marketing Manager' has been rejected. Please review and resubmit.",
      type: "job_verification",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer-dashboard/jobs/job456",
      relatedId: "job456",
      relatedData: { status: "rejected", jobTitle: "Marketing Manager" }
    });
    
    // New application notifications
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title: "New Job Application",
      message: "John Doe has applied for your job: 'Frontend Developer'",
      type: "new_application",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer-dashboard/applications/app123",
      relatedId: "app123",
      relatedData: {
        jobId: "job123",
        jobTitle: "Frontend Developer",
        applicantId: "user123",
        applicantName: "John Doe"
      }
    });
    
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title: "New Job Application",
      message: "Jane Smith has applied for your job: 'Backend Developer'",
      type: "new_application",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer-dashboard/applications/app456",
      relatedId: "app456",
      relatedData: {
        jobId: "job789",
        jobTitle: "Backend Developer",
        applicantId: "user456",
        applicantName: "Jane Smith"
      }
    });
    
    // Applicant update notifications
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title: "Applicant Updated Profile",
      message: "John Doe has updated their profile information.",
      type: "applicant_update",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer-dashboard/applicants/user123",
      relatedId: "user123",
      relatedData: { applicantName: "John Doe" }
    });
    
    // System alerts
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title: "Account Verification Required",
      message: "Please verify your account to continue posting jobs.",
      type: "system_alert",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer-dashboard/account",
      relatedData: { severity: "high" }
    });
    
    // Announcements
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title: "New Feature: Enhanced Job Analytics",
      message: "We've added new analytics to help you track the performance of your job postings.",
      type: "announcement",
      isRead: false,
      createdAt: serverTimestamp(),
      link: "/employer-dashboard/analytics"
    });
    
    await addDoc(collection(db, "employernotifications"), {
      employerId,
      title: "Planned Maintenance",
      message: "The platform will be undergoing maintenance on June 15, 2023, from 2 AM to 4 AM UTC.",
      type: "announcement",
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    console.log("Sample notifications created successfully!");
  } catch (error) {
    console.error("Error creating sample notifications:", error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  createSampleNotifications().then(() => process.exit(0));
}

module.exports = { createSampleNotifications }; 