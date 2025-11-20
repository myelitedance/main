"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";

interface ClassOption {
  id: string;
  day: string;
  date: string;          // YYYY-MM-DD
  label: string;         // "Mon • Dec 1 @ 4:45pm - 5:45pm"
  timeRange: string;
  lengthMinutes: number;
  startISO: string;
  endISO: string;
}

interface ClassGroup {
  groupId: string;
  name: string;
  ageMin: number;
  ageMax: number;
  options: ClassOption[];
}

interface Props {
  age: number;
  years: number;
  onBack: () => void;
  onNext: (selectedOption: any) => void;
}

export default function ClassSelectStep({ age, years, onBack, onNext }: Props) {
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/trial/classes?age=${age}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok) {
          setError("Unable to load classes.");
          return;
        }

        setGroups(json.classes || []);
      } catch (err) {
        setError("Something went wrong loading classes.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [age]);

  const handleNext = () => {
    if (!selectedOption) {
      setError("Please select one of the available class times.");
      return;
    }

    // Locate the selected option in the grouped data
    for (const g of groups) {
      const found = g.options.find((o) => o.startISO === selectedOption);
      if (found) {
        const payload = {
          ...found,
          groupId: g.groupId,
          className: g.name,
          ageMin: g.ageMin,
          ageMax: g.ageMax,
        };

        onNext(payload);
        return;
      }
    }

    setError("Selected class time not found.");
  };

  return (
    <StepWrapper>
      <div className="space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-dance-purple text-center">
          Select Your Trial Class Time
        </h1>

        <p className="text-center text-gray-600">
          Choose the date & time that works best for your trial.
        </p>

        {loading && (
          <div className="text-center py-8 text-gray-500">
            Loading classes…
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No classes are available for this age range.
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="space-y-8 mt-4">
            {groups.map((group) => (
              <div key={group.groupId} className="border rounded-xl p-4 bg-white shadow-sm">
                {/* TITLE */}
                <h2 className="text-lg font-semibold text-dance-blue text-center pb-2">
                  {group.name}
                </h2>

                {/* OPTIONS (side-by-side per pair) */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {group.options.map((opt) => {
                    const isSelected = selectedOption === opt.startISO;

                    return (
                      <button
                        key={opt.startISO}
                        onClick={() => {
                          setSelectedOption(opt.startISO);
                          setError("");
                        }}
                        className={`
                          border rounded-lg p-3 text-center text-sm whitespace-normal
                          transition-all
                          ${
                            isSelected
                              ? "bg-dance-purple text-white border-dance-purple scale-[1.03]"
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          }
                        `}
                      >
                        <div className="font-semibold text-base">
                          {new Date(opt.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs opacity-80">{opt.day}</div>
                        <div className="text-xs mt-1">{opt.timeRange}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        {/* FOOTER BUTTONS */}
        <div className="flex items-center justify-between pt-6">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext}>Continue</Button>
        </div>
      </div>
    </StepWrapper>
  );
}
