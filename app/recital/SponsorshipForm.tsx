"use client";

import { useState } from "react";

type FormState = {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  message: string;
  hp: string;
};

const initialState: FormState = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  message: "",
  hp: "",
};

export default function SponsorshipForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setStatus("idle");
    setErrorText("");

    try {
      const res = await fetch("/api/recital/sponsorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Unable to submit sponsorship inquiry.");
      }

      setStatus("success");
      setForm(initialState);
    } catch (err: any) {
      setStatus("error");
      setErrorText(err?.message || "Unable to submit sponsorship inquiry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={form.hp}
        onChange={(e) => setForm((prev) => ({ ...prev, hp: e.target.value }))}
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-dance-purple focus:outline-none focus:ring-2 focus:ring-dance-purple/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-800">
          Business Name
          <input
            value={form.businessName}
            onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-dance-purple focus:outline-none focus:ring-2 focus:ring-dance-purple/20"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-dance-purple focus:outline-none focus:ring-2 focus:ring-dance-purple/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-800">
          Phone
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-dance-purple focus:outline-none focus:ring-2 focus:ring-dance-purple/20"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-800">
        Message
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-dance-purple focus:outline-none focus:ring-2 focus:ring-dance-purple/20"
          placeholder="Tell us about your sponsorship interest and preferred follow-up."
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-gradient-to-r from-dance-purple to-dance-pink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Submitting..." : "Submit Sponsorship Inquiry"}
      </button>

      {status === "success" ? <p className="text-sm font-medium text-green-700">Thanks. We received your sponsorship inquiry and will reach out soon.</p> : null}
      {status === "error" ? <p className="text-sm font-medium text-red-700">{errorText}</p> : null}
    </form>
  );
}

