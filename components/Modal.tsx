// /components/Modal.tsx
"use client";
import { ReactNode, useEffect } from "react";

export default function Modal({
  open,
  onClose,
  children,
  title = "Book Your Free Trial",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  // Optional: lock page scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Panel wrapper: allow pointer events, margins on mobile */}
      <div className="relative w-full sm:max-w-xl mx-4 sm:mx-0 pointer-events-auto">
        {/* Panel: header fixed, content scrolls */}
        <div className="flex flex-col rounded-3xl bg-white shadow-xl">
          {/* Header (non-scrolling) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              className="rounded-full p-2 text-gray-500 hover:text-gray-800"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Scrollable content area */}
          <div
            className="
              px-6 py-5
              max-h-[calc(100dvh-6rem)] sm:max-h-[85vh]
              overflow-y-auto overscroll-contain
              pb-[max(1rem,env(safe-area-inset-bottom))]
              rounded-b-3xl
            "
            style={{
              WebkitOverflowScrolling: "touch", // iOS momentum scroll
              touchAction: "pan-y",            // allow vertical pan
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}