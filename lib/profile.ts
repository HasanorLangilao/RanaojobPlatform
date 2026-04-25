import { doc, getDoc,db } from "@/config/firebase"

/**
 * Calculate the profile completion percentage for an employer
 * @param employerId The ID of the employer
 * @returns A number between 0 and 100 representing completion percentage
 */
export async function calculateEmployerProfileCompletion(employerId: string): Promise<number> {
  try {
    const employerRef = doc(db, "users", employerId)
    const employerDoc = await getDoc(employerRef)
    
    if (!employerDoc.exists()) {
      return 0
    }
    
    const employerData = employerDoc.data()
    
    // Define required fields for a complete profile
    const requiredFields = [
      'companyName',
      'companyDescription',
      'industry',
      'companySize',
      'website',
      'logo',
      'location',
      'contactEmail',
      'contactPhone'
    ]
    
    // Count how many required fields are filled
    const filledFields = requiredFields.filter(field => {
      const value = employerData[field]
      return value !== undefined && value !== null && value !== ''
    })
    
    // Calculate percentage
    return Math.round((filledFields.length / requiredFields.length) * 100)
  } catch (error) {
    console.error("Error calculating profile completion:", error)
    return 0
  }
} 