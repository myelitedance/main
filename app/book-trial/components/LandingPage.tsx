"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "./ui/Button";

/* MARKETING TACTICS APPLIED:
  1. Value Stacking: We list "Tour", "Consult", "Gift" as line items with value.
  2. Risk Reversal: "No Credit Card Required" & "100% Beginner Friendly".
  3. Future Pacing: "Imagine your child..." copy.
  4. FAQ Accordion: Handles objections immediately (dress code, watching, etc).
*/

export default function LandingStep({ onStart }: { onStart: () => void }) {
  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100">
      
      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-72 md:h-80 bg-dance-purple">
        <Image 
          src="/assets/mini-movers.jpg" 
          alt="Happy dancer at Elite Dance" 
          fill
          className="object-cover opacity-40 mix-blend-overlay"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dance-purple/90 via-dance-purple/60 to-transparent flex flex-col justify-end p-6 md:p-10 text-center md:text-left">
          <span className="inline-block bg-dance-pink text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3 self-center md:self-start shadow-sm">
            Limited Time Offer
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-2 drop-shadow-md">
            Give Your Child the Gift of Confidence
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl font-medium">
            Claim your <span className="text-dance-gold font-bold">VIP Trial Experience</span> at Nolensville’s favorite family studio.
          </p>
        </div>
      </div>

      {/* --- THE OFFER / VALUE STACK --- */}
      <div className="p-6 md:p-10">
        <div className="flex flex-col md:flex-row gap-10 items-start">
          
          {/* LEFT: The "What You Get" Stack */}
          <div className="w-full md:w-1/2 space-y-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900">
                What's Included in Your Visit?
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                (Total Value: <span className="line-through">$75.00</span> — <span className="text-dance-purple font-bold">Yours FREE</span>)
              </p>
            </div>

            <div className="space-y-4">
              <BenefitItem 
                title="Full 45-60 Minute Class" 
                value="$25 Value"
                desc="Your dancer will jump right in, make friends, and learn real steps from day one."
              />
              <BenefitItem 
                title="1-on-1 Parent Consultation" 
                value="$30 Value"
                desc="We’ll sit down to discuss your child's goals and find the perfect schedule for your family."
              />
              <BenefitItem 
                title="Official Welcome Gift Bag" 
                value="$10 Value"
                desc="A special treat just for your dancer to celebrate their first day!"
              />
              <BenefitItem 
                title="Studio Tour & Dress Code Guide" 
                value="$10 Value"
                desc="Get acclimated with our facility and learn exactly what they need to shine."
              />
            </div>
          </div>

          {/* RIGHT: The Call to Action & Urgency */}
          <div className="w-full md:w-1/2 bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-dance-purple text-center">
                Secure Your Spot Today
              </h3>
              <p className="text-gray-600 text-center text-sm">
                Classes are kept small for personal attention. Spots fill up on a first-come, first-served basis!
              </p>
              
              {/* The Big Button */}
              <Button onClick={onStart} className="w-full text-lg py-4 shadow-lg hover:shadow-xl transform transition hover:-translate-y-1 animate-pulse-slow">
                Claim My Free Trial Pass →
              </Button>
              
              <p className="text-center text-xs text-gray-400">
                No credit card required • 100% Risk Free
              </p>
            </div>

            {/* Mini Testimonial */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <div className="flex justify-center text-dance-gold mb-2 text-lg">★★★★★</div>
              <p className="text-gray-600 italic text-sm">
                "We tried other studios, but Elite feels like home. My daughter walked out of her trial class beaming!"
              </p>
              <p className="text-gray-900 font-bold text-xs mt-2">— Sarah J., Nolensville Mom</p>
            </div>
          </div>
        </div>

        {/* --- FAQ SECTION (New) --- */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Common Questions for New Families
          </h3>
          <p className="text-center text-gray-500 mb-8">
            (a.k.a. The part where we read your mind)
          </p>

          <div className="space-y-3">
            <FaqItem 
              isOpen={openFaq === 0} 
              onClick={() => toggleFaq(0)}
              q="What should my child wear to the trial?"
              a="Comfort is key! Leggings and a t-shirt are perfect. If they have dance shoes, great—if not, socks or bare feet work just fine for the first day."
            />
            <FaqItem 
              isOpen={openFaq === 1} 
              onClick={() => toggleFaq(1)}
              q="Do I need to stay during the class?"
              a="For young dancers (ages 2-6), we ask parents to stay in our comfortable lobby. You'll be able to peek in on the fun! Ideally, we want them to focus on the teacher, but we know new places can be scary."
            />
            <FaqItem 
              isOpen={openFaq === 2} 
              onClick={() => toggleFaq(2)}
              q="Is there any obligation to join?"
              a="None at all! We believe you should experience our culture before committing. If it's not the right fit, no hard feelings (but we think you'll love it!)."
            />
            <FaqItem 
              isOpen={openFaq === 3} 
              onClick={() => toggleFaq(3)}
              q="My child is shy. Is that okay?"
              a="Absolutely. Our teachers are experts at welcoming shy dancers. We never force them to participate; sometimes 'watching' is the first step to 'doing'!"
            />
          </div>
        </div>

        {/* --- FINAL CTA --- */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Ready to see your child shine?
          </p>
          <button 
            onClick={onStart}
            className="text-dance-purple font-bold hover:underline text-lg"
          >
            Click here to start booking now
          </button>
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS FOR CLEANLINESS ---

function BenefitItem({ title, value, desc }: { title: string, value: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-1">
        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-gray-900">{title}</h4>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md border border-gray-200">
            {value}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}

function FaqItem({ isOpen, onClick, q, a }: { isOpen: boolean, onClick: () => void, q: string, a: string }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button 
        onClick={onClick}
        className="w-full flex justify-between items-center p-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800">{q}</span>
        <span className={`transform transition-transform text-dance-purple ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 leading-relaxed animate-fade-in">
          {a}
        </div>
      )}
    </div>
  );
}