"use client";

import Image from "next/image";
import Button from "./ui/Button";
import StepWrapper from "./StepWrapper";

// Reusing your theme colors and typography
export default function LandingStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col md:flex-row max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
      
      {/* LEFT: Emotional Hook & Visual */}
      <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-dance-purple">
        {/* Use one of your existing assets */}
        <Image 
          src="/assets/mini-movers.jpg" 
          alt="Happy dancer at Elite Dance" 
          fill
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dance-purple/90 to-transparent flex flex-col justify-end p-6">
          <p className="text-white font-bold text-lg">
            "My daughter walks out of every class beaming with confidence."
          </p>
          <p className="text-dance-pink text-sm mt-1">— Sarah M., Nolensville Mom</p>
        </div>
      </div>

      {/* RIGHT: The Offer & Logic */}
      <div className="w-full md:w-1/2 p-8 flex flex-col justify-center space-y-6">
        <div className="space-y-2">
          <span className="inline-block bg-dance-pink/10 text-dance-pink text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            100% Free Trial
          </span>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            See Your Child Shine at Elite Dance
          </h1>
          <p className="text-gray-600 text-lg">
            Experience our warm, family-friendly studio culture firsthand. No pressure to join—just dance.
          </p>
        </div>

        {/* Benefits Checklist - Marketing Psychology */}
        <ul className="space-y-3">
          {[
            "Meet our nurturing, professional teachers",
            "Find the perfect class style for their personality",
            "Tour the studio and get dress code help",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-1 min-w-[20px] h-5 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700 text-sm">{item}</span>
            </li>
          ))}
        </ul>

        {/* The "Micro-Commitment" Button */}
        <div className="pt-2">
          <Button onClick={onStart} className="w-full text-lg py-4 shadow-lg hover:shadow-xl transform transition hover:-translate-y-0.5">
            Start My Free Trial Booking
          </Button>
          <p className="text-center text-xs text-gray-400 mt-3">
            Takes less than 60 seconds • Secure Booking
          </p>
        </div>
      </div>
    </div>
  );
}