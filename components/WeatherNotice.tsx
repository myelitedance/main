"use client";

import { useEffect, useState } from "react";
import { WEATHER_NOTICE } from "@/lib/site-notices";

function todayISO_CST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateWithOrdinal(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);

  const ordinal =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";

  const monthName = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][month - 1];

  return `${monthName} ${day}${ordinal}, ${year}`;
}

export default function WeatherNotice() {
  const [open, setOpen] = useState(false);
  const today = todayISO_CST();

  const isForcedToday = WEATHER_NOTICE.forceDates.includes(today);

  useEffect(() => {
    if (!WEATHER_NOTICE.enabled) return;

    // 🚨 Forced days ALWAYS show
    if (isForcedToday) {
      setOpen(true);
      return;
    }

    const key = `weather-notice-dismissed-${WEATHER_NOTICE.effectiveId}`;
    const dismissed = localStorage.getItem(key);

    if (!dismissed) {
      setOpen(true);
    }
  }, [today, isForcedToday]);

  if (!open) return null;

  const dismiss = () => {
    // Forced days: close only for this render
    if (!isForcedToday) {
      const key = `weather-notice-dismissed-${WEATHER_NOTICE.effectiveId}`;
      localStorage.setItem(key, "true");
    }

    setOpen(false);
  };

  // ✅ Display the forced date (not UTC today)
  const displayDate = formatDateWithOrdinal(
    isForcedToday ? today : today
  );

  const renderedMessage = WEATHER_NOTICE.message.replace(
    "{{DATE}}",
    `<strong>${displayDate}</strong>`
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" />

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
