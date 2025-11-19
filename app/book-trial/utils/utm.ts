"use client";

export type UTMValues = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  page_path: string | null;
};

const STORAGE_KEY = "elite_utms";

/**
 * Read UTMs from URL on first load and store in sessionStorage.
 */
export function captureUTMs() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  const utm_source = params.get("utm_source");
  const utm_medium = params.get("utm_medium");
  const utm_campaign = params.get("utm_campaign");

  // Always track page path
  const page_path = window.location.pathname;

  const utmData: UTMValues = {
    utm_source,
    utm_medium,
    utm_campaign,
    page_path,
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));
}

/**
 * Retrieve the stored UTMs for API submission.
 */
export function getUTMs(): UTMValues {
  if (typeof window === "undefined") {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      page_path: null,
    };
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        page_path: window.location.pathname, // fallback
      };
    }

    return JSON.parse(stored);
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      page_path: window.location.pathname,
    };
  }
}
