"use client";

import { useState } from "react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";

interface IntroStepProps {
  onNext: (data: { age: number; years: number }) => void;
}

export default function IntroStep({ onNext }: IntroStepProps) {
  const [age, setAge] = useState("");
  const [years, setYears] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const ageNum = Number(age);
    const yearsNum = Number(years);

    if (!age || !years) {
      return setError("Please fill out all fields.");
    }
    if (isNaN(ageNum) || ageNum < 2 || ageNum > 99) {
      return setError("Please enter a valid age.");
    }
    if (isNaN(yearsNum) || yearsNum < 0 || yearsNum > 20) {
      return setError("Years of dance must be between 0 and 20.");
    }

    setError("");
    onNext({ age: ageNum, years: yearsNum });
  };

  return (
    <StepWrapper>
      <div className="space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-dance-purple text-center">
          Find the Perfect Class!
        </h1>

        <p class-sName="text-center text-gray-600">
          Let’s match your dancer with the best class based on age and experience.
        </p>

        <div className="space-y-4 mt-6">
          <Input
            label="Dancer Age"
            type="number"
            value={age}
            placeholder="e.g. 8"
            onChange={(e) => setAge(e.target.value)}
          />

          <Input
            label="Years of Dance Experience"
            type="number"
            value={years}
            placeholder="e.g. 0, 1, 2..."
            onChange={(e) => setYears(e.target.value)}
          />
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="pt-6">
          <Button onClick={handleSubmit} className="w-full">
            Find Dance Classes
          </Button>
        </div>
      </div>
    </StepWrapper>
  );
}
