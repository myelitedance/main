"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";

interface ClassOption {
  id: string;
  day: string;
  date: string;          // YYYY-MM-DD
  dateFormatted: string; // "Dec 1"
  label: string;
  timeRange: string;
  startISO: string;
  endISO: string;
  lengthMinutes: number;
}

interface ClassGroup {
  groupId: string;
  name: string; // description
  ageMin: number;
  ageMax: number;
  options: ClassOption[];
}

interface Props {
  age: number;
  years: number;
  onBack: () => void;
  onNext: (selected: {
    className: string;
    option: ClassOption;
    lengthMinutes: number;
  }) => void;
}

// ================================================
// FIX: DATE DISPLAY USING AMERICA/CHICAGO CORRECTLY
// ================================================
function formatCSTDate(isoDate: string): string {
  // isoDate is "YYYY-MM-DD"
  const [y, m, d] = isoDate.split("-").map(Number);

  // Create a date at midnight *local*, not UTC-shifted.
  // We use Date.UTC only to safely construct the date parts,
  // and then force the formatter to interpret it in CST.
  const dt = new Date(Date.UTC(y, m - 1, d, 12)); 
  // Using noon UTC prevents DST day-shifts.

  return dt.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
  });
}

export default function ClassSelectStep({ age, years, onBack, onNext }: Props) {
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/elite/classes?age=${age}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          setError("Unable to load available classes.");
          return;
        }

        // ================================================
        // FIX APPLIED HERE:
        // Convert the raw YYYY-MM-DD date into a CST display date
        // without affecting backend logic or ISO timestamps.
        // ================================================
        setGroups(
          (data.classes || []).map((group: ClassGroup) => ({
            ...group,
            options: group.options.map((o) => ({
              ...o,
              dateFormatted: formatCSTDate(o.date),
            })),
          }))
        );
      } catch (err) {
        setError("Something went wrong while loading classes.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [age]);

  const handleSelect = (group: ClassGroup, option: ClassOption) => {
    const key = `${group.groupId}_${option.date}_${option.timeRange}`;
    setSelectedKey(key);

    onNext({
      className: group.name,
      option,
      lengthMinutes: option.lengthMinutes,
    });
  };

  return (
    <StepWrapper>
      <div className="space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-dance-purple text-center">
          Select Your Trial Class
        </h1>

        <p className="text-center text-gray-600">
          Choose the best day & time for your trial.
        </p>

        {loading && (
          <div className="text-center py-8 text-gray-500">
            Loading classes…
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No classes available for this age range.
          </div>
        )}

        {!loading &&
          groups.length > 0 &&
          groups.map((group) => (
            <div
              key={group.groupId}
              className="border rounded-xl p-4 bg-white space-y-3"
            >
              {/* CLASS DESCRIPTION */}
              <h2 className="text-xl font-bold text-dance-blue text-center">
                {group.name}
              </h2>

              {/* AGE RANGE */}
              <p className="text-sm text-center text-gray-600 -mt-2">
                Ages {group.ageMin}–{group.ageMax}
              </p>

              {/* DATE BUTTONS */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.options.slice(0, 2).map((opt) => {
                  const key = `${group.groupId}_${opt.date}_${opt.timeRange}`;
                  const isSelected = selectedKey === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelect(group, opt)}
                      className={`
                        border rounded-lg p-3 text-center transition-all
                        ${
                          isSelected
                            ? "bg-dance-purple text-white border-dance-purple scale-[1.02]"
                            : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                        }
                      `}
                    >
                      <div className="text-base font-bold">
                        {opt.dateFormatted}
                      </div>
                      <div className="text-sm opacity-90">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex items-center justify-between pt-6">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <div></div>
        </div>
      </div>
    </StepWrapper>
  );
}
