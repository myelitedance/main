"use client";

import RecitalWizard from "./RecitalWizard";

export default function Recital2026Page() {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          fontSize: "2rem",
          fontWeight: 700,
          color: "#8B5CF6", // dance-purple
        }}
      >
        2026 Recital Participation Form
      </h1>

      <RecitalWizard />
    </div>
  );
}
