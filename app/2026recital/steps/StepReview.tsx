"use client";

import { useState } from "react";
import { ED_COLORS } from "@/styles/theme";
import {
  AkadaStudent,
  RecitalClassSelection,
} from "@/types/akada";

interface StepReviewProps {
  student: AkadaStudent;
  classList: RecitalClassSelection[];
  accepted: boolean;
  signature: string;
  isAdditionalDancer: boolean;
  accountEmail: string;
  accountName: string;
  onBack: () => void;
}

export default function StepReview({
  student,
  classList,
  accepted,
  signature,
  isAdditionalDancer,
  accountEmail,
  accountName,
  onBack,
}: StepReviewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // NEW — auto charge checkbox state
  const [autoCharge, setAutoCharge] = useState(false);

  const selectedClasses = classList.filter((c) => c.selected);

  // Base total
  const baseTotal = selectedClasses.reduce((sum, c) => sum + c.price, 0);

  // Multi-class discount
  const eligible = selectedClasses.filter((c) => c.allowMultiDiscount);
  const multiClassDiscount =
    eligible.length > 1 ? (eligible.length - 1) * 75 : 0;

  // Family discount
  const familyDiscount = isAdditionalDancer ? 50 : 0;

  // Final total (informational only)
  const finalTotal = baseTotal - multiClassDiscount - familyDiscount;

  // Auto charge details
  const remainingBalance = Math.max(finalTotal - 100, 0);

  async function submit() {
    setSubmitting(true);

    try {
      await fetch("/api/send-recital-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName,
          accountEmail,
          studentName: `${student.studentFirstName} ${student.studentLastName}`,
          studentId: student.studentId,

          classes: selectedClasses,

          baseTotal,
          multiClassDiscount,
          familyDiscount,
          finalTotal,

          autoCharge, // ⭐ include new field
          isAdditionalDancer,
          signature,
          submittedAt: new Date().toISOString(),
        }),
      });

      setDone(true);
    } catch {
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
        <p><strong>Account:</strong> {accountName}</p>
        <p><strong>Parent Email:</strong> {accountEmail}</p>
        <p><strong>Student:</strong> {student.studentFirstName} {student.studentLastName}</p>
      </div>

      <h3 style={{ marginTop: 20 }}>Recital Classes</h3>

      <ul>
        {selectedClasses.map((c) => (
          <li key={c.classId}>
            {c.allowMultiDiscount ? "" : "* "}
            {c.className} – ${c.price}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 20 }}>
        <p><strong>Base Total:</strong> ${baseTotal}</p>
        <p><strong>Multi-Class Discount:</strong> -${multiClassDiscount}</p>

        {isAdditionalDancer && (
          <p><strong>Sibling Discount:</strong> -$50</p>
        )}

        <p style={{ fontSize: "1.2rem", marginTop: 10 }}>
          <strong>Final Total:</strong> ${finalTotal}
        </p>

        {selectedClasses.some((c) => !c.allowMultiDiscount) && (
          <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "1rem" }}>
            * Ineligible for Multi-Class Discount
          </p>
        )}
      </div>

      {/* ⭐ AUTO-CHARGE AREA */}
      <div style={{ marginTop: 30 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={autoCharge}
            onChange={(e) => setAutoCharge(e.target.checked)}
          />
          <span style={{ fontSize: 16 }}>
            <strong>Auto Charge my card on file</strong>
          </span>
        </label>

        <p style={{ fontSize: 14, color: "#555", marginTop: 8 }}>
          By selecting this option, you agree to be auto-charged:
        </p>

        <ul style={{ fontSize: 14, marginLeft: 20, color: "#555" }}>
          <li><strong>$100</strong> on <strong>December 15th</strong></li>
          <li>
            <strong>${remainingBalance}</strong> (remaining balance)
            on <strong>January 15th</strong>
          </li>
        </ul>
      </div>

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
