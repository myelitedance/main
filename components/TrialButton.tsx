// Example usage
"use client";
import { useState } from "react";
import Modal from "./Modal";
import BookTrialForm from "./BookTrialForm";

export default function TrialButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="px-5 py-3 rounded-2xl bg-dance-blue text-white" onClick={() => setOpen(true)}>
        Book a Free Trial
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Find the Perfect Class">
        <BookTrialForm />
      </Modal>
    </>
  );
}