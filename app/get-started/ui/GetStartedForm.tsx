"use client";

import { useState } from "react";

function getUTM() {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  return {
    source: sp.get("utm_source") || "",
    medium: sp.get("utm_medium") || "",
    campaign: sp.get("utm_campaign") || "",
  };
}

export default function GetStartedForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsOptIn, setSmsOptIn] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);

    const payload = {
  parentFirstName: String(fd.get("parentFirstName") || ""),
  parentLastName: String(fd.get("parentLastName") || ""),
  parentEmail: String(fd.get("parentEmail") || ""),
  parentPhone: String(fd.get("parentPhone") || ""),
  smsOptIn: fd.get("smsOptIn") === "on",

  dancerFirstName: String(fd.get("dancerFirstName") || ""),
  dancerAge: Number(fd.get("dancerAge") || 0),

  notes: String(fd.get("notes") || ""),
  utm: getUTM(),
  pagePath: "/get-started",
};


    try {
      const res = await fetch("/api/elite/get-started", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Submission failed");

      // HARD NAVIGATION so Meta URL-based conversion triggers reliably
      window.location.assign("/get-started/thank-you");
    } catch (err: any) {
      setError(String(err?.message || err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-gray-200 bg-gray-50 p-6 space-y-6">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Parent</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name" name="parentFirstName" required />
          <Field label="Last Name" name="parentLastName" required />
          <Field label="Email" name="parentEmail" type="email" required className="sm:col-span-2" />
          <Field
            label="Phone (required if SMS opt-in)"
            name="parentPhone"
            type="tel"
            className="sm:col-span-2"
          />

          <label className="sm:col-span-2 flex items-start gap-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
            <input
              type="checkbox"
              name="smsOptIn"
              checked={smsOptIn}
              onChange={(e) => setSmsOptIn(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm text-gray-800">
              Yes, I agree to receive text messages from Elite Dance &amp; Music about classes and enrollment.
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Dancer</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name" name="dancerFirstName" required />

          <div>
            <label className="block text-sm font-medium text-gray-900">
              Age <span className="text-red-600">*</span>
            </label>
            <select
              name="dancerAge"
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              defaultValue=""
              required
            >
              <option value="" disabled>Select…</option>
              {Array.from({ length: 17 }, (_, i) => i + 2).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Notes (optional)</h3>
        <textarea
          name="notes"
          rows={4}
          className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
          placeholder="Schedule needs, experience level, questions…"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>

      <p className="text-xs text-gray-500">
        SMS is optional and only used if you opt in.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-900">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
      />
    </div>
  );
}
