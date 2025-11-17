"use client";

import { ED_COLORS } from "@/styles/theme";

interface StepSignatureProps {
  signature: string;
  setSignature: (s: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepSignature({
  signature,
  setSignature,
  onNext,
  onBack,
}: StepSignatureProps) {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ color: ED_COLORS.purple }}>Sign Your Agreement</h2>

      <p style={{ marginTop: 12, lineHeight: 1.5 }}>
        By typing your full name below, you confirm that this serves as your
        legally valid electronic signature for the 2026 Elite Dance Recital
        Agreement.
      </p>

      <input
        type="text"
        placeholder="Type your full legal name"
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 20,
          borderRadius: 6,
          border: "1px solid #ddd",
        }}
      />

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
          disabled={signature.trim().length < 3}
          style={{
            padding: "10px 16px",
            background: ED_COLORS.blue,
            color: "white",
            borderRadius: 6,
            opacity: signature.trim().length >= 3 ? 1 : 0.5,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
