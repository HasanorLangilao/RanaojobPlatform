<<<<<<< HEAD
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Your Firebase configuration
=======
// Script to add test job data to Firestore
// Run with: node scripts/add-test-jobs.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, Timestamp } = require("firebase/firestore");

// Firebase configuration
>>>>>>> af4e0320e61042feb46ef4f09888f57fd3d12335
const firebaseConfig = {
  apiKey: "AIzaSyDxaiAf_pHRfZIyBYLkDZLsodRNCkJqYh0",
  authDomain: "ranaojob.firebaseapp.com",
  projectId: "ranaojob",
<<<<<<< HEAD
  storageBucket: "ranaojob.firebasestorage.app",
=======
  storageBucket: "ranaojob.appspot.com",
>>>>>>> af4e0320e61042feb46ef4f09888f57fd3d12335
  messagingSenderId: "636345591279",
  appId: "1:636345591279:web:ae61c5efdfe54a2267421a",
  measurementId: "G-06LYFC8YDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
<<<<<<< HEAD
const auth = getAuth(app);
const db = getFirestore(app);

// Admin credentials
const adminEmail = "admin@ranoac.om";
const adminPassword = "admin123";

const testJobs = [
  {
    title: "Senior Software Engineer",
    company: "Tech Solutions Inc.",
    location: "Manila, Philippines",
    city: "Manila",
    coordinates: [14.5995, 120.9842],
    type: "Full-time",
    category: "Development",
    salary: "₱80,000 - ₱120,000 per month",
    description: "We are looking for an experienced Software Engineer to join our team.",
    requirements: "5+ years of experience in software development",
    benefits: "Health insurance, flexible hours, remote work options",
    applicationDeadline: "2024-06-30",
    contactEmail: "careers@techsolutions.com",
    contactPhone: "+63 912 345 6789",
    remote: true,
    featured: true,
    urgent: true,
    employerId: "test-employer-1",
    companyName: "Tech Solutions Inc.",
    isActive: true,
    verificationStatus: "approved",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    applicationsCount: 0
  },
  {
    title: "UX/UI Designer",
    company: "Creative Designs Co.",
    location: "Cebu City, Philippines",
    city: "Cebu",
    coordinates: [10.3157, 123.8854],
    type: "Full-time",
    category: "Design",
    salary: "₱50,000 - ₱70,000 per month",
    description: "Join our creative team as a UX/UI Designer.",
    requirements: "3+ years of experience in UX/UI design",
    benefits: "Creative environment, learning opportunities",
    applicationDeadline: "2024-07-15",
    contactEmail: "jobs@creativedesigns.com",
    contactPhone: "+63 912 345 6789",
    remote: false,
    featured: true,
    urgent: false,
    employerId: "test-employer-2",
    companyName: "Creative Designs Co.",
    isActive: true,
    verificationStatus: "approved",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    applicationsCount: 0
  },
  {
    title: "Digital Marketing Specialist",
    company: "Growth Marketing Agency",
    location: "Quezon City, Philippines",
    city: "Quezon City",
    coordinates: [14.6760, 121.0437],
    type: "Full-time",
    category: "Marketing",
    salary: "₱40,000 - ₱60,000 per month",
    description: "Looking for a Digital Marketing Specialist to drive our online presence.",
    requirements: "2+ years of digital marketing experience",
    benefits: "Performance bonuses, professional development",
    applicationDeadline: "2024-07-30",
    contactEmail: "careers@growthmarketing.com",
    contactPhone: "+63 912 345 6789",
    remote: true,
    featured: false,
    urgent: true,
    employerId: "test-employer-3",
    companyName: "Growth Marketing Agency",
    isActive: true,
    verificationStatus: "approved",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    applicationsCount: 0
  }
];

async function addTestJobs() {
  try {
    // Sign in first
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log("Signed in successfully");
    
    console.log("Adding test jobs...");
    
    for (const job of testJobs) {
      const docRef = await addDoc(collection(db, "jobs"), job);
      console.log(`Added job "${job.title}" with ID: ${docRef.id}`);
=======
const db = getFirestore(app);

// Sample test jobs
const testJobs = [
  {
    title: "Frontend Developer",
    company: "TechCorp",
    companyId: "techcorp123",
    location: "Marawi City",
    type: "Full-time",
    category: "Technology",
    salary: "₱25,000 - ₱35,000",
    postedAt: Timestamp.now(),
    deadline: "2023-12-31",
    tags: ["React", "JavaScript", "UI/UX"]
  },
  {
    title: "Marketing Specialist",
    company: "Global Marketing",
    companyId: "globalmarketing456",
    location: "Remote",
    type: "Part-time",
    category: "Marketing",
    salary: "₱20,000 - ₱30,000",
    postedAt: Timestamp.now(),
    deadline: "2023-12-20",
    tags: ["Digital Marketing", "Social Media", "SEO"]
  },
  {
    title: "Project Manager",
    company: "BuildWell Construction",
    companyId: "buildwell789",
    location: "Marawi City",
    type: "Contract",
    category: "Construction",
    salary: "₱40,000 - ₱60,000",
    postedAt: Timestamp.now(),
    deadline: "2023-12-15",
    tags: ["Construction", "Management", "Planning"]
  }
];

// Function to add test jobs to Firestore
async function addTestJobs() {
  try {
    console.log("Adding test jobs to Firestore...");
    
    for (const job of testJobs) {
      const docRef = await addDoc(collection(db, "jobs"), job);
      console.log(`Job added with ID: ${docRef.id}`);
>>>>>>> af4e0320e61042feb46ef4f09888f57fd3d12335
    }
    
    console.log("All test jobs added successfully!");
  } catch (error) {
<<<<<<< HEAD
    console.error("Error:", error);
  }
}

// Run the function
=======
    console.error("Error adding test jobs:", error);
  }
}

// Execute the function
>>>>>>> af4e0320e61042feb46ef4f09888f57fd3d12335
addTestJobs(); 