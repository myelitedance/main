"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ConnectState = "idle" | "running" | "success" | "error";

export default function PreorderThankYouPage() {
  const params = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");

  const [connectState, setConnectState] = useState<ConnectState>(code ? "running" : "idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!code) return;
    const authCode = code;

    let cancelled = false;

    async function run() {
      setConnectState("running");

      try {
        const url = new URL("/api/xero/connect/complete", window.location.origin);
        url.searchParams.set("code", authCode);
        if (state) url.searchParams.set("state", state);

        const res = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
        });

        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          tenantId?: string;
          tenantName?: string | null;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Xero connection failed");
        }

        if (!cancelled) {
          setConnectState("success");
          setMessage(
            data.tenantName
              ? `Connected to Xero tenant: ${data.tenantName}`
              : `Connected to Xero tenant: ${data.tenantId || "configured"}`
          );
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Xero connection failed";
          setConnectState("error");
          setMessage(msg);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [code, state]);

  const title = useMemo(() => {
    if (connectState === "running") return "Connecting Xero";
    if (connectState === "success") return "Xero Connected";
    if (connectState === "error") return "Xero Connection Error";
    return "Thank You";
  }, [connectState]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>

      {connectState === "idle" && (
        <p className="mt-4 text-sm text-gray-700">
          Thank you for your preorder request. Our team will contact you if anything else is needed.
        </p>
      )}

      {connectState === "running" && (
        <p className="mt-4 text-sm text-gray-700">Finalizing secure Xero connection...</p>
      )}

      {connectState === "success" && (
        <p className="mt-4 text-sm text-green-700">{message}</p>
      )}

      {connectState === "error" && (
        <p className="mt-4 text-sm text-red-700">{message}</p>
      )}

      <div className="mt-8 flex gap-4">
        <Link className="text-sm font-medium text-purple-700 underline" href="/2026recital/preorder/admin">
          Back to Preorder Admin
        </Link>
        <Link className="text-sm font-medium text-purple-700 underline" href="/2026recital/preorder">
          Back to Preorder Form
        </Link>
      </div>
    </main>
  );
}
