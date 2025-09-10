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
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}