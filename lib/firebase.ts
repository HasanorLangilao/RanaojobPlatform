// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase, ref, set, onDisconnect, serverTimestamp } from "firebase/database";

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
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);

// Initialize Analytics conditionally (only in browser environment)
const analytics = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

// Function to track user online status
export const trackUserPresence = (userId: string) => {
  if (!userId) return;
  
  const userStatusRef = ref(rtdb, `status/${userId}`);
  
  // When the user is online, update their status
  set(userStatusRef, true);
  
  // When the user disconnects, update the database
  onDisconnect(userStatusRef).set(false);
  
  // Also store the last online timestamp
  const userLastOnlineRef = ref(rtdb, `lastOnline/${userId}`);
  onDisconnect(userLastOnlineRef).set(serverTimestamp());
};

// Setup auth state listener to track user presence
export const setupPresenceTracking = () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      trackUserPresence(user.uid);
    }
  });
};

export { app, auth, db, storage, analytics, rtdb }; 