"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";

// ================================
// HARD-CODED SEASON + CLOSED DATES
// ================================
const TIMEZONE = "America/Chicago";

// You will update this list whenever the studio is closed.
const CLOSED_DATES = [
  // Format: "YYYY-MM-DD"
  "2025-11-25",
  "2025-11-26",
  "2025-11-27",
  "2025-11-28",
  // add more here
];

const SEASON_START = "2025-11-20";
const SEASON_END = "2026-05-31";

// ======================================
// TYPES
// ======================================

interface RawClass {
  id: string;
  name: string;
  level: string;
  type: string;
  day: string;
  time: string;
  ageMin: number;
  ageMax: number;
  lengthMinutes: number;
}

interface GroupedClass {
  description: string;
  ageRange: string;
  items: RawClass[];
  nextDates: {
    date: string; // ISO
    day: string;
    time: string;
    classId: string;
    lengthMinutes: number;
  }[];
}

interface Props {
  age: number;
  years: number;
  onBack: () => void;
  onNext: (selectedClass: any) => void;
}

// =====================================================
// DATE HELPERS
// =====================================================

function nextOccurrences(dayName: string, count = 2) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const target = days.indexOf(dayName);
  if (target < 0) return [];

  const results: Date[] = [];
  const now = new Date();

  // start from tomorrow to avoid "today if already passed"
  let d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);

  while (results.length < count) {
    if (d.getDay() === target) {
      results.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }

  return results;
}

function applyTime(date: Date, timeStr: string) {
  const cleaned = timeStr.replace(/\s+/g, "").toLowerCase(); // "4:45pm"
  const [time, ampm] = cleaned.split(/(am|pm)/);
  let [h, m] = time.split(":").map(Number);
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;

  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatDateDisplay(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TIMEZONE,
  });
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ClassSelectStep({ age, years, onBack, onNext }: Props) {
  const [grouped, setGrouped] = useState<GroupedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/trial/classes?age=${age}`);
        const data = await res.json();

        if (!res.ok) {
          setError("Unable to load classes.");
          return;
        }

        let list: RawClass[] = data.classes || [];

        // Filter out unwanted categories
        list = list.filter((c) => {
          const lvl = (c.level || "").toUpperCase();
          if (["FLX", "PRE", "DT"].includes(lvl)) return false;
          if (c.ageMin === c.ageMax) return false; // private classes
          if (c.day === "Sun") return false;
          return true;
        });

        const groups: Record<string, RawClass[]> = {};

        // Group by description
        list.forEach((c) => {
          if (!groups[c.name]) groups[c.name] = [];
          groups[c.name].push(c);
        });

        const finalGroups: GroupedClass[] = [];

        for (const desc of Object.keys(groups)) {
          const items = groups[desc];

          // determine age range display (min across all, max across all)
          const minAge = Math.min(...items.map((i) => i.ageMin));
          const maxAge = Math.max(...items.map((i) => i.ageMax));
          const ageRange = `${minAge}-${maxAge}`;

          const nextDates: GroupedClass["nextDates"] = [];

          // get next 2 dates overall
          const byDay: Record<string, RawClass[]> = {};
          items.forEach((c) => {
            if (!byDay[c.day]) byDay[c.day] = [];
            byDay[c.day].push(c);
          });

          const allCandidateDates: {
            date: Date;
            classItem: RawClass;
          }[] = [];

          for (const dayName of Object.keys(byDay)) {
            const occurrences = nextOccurrences(dayName, 4); // overshoot then trim
            occurrences.forEach((occ) => {
              byDay[dayName].forEach((classItem) => {
                const d = new Date(occ);
                // no CLOSED_DATES
                const iso = d.toISOString().slice(0, 10);
                if (!CLOSED_DATES.includes(iso)) {
                  allCandidateDates.push({ date: d, classItem });
                }
              });
            });
          }

          allCandidateDates.sort((a, b) => a.date.getTime() - b.date.getTime());
          const chosen = allCandidateDates.slice(0, 2);

          const nextTwoDates = chosen.map(({ date, classItem }) => {
            const start = applyTime(date, classItem.time.split("-")[0].trim());
            const end = applyTime(date, classItem.time.split("-")[1].trim());

            return {
              date: start.toISOString(),
              day: classItem.day,
              time: classItem.time,
              classId: classItem.id,
              lengthMinutes: classItem.lengthMinutes,
            };
          });

          finalGroups.push({
            description: desc,
            ageRange,
            items,
            nextDates: nextTwoDates,
          });
        }

        setGrouped(finalGroups);
      } catch (err) {
        console.error(err);
        setError("Unable to load classes.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [age]);

  const handleNext = () => {
    if (!selected) {
      setError("Please select a class time.");
      return;
    }

    const parts = selected.split("::");
    const classId = parts[0];
    const dateISO = parts[1];

    let foundGroup: GroupedClass | null = null;
    let foundDate: any = null;

    for (const g of grouped) {
      const match = g.nextDates.find((d) => d.classId === classId && d.date === dateISO);
      if (match) {
        foundGroup = g;
        foundDate = match;
        break;
      }
    }

    if (!foundGroup || !foundDate) {
      setError("Class not found.");
      return;
    }

    onNext({
      id: foundDate.classId,
      name: foundGroup.description,
      day: foundDate.day,
      time: foundDate.time,
      computedDate: foundDate.date,
      lengthMinutes: foundDate.lengthMinutes,
    });
  };

  // ===============================================
  // RENDER
  // ===============================================

  return (
    <StepWrapper>
      <div className="space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-dance-purple text-center">
          Select a Trial Class
        </h1>

        {loading && (
          <div className="text-center py-8 text-gray-500">Loading classes…</div>
        )}

        {!loading && grouped.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No matching classes found.
          </div>
        )}

        {!loading &&
          grouped.map((g) => (
            <div key={g.description} className="border rounded-xl p-4 bg-white shadow-sm">
              {/* Title */}
              <div className="text-center mb-3">
                <div className="font-semibold text-lg">{g.description}</div>
                <div className="text-sm text-gray-600">Ages {g.ageRange}</div>
              </div>

              {/* Date Buttons */}
              <div className="flex justify-center gap-3 mt-3">
                {g.nextDates.map((slot) => {
                  const display = formatDateDisplay(new Date(slot.date));

                  const id = `${slot.classId}::${slot.date}`;
                  const isSelected = selected === id;

                  return (
                    <button
                      key={id}
                      onClick={() => setSelected(id)}
                      className={`
                        border rounded-lg px-4 py-3 text-center min-w-[130px]
                        transition-all
                        ${
                          isSelected
                            ? "bg-dance-purple text-white border-dance-purple scale-[1.05]"
                            : "bg-white border-gray-300 hover:bg-gray-50"
                        }
                      `}
                    >
                      <div className="font-semibold">{display}</div>
                      <div className="text-sm opacity-80">{slot.time}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {error && <ErrorText>{error}</ErrorText>}

        {/* Footer buttons */}
        <div className="flex justify-between pt-6">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext}>Continue</Button>
        </div>
      </div>
    </StepWrapper>
  );
}
