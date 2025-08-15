"use client";

import NextLink, { LinkProps } from "next/link";
import React from "react";

type CustomLinkProps = LinkProps & 
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

export function Link({ onClick, children, ...rest }: CustomLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call the original onClick if provided
    if (onClick) {
      onClick(e);
    }

    // Don't show loading for external links, new tabs, or downloads
    if (
      rest.target === "_blank" ||
      rest.download ||
      (typeof rest.href === "string" && 
       rest.href.startsWith("http") && 
       !rest.href.startsWith(window.location.origin))
    ) {
      return;
    }

    // If navigation is not prevented, trigger loading indicator
    if (!e.defaultPrevented) {
      window.dispatchEvent(new Event("routeChangeStart"));
    }
  };

  return (
    <NextLink onClick={handleClick} {...rest}>
      {children}
    </NextLink>
  );
} 