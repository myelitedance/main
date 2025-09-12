"use client";
import { useState } from "react";

export default function LoginModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-dance-purple to-dance-pink text-white px-6 py-2 rounded-full font-semibold text-base shadow-lg hover:scale-105 transition-all"
      >
        Login
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 relative">
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 text-2xl"
            >
              &times;
            </button>

            {/* Heading */}
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Login to Your Account
            </h3>

            {/* Options */}
            <div className="space-y-4">
              <button
                onClick={() =>
                  (window.location.href =
                    "https://portal.akadadance.com/signup?schoolId=100")
                }
                className="w-full bg-gradient-to-r from-dance-purple to-dance-pink text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all"
              >
                New Dancer
              </button>
              <button
                onClick={() =>
                  (window.location.href =
                    "https://portal.akadadance.com/auth?schoolId=100")
                }
                className="w-full bg-gradient-to-r from-dance-purple to-dance-pink text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all"
              >
                Returning Dancer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}