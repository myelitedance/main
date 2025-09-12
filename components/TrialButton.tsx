// Example usage
"use client";
import { useState } from "react";
import Modal from "./Modal";
import BookTrialForm from "./BookTrialForm";

export default function TrialButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="px-5 py-3 rounded-5xl bg-dance-while text-purple" onClick={() => setOpen(true)}>
        Book a Free Trial
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Find the Perfect Class">
        <BookTrialForm />
      </Modal>
    </>
  );
}