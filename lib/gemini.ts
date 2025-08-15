interface UserProfile {
  skills?: string[];
  experience?: any;
}

interface Job {
  id: string;
  title: string;
  category: string;
  requirements: string | string[];
}

export async function matchJobsWithGemini(profile: UserProfile, jobs: Job[]) {
  const apiKey = "AIzaSyCg-zY44mGIoopifXm60-7owpzuOLjX53Q"
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey

  const prompt = `Given the following jobseeker profile:\nSkills: ${profile.skills?.join(", ") || "None"}\nExperience: ${profile.experience || "None"}\n\nAnd the following jobs:\n${jobs.map(j => `Title: ${j.title}, Category: ${j.category}, Skill Requirements: ${j.requirements}`).join('\n')}\n\nReturn a JSON array of job IDs that best match the jobseeker's skills and experience. Only include jobs where there is at least one skill match between the jobseeker's skills and the job's skill requirements.`

  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  const data = await response.json()
  // Try to extract the JSON array from the response
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
  try {
    const jobIds = JSON.parse(text)
    return jobs.filter(j => jobIds.includes(j.id))
  } catch {
    return []
  }
} 