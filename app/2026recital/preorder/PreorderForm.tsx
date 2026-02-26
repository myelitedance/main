"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  taxable: boolean;
  is_active: boolean;
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PreorderForm() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

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
      .map((p) => ({ productId: p.id, quantity: qtyByProduct[p.id] || 0, priceCents: p.price_cents }))
      .filter((row) => row.quantity > 0);
  }, [products, qtyByProduct]);

  const summary = useMemo(() => {
    const subtotalCents = selectedItems.reduce((sum, row) => sum + row.priceCents * row.quantity, 0);
    const totalItems = selectedItems.reduce((sum, row) => sum + row.quantity, 0);
    return { subtotalCents, totalItems };
  }, [selectedItems]);

  function setQty(productId: string, nextQty: number) {
    setQtyByProduct((prev) => ({ ...prev, [productId]: Math.max(0, nextQty) }));
  }

  function goToCheckout() {
    setError("");

    if (selectedItems.length === 0) {
      setError("Select at least one product before checkout.");
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "recital_checkout_draft",
        JSON.stringify({
          items: selectedItems.map(({ productId, quantity }) => ({ productId, quantity })),
          createdAt: Date.now(),
        })
      );
    }

    router.push("/2026recital/preorder/checkout");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loadingProducts && <p className="text-sm text-slate-600">Loading products...</p>}

        {!loadingProducts && (
          <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 md:p-5">
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
        )}

        <section className="rounded-md border border-purple-200 bg-slate-50 p-4 text-sm">
          <h3 className="font-semibold">Current Cart</h3>
          <p className="mt-2">Items selected: {summary.totalItems}</p>
          <p>Subtotal: {dollars(summary.subtotalCents)}</p>
          <p className="text-xs text-slate-500">Tax and final total shown on checkout screen.</p>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="button"
          onClick={goToCheckout}
          className="w-full rounded-md bg-purple-700 px-8 py-3 text-base font-semibold text-white shadow-md transition hover:bg-purple-800 md:w-auto"
        >
          Checkout
        </Button>
      </CardContent>
    </Card>
  );
}
