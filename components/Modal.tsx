"use client";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, title, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl h-[90vh] md:h-[85vh] bg-white rounded-3xl shadow flex flex-col overflow-hidden"
      >
        {/* Header (fixed) */}
        <div className="flex items-center justify-between p-5 border-b bg-white">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button
            aria-label="Close"
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body container – we'll put the form here */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}