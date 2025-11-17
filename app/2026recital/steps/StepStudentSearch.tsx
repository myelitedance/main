"use client";

import { useState } from "react";
import { ED_COLORS } from "@/styles/theme";
import { AkadaStudent } from "@/types/akada";

interface StepStudentSearchProps {
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setStudents: (students: AkadaStudent[]) => void;
  onNext: () => void;
}

export default function StepStudentSearch({
  firstName,
  lastName,
  setFirstName,
  setLastName,
  setStudents,
  onNext,
}: StepStudentSearchProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function lookup() {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/akada/students/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ firstName, lastName }),
});

      const allStudents: AkadaStudent[] = await res.json();

      const matches = allStudents.filter(
        (s) =>
          s.studentFirstName.toLowerCase() === firstName.toLowerCase() &&
          s.studentLastName.toLowerCase() === lastName.toLowerCase()
      );

      if (!matches.length) {
        setErr("No student found with that name.");
        setLoading(false);
        return;
      }

      setStudents(matches);
      onNext();
    } catch (e) {
      setErr("Error fetching Akada data.");
    }

    setLoading(false);
  }

  const disabled = !firstName.trim() || !lastName.trim() || loading;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <h2 style={{ color: ED_COLORS.purple }}>Find Your Student</h2>

      <input
        type="text"
        placeholder="Student First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 12,
          borderRadius: 6,
          border: "1px solid #ddd",
        }}
      />

      <input
        type="text"
        placeholder="Student Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
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
        disabled={disabled}
        style={{
          marginTop: 20,
          padding: "12px 20px",
          background: ED_COLORS.blue,
          color: "white",
          borderRadius: 6,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {loading ? "Searching…" : "Next"}
      </button>
    </div>
  );
}
