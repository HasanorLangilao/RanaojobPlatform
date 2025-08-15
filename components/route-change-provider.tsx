"use client";

import { useEffect, useRef } from "react";
import { useRouter as useNextRouter } from "next/navigation";

// Create a wrapper for Next.js router to capture navigation events
export function useRouter() {
  const router = useNextRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    // Keep a reference to the original router
    routerRef.current = router;

    // Store the original push method
    const originalPush = router.push;
    
    // Override the push method to dispatch our custom event
    router.push = (href: string, options?: any) => {
      window.dispatchEvent(new Event("routeChangeStart"));
      return originalPush(href, options);
    };

    // Clean up
    return () => {
      router.push = originalPush;
    };
  }, [router]);

  return router;
}

// This component wraps link clicks to dispatch route change events
export function RouteChangeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle link clicks
    const handleLinkClick = (e: MouseEvent) => {
      // Check if it's an anchor tag or its child
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (link && 
          link.href && 
          link.href.startsWith(window.location.origin) && 
          !link.target && 
          !link.hasAttribute("download") &&
          !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
      ) {
        // It's an internal link - dispatch our custom event
        window.dispatchEvent(new Event("routeChangeStart"));
      }
    };

    // Add event listener for link clicks
    document.addEventListener("click", handleLinkClick);

    return () => {
      document.removeEventListener("click", handleLinkClick);
    };
  }, []);

  return <>{children}</>;
} 