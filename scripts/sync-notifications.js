// This script syncs existing job applications with employer notifications
// Run with: node scripts/sync-notifications.js

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  getDoc,
  doc
} = require('firebase/firestore');

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

async function syncApplicationNotifications() {
  console.log("Starting notification sync...");
  
  try {
    // Get all applications from the activity_emp collection
    console.log("Fetching application activities...");
    const activityQuery = query(
      collection(db, "activity_emp"),
      where("type", "==", "application")
    );
    const activitySnapshot = await getDocs(activityQuery);
    
    console.log(`Found ${activitySnapshot.size} application activities`);
    
    // Process each application activity
    for (const activityDoc of activitySnapshot.docs) {
      const activity = activityDoc.data();
      
      // Check if we have all the required data
      if (!activity.employerId || !activity.metadata || !activity.metadata.jobId) {
        console.log("Skipping activity with missing data:", activityDoc.id);
        continue;
      }
      
      // Get job details
      let jobTitle = "a job position";
      try {
        const jobDoc = await getDoc(doc(db, "jobs", activity.metadata.jobId));
        if (jobDoc.exists()) {
          jobTitle = jobDoc.data().title || jobTitle;
        }
      } catch (err) {
        console.log(`Could not fetch job details for ${activity.metadata.jobId}`);
      }
      
      // Get applicant details
      let applicantName = "A candidate";
      if (activity.metadata.applicantId) {
        try {
          const userDoc = await getDoc(doc(db, "users", activity.metadata.applicantId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            applicantName = userData.firstName ? 
              `${userData.firstName} ${userData.lastName || ''}`.trim() : 
              userData.email || "A candidate";
          }
        } catch (err) {
          console.log(`Could not fetch applicant details for ${activity.metadata.applicantId}`);
        }
      }
      
      // Create a notification in employernotifications collection
      await addDoc(collection(db, "employernotifications"), {
        employerId: activity.employerId,
        title: "New Application Received",
        message: `${applicantName} has applied for the position: ${jobTitle}`,
        createdAt: activity.createdAt || serverTimestamp(),
        isRead: false,
        type: "application",
        link: `/employer/applications/${activity.metadata.jobId}`,
        applicationId: activity.metadata.applicationId || "",
        relatedJob: {
          id: activity.metadata.jobId,
          title: jobTitle
        }
      });
      
      console.log(`Created notification for application by ${applicantName} to ${jobTitle}`);
    }
    
    console.log("Notification sync completed successfully!");
  } catch (error) {
    console.error("Error syncing notifications:", error);
  }
}

// Run the function
syncApplicationNotifications(); 