import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PresenceTracker } from "@/components/presence-tracker"
import { AuthProvider } from "@/components/auth-provider"
import { ErrorSuppressor } from "@/components/error-suppressor"
import { RouteChangeProvider } from "@/components/route-change-provider"
import { LoadingSpinner } from "@/components/loading-spinner"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ranao Jobs Platform",
  description: "Find jobs in Marawi City and surrounding areas",
  keywords: ["jobs", "employment", "marawi", "ranao", "mindanao"],
  generator: 'v0.dev',
  icons: {
    icon: '/images/logo_icon.png',
    shortcut: '/images/logo-icon.png',
    apple: '/images/logo-icon.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <Script id="suppress-console" strategy="beforeInteractive">
          {`
            // Suppress console errors and warnings
            (function() {
              var originalConsoleError = console.error;
              var originalConsoleWarn = console.warn;
              
              console.error = function() {};
              console.warn = function() {};
              
              window.__restoreConsole = function() {
                console.error = originalConsoleError;
                console.warn = originalConsoleWarn;
              };
            })();
          `}
        </Script>
      </head>
      <body className={`${inter.className} flex min-h-screen flex-col overflow-x-hidden`}>
        <ThemeProvider>
          <AuthProvider>
            <RouteChangeProvider>
              <LoadingSpinner />
              {children}
              <Toaster />
              <PresenceTracker />
              <ErrorSuppressor />
            </RouteChangeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
