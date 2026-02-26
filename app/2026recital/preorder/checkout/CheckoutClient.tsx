"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  taxable: boolean;
  xero_account_code: string;
  xero_tax_type: string;
};

type DraftItem = { productId: string; quantity: number };
type PaymentOption = "charge_account" | "pay_now";
type CalloutTier = "quarter" | "half" | "full";

const CALL_OUT_CHAR_LIMITS: Record<CalloutTier, number> = { quarter: 120, half: 240, full: 360 };
const CALL_OUT_PHOTO_LIMITS: Record<CalloutTier, number> = { quarter: 1, half: 2, full: 3 };
const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024;

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function detectCalloutTier(name: string): CalloutTier | null {
  const n = name.toLowerCase();
  const isCallout = n.includes("callout") || n.includes("congrat");
  if (!isCallout) return null;
  if (n.includes("1/4") || n.includes("quarter")) return "quarter";
  if (n.includes("1/2") || n.includes("half")) return "half";
  if (n.includes("full")) return "full";
  return null;
}

export default function CheckoutClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [productsById, setProductsById] = useState<Map<string, Product>>(new Map());
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const [paymentOption, setPaymentOption] = useState<PaymentOption>("charge_account");
  const [akadaChargeAuthorized, setAkadaChargeAuthorized] = useState(false);

  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [calloutMessage, setCalloutMessage] = useState("");
  const [calloutPhotos, setCalloutPhotos] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError("");

      try {
        const raw = typeof window !== "undefined" ? window.sessionStorage.getItem("recital_checkout_draft") : null;
        if (!raw) throw new Error("No cart draft found. Start from preorder page.");

        const parsed = JSON.parse(raw) as { items?: DraftItem[] };
        const items = Array.isArray(parsed.items) ? parsed.items.filter((i) => i.quantity > 0 && i.productId) : [];
        if (items.length === 0) throw new Error("No items in cart. Start from preorder page.");

        const res = await fetch("/api/2026recital/products", { cache: "no-store" });
        const data = (await res.json()) as { products?: Product[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to load products.");

        const map = new Map<string, Product>((data.products || []).map((p) => [p.id, p]));

        const missing = items.some((i) => !map.has(i.productId));
        if (missing) throw new Error("One or more selected products are no longer available.");

        if (!cancelled) {
          setDraftItems(items);
          setProductsById(map);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Checkout initialization failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRows = useMemo(() => {
    return draftItems
      .map((i) => ({ item: i, product: productsById.get(i.productId) }))
      .filter((x): x is { item: DraftItem; product: Product } => Boolean(x.product));
  }, [draftItems, productsById]);

  const summary = useMemo(() => {
    const subtotalCents = selectedRows.reduce((sum, r) => sum + r.product.price_cents * r.item.quantity, 0);
    const taxableCents = selectedRows
      .filter((r) => r.product.taxable)
      .reduce((sum, r) => sum + r.product.price_cents * r.item.quantity, 0);
    return { subtotalCents, taxableCents, totalItems: selectedRows.reduce((sum, r) => sum + r.item.quantity, 0) };
  }, [selectedRows]);

  const calloutRows = useMemo(() => {
    return selectedRows
      .map((r) => ({ row: r, tier: detectCalloutTier(r.product.name) }))
      .filter((x): x is { row: { item: DraftItem; product: Product }; tier: CalloutTier } => Boolean(x.tier));
  }, [selectedRows]);

  const uniqueCalloutTiers = useMemo(() => [...new Set(calloutRows.map((c) => c.tier))], [calloutRows]);
  const activeCalloutTier = uniqueCalloutTiers.length === 1 ? uniqueCalloutTiers[0] : null;

  function validate(): string | null {
    if (selectedRows.length === 0) return "No items selected.";

    if (!parentFirstName.trim() || !parentLastName.trim() || !parentEmail.trim() || !parentPhone.trim()) {
      return "Please complete all required contact fields.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim())) {
      return "Please enter a valid email.";
    }

    if (parentPhone.replace(/\D/g, "").length < 10) {
      return "Please enter a valid phone number.";
    }

    if (paymentOption === "charge_account" && !akadaChargeAuthorized) {
      return "You must authorize account charging to submit this order.";
    }

    if (uniqueCalloutTiers.length > 1) {
      return "Select only one dancer callout size at a time.";
    }

    if (activeCalloutTier) {
      const maxChars = CALL_OUT_CHAR_LIMITS[activeCalloutTier];
      const maxPhotos = CALL_OUT_PHOTO_LIMITS[activeCalloutTier];

      const calloutQty = calloutRows[0]?.row.item.quantity ?? 0;
      if (calloutQty !== 1) return "Dancer callout quantity must be 1.";

      if (!calloutMessage.trim()) return "Enter the dancer callout message.";
      if (calloutMessage.trim().length > maxChars) {
        return `Callout message must be ${maxChars} characters or less.`;
      }

      if (calloutPhotos.length > maxPhotos) {
        return `You can upload up to ${maxPhotos} photo${maxPhotos === 1 ? "" : "s"} for this callout size.`;
      }

      for (const f of calloutPhotos) {
        if (f.size > 10 * 1024 * 1024) return `File ${f.name} exceeds 10MB.`;
      }

      const totalBytes = calloutPhotos.reduce((sum, f) => sum + f.size, 0);
      if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
        return "Total upload size is too large. Please use smaller photos (about 4MB total max).";
      }
    }

    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.set("paymentOption", paymentOption);
      fd.set("akadaChargeAuthorized", String(akadaChargeAuthorized));
      fd.set("parentFirstName", parentFirstName.trim());
      fd.set("parentLastName", parentLastName.trim());
      fd.set("parentEmail", parentEmail.trim());
      fd.set("parentPhone", parentPhone.trim());
      fd.set("items", JSON.stringify(selectedRows.map((r) => ({ productId: r.product.id, quantity: r.item.quantity }))));

      if (activeCalloutTier) {
        fd.set("calloutTier", activeCalloutTier);
        fd.set("calloutMessage", calloutMessage.trim());
        for (const file of calloutPhotos) fd.append("calloutPhotos", file);
      }

      const res = await fetch("/api/2026recital/preorder", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string; payNowUrl?: string | null };

      if (!res.ok) throw new Error(data.error || "Submission failed.");

      if (paymentOption === "pay_now" && data.payNowUrl) {
        window.location.assign(data.payNowUrl);
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("recital_checkout_draft");
      }

      router.replace("/2026recital/preorder/thankyou");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-slate-600">Loading checkout...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-purple-700">Selected Items</h3>
          <ul className="space-y-1 text-sm text-slate-800">
            {selectedRows.map((r) => (
              <li key={r.product.id}>
                {r.product.name} x{r.item.quantity} — {dollars(r.product.price_cents * r.item.quantity)}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">Subtotal: {dollars(summary.subtotalCents)}</p>
          <p className="text-xs text-slate-500">Tax is calculated at submit based on product tax flags and configured tax rate.</p>
        </section>

        {activeCalloutTier && (
          <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">Dancer Callout Details</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="calloutMessage">
                  Message ({calloutMessage.length}/{CALL_OUT_CHAR_LIMITS[activeCalloutTier]})
                </Label>
                <Textarea
                  id="calloutMessage"
                  value={calloutMessage}
                  maxLength={CALL_OUT_CHAR_LIMITS[activeCalloutTier]}
                  onChange={(e) => setCalloutMessage(e.target.value)}
                  placeholder="Enter exactly what should be printed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calloutPhotos">Photos (up to {CALL_OUT_PHOTO_LIMITS[activeCalloutTier]})</Label>
                <Input
                  id="calloutPhotos"
                  type="file"
                  accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                  multiple
                  onChange={(e) => setCalloutPhotos(Array.from(e.target.files || []))}
                />
                <p className="text-xs text-slate-600">JPG, PNG, HEIC. Max 10MB each, ~4MB combined request size limit.</p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">Payment Option</h3>
          <RadioGroup value={paymentOption} onValueChange={(v) => setPaymentOption(v as PaymentOption)}>
            <label className="flex items-center gap-3 rounded border bg-white p-3">
              <RadioGroupItem value="charge_account" id="pay-charge" />
              <span>Charge my studio account</span>
            </label>
            <label className="flex items-center gap-3 rounded border bg-white p-3">
              <RadioGroupItem value="pay_now" id="pay-now" />
              <span>Pay Now</span>
            </label>
          </RadioGroup>
        </section>

        <form onSubmit={onSubmit} className="space-y-6">
          <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">Contact Info</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parentFirstName">Name (First) *</Label>
                <Input id="parentFirstName" value={parentFirstName} onChange={(e) => setParentFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentLastName">Name (Last) *</Label>
                <Input id="parentLastName" value={parentLastName} onChange={(e) => setParentLastName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentEmail">Email *</Label>
                <Input id="parentEmail" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Phone *</Label>
                <Input id="parentPhone" inputMode="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />
              </div>
            </div>
          </section>

          {paymentOption === "charge_account" && (
            <label className="flex items-center gap-3 rounded border bg-white p-3">
              <Checkbox checked={akadaChargeAuthorized} onCheckedChange={(c) => setAkadaChargeAuthorized(c === true)} />
              <span className="text-sm">
                I authorize Elite Dance to apply charges to my studio account and charge my card on file.
              </span>
            </label>
          )}

          <div className="flex gap-3">
            <Link href="/2026recital/preorder" className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium">
              Back to Cart
            </Link>

            <Button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-purple-700 px-8 py-3 text-base font-semibold text-white shadow-md transition hover:bg-purple-800"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {paymentOption === "charge_account"
                ? (submitting ? "Submitting..." : "Submit Order")
                : (submitting ? "Processing..." : "Pay Now")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
