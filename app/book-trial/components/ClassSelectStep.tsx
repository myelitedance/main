"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";

interface ClassItem {
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

interface Props {
  age: number;
  years: number;
  onBack: () => void;
  onNext: (selectedClass: ClassItem) => void;
}

export default function ClassSelectStep({ age, years, onBack, onNext }: Props) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
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
          setError("Unable to load classes. Please try again.");
          return;
        }

        setClasses(data.classes || []);
      } catch (err) {
        setError("Something went wrong loading classes.");
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

    const found = classes.find((c) => c.id === selected);
    if (!found) {
      setError("Class not found.");
      return;
    }

    onNext(found);
  };

  return (
    <StepWrapper>
      <div className="space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-dance-purple text-center">
          Select a Day & Time
        </h1>

        <p className="text-center text-gray-600">
          Choose a class time that works best for your trial.
        </p>

        {loading && (
          <div className="text-center py-8 text-gray-500">
            Loading available classes…
          </div>
        )}

        {!loading && classes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No classes match this age range.
          </div>
        )}

        {!loading && classes.length > 0 && (
          <div className="grid gap-4 mt-4">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`
                  border rounded-xl p-4 text-left 
                  transition-all 
                  ${
                    selected === c.id
                      ? "bg-dance-purple text-white border-dance-purple scale-[1.02]"
                      : "bg-white border-gray-300"
                  }
                `}
              >
                <div className="text-lg font-semibold">{c.day}</div>
                <div className="text-sm">{c.time}</div>
                <div className="text-xs opacity-70 mt-1">{c.name}</div>
              </button>
            ))}
          </div>
        )}

        {error && <ErrorText>{error}</ErrorText>}

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
