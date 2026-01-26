"use client";

import { useEffect, useState } from "react";
import { WEATHER_NOTICE } from "@/lib/site-notices";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function formatDateWithOrdinal(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`); // avoid timezone edge cases
  const day = date.getDate();

  const ordinal =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";

  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return `${formatted.replace(",", "")} ${day}${ordinal}`;
}


export default function WeatherNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!WEATHER_NOTICE.enabled) return;

    const today = todayISO();
    const isForcedToday = WEATHER_NOTICE.forceDates.includes(today);

    // 🚨 FORCE SHOW: ignore dismissal entirely
    if (isForcedToday) {
      setOpen(true);
      return;
    }

    // Normal dismissible behavior
    const key = `weather-notice-dismissed-${WEATHER_NOTICE.effectiveId}`;
    const dismissed = localStorage.getItem(key);

    if (!dismissed) setOpen(true);
  }, []);

  if (!open) return null;

  const dismiss = () => {
    const today = todayISO();
    const isForcedToday = WEATHER_NOTICE.forceDates.includes(today);

    // On forced days, only close for this render
    if (!isForcedToday) {
      const key = `weather-notice-dismissed-${WEATHER_NOTICE.effectiveId}`;
      localStorage.setItem(key, "true");
    }

    setOpen(false);
  };
const today = todayISO();
const displayDate = formatDateWithOrdinal(today);

const renderedMessage = WEATHER_NOTICE.message.replace(
  "{{DATE}}",
  `<strong>${displayDate}</strong>`
);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={dismiss}
      />

      {/* modal */}
      <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-dance-purple to-dance-pink flex items-center justify-center text-white text-3xl">
          ❄️
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {WEATHER_NOTICE.title}
        </h3>
<p
  className="text-gray-700 mb-6 leading-relaxed"
  dangerouslySetInnerHTML={{ __html: renderedMessage }}
/>


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
