import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initAdmin() {
  const apps = getApps();
  
  if (!apps.length) {
    // Use environment variables for credentials in production
    // In development, you can use a service account file
    try {
      // For production, use environment variables
      if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        
        initializeApp({
          credential: cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      } 
      // For development using a service account file
      else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        
        initializeApp({
          credential: cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }
      else {
        console.warn('Missing Firebase admin credentials');
      }
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
    }
  }
  
  return getFirestore();
}

// Get Firestore instance
export const adminDb = initAdmin();

// Collection references with types
export const collections = {
  jobs: adminDb.collection('jobs'),
  users: adminDb.collection('users'),
  applications: adminDb.collection('applications'),
  notifications: adminDb.collection('notifications')
};

// Helper function to get a user's applied jobs subcollection
export const getUserAppliedJobs = (userId: string) => {
  return collections.users.doc(userId).collection('appliedJobs');
};

// Helper function to create application with transaction
export const createApplication = async (applicationData: any) => {
  const { jobseekerId, jobId, ...appData } = applicationData;
  
  // Create a transaction to ensure all operations complete or none do
  return adminDb.runTransaction(async (transaction) => {
    // 1. Create the application document
    const appRef = collections.applications.doc();
    transaction.set(appRef, { 
      ...appData, 
      jobId, 
      jobseekerId,
      applicationId: appRef.id, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    });
    
    // 2. Add to user's applied jobs subcollection
    const appliedJobRef = getUserAppliedJobs(jobseekerId).doc(appRef.id);
    transaction.set(appliedJobRef, {
      jobId,
      applicationId: appRef.id,
      appliedAt: new Date(),
      status: 'pending'
    });
    
    return appRef.id;
  });
};

// Helper function to update application status
export const updateApplicationStatus = async (applicationId: string, status: string) => {
  const appRef = collections.applications.doc(applicationId);
  
  return adminDb.runTransaction(async (transaction) => {
    const appDoc = await transaction.get(appRef);
    
    if (!appDoc.exists) {
      throw new Error('Application not found');
    }
    
    const appData = appDoc.data();
    const jobseekerId = appData?.jobseekerId;
    
    // Update the main application
    transaction.update(appRef, { 
      status, 
      updatedAt: new Date() 
    });
    
    // Update in the user's applied jobs collection
    if (jobseekerId) {
      const appliedJobRef = getUserAppliedJobs(jobseekerId).doc(applicationId);
      transaction.update(appliedJobRef, { status });
    }
  });
}; 