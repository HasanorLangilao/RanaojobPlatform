// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"

// AUTH imports
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

// FIRESTORE imports
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot
  
} from "firebase/firestore"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3_Anh97nwoLjcXbukNv0gjTFOVp_ZheQ",
  authDomain: "ranaojobs.firebaseapp.com",
  projectId: "ranaojobs",
  storageBucket: "ranaojobs.firebasestorage.app",
  messagingSenderId: "692102557801",
  appId: "1:692102557801:web:ccfdedf0e9cec5f5ef32f8",
  measurementId: "G-3NC5MS032J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Export Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)

export {
  // AUTH
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,

  // FIRESTORE
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
  //storage
}

export default app
