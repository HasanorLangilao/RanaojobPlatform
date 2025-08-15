import { getUserProfile } from "./users";

/**
 * Calculate the profile completion percentage for a jobseeker
 * @param userId The user ID
 * @returns A number between 0-100 representing completion percentage
 */
export async function calculateJobseekerProfileCompletion(userId: string): Promise<number> {
  try {
    const profile = await getUserProfile(userId);
    
    // Define fields that contribute to a complete jobseeker profile
    const requiredFields = [
      { name: 'firstName', weight: 10 },
      { name: 'lastName', weight: 10 },
      { name: 'email', weight: 10 },
      { name: 'phone', weight: 5 },
      { name: 'professionalTitle', weight: 10 },
      { name: 'aboutMe', weight: 10 },
      { name: 'skills', weight: 10 }, // Array field
      { name: 'education', weight: 10 }, // Array field
      { name: 'experience', weight: 10 }, // Array field
      { name: 'profilePhoto', weight: 5 },
      { name: 'resume', weight: 10 },
      { name: 'location', weight: 5 },
      { name: 'socialMedia', weight: 5 }, // Object field
    ];
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    requiredFields.forEach(field => {
      totalWeight += field.weight;
      
      // Check if field exists and has value
      if (profile[field.name]) {
        if (Array.isArray(profile[field.name])) {
          // For array fields, check if they have items
          if (profile[field.name].length > 0) {
            completedWeight += field.weight;
          }
        } else if (typeof profile[field.name] === 'object' && profile[field.name] !== null) {
          // For object fields like socialMedia, check if any property has a value
          const objValues = Object.values(profile[field.name]).filter(val => 
            val !== null && val !== undefined && val !== ''
          );
          
          if (objValues.length > 0) {
            completedWeight += field.weight;
          }
        } else if (profile[field.name].toString().trim() !== '') {
          // For string and other fields
          completedWeight += field.weight;
        }
      }
    });
    
    // Calculate percentage and round to nearest integer
    return Math.round((completedWeight / totalWeight) * 100);
    
  } catch (error) {
    console.error("Error calculating jobseeker profile completion:", error);
    return 0; // Return 0 in case of error
  }
}

/**
 * Calculate the profile completion percentage for an employer
 * @param userId The user ID
 * @returns A number between 0-100 representing completion percentage
 */
export async function calculateEmployerProfileCompletion(userId: string): Promise<number> {
  try {
    const profile = await getUserProfile(userId);
    
    // Define fields that contribute to a complete employer profile
    const requiredFields = [
      { name: 'companyName', weight: 15 },
      { name: 'industry', weight: 10 },
      { name: 'companySize', weight: 5 },
      { name: 'founded', weight: 5 },
      { name: 'description', weight: 15 },
      { name: 'website', weight: 5 },
      { name: 'email', weight: 10 },
      { name: 'phone', weight: 5 },
      { name: 'address', weight: 5 },
      { name: 'city', weight: 5 },
      { name: 'logo', weight: 10 },
      { name: 'coverImage', weight: 5 },
      { name: 'benefits', weight: 5 }, // Array field
    ];
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    requiredFields.forEach(field => {
      totalWeight += field.weight;
      
      // Check if field exists and has value
      if (profile[field.name]) {
        if (Array.isArray(profile[field.name])) {
          // For array fields, check if they have items
          if (profile[field.name].length > 0) {
            completedWeight += field.weight;
          }
        } else if (profile[field.name].toString().trim() !== '') {
          // For string and other fields
          completedWeight += field.weight;
        }
      }
    });
    
    // Calculate percentage and round to nearest integer
    return Math.round((completedWeight / totalWeight) * 100);
    
  } catch (error) {
    console.error("Error calculating employer profile completion:", error);
    return 0; // Return 0 in case of error
  }
} 