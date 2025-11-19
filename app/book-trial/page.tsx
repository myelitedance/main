"use client";

import { useEffect, useState } from "react";
import IntroStep from "./components/IntroStep";
import ClassSelectStep from "./components/ClassSelectStep";
import ContactStep from "./components/ContactStep";
import ConfirmStep from "./components/ConfirmStep";
import { captureUTMs, getUTMs, UTMValues } from "./utils/utm";

export default function BookTrialPage() {
  const [step, setStep] = useState(1);

  // Step 1 data
  const [age, setAge] = useState<number | null>(null);
  const [years, setYears] = useState<number | null>(null);

  // Step 2 data
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Step 3 data
  const [contactData, setContactData] = useState<any>(null);

  // UTM tracking
  const [utms, setUTMs] = useState<UTMValues | null>(null);

  // Load UTMs once on mount
  useEffect(() => {
    captureUTMs();
    const data = getUTMs();
    setUTMs(data);
  }, []);

  const handleIntroNext = (data: { age: number; years: number }) => {
    setAge(data.age);
    setYears(data.years);
    setStep(2);
  };

  const handleClassNext = (c: any) => {
    setSelectedClass(c);
    setStep(3);
  };

  const handleContactNext = (data: any) => {
    setContactData(data);
    setStep(4);
  };

  const handleComplete = () => {
    setStep(5);
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen py-10">
      {step === 1 && <IntroStep onNext={handleIntroNext} />}

      {step === 2 && age !== null && years !== null && (
        <ClassSelectStep
          age={age}
          years={years}
          onBack={() => setStep(1)}
          onNext={handleClassNext}
        />
      )}

      {step === 3 && age !== null && years !== null && selectedClass && (
        <ContactStep
          age={age}
          years={years}
          selectedClass={selectedClass}
          onBack={() => setStep(2)}
          onNext={handleContactNext}
        />
      )}

      {step === 4 && age !== null && years !== null && selectedClass && contactData && utms && (
        <ConfirmStep
          age={age}
          years={years}
          selectedClass={selectedClass}
          contactData={contactData}
          utms={utms}
          onBack={() => setStep(3)}
          onComplete={handleComplete}
        />
      )}

      {step === 5 && (
        <div className="text-center space-y-6 animate-fade-slide px-4">
          <h1 className="text-3xl font-bold text-dance-purple">
            You're All Set! 🎉
          </h1>
          <p className="text-gray-700 text-lg">
            Your dancer's trial class has been booked.
          </p>
          <p className="text-sm text-gray-500">
            You will receive a confirmation message and reminders before class.
          </p>
        </div>
      )}
    </div>
  );
}
