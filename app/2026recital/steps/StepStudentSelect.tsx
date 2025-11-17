"use client";

import { ED_COLORS } from "@/styles/theme";
import { AkadaStudent } from "@/types/akada";

interface StepStudentSelectProps {
  students: AkadaStudent[];
  selectedStudent: AkadaStudent | null;
  setSelectedStudent: (s: AkadaStudent) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepStudentSelect({
  students,
  selectedStudent,
  setSelectedStudent,
  onNext,
  onBack,
}: StepStudentSelectProps) {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ color: ED_COLORS.purple }}>Select Your Student</h2>

      <p style={{ marginBottom: 20 }}>
        We found <strong>{students.length}</strong> student
        {students.length > 1 ? "s" : ""} associated with your account.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {students.map((s) => {
          const selected = selectedStudent?.studentId === s.studentId;

          return (
            <div
              key={s.studentId}
              onClick={() => setSelectedStudent(s)}
              style={{
                padding: 16,
                borderRadius: 8,
                border: selected
                  ? `3px solid ${ED_COLORS.blue}`
                  : "2px solid #ddd",
                cursor: "pointer",
                background: selected ? "#F0F7FF" : "white",
                transition: "0.2s",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: selected ? ED_COLORS.blue : "#333",
                }}
              >
                {s.studentFirstName} {s.studentLastName}
              </div>

              <div style={{ fontSize: 14, marginTop: 4 }}>
                Account: {s.accountName}
              </div>
            </div>
          );
        })}
      </div>

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
          disabled={!selectedStudent}
          style={{
            padding: "10px 16px",
            background: ED_COLORS.blue,
            color: "white",
            borderRadius: 6,
            opacity: selectedStudent ? 1 : 0.4,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
