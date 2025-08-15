"use client";

import { useEffect } from "react";

export function ErrorSuppressor() {
  useEffect(() => {
    // Store original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    // Override console.error
    console.error = (...args) => {
      // Completely suppress errors
      return;
    };

    // Override console.warn
    console.warn = (...args) => {
      // Completely suppress warnings
      return;
    };

    // Override console.log for specific error messages (optional)
    console.log = (...args) => {
      // Check if this is an error log we want to suppress
      const firstArg = args[0];
      if (typeof firstArg === 'string' && 
          (firstArg.includes('error') || 
           firstArg.includes('Error') || 
           firstArg.includes('warning') || 
           firstArg.includes('Warning'))) {
        return;
      }
      
      // Allow other logs to pass through
      originalConsoleLog(...args);
    };

    // Restore original methods on cleanup
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
    };
  }, []);

  return null;
} 