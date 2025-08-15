"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// Configure NProgress
NProgress.configure({
  minimum: 0.3,
  easing: "ease",
  speed: 500,
  showSpinner: false,
});

export function LoadingSpinner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Create custom events for route change
    const routeChangeStartEvent = new Event("routeChangeStart");
    const routeChangeCompleteEvent = new Event("routeChangeComplete");

    // Add event listeners
    const handleStart = () => {
      NProgress.start();
    };

    const handleComplete = () => {
      NProgress.done();
    };

    // Listen for our custom events
    window.addEventListener("routeChangeStart", handleStart);
    window.addEventListener("routeChangeComplete", handleComplete);

    return () => {
      // Clean up event listeners
      window.removeEventListener("routeChangeStart", handleStart);
      window.removeEventListener("routeChangeComplete", handleComplete);
      // Make sure to complete NProgress when component unmounts
      NProgress.done();
    };
  }, []);

  // This effect watches for pathname/searchParams changes
  // and triggers the complete event when they change
  useEffect(() => {
    window.dispatchEvent(new Event("routeChangeComplete"));
  }, [pathname, searchParams]);

  return null;
} 