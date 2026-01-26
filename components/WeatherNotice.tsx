"use client";

import { useEffect, useState } from "react";
import { WEATHER_NOTICE } from "@/lib/site-notices";

export default function WeatherNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!WEATHER_NOTICE.enabled) return;

    const key = `weather-notice-dismissed-${WEATHER_NOTICE.effectiveDate}`;
    const dismissed = localStorage.getItem(key);

    if (!dismissed) setOpen(true);
  }, []);

  if (!open) return null;

  const dismiss = () => {
    const key = `weather-notice-dismissed-${WEATHER_NOTICE.effectiveDate}`;
    localStorage.setItem(key, "true");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* modal */}
      <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl p-8 text-center animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-dance-purple to-dance-pink flex items-center justify-center text-white text-3xl">
          ❄️
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {WEATHER_NOTICE.title}
        </h3>

        <p className="text-gray-700 mb-6 leading-relaxed">
          {WEATHER_NOTICE.message}
        </p>

        <button
          onClick={dismiss}
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-dance-purple to-dance-pink hover:shadow-lg transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
