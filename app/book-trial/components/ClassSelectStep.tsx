"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";

interface ClassOption {
  id: string;
  day: string;
  date: string;
  dateFormatted: string;
  label: string;
  timeRange: string;
  startISO: string;
  endISO: string;
  lengthMinutes: number;
}

interface ClassGroup {
  id: string;          // Akada numeric ID as string
  name: string;        // description
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

// ============================
// DATE FORMATTER
// ============================
function formatCSTDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
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

  const [descriptions, setDescriptions] = useState<
    Record<string, { shortDescription: string }> | null
  >(null);

  const [openDesc, setOpenDesc] = useState<string | null>(null);

  // Load descriptions JSON ONCE
  useEffect(() => {
    async function loadDescriptions() {
      try {
        const res = await fetch("/data/classDescriptions.json", {
          cache: "no-store",
        });
        const json = await res.json();
        setDescriptions(json);
      } catch {
        console.warn("⚠️ Could not load classDescriptions.json");
      }
    }

    loadDescriptions();
  }, []);

  // Load class groups
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/elite/classes?age=${age}`, {
          cache: "no-store",
        });
        const data = await res.json();
        console.log("RAW API RESPONSE:", data);  // <----- ADD THIS

        if (!res.ok) {
          setError("Unable to load available classes.");
          return;
        }

        // 🔥 Correct mapping: Convert Akada → ClassGroup shape
        const mapped: ClassGroup[] = (data.classes || []).map((cls: any) => ({
          id: String(cls.id),          // REAL Akada ID
          name: cls.name,              // description
          ageMin: cls.ageMin,
          ageMax: cls.ageMax,
          options: cls.options.map((o: any) => ({
            ...o,
            dateFormatted: formatCSTDate(o.date),
          })),
        }));

        setGroups(mapped);
      } catch (err) {
        setError("Something went wrong while loading classes.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [age]);

  const handleSelect = (group: ClassGroup, option: ClassOption) => {
    const key = `${group.id}_${option.date}_${option.timeRange}`;
    setSelectedKey(key);

    onNext({
      className: group.name,
      option,
      lengthMinutes: option.lengthMinutes,
    });
  };

  const toggleDescription = (groupId: string) => {
    setOpenDesc((prev) => (prev === groupId ? null : groupId));
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
          groups.map((group) => {
            console.log("GROUP RECEIVED:", group);   // <--- ADD THIS
            const desc = descriptions?.[group.id]?.shortDescription ?? null;

            return (
              <div
                key={group.id}
                className="
                  border-2 border-dance-purple rounded-2xl p-5 bg-white shadow-md
                  space-y-4
                "
              >
                {/* CLASS NAME - CLICK TO EXPAND */}
                <h2
                  className="text-xl font-bold text-dance-blue text-center cursor-pointer hover:text-dance-pink transition"
                  onClick={() => toggleDescription(group.id)}
                >
                  {group.name}
                </h2>

                {/* DESCRIPTION ACCORDION */}
                {desc && (
  <div
    className="text-center cursor-pointer"
    onClick={() => toggleDescription(group.id)}
  >
    {openDesc === group.id ? (
      <p className="text-sm text-gray-700 px-2">
        {desc}
      </p>
    ) : (
      <p className="text-xs text-dance-pink mt-1">
        Click for a description
      </p>
    )}
  </div>
)}

                <p className="text-sm text-center text-gray-600 -mt-2">
                  Ages {group.ageMin}–{group.ageMax}
                </p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.options.slice(0, 2).map((opt) => {
                    const key = `${group.id}_${opt.date}_${opt.timeRange}`;
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
            );
          })}

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex items-center justify-between pt-6">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <div />
        </div>
      </div>
    </StepWrapper>
  );
}
