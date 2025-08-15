# RANAO Jobs Platform

A comprehensive job board platform designed for the RANAO region, connecting job seekers with employers through a modern, user-friendly interface.

## Features

- **Multi-role Authentication**: Users can register as job seekers, employers, or both
- **Job Posting and Management**: Employers can create, edit, and manage job listings
- **Admin Verification**: Admin approval system for job postings and employer accounts
- **Advanced Search**: Search jobs with filters for location, category, and job type
- **Applications Tracking**: Track job applications and statuses
- **Admin Dashboard**: Comprehensive admin tools for platform management
- **Activity Notifications**: Real-time activity tracking and notifications
- **Global Search Command Palette**: Quick search across all platform content

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Firebase account

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ranao-jobs-platform.git
   cd ranao-jobs-platform
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # Email Configuration (for contact form and notifications)
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-digit-app-password
   EMAIL_FROM=Ranao Jobs <your-gmail@gmail.com>
   NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
   
   # Contact Form Recipient
   CONTACT_FORM_RECIPIENT=langilaohasanor@gmail.com
   ```
   
   **Note for Gmail Configuration:**
   - You need to enable 2-Step Verification for your Google account
   - Generate an App Password at: https://myaccount.google.com/apppasswords
   - Use your Gmail address as EMAIL_USER and the generated App Password as EMAIL_PASS

4. Run the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                  # Next.js app router pages and API routes
│   ├── admin/            # Admin dashboard pages
│   ├── employer/         # Employer dashboard pages
│   ├── jobseeker/        # Job seeker dashboard pages
│   └── api/              # API routes
├── components/           # React components
├── lib/                  # Utility functions and shared logic
├── public/               # Static assets
├── styles/               # Global styles
└── types/                # TypeScript type definitions
```

## Firebase Setup

1. Create a new Firebase project
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Set up Firestore rules for security
5. Add Firebase config to environment variables

## Admin Features

- User management
- Job posting approval system
- Employer verification process
- Activity tracking and logs
- Multi-role request approval

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 