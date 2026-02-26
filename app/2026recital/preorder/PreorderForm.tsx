"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  taxable: boolean;
  is_active: boolean;
};

type PaymentOption = "charge_account" | "pay_now";
type Phase = "cart" | "checkout";
type CalloutTier = "quarter" | "half" | "full";

const CALL_OUT_CHAR_LIMITS: Record<CalloutTier, number> = {
  quarter: 120,
  half: 240,
  full: 360,
};

const CALL_OUT_PHOTO_LIMITS: Record<CalloutTier, number> = {
  quarter: 1,
  half: 2,
  full: 3,
};

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

export default function PreorderForm() {
  const [phase, setPhase] = useState<Phase>("cart");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({});

  const [paymentOption, setPaymentOption] = useState<PaymentOption>("charge_account");
  const [akadaChargeAuthorized, setAkadaChargeAuthorized] = useState(false);

  const [calloutMessage, setCalloutMessage] = useState("");
  const [calloutPhotos, setCalloutPhotos] = useState<File[]>([]);

  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoadingProducts(true);
      setError("");
      try {
        const res = await fetch("/api/2026recital/products", { cache: "no-store" });
        const data = (await res.json()) as { products?: Product[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to load products");

        if (!cancelled) {
          const nextProducts = (data.products || []).filter((p) => p.is_active);
          setProducts(nextProducts);
          setQtyByProduct((prev) => {
            const next: Record<string, number> = {};
            for (const p of nextProducts) next[p.id] = prev[p.id] || 0;
            return next;
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load products");
        }
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedItems = useMemo(() => {
    return products
      .map((p) => ({ product: p, quantity: qtyByProduct[p.id] || 0 }))
      .filter((row) => row.quantity > 0);
  }, [products, qtyByProduct]);

  const detectedCalloutTiers = useMemo(() => {
    const tiers = selectedItems
      .map((row) => detectCalloutTier(row.product.name))
      .filter((x): x is CalloutTier => Boolean(x));
    return [...new Set(tiers)];
  }, [selectedItems]);

  const activeCalloutTier = detectedCalloutTiers.length === 1 ? detectedCalloutTiers[0] : null;

  const summary = useMemo(() => {
    const subtotalCents = selectedItems.reduce((sum, row) => sum + row.product.price_cents * row.quantity, 0);
    return {
      subtotalCents,
      totalItems: selectedItems.reduce((sum, row) => sum + row.quantity, 0),
    };
  }, [selectedItems]);

  function setQty(productId: string, nextQty: number) {
    setQtyByProduct((prev) => ({ ...prev, [productId]: Math.max(0, nextQty) }));
  }

  function validateCartPhase(): string | null {
    if (selectedItems.length === 0) return "Select at least one product.";

    if (detectedCalloutTiers.length > 1) {
      return "Select only one dancer callout size at a time.";
    }

    if (activeCalloutTier) {
      const calloutLine = selectedItems.find((row) => detectCalloutTier(row.product.name) === activeCalloutTier);
      if (!calloutLine) return null;

      if (calloutLine.quantity !== 1) {
        return "Dancer callout quantity must be 1.";
      }

      const maxChars = CALL_OUT_CHAR_LIMITS[activeCalloutTier];
      const maxPhotos = CALL_OUT_PHOTO_LIMITS[activeCalloutTier];

      if (!calloutMessage.trim()) {
        return "Enter the dancer callout message before checkout.";
      }

      if (calloutMessage.trim().length > maxChars) {
        return `Callout message must be ${maxChars} characters or less for this size.`;
      }

      if (calloutPhotos.length > maxPhotos) {
        return `You can upload up to ${maxPhotos} photo${maxPhotos === 1 ? "" : "s"} for this callout size.`;
      }

      for (const file of calloutPhotos) {
        if (file.size > 10 * 1024 * 1024) {
          return `File ${file.name} exceeds 10MB.`;
        }
      }

      const totalBytes = calloutPhotos.reduce((sum, f) => sum + f.size, 0);
      if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
        return "Total upload size is too large. Please use smaller photos (about 4MB total max).";
      }
    }

    return null;
  }

  function validateCheckoutPhase(): string | null {
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

    return null;
  }

  function proceedToCheckout() {
    setError("");
    const msg = validateCartPhase();
    if (msg) {
      setError(msg);
      return;
    }
    setPhase("checkout");
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cartValidation = validateCartPhase();
    if (cartValidation) {
      setError(cartValidation);
      return;
    }

    const checkoutValidation = validateCheckoutPhase();
    if (checkoutValidation) {
      setError(checkoutValidation);
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
      fd.set(
        "items",
        JSON.stringify(selectedItems.map((row) => ({ productId: row.product.id, quantity: row.quantity })))
      );

      if (activeCalloutTier) {
        fd.set("calloutTier", activeCalloutTier);
        fd.set("calloutMessage", calloutMessage.trim());
        for (const file of calloutPhotos) {
          fd.append("calloutPhotos", file);
        }
      }

      const res = await fetch("/api/2026recital/preorder", {
        method: "POST",
        body: fd,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        payNowUrl?: string | null;
      };

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      if (paymentOption === "pay_now" && data.payNowUrl) {
        window.location.assign(data.payNowUrl);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Received</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">
            Thank you. Your order has been submitted and a confirmation email was sent.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recital Preorder Checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loadingProducts && <p className="text-sm text-slate-600">Loading products...</p>}

        {!loadingProducts && (
          <>
            <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">Select Products</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {products.map((p) => {
                  const qty = qtyByProduct[p.id] || 0;
                  return (
                    <div key={p.id} className="rounded-md border bg-white p-3">
                      {p.image_url ? (
                        <div className="relative mb-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-md border bg-white p-2">
                          <img src={p.image_url} alt={p.name} className="max-h-full max-w-full object-contain" />
                        </div>
                      ) : (
                        <div className="mb-3 flex h-40 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
                          Example image spot
                        </div>
                      )}

                      <p className="font-semibold text-slate-900">{p.name}</p>
                      {p.description && <p className="mt-1 text-xs text-slate-600">{p.description}</p>}
                      <p className="mt-2 text-sm font-medium text-purple-700">
                        {dollars(p.price_cents)} {p.taxable ? "+ tax" : "(no tax)"}
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <Button type="button" variant="outline" size="icon" onClick={() => setQty(p.id, qty - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input value={qty} readOnly className="w-16 text-center" />
                        <Button type="button" variant="outline" size="icon" onClick={() => setQty(p.id, qty + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

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

            {activeCalloutTier && phase === "cart" && (
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
                    <Label htmlFor="calloutPhotos">
                      Photos (up to {CALL_OUT_PHOTO_LIMITS[activeCalloutTier]})
                    </Label>
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

            {phase === "cart" && (
              <Button
                type="button"
                onClick={proceedToCheckout}
                className="w-full rounded-md bg-purple-700 px-8 py-3 text-base font-semibold text-white shadow-md transition hover:bg-purple-800 md:w-auto"
              >
                Checkout
              </Button>
            )}

            {phase === "checkout" && (
              <form onSubmit={submitOrder} className="space-y-6">
                <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">Contact Details</h3>
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

                <section className="rounded-md border border-purple-200 bg-slate-50 p-4 text-sm">
                  <h3 className="font-semibold">Order Summary</h3>
                  <p className="mt-2">Items selected: {summary.totalItems}</p>
                  <p>Subtotal: {dollars(summary.subtotalCents)}</p>
                  <p className="text-xs text-slate-500">Tax and final total are calculated at submit.</p>
                </section>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setPhase("cart")}>
                    Back
                  </Button>

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
            )}
          </>
        )}

        {error && phase === "cart" && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
