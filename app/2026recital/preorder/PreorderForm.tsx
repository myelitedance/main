"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  taxable: boolean;
  is_active: boolean;
};

type CustomerType = "akada" | "guest";

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PreorderForm() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({});

  const [customerType, setCustomerType] = useState<CustomerType>("akada");
  const [akadaChargeAuthorized, setAkadaChargeAuthorized] = useState(false);

  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [payNowUrl, setPayNowUrl] = useState<string | null>(null);
  const [payNowStatus, setPayNowStatus] = useState<"not_needed" | "synced" | "failed">("not_needed");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoadingProducts(true);
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

  const summary = useMemo(() => {
    const subtotalCents = selectedItems.reduce((sum, row) => sum + row.product.price_cents * row.quantity, 0);
    return { subtotalCents, totalItems: selectedItems.reduce((sum, row) => sum + row.quantity, 0) };
  }, [selectedItems]);

  function setQty(productId: string, nextQty: number) {
    setQtyByProduct((prev) => ({ ...prev, [productId]: Math.max(0, nextQty) }));
  }

  function validate(): string | null {
    if (selectedItems.length === 0) return "Select at least one product.";
    if (!parentFirstName.trim() || !parentLastName.trim() || !parentEmail.trim() || !parentPhone.trim()) {
      return "Please complete all required contact fields.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim())) {
      return "Please enter a valid email.";
    }
    if (parentPhone.replace(/\D/g, "").length < 10) {
      return "Please enter a valid phone number.";
    }
    if (customerType === "akada" && !akadaChargeAuthorized) {
      return "You must authorize charge to the card on file.";
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
      const payload = {
        customerType,
        paymentOption: customerType === "akada" ? "charge_account" : "pay_now",
        akadaChargeAuthorized,
        parentFirstName: parentFirstName.trim(),
        parentLastName: parentLastName.trim(),
        parentEmail: parentEmail.trim(),
        parentPhone: parentPhone.trim(),
        items: selectedItems.map((row) => ({ productId: row.product.id, quantity: row.quantity })),
      };

      const res = await fetch("/api/2026recital/preorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>Thank you. We emailed your confirmation and copied the front desk.</p>
          {payNowStatus === "synced" && payNowUrl && (
            <p>
              Payment link: <a href={payNowUrl} target="_blank" rel="noreferrer" className="font-semibold text-purple-700 underline">Open Xero checkout</a>
            </p>
          )}
          {payNowStatus === "failed" && (
            <p className="text-amber-700">We could not generate a payment link automatically. Front desk will follow up.</p>
          )}
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
          <form onSubmit={onSubmit} className="space-y-8">
            <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">1. Select Products</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {products.map((p) => {
                  const qty = qtyByProduct[p.id] || 0;

                  return (
                    <div key={p.id} className="rounded-md border bg-white p-3">
                      {p.image_url ? (
                        <div className="relative mb-3 h-40 w-full overflow-hidden rounded-md bg-slate-100">
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
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
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">2. Account Type</h3>
              <RadioGroup value={customerType} onValueChange={(v) => setCustomerType(v as CustomerType)}>
                <label className="flex items-center gap-3 rounded border bg-white p-3">
                  <RadioGroupItem value="akada" id="acct-akada" />
                  <span>I have an Akada studio account</span>
                </label>
                <label className="flex items-center gap-3 rounded border bg-white p-3">
                  <RadioGroupItem value="guest" id="acct-guest" />
                  <span>I do not have an Akada account</span>
                </label>
              </RadioGroup>

              {customerType === "akada" && (
                <label className="mt-3 flex items-center gap-3 rounded border bg-white p-3">
                  <Checkbox checked={akadaChargeAuthorized} onCheckedChange={(c) => setAkadaChargeAuthorized(c === true)} />
                  <span className="text-sm">I authorize Elite Dance to charge the card on file for this order.</span>
                </label>
              )}

              {customerType === "guest" && (
                <p className="mt-3 text-sm text-slate-700">Guest orders are invoiced through Xero and paid online.</p>
              )}
            </section>

            <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-700">3. Contact Info</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parentFirstName">First Name *</Label>
                  <Input id="parentFirstName" value={parentFirstName} onChange={(e) => setParentFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentLastName">Last Name *</Label>
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

            <section className="rounded-md border border-purple-200 bg-slate-50 p-4 text-sm">
              <h3 className="font-semibold">Order Summary</h3>
              <p className="mt-2">Items selected: {summary.totalItems}</p>
              <p>Subtotal: {dollars(summary.subtotalCents)}</p>
              <p className="text-xs text-slate-500">Final tax and total are calculated at submit.</p>
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
        )}
      </CardContent>
    </Card>
  );
}
