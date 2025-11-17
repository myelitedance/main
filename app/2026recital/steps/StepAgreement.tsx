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
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ color: ED_COLORS.purple }}>Agreement</h2>

      <p style={{ marginTop: 12, lineHeight: 1.5 }}>
        Please review our{" "}
        <a
          href="/recital-agreement-2026"
          target="_blank"
          style={{ color: ED_COLORS.blue, textDecoration: "underline" }}
        >
          2026 Recital Agreement
        </a>
        . Once you’ve read and understood the terms, check the box below.
      </p>

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
