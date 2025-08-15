import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
        return NextResponse.json({
            success: false,
            message: 'Email parameter is required'
        }, { status: 400 });
    }

    console.log(`Attempting to send test email to ${email}...`);

    try {
        // Make a request to our own email API
        const apiUrl = new URL('/api/send-email', request.url).toString();
        console.log(`Making request to email API: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: email,
                subject: 'Test Notification Email',
                message: 'This is a test email from Ranao Jobs Platform to verify that email notifications are working correctly.',
                link: 'http://localhost:3000/employer-dashboard/notifications'
            })
        });

        console.log(`Email API response status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Email API returned error:', errorData);
            throw new Error(`Email API returned error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log('Email API response:', result);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Test email sent to ${email}`,
                messageId: result.messageId
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Failed to send test email',
                error: result.message
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error sending test email:', error);

        return NextResponse.json({
            success: false,
            message: 'Error sending test email',
            error: String(error)
        }, { status: 500 });
    }
} 