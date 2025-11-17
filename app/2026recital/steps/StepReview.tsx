"use client";

import { useState } from "react";
import { ED_COLORS } from "@/styles/theme";
import {
  AkadaStudent,
  RecitalClassSelection,
} from "@/types/akada";

interface StepReviewProps {
  email: string;
  student: AkadaStudent;
  classList: RecitalClassSelection[];
  accepted: boolean;
  signature: string;
  onBack: () => void;
}

export default function StepReview({
  email,
  student,
  classList,
  accepted,
  signature,
  onBack,
}: StepReviewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const selectedClasses = classList.filter((c) => c.selected);
  const total = selectedClasses.reduce((sum, c) => sum + c.price, 0);

  async function submit() {
    setSubmitting(true);

    try {
      await fetch("/api/send-recital-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: student.accountName,
          accountEmail: email,
          studentName: `${student.studentFirstName} ${student.studentLastName}`,
          studentId: student.studentId,
          classes: selectedClasses,
          total,
          signature,
          submittedAt: new Date().toISOString(),
        }),
      });

      setDone(true);
    } catch (err) {
      alert("Submission failed. Please try again.");
    }

    setSubmitting(false);
  }

  if (done) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h2 style={{ color: ED_COLORS.purple }}>Submitted!</h2>
        <p style={{ marginTop: 12 }}>
          Thank you — a confirmation email has been sent to you and the Elite
          Dance front desk.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ color: ED_COLORS.purple }}>Review Your Submission</h2>

      <div style={{ marginTop: 16 }}>
        <p><strong>Parent Email:</strong> {email}</p>
        <p><strong>Account:</strong> {student.accountName}</p>
        <p>
          <strong>Student:</strong>{" "}
          {student.studentFirstName} {student.studentLastName}
        </p>
      </div>

      <h3 style={{ marginTop: 20 }}>Recital Classes</h3>

      <ul>
        {selectedClasses.map((c) => (
          <li key={c.classId}>
            {c.className} – ${c.price}
          </li>
        ))}
      </ul>

      <h3>Total: ${total}</h3>

      <p style={{ marginTop: 16 }}>
        <strong>Signature:</strong> {signature}
      </p>

      <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            padding: "10px 16px",
            background: "#ddd",
            borderRadius: 6,
          }}
        >
          Back
        </button>

        <button
          onClick={submit}
          disabled={submitting}
          style={{
            padding: "10px 16px",
            background: ED_COLORS.blue,
            color: "white",
            borderRadius: 6,
          }}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
