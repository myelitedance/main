"use client";
import { useState } from "react";
import BookTrialForm from "./BookTrialForm";

export default function TrialButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-dance-purple to-dance-pink text-white
                   px-8 py-4 rounded-full font-semibold text-xl
                   hover:scale-105 transition-all dance-shadow"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Book your FREE trial class
      </button>

      {open && <BookTrialForm onClose={() => setOpen(false)} />}
    </>
  );
}