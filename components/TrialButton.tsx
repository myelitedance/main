// /components/TrialButton.tsx
"use client";

import { useState } from "react";
import Modal from "./Modal";
import BookTrialForm from "./BookTrialForm";

type Props = {
  /** "small" = hero pill; "big" = wide CTA card */
  variant?: "small" | "big";
  /** Optional custom label */
  label?: string;
  mode?: "book" | "help";
};

export default function TrialButton({ variant = "small", label = "Book Your Trial", mode = "book" }: Props) {
  const [open, setOpen] = useState(false);

  const base = "font-semibold transition-all transform hover:scale-105";
  const styles =
    variant === "small"
      ? "bg-white text-dance-purple px-8 py-4 rounded-full text-lg hover:bg-gray-100 dance-shadow"
      : "w-full max-w-2xl bg-gradient-to-r from-dance-purple to-dance-pink text-white py-5 px-8 rounded-2xl text-2xl text-center shadow-lg";

  return (
    <>
      <button className={`${base} ${styles}`} onClick={() => setOpen(true)}>
        {label}
      </button>

      <Modal 
        open={open} 
        onClose={() => setOpen(false)} 
        title={mode === "help" ? "Need help choosing a class?" : "Book Your Trial"}
        >
        <BookTrialForm
          key={open ? "form-open" : "form-closed"} // 👈 this forces a remount
          mode={mode}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}