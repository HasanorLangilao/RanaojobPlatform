// Import Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

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
const auth = getAuth(app);
const db = getFirestore(app);

// Replace with your Firebase email and password
const email = "YOUR_FIREBASE_EMAIL";
const password = "YOUR_FIREBASE_PASSWORD";

async function addTestJob() {
  try {
    // Sign in first
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Signed in successfully");
    
    const jobData = {
      title: "Test Job Position",
      company: "Test Company",
      location: "Manila, Philippines",
      city: "Manila",
      coordinates: [14.5995, 120.9842],
      type: "Full-time",
      category: "Development",
      salary: "₱30,000 - ₱40,000 per month",
      description: "This is a test job description",
      requirements: "This is a test job requirement",
      benefits: "This is a test job benefit",
      applicationDeadline: "2024-06-30",
      contactEmail: "test@example.com",
      contactPhone: "+63 912 345 6789",
      remote: false,
      featured: false,
      urgent: false,
      employerId: "test-employer-id",
      companyName: "Test Company Name",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
     // isActive: true,
      applicationsCount: 0
    };

    // Add to Firestore - this will automatically create the "jobs" collection if it doesn't exist
    console.log("Adding job...");
    const docRef = await addDoc(collection(db, "jobs"), jobData);
    
    console.log("Job added with ID: ", docRef.id);
  } catch (error) {
    console.error("Error adding job: ", error);
  }
}

// Run the function
addTestJob(); 