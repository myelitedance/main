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
  setAccountEmail: (v: string) => void;     // ⭐ NEW
  setAccountName: (v: string) => void;      // ⭐ NEW
  onNext: () => void;
  onBack: () => void;
}


export default function StepClassSelect({
  student,
  classList,
  setClassList,
  setAccountEmail,
  setAccountName,
  onNext,
  onBack,
}: StepClassSelectProps) {

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /** Load student's class history */
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

        // Only classes from session 27450 (API already filters)
        const filtered = history.filter((c) => c.sessionId === "27450");

        // Only include recital-eligible classes (present in price map)
        const recitalEligible = filtered.filter(
          (c) => recitalPricesByClassId[c.classId] !== undefined
        );

        // ⭐ Extract account info from first class
        if (recitalEligible.length > 0) {
          const first = recitalEligible[0];

          setAccountEmail(first.accountEmail || "");
          setAccountName(`${first.accountFirstName || ""} ${first.accountLastName || ""}`.trim());
        }

        const mapped: RecitalClassSelection[] = recitalEligible.map((c) => {
          const priceInfo = recitalPricesByClassId[c.classId];
          return {
            classId: c.classId,
            className: c.className,
            price: priceInfo.price,
            allowMultiDiscount: priceInfo.allowMultiDiscount,
            selected: false, // default: No
          };
        });

        setClassList(mapped);
      } catch (e) {
        console.error(e);
        setErr("Could not load class history.");
      }

      setLoading(false);
    }

    if (student?.studentId) load();
  }, [student, setClassList]);

  /** YES/NO selection for a specific class */
  function setSelection(classId: string, selected: boolean) {
    setClassList((prev) =>
      prev.map((c) =>
        c.classId === classId ? { ...c, selected } : c
      )
    );
  }

  /** Sum of selected (YES) classes */
  const total = classList
    .filter((c) => c.selected === true)
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
        <p>No recital-eligible classes found for this student.</p>
      )}

      {!loading && classList.length > 0 && (
        <table style={{ width: "100%", marginTop: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: 8, textAlign: "left" }}>Class Name</th>
              <th style={{ padding: 8 }}>Price</th>
              <th style={{ padding: 8, textAlign: "center" }}>Recital?</th>
            </tr>
          </thead>

          <tbody>
            {classList.map((c) => (
              <tr key={c.classId}>
                <td style={{ padding: 8 }}>{c.className}</td>
                <td style={{ padding: 8 }}>${c.price}</td>

                {/* YES / NO REQUIRED RADIO BUTTONS */}
                <td style={{ padding: 8, textAlign: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "1.5rem",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="radio"
                        name={`recital-${c.classId}`}
                        checked={c.selected === true}
                        onChange={() => setSelection(c.classId, true)}
                      />
                      Yes
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="radio"
                        name={`recital-${c.classId}`}
                        checked={c.selected === false}
                        onChange={() => setSelection(c.classId, false)}
                      />
                      No
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Dynamic Total */}
      <h3 style={{ marginTop: 20, color: ED_COLORS.blue }}>
        Total (selected classes): ${total}
      </h3>

      <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
        * You may opt out of all classes — please email frontdesk@myelitedance.com<br />
        Multi-Class Discounts are applied on the review page.
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

        {/* NEXT BUTTON ALWAYS ENABLED */}
        <button
          onClick={onNext}
          style={{
            padding: "10px 16px",
            background: ED_COLORS.blue,
            color: "white",
            borderRadius: 6,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
