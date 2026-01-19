"use client";

import { useEffect } from "react";

export default function ThankYouPage() {
  useEffect(() => {
    const eventId = crypto.randomUUID();

    // Browser Pixel
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Lead", {}, { eventID: eventId });
    }

    // Server-side Conversions API
    fetch("/api/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "Lead",
        event_id: eventId,
        source: "thank-you-page",
      }),
    });
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-gray-200 p-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            You’re all set 🎉
          </h1>
          <p className="mt-3 text-gray-600">
            We received your info. Our team will reach out within 1 business day.
          </p>
        </div>
      </div>
    </main>
  );
}
