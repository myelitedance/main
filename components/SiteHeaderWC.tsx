"use client";
import React from "react";

/** JSX-safe wrapper around the <site-header> web component */
export default function SiteHeaderWC(props: React.HTMLAttributes<HTMLElement>) {
  return React.createElement("site-header", props);
}