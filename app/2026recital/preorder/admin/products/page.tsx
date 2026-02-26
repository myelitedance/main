"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  taxable: boolean;
  xero_account_code: string;
  xero_tax_type: string;
  is_active: boolean;
  sort_order: number;
};

export default function PreorderProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [priceDollars, setPriceDollars] = useState("");
  const [taxable, setTaxable] = useState(false);
  const [xeroAccountCode, setXeroAccountCode] = useState("");
  const [xeroTaxType, setXeroTaxType] = useState("NONE");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("100");

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2026recital/products?includeInactive=1", { cache: "no-store" });
      const data = (await res.json()) as { products?: Product[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load products");
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setImageUrl("");
    setImageFile(null);
    setPriceDollars("");
    setTaxable(false);
    setXeroAccountCode("");
    setXeroTaxType("NONE");
    setIsActive(true);
    setSortOrder("100");
  }

  function beginEdit(p: Product) {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description || "");
    setImageUrl(p.image_url || "");
    setImageFile(null);
    setPriceDollars((p.price_cents / 100).toFixed(2));
    setTaxable(p.taxable);
    setXeroAccountCode(p.xero_account_code);
    setXeroTaxType(p.xero_tax_type || (p.taxable ? "OUTPUT" : "NONE"));
    setIsActive(p.is_active);
    setSortOrder(String(p.sort_order));
  }

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Name is required");
    if (!xeroAccountCode.trim()) return setError("Xero account code is required");

    const priceCents = Math.round(Number(priceDollars || 0) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) return setError("Invalid price");

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("description", description.trim());
    fd.set("imageUrl", imageUrl.trim());
    if (imageFile) fd.set("imageFile", imageFile);
    fd.set("priceCents", String(priceCents));
    fd.set("taxable", String(taxable));
    fd.set("xeroAccountCode", xeroAccountCode.trim());
    fd.set("xeroTaxType", xeroTaxType.trim() || (taxable ? "OUTPUT" : "NONE"));
    fd.set("isActive", String(isActive));
    fd.set("sortOrder", sortOrder || "100");

    const url = editingId ? `/api/2026recital/products/${editingId}` : "/api/2026recital/products";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, { method, body: fd });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }

    resetForm();
    await loadProducts();
  }

  async function deactivate(productId: string) {
    const res = await fetch(`/api/2026recital/products/${productId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to deactivate product");
      return;
    }
    await loadProducts();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Preorder Products</h1>
        <Link href="/2026recital/preorder/admin" className="text-sm font-medium text-purple-700 underline">
          Back to Orders
        </Link>
      </div>

      <form onSubmit={submitProduct} className="mb-8 space-y-4 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">{editingId ? "Edit Product" : "Add Product"}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Price (USD) *</Label>
            <Input value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} placeholder="20.00" required />
          </div>

          <div className="space-y-2">
            <Label>Xero Account Code *</Label>
            <Input value={xeroAccountCode} onChange={(e) => setXeroAccountCode(e.target.value)} placeholder="Yearbook" required />
          </div>

          <div className="space-y-2">
            <Label>Xero Tax Type *</Label>
            <Input value={xeroTaxType} onChange={(e) => setXeroTaxType(e.target.value)} placeholder={taxable ? "OUTPUT" : "NONE"} required />
          </div>

          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Or Upload Image</Label>
            <Input type="file" accept="image/*" onChange={(e) => setImageFile((e.target.files && e.target.files[0]) || null)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <label className="flex items-center gap-2">
            <Checkbox checked={taxable} onCheckedChange={(c) => setTaxable(c === true)} />
            <span className="text-sm">Taxable</span>
          </label>

          <label className="flex items-center gap-2">
            <Checkbox checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
            <span className="text-sm">Active</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Update Product" : "Create Product"}</Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Tax</th>
              <th className="px-3 py-2">Xero</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-3 py-3" colSpan={6}>Loading...</td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.description || "No description"}</p>
                  </td>
                  <td className="px-3 py-2">${(p.price_cents / 100).toFixed(2)}</td>
                  <td className="px-3 py-2">{p.taxable ? "Taxed" : "No Tax"}</td>
                  <td className="px-3 py-2">
                    <div>{p.xero_account_code}</div>
                    <div className="text-xs text-gray-500">{p.xero_tax_type}</div>
                  </td>
                  <td className="px-3 py-2">{p.is_active ? "Active" : "Inactive"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(p)}>
                        Edit
                      </Button>
                      {p.is_active && (
                        <Button type="button" size="sm" variant="outline" onClick={() => deactivate(p.id)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
