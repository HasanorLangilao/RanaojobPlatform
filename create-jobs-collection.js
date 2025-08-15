// Import Firebase
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

async function createJobsCollection() {
  try {
    // Create a minimal job document
    const jobData = {
      title: "Initial Job",
      description: "This document was created to initialize the jobs collection",
      createdAt: serverTimestamp()
    };

    // Add to Firestore - this will automatically create the "jobs" collection if it doesn't exist
    console.log("Creating jobs collection...");
    const docRef = await addDoc(collection(db, "jobs"), jobData);
    
    console.log("Jobs collection created successfully!");
    console.log("Initial document added with ID: ", docRef.id);
  } catch (error) {
    console.error("Error creating collection:", error);
  }
}

// Run the function
createJobsCollection(); 