// Email configuration
export const emailConfig = {
    // Email settings (replace with actual values or use environment variables in production)
    // Important: For Gmail, you need to:
    // 1. Enable 2-Step Verification for your Google account
    // 2. Generate an App Password: https://myaccount.google.com/apppasswords
    // 3. Use your Gmail address and the generated App Password below
    emailUser: process.env.EMAIL_USER || 'your-gmail@gmail.com',
    emailPass: process.env.EMAIL_PASS || 'your-app-password',
    emailFrom: process.env.EMAIL_FROM || 'Ranao Jobs <noreply@ranaojobs.com>',
    
    // Default recipient for contact form
    contactFormRecipient: process.env.CONTACT_FORM_RECIPIENT || 'langilaohasanor@gmail.com',

    // Website URL for links in emails
    websiteUrl: process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000'
}; 