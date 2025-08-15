import { NextApiRequest, NextApiResponse } from 'next'
import { getJobseekerProfile, getAllJobs } from '@/lib/db'
import { matchJobsWithGemini } from '@/lib/gemini'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'Missing userId' })
  const profile = await getJobseekerProfile(userId as string)
  const jobs = await getAllJobs()
  const suggestedJobs = await matchJobsWithGemini(profile, jobs)
  res.status(200).json({ suggestedJobs })
} 