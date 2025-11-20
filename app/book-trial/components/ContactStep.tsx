"use client";

import { useState } from "react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Checkbox from "./ui/Checkbox";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";

interface ClassOption {
  id: string;
  day: string;
  date: string;
  label: string;
  timeRange: string;
  startISO: string;
  endISO: string;
}

interface Props {
  age: number;
  years: number;
  selectedClass: {
    className: string;
    option: ClassOption;
    lengthMinutes: number;
  };
  onBack: () => void;
  onNext: (data: {
    parentFirstName: string;
    parentLastName: string;
    email: string;
    phone: string;
    dancerFirstName: string;
    smsOptIn: boolean;
  }) => void;
}

export default function ContactStep({
  age,
  years,
  selectedClass,
  onBack,
  onNext,
}: Props) {
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dancerFirstName, setDancerFirstName] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!parentFirstName || !parentLastName || !email || !phone || !dancerFirstName) {
      return setError("Please fill in all fields.");
    }

    if (!smsOptIn) {
      return setError("You must agree to SMS reminders.");
    }

    setError("");

    onNext({
      parentFirstName,
      parentLastName,
      email,
      phone,
      dancerFirstName,
      smsOptIn,
    });
  };

  return (
    <StepWrapper>
      <div className="space-y-6 px-4 py-6">

        <h1 className="text-2xl font-bold text-dance-purple text-center">
          Parent & Dancer Information
        </h1>

        <div className="text-center text-gray-600">
          <p className="font-medium">{selectedClass.className}</p>
          <p className="text-sm">
            {selectedClass.option.day} • {selectedClass.option.label}
          </p>
        </div>

        <div className="grid gap-4 mt-6">
          <Input
            label="Parent First Name"
            value={parentFirstName}
            onChange={(e) => setParentFirstName(e.target.value)}
          />

          <Input
            label="Parent Last Name"
            value={parentLastName}
            onChange={(e) => setParentLastName(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Dancer First Name"
            value={dancerFirstName}
            onChange={(e) => setDancerFirstName(e.target.value)}
          />
        </div>

        <div className="mt-4 px-2 py-3 rounded-lg bg-gray-50 border">
          <p className="text-sm text-gray-700">
            <strong>Dancer Age:</strong> {age}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Years of Experience:</strong> {years}
          </p>
        </div>

        <div className="mt-4">
          <Checkbox
            checked={smsOptIn}
            onCheckedChange={(v) => setSmsOptIn(!!v)}
            label="I agree to receive SMS reminders for this appointment"
          />
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex justify-between pt-6">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext}>Review & Confirm</Button>
        </div>

      </div>
    </StepWrapper>
  );
}
