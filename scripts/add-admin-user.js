const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Your web app's Firebase configuration
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

// Admin user details
const adminEmail = "admin@ranao.com";
const adminPassword = "admin123";

async function createAdminUser() {
  try {
    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;
    
    console.log('Admin user created successfully with UID:', user.uid);
    
    // Add admin user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: adminEmail,
      firstName: "Admin",
      lastName: "User",
      role: "admin", // Set role as admin
      createdAt: new Date().toISOString()
    });
    
    console.log('Admin user added to Firestore successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(); 