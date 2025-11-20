"use client";

import { useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";
import { sendContact, sendOpportunity, sendAppointment } from "../utils/api";

interface ClassOption {
  id: string;
  day: string;
  date: string;
  label: string;
  timeRange: string;
  startISO: string;
  endISO: string;
}

interface ConfirmStepProps {
  age: number;
  years: number;
  selectedClass: {
    className: string;
    option: ClassOption;
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
  onComplete,
}: ConfirmStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError("");

      // 1️⃣ Create / Update Contact
      const contactRes = await sendContact({ ...contactData, utms });

      if (!contactRes?.contactId) {
        setError("Unable to save contact information.");
        setLoading(false);
        return;
      }

      const contactId = contactRes.contactId;

      // 2️⃣ Create Opportunity
      //    Adapt our richer selectedClass into the shape sendOpportunity expects:
      //    selectedClass: { id: string; name: string }
      const oppRes = await sendOpportunity({
        contactId,
        parentFirstName: contactData.parentFirstName,
        parentLastName: contactData.parentLastName,
        dancerFirstName: contactData.dancerFirstName,
        dancerAge: age,
        selectedClass: {
          id: selectedClass.option.id,
          name: selectedClass.className,
        },
      });

      if (!oppRes?.opportunityId) {
        setError("Unable to create opportunity.");
        setLoading(false);
        return;
      }

      const opportunityId = oppRes.opportunityId;

      // 3️⃣ Schedule Appointment
      //    Adapt to the current sendAppointment signature:
      //    { classId, className, lengthMinutes, dancerFirstName, day, time, contactId, opportunityId }
      const apptRes = await sendAppointment({
        classId: selectedClass.option.id,
        className: selectedClass.className,
        lengthMinutes: selectedClass.lengthMinutes,
        dancerFirstName: contactData.dancerFirstName,
        day: selectedClass.option.day,
        time: selectedClass.option.timeRange,
        contactId,
        opportunityId,
      });

      if (!apptRes?.appointmentId) {
        setError("Unable to schedule appointment.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onComplete();
    } catch (err: any) {
      console.error(err);
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

        <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
          <div>
            <h2 className="font-semibold text-dance-blue">Class</h2>
            <p>{selectedClass.className}</p>
            <p className="text-sm text-gray-600">
              {selectedClass.option.day} • {selectedClass.option.label}
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
