// Script to add coordinates to existing jobs in Firestore
// Run with: node scripts/update-job-coordinates.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxaiAf_pHRfZIyBYLkDZLsodRNCkJqYh0",
  authDomain: "ranaojob.firebaseapp.com",
  projectId: "ranaojob",
  storageBucket: "ranaojob.appspot.com",
  messagingSenderId: "636345591279",
  appId: "1:636345591279:web:ae61c5efdfe54a2267421a",
  measurementId: "G-06LYFC8YDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Philippines-specific geocoding approximations for major cities
const addressMap = {
  'manila': [14.5995, 120.9842],
  'cebu': [10.3157, 123.8854], 
  'davao': [7.1907, 125.4553],
  'quezon': [14.6760, 121.0437],
  'makati': [14.5547, 121.0244],
  'marawi': [8.0, 124.3],
  'iligan': [8.2289, 124.2444],
  'cagayan': [8.4542, 124.6319],
  'zamboanga': [6.9214, 122.0790],
  'baguio': [16.4023, 120.5960],
  'iloilo': [10.7202, 122.5621],
  'bacolod': [10.6713, 122.9511],
  'general santos': [6.1164, 125.1716],
  'cdo': [8.4542, 124.6319], // Alias for Cagayan de Oro
  'tacloban': [11.2543, 125.0041],
  'tagaytay': [14.1153, 120.9621],
  'angeles': [15.1450, 120.5887],
  'legazpi': [13.1391, 123.7438],
  'naga': [13.6192, 123.1946],
  'butuan': [8.9475, 125.5406],
  'cotabato': [7.2047, 124.2310],
  'tarlac': [15.4755, 120.5963],
  'laoag': [18.1981, 120.5937],
  'puerto princesa': [9.7407, 118.7375],
  'roxas': [11.5853, 122.7511],
  'dumaguete': [9.3103, 123.3081],
  'dipolog': [8.5883, 123.3425],
  'malolos': [14.8527, 120.8160],
  'batangas': [13.7565, 121.0583],
  'cabanatuan': [15.4865, 120.9734],
  'dagupan': [16.0430, 120.3324],
  'olongapo': [14.8386, 120.2842],
  'san fernando': [15.0327, 120.6910], // La Union
  'lucena': [13.9311, 121.6170],
  'ormoc': [11.0050, 124.6147],
  'calapan': [13.4110, 121.1870],
  'tagbilaran': [9.6500, 123.8500],
  'surigao': [9.7833, 125.4667],
  'pagadian': [7.8333, 123.4333],
  'koronadal': [6.5000, 124.8500],
  'malaybalay': [8.1575, 125.0875],
  'tuguegarao': [17.6132, 121.7270],
  'ilagan': [17.1333, 121.8833],
  'vigan': [17.5747, 120.3869],
  'masbate': [12.3687, 123.6195],
  'catbalogan': [11.7758, 124.8867],
  'mati': [6.9500, 126.2167],
  'tandag': [9.0667, 126.1950],
  'bayombong': [16.4833, 121.1500],
  'bontoc': [17.0873, 120.9707],
  'tabuk': [17.4106, 121.4442],
  'basco': [20.4500, 121.9667],
  'jolo': [6.0500, 121.0000],
  'shariff aguak': [6.8635, 124.4420],
  'patikul': [6.0667, 121.1000],
  'kalibo': [11.7000, 122.3667],
  'borongan': [11.6072, 125.4336],
  'kabugao': [17.7833, 121.1833],
  'bongao': [5.0292, 119.7731],
  'mamburao': [13.2167, 120.6000],
  'daet': [14.1167, 122.9500],
  'virac': [13.5833, 124.2333],
  'catarman': [12.4500, 124.6500],
  'mambajao': [9.2500, 124.7167],
  'jordan': [10.6667, 122.6000],
  'siquijor': [9.2000, 123.5167],
  'prosperidad': [8.6031, 125.9156],
  'nabunturan': [7.6086, 126.0769],
  'calamba': [14.2167, 121.1667],
  'batac': [18.0500, 120.5667],
  'san jose': [12.3528, 121.0670], // Occidental Mindoro
  'pasig': [14.5750, 121.0833],
  'quezon city': [14.6760, 121.0437],
  'antipolo': [14.5842, 121.1763],
  'pasay': [14.5378, 121.0014],
  'taguig': [14.5176, 121.0509],
  'parañaque': [14.4791, 121.0215],
  'muntinlupa': [14.4083, 121.0413],
  'las piñas': [14.4453, 120.9829],
  'valenzuela': [14.7000, 120.9833],
  'navotas': [14.6667, 120.9417],
  'malabon': [14.6625, 120.9567],
  'mandaluyong': [14.5833, 121.0333],
  'san juan': [14.6000, 121.0333],
  'marikina': [14.6500, 121.1000],
  'pateros': [14.5417, 121.0667],
  'caloocan': [14.6500, 120.9667],
};

// Convert street address to coordinates
const geocodeAddress = async (address) => {
  try {
    const lowerAddress = address.toLowerCase();
    
    // Check for city matches
    for (const [city, coords] of Object.entries(addressMap)) {
      if (lowerAddress.includes(city)) {
        return coords;
      }
    }
    
    // Fallback to central Philippines
    return [12.8797, 121.774];
  } catch (error) {
    console.error(`Error geocoding address: ${address}`, error);
    return null;
  }
};

// Function to update jobs with coordinates
async function updateJobCoordinates() {
  try {
    console.log("Fetching jobs from Firestore...");
    
    const jobsCollection = collection(db, "jobs");
    const jobsSnapshot = await getDocs(jobsCollection);
    
    if (jobsSnapshot.empty) {
      console.log("No jobs found in the database.");
      return;
    }
    
    console.log(`Found ${jobsSnapshot.size} jobs. Processing...`);
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const docSnapshot of jobsSnapshot.docs) {
      const jobData = docSnapshot.data();
      const jobId = docSnapshot.id;
      
      // Skip jobs that already have coordinates
      if (jobData.coordinates && 
          Array.isArray(jobData.coordinates) && 
          jobData.coordinates.length === 2) {
        console.log(`Job ${jobId} already has coordinates. Skipping.`);
        skippedCount++;
        continue;
      }
      
      // Skip jobs without location
      if (!jobData.location) {
        console.log(`Job ${jobId} has no location field. Skipping.`);
        skippedCount++;
        continue;
      }
      
      // Geocode the location
      const coordinates = await geocodeAddress(jobData.location);
      
      if (coordinates) {
        // Update the job document with coordinates
        const jobRef = doc(db, "jobs", jobId);
        await updateDoc(jobRef, { coordinates });
        console.log(`Updated job ${jobId} with coordinates: [${coordinates[0]}, ${coordinates[1]}]`);
        updatedCount++;
      } else {
        console.log(`Could not geocode location for job ${jobId}. Skipping.`);
        skippedCount++;
      }
    }
    
    console.log(`\nUpdate complete!`);
    console.log(`Updated: ${updatedCount} jobs`);
    console.log(`Skipped: ${skippedCount} jobs`);
    
  } catch (error) {
    console.error("Error updating job coordinates:", error);
  }
}

// Execute the function
updateJobCoordinates().then(() => console.log("Script completed.")); 