"use client";

import { useState } from "react";
import { ED_COLORS } from "@/styles/theme";
import { AkadaStudent } from "@/types/akada";

interface StepEmailProps {
  email: string;
  setEmail: (email: string) => void;
  setStudents: (students: AkadaStudent[]) => void;
  onNext: () => void;
}

export default function StepEmail({
  email,
  setEmail,
  setStudents,
  onNext,
}: StepEmailProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function lookup() {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/akada/students");
      if (!res.ok) throw new Error("API error");

      const allStudents: AkadaStudent[] = await res.json();

      const matches = allStudents.filter(
        (s) => s.accountEmail.toLowerCase() === email.toLowerCase()
      );

      if (!matches.length) {
        setErr("No students found for that email.");
        setLoading(false);
        return;
      }

      setStudents(matches);
      onNext();
    } catch (e) {
      setErr("There was an error looking up your account.");
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <h2 style={{ color: ED_COLORS.purple }}>Enter Your Email</h2>

      <input
        type="email"
        placeholder="parent@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 12,
          borderRadius: 6,
          border: "1px solid #ddd",
        }}
      />

      {err && <p style={{ color: "red", marginTop: 8 }}>{err}</p>}

      <button
        onClick={lookup}
        disabled={!email || loading}
        style={{
          marginTop: 20,
          padding: "12px 20px",
          background: ED_COLORS.blue,
          color: "white",
          borderRadius: 6,
          opacity: email ? 1 : 0.5,
        }}
      >
        {loading ? "Looking up..." : "Next"}
      </button>
    </div>
  );
}
