"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { submitLead } from "../actions";

type FieldErrors = Record<string, string[] | undefined>;

export default function GetStartedInlineForm() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [smsOptIn, setSmsOptIn] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);

  // Auto-open if user navigates to the anchor
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#get-started-form") setOpen(true);
  }, []);

  const err = (name: string) => errors[name]?.[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const fd = new FormData(e.currentTarget);
    fd.set("sourcePath", "/get-started");

    const res = await submitLead(fd);

    // If redirect happens, we never reach here.
    if (res && !res.ok) {
      setErrors(res.errors || {});
      setSubmitting(false);
      // keep it open + scroll into view
      setOpen(true);
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Start here</h2>
          <p className="mt-1 text-sm text-gray-600">
            We’ll reach out within 1 business day.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-100"
        >
          {open ? "Hide form" : "Open form"}
        </button>
      </div>

      {open && (
        <form ref={formRef} onSubmit={onSubmit} className="mt-6 space-y-6">
          {/* Parent */}
          <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Parent Info</h3>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First Name" name="parentFirstName" error={err("parentFirstName")} required />
              <Field label="Last Name" name="parentLastName" error={err("parentLastName")} required />
              <Field label="Email" name="parentEmail" type="email" error={err("parentEmail")} required className="sm:col-span-2" />

              <Field
                label="Phone (optional unless SMS opt-in)"
                name="parentPhone"
                type="tel"
                error={err("parentPhone")}
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

          {/* Dancer */}
          <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Dancer Info</h3>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First Name" name="dancerFirstName" error={err("dancerFirstName")} required />
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Age <span className="text-red-600">*</span>
                </label>
                <select
                  name="dancerAge"
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {Array.from({ length: 17 }, (_, i) => i + 2).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                {err("dancerAge") && <p className="mt-1 text-xs text-red-600">{err("dancerAge")}</p>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Notes (optional)</h3>
            <textarea
              name="notes"
              rows={4}
              placeholder="Schedule needs, experience level, questions…"
              className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>

          <p className="text-xs text-gray-500">
            By submitting, you agree we may contact you about enrollment. SMS is optional and only used if you opt in.
          </p>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  error,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
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
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
