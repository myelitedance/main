"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  initialStatus: "pending" | "paid";
};

export default function PaymentStatusSelect({ orderId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "paid">(initialStatus);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function onChange(next: "pending" | "paid") {
    setStatus(next);
    setError("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/2026recital/preorder/admin/payment-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paymentStatus: next }),
        });

        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Update failed.");

        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Update failed.";
        setError(message);
        setStatus((prev) => (prev === "paid" ? "pending" : "paid"));
      }
    });
  }

  return (
    <div className="space-y-1">
      <select
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        value={status}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value === "paid" ? "paid" : "pending")}
      >
        <option value="pending">pending</option>
        <option value="paid">paid</option>
      </select>
      {error && <div className="text-xs text-red-700">{error}</div>}
    </div>
  );
}
