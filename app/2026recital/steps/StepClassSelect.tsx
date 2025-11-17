"use client";

import React, { useState, useEffect } from "react";
import {
  AkadaStudent,
  RecitalClassSelection,
  AkadaClassHistoryItem,
} from "@/types/akada";
import { ED_COLORS } from "@/styles/theme";
import { recitalPricesByClassId } from "@/data/recitalPrices2026";


interface StepClassSelectProps {
  student: AkadaStudent;
  classList: RecitalClassSelection[];
  setClassList: React.Dispatch<React.SetStateAction<RecitalClassSelection[]>>;
  onNext: () => void;
  onBack: () => void;
}


export default function StepClassSelect({
  student,
  classList,
  setClassList,
  onNext,
  onBack,
}: StepClassSelectProps) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /** Load the student's class history */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(
          `/api/akada/studentclasshistory?studentId=${student.studentId}`
        );
        if (!res.ok) throw new Error("API error");

        const history: AkadaClassHistoryItem[] = await res.json();

        // Only classes from session 27450
        const filtered = history.filter((c) => c.sessionId === "27450");

        // Map to selection format
        const mapped: RecitalClassSelection[] = filtered.map((c) => ({
          classId: c.classId,
          className: c.className,
          price: recitalPricesByClassId[c.classId] ?? 0,
          selected: false,
        }));

        setClassList(mapped);
      } catch (e) {
        console.error(e);
        setErr("Could not load class history.");
      }

      setLoading(false);
    }

    if (student?.studentId) load();
  }, [student, setClassList]);

  function toggleClass(classId: string) {
    setClassList((prev) =>
      prev.map((c) =>
        c.classId === classId ? { ...c, selected: !c.selected } : c
      )
    );
  }

  const total = classList
    .filter((c) => c.selected)
    .reduce((sum, c) => sum + c.price, 0);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ color: ED_COLORS.purple }}>
        Select Recital Participation
      </h2>

      <p>
        Classes for: <strong>{student.studentFirstName}</strong>
      </p>

      {loading && <p>Loading classes…</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}

      {!loading && classList.length === 0 && (
        <p>No classes found for the 2026 recital session.</p>
      )}

      {!loading && classList.length > 0 && (
        <table style={{ width: "100%", marginTop: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: 8, textAlign: "left" }}>Class Name</th>
              <th style={{ padding: 8 }}>Price</th>
              <th style={{ padding: 8 }}>Recital?</th>
            </tr>
          </thead>

          <tbody>
            {classList.map((c) => (
              <tr key={c.classId}>
                <td style={{ padding: 8 }}>{c.className}</td>
                <td style={{ padding: 8 }}>${c.price}</td>
                <td style={{ padding: 8, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={c.selected}
                    onChange={() => toggleClass(c.classId)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ marginTop: 20, color: ED_COLORS.blue }}>
        Total: ${total}
      </h3>

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
          disabled={!classList.some((c) => c.selected)}
          style={{
            padding: "10px 16px",
            background: ED_COLORS.blue,
            color: "white",
            borderRadius: 6,
            opacity: classList.some((c) => c.selected) ? 1 : 0.5,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
