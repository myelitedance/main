"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type CongratsSize = "none" | "quarter" | "half" | "full";
type PaymentOption = "charge_account" | "pay_now";

type FormState = {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  dancerFirstName: string;
  dancerLastName: string;
  yearbookRequested: boolean;
  congratsSize: CongratsSize;
  congratsMessage: string;
  paymentOption: PaymentOption;
};

const PRICES = {
  yearbook: 20,
  quarter: 25,
  half: 50,
  full: 100,
} as const;

const MESSAGE_LIMITS: Record<CongratsSize, number> = {
  none: 0,
  quarter: 120,
  half: 240,
  full: 500,
};

const MAX_PHOTOS_BY_SIZE: Record<CongratsSize, number> = {
  none: 0,
  quarter: 1,
  half: 3,
  full: 6,
};

const ALLOWED_TYPES_TEXT = "JPG, PNG, or HEIC (max 10MB each).";

function adLabel(size: CongratsSize): string {
  if (size === "quarter") return "1/4 Page Dancer Congratulations";
  if (size === "half") return "1/2 Page Dancer Congratulations";
  if (size === "full") return "Full Page Dancer Congratulations";
  return "No dancer congratulations ad";
}

export default function PreorderForm() {
  const [form, setForm] = useState<FormState>({
    parentFirstName: "",
    parentLastName: "",
    parentEmail: "",
    parentPhone: "",
    dancerFirstName: "",
    dancerLastName: "",
    yearbookRequested: false,
    congratsSize: "none",
    congratsMessage: "",
    paymentOption: "charge_account",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [payNowUrl, setPayNowUrl] = useState<string | null>(null);
  const [payNowStatus, setPayNowStatus] = useState<"not_needed" | "synced" | "failed">("not_needed");

  const currentMessageLimit = MESSAGE_LIMITS[form.congratsSize];
  const currentPhotoLimit = MAX_PHOTOS_BY_SIZE[form.congratsSize];

  const pricing = useMemo(() => {
    const yearbookAmount = form.yearbookRequested ? PRICES.yearbook : 0;
    const adAmount =
      form.congratsSize === "quarter"
        ? PRICES.quarter
        : form.congratsSize === "half"
          ? PRICES.half
          : form.congratsSize === "full"
            ? PRICES.full
            : 0;

    return {
      yearbookAmount,
      adAmount,
      total: yearbookAmount + adAmount,
    };
  }, [form.yearbookRequested, form.congratsSize]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateClient(): string | null {
    const requiredTextFields = [
      ["Parent first name", form.parentFirstName],
      ["Parent last name", form.parentLastName],
      ["Parent email", form.parentEmail],
      ["Parent phone", form.parentPhone],
      ["Dancer first name", form.dancerFirstName],
      ["Dancer last name", form.dancerLastName],
    ] as const;

    for (const [label, value] of requiredTextFields) {
      if (!value.trim()) return `${label} is required.`;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
      return "Please enter a valid email address.";
    }

    const phoneDigits = form.parentPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      return "Please enter a valid phone number.";
    }

    if (!form.yearbookRequested && form.congratsSize === "none") {
      return "Select at least one item: yearbook or dancer congratulations ad.";
    }

    if (form.congratsSize !== "none") {
      const trimmed = form.congratsMessage.trim();
      if (!trimmed) return "A message is required for dancer congratulations.";
      if (trimmed.length > currentMessageLimit) {
        return `Message must be ${currentMessageLimit} characters or less for this ad size.`;
      }
    }

    if (photos.length > currentPhotoLimit) {
      return `You can upload up to ${currentPhotoLimit} photo${currentPhotoLimit === 1 ? "" : "s"} for this ad size.`;
    }

    for (const file of photos) {
      if (file.size > 10 * 1024 * 1024) {
        return `File ${file.name} exceeds 10MB.`;
      }
    }

    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      return;
    }

    setSubmitting(true);

    try {
      const body = new FormData();
      body.set("parentFirstName", form.parentFirstName.trim());
      body.set("parentLastName", form.parentLastName.trim());
      body.set("parentEmail", form.parentEmail.trim());
      body.set("parentPhone", form.parentPhone.trim());
      body.set("dancerFirstName", form.dancerFirstName.trim());
      body.set("dancerLastName", form.dancerLastName.trim());
      body.set("yearbookRequested", String(form.yearbookRequested));
      body.set("congratsSize", form.congratsSize);
      body.set("congratsMessage", form.congratsMessage.trim());
      body.set("paymentOption", form.paymentOption);

      for (const photo of photos) {
        body.append("congratsPhotos", photo);
      }

      const res = await fetch("/api/2026recital/preorder", {
        method: "POST",
        body,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        payNowUrl?: string | null;
        payNowIntegrationStatus?: "not_needed" | "synced" | "failed";
      };

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setPayNowUrl(data.payNowUrl ?? null);
      setPayNowStatus(data.payNowIntegrationStatus ?? "not_needed");
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preorder Received</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>Thank you. We emailed your confirmation and copied the front desk.</p>
          <p>
            If you selected <strong>Pay Now</strong>, use your Xero link below when available.
            If a link could not be generated, front desk will follow up with payment instructions.
          </p>
          {payNowStatus === "synced" && payNowUrl && (
            <p>
              Payment link:{" "}
              <a
                href={payNowUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-purple-700 underline"
              >
                Open Xero checkout
              </a>
            </p>
          )}
          {payNowStatus === "failed" && (
            <p className="text-amber-700">
              Pay-now invoice link could not be generated automatically. Front desk will follow up.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yearbook + Dancer Congratulations Preorder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onSubmit} className="space-y-8">
          <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">
              Parent + Dancer Details
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parentFirstName">Parent First Name *</Label>
              <Input
                id="parentFirstName"
                value={form.parentFirstName}
                onChange={(e) => update("parentFirstName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentLastName">Parent Last Name *</Label>
              <Input
                id="parentLastName"
                value={form.parentLastName}
                onChange={(e) => update("parentLastName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent Email (Akada Account) *</Label>
              <Input
                id="parentEmail"
                type="email"
                value={form.parentEmail}
                onChange={(e) => update("parentEmail", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent Phone *</Label>
              <Input
                id="parentPhone"
                inputMode="tel"
                value={form.parentPhone}
                onChange={(e) => update("parentPhone", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dancerFirstName">Dancer First Name *</Label>
              <Input
                id="dancerFirstName"
                value={form.dancerFirstName}
                onChange={(e) => update("dancerFirstName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dancerLastName">Dancer Last Name *</Label>
              <Input
                id="dancerLastName"
                value={form.dancerLastName}
                onChange={(e) => update("dancerLastName", e.target.value)}
                required
              />
            </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
            <Label className="text-base">Yearbook</Label>
            <label className="flex items-center gap-3 rounded border p-3">
              <Checkbox
                checked={form.yearbookRequested}
                onCheckedChange={(checked) => update("yearbookRequested", checked === true)}
                aria-label="Yearbook"
              />
              <span>Yearbook - $20</span>
            </label>
          </section>

          <section className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
            <Label className="text-base">Dancer Congratulations (choose one)</Label>
            <RadioGroup
              value={form.congratsSize}
              onValueChange={(v) => {
                const next = v as CongratsSize;
                update("congratsSize", next);
                if (next === "none") {
                  update("congratsMessage", "");
                  setPhotos([]);
                }
              }}
            >
              <label className="flex items-center gap-3 rounded border p-3">
                <RadioGroupItem value="none" id="congrats-none" />
                <span>No dancer congratulations ad</span>
              </label>

              <label className="flex items-center gap-3 rounded border p-3">
                <RadioGroupItem value="quarter" id="congrats-quarter" />
                <span>1/4 page dancer congratulations - $25</span>
              </label>

              <label className="flex items-center gap-3 rounded border p-3">
                <RadioGroupItem value="half" id="congrats-half" />
                <span>1/2 page dancer congratulations - $50</span>
              </label>

              <label className="flex items-center gap-3 rounded border p-3">
                <RadioGroupItem value="full" id="congrats-full" />
                <span>Full page dancer congratulations - $100</span>
              </label>
            </RadioGroup>

            <p className="text-xs text-slate-600">
              Dancer congratulations ads are printed in both the yearbook and recital program.
            </p>

            {form.congratsSize !== "none" && (
              <div className="space-y-4 rounded border p-4">
                <div className="space-y-2">
                  <Label htmlFor="congratsMessage">
                    Dancer Congratulations Message * ({form.congratsMessage.length}/{currentMessageLimit})
                  </Label>
                  <Textarea
                    id="congratsMessage"
                    value={form.congratsMessage}
                    maxLength={currentMessageLimit}
                    onChange={(e) => update("congratsMessage", e.target.value)}
                    placeholder="Type the message exactly as you want it printed."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="congratsPhotos">Optional Photo Upload(s)</Label>
                  <Input
                    id="congratsPhotos"
                    type="file"
                    accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                    multiple
                    onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                  />
                  <p className="text-xs text-slate-600">
                    {ALLOWED_TYPES_TEXT} Limit: {currentPhotoLimit} photo{currentPhotoLimit === 1 ? "" : "s"} for this ad size.
                  </p>
                  {photos.length > 0 && (
                    <ul className="list-disc space-y-1 pl-6 text-xs text-slate-700">
                      {photos.map((file) => (
                        <li key={`${file.name}-${file.size}`}>
                          {file.name} ({Math.round(file.size / 1024)} KB)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
            <Label className="text-base">Payment Option *</Label>
            <RadioGroup
              value={form.paymentOption}
              onValueChange={(v) => update("paymentOption", v as PaymentOption)}
            >
              <label className="flex items-center gap-3 rounded border p-3">
                <RadioGroupItem value="charge_account" id="charge-account" />
                <span>Charge my studio account</span>
              </label>

              <label className="flex items-center gap-3 rounded border p-3">
                <RadioGroupItem value="pay_now" id="pay-now" />
                <span>Pay now</span>
              </label>
            </RadioGroup>
          </section>

          <section className="rounded-md border border-purple-200 bg-slate-50 p-4 text-sm">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="mt-3 space-y-1">
              <p>Yearbook: ${pricing.yearbookAmount}</p>
              <p>{adLabel(form.congratsSize)}: ${pricing.adAmount}</p>
              <p className="pt-2 text-base font-semibold">Total: ${pricing.total}</p>
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-purple-700 px-8 py-3 text-base font-semibold text-white shadow-md transition hover:bg-purple-800 md:w-auto"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting..." : "Submit Order"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
