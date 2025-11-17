"use client";

import { ED_COLORS } from "@/styles/theme";

interface StepAgreementProps {
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepAgreement({
  accepted,
  setAccepted,
  onNext,
  onBack,
}: StepAgreementProps) {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ color: ED_COLORS.purple }}>Recital Agreement Acknowledgment</h2>

      <p style={{ marginTop: 12, lineHeight: 1.5 }}>
        Please review the key points of the Elite Dance 2026 Recital Agreement below.
        This is a summary; the full agreement can be viewed here:
        <br />
        <a
          href="/recital-agreement-2026"
          target="_blank"
          style={{ color: ED_COLORS.blue, textDecoration: "underline" }}
        >
          View Full 2026 Recital Agreement
        </a>
      </p>

      {/* ⭐ NEW: Agreement summary bullets */}
      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ color: ED_COLORS.blue }}>Key Acknowledgements</h3>
        <ul style={{ marginTop: "0.75rem", marginLeft: "1.25rem", lineHeight: 1.6 }}>
          <li>I understand recital fee due dates: $100 by Dec 15 & final balance by Jan 15.</li>
          <li>I understand auto-pay recital fees only occur upon request.</li>
          <li>I understand unpaid balances delay costume orders and may cause late arrival.</li>
          <li>I understand dancers must be measured by Jan 15.</li>
          <li>I understand the recital contract must be turned in by Dec 15.</li>
          <li>I understand dance shoes are required and not included in recital fees.</li>
          <li>I understand the refund policy as listed above.</li>
          <li>I understand attendance at dress rehearsal is required.</li>
          <li>I understand dancers cannot perform if any balance remains after May 10th.</li>
        </ul>
      </div>

      {/* Checkbox */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 20,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>I agree to the 2026 Recital Agreement.</span>
      </label>

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
          onClick={onNext}
          disabled={!accepted}
          style={{
            padding: "10px 16px",
            background: ED_COLORS.blue,
            color: "white",
            borderRadius: 6,
            opacity: accepted ? 1 : 0.5,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
