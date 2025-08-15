import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { emailConfig } from '../../../lib/config';

// Check if we're in development mode and email credentials are not properly set
const isDevelopmentMode = process.env.NODE_ENV === 'development' && 
  (emailConfig.emailUser === 'your-gmail@gmail.com' || 
   emailConfig.emailPass === 'your-app-password');

// Setup nodemailer transport in the server context
const transporter = isDevelopmentMode 
  ? // Use ethereal email for development (no actual emails sent)
    nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass',
      },
    })
  : // Use configured email service for production
    nodemailer.createTransport({
  service: 'gmail', // Or your preferred email service
  auth: {
    user: emailConfig.emailUser,
    pass: emailConfig.emailPass,
  },
});

/**
 * Generate an HTML email template for notifications
 */
function generateEmailTemplate(title: string, message: string, link?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #f8cb45;
          padding: 20px;
          text-align: center;
        }
        .content {
          background-color: #ffffff;
          padding: 20px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .button {
          display: inline-block;
          background-color: #f8cb45;
          color: #333;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          margin-top: 20px;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>RANAO JOBS</h1>
        </div>
        <div class="content">
          <h2>${title}</h2>
          <p>${message}</p>
          ${link ? `<a href="${link}" class="button">View Details</a>` : ''}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Ranao Jobs. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { to, subject, message, link, from } = body;

    // Use the configured recipient if no recipient is specified
    const emailTo = to || emailConfig.contactFormRecipient;

    if (!emailTo || !subject || !message) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Generate HTML content
    const htmlContent = generateEmailTemplate(subject, message, link);

    // Use employer's email as 'from' if provided, otherwise use default
    const emailFrom = from || emailConfig.emailFrom;

    if (isDevelopmentMode) {
      console.log('Development mode: Email would be sent with these details:');
      console.log('From:', emailFrom);
      console.log('To:', emailTo);
      console.log('Subject:', subject);
      console.log('Message:', message);
      
      // Simulate successful email sending in development
      return NextResponse.json({
        success: true,
        message: 'Email simulated successfully in development mode',
        messageId: 'dev-' + Date.now()
      });
    }

    // Send the email
    const info = await transporter.sendMail({
      from: emailFrom,
      to: emailTo,
      subject,
      html: htmlContent,
    });

    console.log('Email sent successfully:', info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to send email',
      error: String(error)
    }, { status: 500 });
  }
} 