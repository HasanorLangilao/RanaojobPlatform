import { NextResponse } from 'next/server';
import { testNotificationSystem } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const jobseekerId = data.jobseekerId;
    
    if (!jobseekerId) {
      return NextResponse.json(
        { success: false, error: "jobseekerId is required" },
        { status: 400 }
      );
    }
    
    console.log(`API: Testing notification system for jobseeker ${jobseekerId}`);
    const result = await testNotificationSystem(jobseekerId);
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
} 