"use client";

import React from "react";
import { ED_COLORS } from "@/styles/theme";

interface ProgressBarProps {
  step: number;     // current step index (1-based)
  total: number;    // total number of steps
}

export default function ProgressBar({ step, total }: ProgressBarProps) {
  const progress = (step / total) * 100;

  return (
    <div style={{ margin: "20px 0" }}>
      <p style={{ marginBottom: 6, fontWeight: 600 }}>
        Step {step} of {total}
      </p>

      <div
        style={{
          width: "100%",
          height: 10,
          background: "#e5e5e5",
          borderRadius: 5,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: ED_COLORS.purple,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
