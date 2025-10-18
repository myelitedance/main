// /components/Modal.tsx
"use client";
import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, title, children }: ModalProps) {
  // Optional: light scroll lock only when open (don't fight the inner scroll area)
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-label={title || "Dialog"}
    >
      {/* Dimmer */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
      />

      {/* Panel: DO NOT set overflow-hidden here; let child (form) scroll */}
      <div className="relative w-full sm:max-w-lg pointer-events-auto px-3 sm:px-0">
        <div className="relative bg-white rounded-2xl shadow-xl">
          {/* Optional header */}
          {title && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          )}

          {/* Content (child should be the scroll area) */}
          {children}
        </div>
      </div>
    </div>
  );
}