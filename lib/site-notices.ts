export const WEATHER_NOTICE = {
  enabled: true,

  // Dates where dismissal is ignored (ISO format)
  forceDates: [
    "2026-01-26",
    "2026-01-27",
    "2026-01-28",
    "2026-01-29",
  ],

  title: "Studio Closed Due to Inclement Weather",
  message:
    "Due to inclement weather, Elite Dance & Music is closed today, {{DATE}}. for the safety of our dancers, families and instructors. Classes will resume once conditions improve.  We will assess the safety each day and update by 1pm.  Please stay safe and warm.",

  // Used only for non-forced days
  effectiveId: "winter-2026-storm-1",
};
