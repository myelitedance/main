"use client";

import { useState } from "react";
import Button from "./ui/Button";
import ErrorText from "./ui/ErrorText";
import StepWrapper from "./StepWrapper";
import { sendContact, sendOpportunity, sendAppointment } from "../utils/api";

interface ClassOption {
  id: string;
  day: string;
  date: string;       // YYYY-MM-DD
  label: string;      // “Mon • Dec 1 @ 4:45pm - 5:45pm”
  timeRange: string;  // “4:45pm - 5:45pm”
  startISO: string;
  endISO: string;
  lengthMinutes?: number;
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
  onComplete
}: ConfirmStepProps) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const opt = selectedClass.option;

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      // 1) CONTACT ----------------------------------
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


// 2) OPPORTUNITY -------------------------------
const oppRes = await sendOpportunity({
  contactId,
  parentFirstName: contactData.parentFirstName,
  parentLastName: contactData.parentLastName,
  dancerFirstName: contactData.dancerFirstName,
  dancerAge: age,

  selectedClass: {
    className: selectedClass.className,
    option: selectedClass.option,
    lengthMinutes: selectedClass.lengthMinutes
  }
});




      if (!oppRes?.opportunityId) {
        setError("Unable to create opportunity.");
        setLoading(false);
        return;
      }

      const opportunityId = oppRes.opportunityId;


      // 3) APPOINTMENT -------------------------------
      const apptRes = await sendAppointment({
        classId: opt.id,
        className: selectedClass.className,
        lengthMinutes: selectedClass.lengthMinutes,

        dancerFirstName: contactData.dancerFirstName,

        // REQUIRED BY APPOINTMENT ROUTE + utils/api
        day: opt.day,
        date: opt.date,
        timeRange: opt.timeRange,

        startISO: opt.startISO,
        endISO: opt.endISO,

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
      console.error("Confirm error:", err);
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
          Make sure everything looks correct before finalizing your trial class.
        </p>

        <div className="bg-gray-50 border rounded-lg p-4 space-y-4">

          {/* CLASS INFO */}
          <div>
            <h2 className="font-semibold text-dance-blue">Class</h2>
            <p className="font-medium">{selectedClass.className}</p>
            <p className="text-sm text-gray-600">
              {opt.label}
            </p>
          </div>

          {/* DANCER */}
          <div>
            <h2 className="font-semibold text-dance-blue">Dancer</h2>
            <p>{contactData.dancerFirstName}</p>
            <p className="text-sm text-gray-600">
              Age: {age} • Experience: {years} years
            </p>
          </div>

          {/* PARENT */}
          <div>
            <h2 className="font-semibold text-dance-blue">Parent</h2>
            <p>{contactData.parentFirstName} {contactData.parentLastName}</p>
            <p className="text-sm text-gray-600">{contactData.email}</p>
            <p className="text-sm text-gray-600">{contactData.phone}</p>
          </div>

          {/* SMS */}
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
