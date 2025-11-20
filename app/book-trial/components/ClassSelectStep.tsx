"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";

interface BackendClassGroup {
  groupId: string;
  name: string;
  ageMin: number;
  ageMax: number;
  options: {
    id: string;
    day: string;
    date: string;
    label: string;
    timeRange: string;
    lengthMinutes: number;
    startISO: string;
    endISO: string;
  }[];
}

interface Props {
  age: number;
  years: number;
  onBack: () => void;
  onNext: (selectedClass: any) => void;
}

export default function ClassSelectStep({ age, years, onBack, onNext }: Props) {
  const [groups, setGroups] = useState<BackendClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/trial/classes?age=${age}`);
        const json = await res.json();

        if (!res.ok) {
          setError("Unable to load classes.");
          return;
        }

        setGroups(json.classes || []);
      } catch (err) {
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

    let foundGroup: BackendClassGroup | null = null;
    let foundOption: any = null;

    for (const g of groups) {
      const match = g.options.find((opt) => opt.startISO === selected);
      if (match) {
        foundGroup = g;
        foundOption = match;
        break;
      }
    }

    if (!foundGroup || !foundOption) {
      setError("Class not found.");
      return;
    }

    onNext({
      id: foundOption.id,
      name: foundGroup.name,
      day: foundOption.day,
      time: foundOption.timeRange,
      computedDate: foundOption.startISO,
      lengthMinutes: foundOption.lengthMinutes,
    });
  };

  return (
    <StepWrapper>
      <div className="space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-dance-purple text-center">
          Select a Trial Class
        </h1>

        {loading && (
          <div className="text-center py-8 text-gray-500">Loading…</div>
        )}

        {!loading && groups.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No classes match this age.
          </div>
        )}

        {!loading &&
          groups.map((g) => (
            <div
              key={g.groupId}
              className="border rounded-xl p-4 bg-white shadow-sm"
            >
              {/* Title */}
              <div className="text-center mb-3">
                <div className="font-semibold text-lg">{g.name}</div>
                <div className="text-sm text-gray-600">
                  Ages {g.ageMin}–{g.ageMax}
                </div>
              </div>

              {/* Buttons for next 2 run dates */}
              <div className="flex justify-center gap-3 mt-3 flex-wrap">
                {g.options.map((opt) => {
                  const isSelected = selected === opt.startISO;

                  return (
                    <button
                      key={opt.startISO}
                      onClick={() => setSelected(opt.startISO)}
                      className={`
                        border rounded-lg px-4 py-3 text-center min-w-[150px]
                        transition-all
                        ${
                          isSelected
                            ? "bg-dance-purple text-white border-dance-purple scale-105"
                            : "bg-white border-gray-300 hover:bg-gray-50"
                        }
                      `}
                    >
                      <div className="font-semibold">{opt.label.split("@")[0]}</div>
                      <div className="text-sm opacity-80">
                        {opt.timeRange}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {error && <ErrorText>{error}</ErrorText>}

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
