"use client";

import { useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";
import { sendContact, sendOpportunity, sendAppointment } from "../utils/api";

interface ConfirmStepProps {
  age: number;
  years: number;
  selectedClass: {
    id: string;
    name: string;
    day: string;
    time: string;
    lengthMinutes: number;
  };
  contactData: {
    parentFirstName: string;
    parentLastName: string;
    email: string;
    phone: string;
    dancerFirstName: string;
    smsOptIn: boolean;
  };
  utms: Record<string, string | null>;
  onBack: () => void;
  onComplete: () => void;
}

export default function ConfirmStep({
  age,
  years,
  selectedClass,
  contactData,
  utms,
  onBack,
  onComplete
}: ConfirmStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError("");

      // 1️⃣ Create / Update Contact
      const contactRes = await sendContact({
        ...contactData,
        utms
      });

      if (!contactRes?.contactId) {
        setError("Unable to save contact information.");
        setLoading(false);
        return;
      }

      const contactId = contactRes.contactId;

      // 2️⃣ Create Opportunity
      const oppRes = await sendOpportunity({
  contactId,
  parentFirstName: contactData.parentFirstName,
  parentLastName: contactData.parentLastName,
  dancerFirstName: contactData.dancerFirstName,
  dancerAge: age,
  selectedClass,
});

      if (!oppRes?.opportunityId) {
        setError("Unable to create opportunity.");
        setLoading(false);
        return;
      }

      const opportunityId = oppRes.opportunityId;

      // 3️⃣ Schedule Appointment
      const apptRes = await sendAppointment({
        classId: selectedClass.id,
        className: selectedClass.name,
        lengthMinutes: selectedClass.lengthMinutes,
        dancerFirstName: contactData.dancerFirstName,
        day: selectedClass.day,
        time: selectedClass.time,
        contactId,
        opportunityId
      });

      if (!apptRes?.appointmentId) {
        setError("Unable to schedule appointment.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onComplete();

    } catch (err: any) {
      setError("Something went wrong completing your booking.");
      setLoading(false);
    }
  };

  return (
    <StepWrapper>
      <div className="space-y-6 px-4 py-6">

        <h1 className="text-2xl font-bold text-dance-purple text-center">
          Review & Confirm
        </h1>

        <p className="text-center text-gray-600">
          Make sure everything looks correct before we finalize your trial class.
        </p>

        <div className="bg-gray-50 border rounded-lg p-4 space-y-4">

          <div>
            <h2 className="font-semibold text-dance-blue">Class</h2>
            <p>{selectedClass.name}</p>
            <p className="text-sm text-gray-600">
              {selectedClass.day} • {selectedClass.time}
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-dance-blue">Dancer</h2>
            <p>{contactData.dancerFirstName}</p>
            <p className="text-sm text-gray-600">
              Age: {age} • Experience: {years} years
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-dance-blue">Parent</h2>
            <p>
              {contactData.parentFirstName} {contactData.parentLastName}
            </p>
            <p className="text-sm text-gray-600">{contactData.email}</p>
            <p className="text-sm text-gray-600">{contactData.phone}</p>
          </div>

          <div>
            <h2 className="font-semibold text-dance-blue">SMS</h2>
            <p className="text-sm">
              {contactData.smsOptIn
                ? "You will receive text reminders for this appointment."
                : "No SMS reminders selected."}
            </p>
          </div>
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex justify-between pt-4">
          <Button variant="secondary" onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Booking…" : "Confirm & Book"}
          </Button>
        </div>
      </div>
    </StepWrapper>
  );
}
