"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "./ui/Button";

export default function LandingStep({ onStart }: { onStart: () => void }) {
  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100">
      
      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-80 md:h-96 bg-dance-purple">
        <Image 
          src="/assets/mini-movers.jpg" 
          alt="Confident dancer on stage" 
          fill
          className="object-cover opacity-40 mix-blend-overlay"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dance-purple/95 via-dance-purple/70 to-transparent flex flex-col justify-end p-6 md:p-10 text-center md:text-left">
          <span className="inline-block bg-white text-dance-purple text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3 self-center md:self-start shadow-sm">
            Nolensville Parents
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3 drop-shadow-md">
            Transform Your Child Into a <span className="text-dance-gold">Confident Performer</span>
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl font-medium leading-relaxed">
            Building character, creativity, and genuine friendships right here in our community.
          </p>
        </div>
      </div>

      {/* --- THE TRANSFORMATION STACK --- */}
      <div className="p-6 md:p-10">
        <div className="flex flex-col md:flex-row gap-10 items-stretch">
          
          {/* LEFT: The "Outcomes" */}
          <div className="w-full md:w-1/2 space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900">
                See The Difference Dance Makes
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                It’s about so much more than just steps on a stage.
              </p>
            </div>

            <div className="space-y-6">
              <BenefitItem 
                title="Confidence That Soars" 
                desc="Watch them develop new abilities with teachers who genuinely care about their individual growth."
              />
              <BenefitItem 
                title="Character & Discipline" 
                desc="We use age-appropriate challenges to teach the perseverance and dedication that lasts a lifetime."
              />
              <BenefitItem 
                title="Give Them 'Their People'" 
                desc="Real friendships bloom here. Join an encouraging community where your child truly belongs."
              />
            </div>
          </div>

          {/* RIGHT: The Call to Action */}
          <div className="w-full md:w-1/2 bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col justify-center h-auto shadow-inner">
            <div className="space-y-5 text-center">
              <h3 className="text-xl font-bold text-dance-purple">
                Book Your Trial Class
              </h3>
              <p className="text-gray-600 text-sm px-2">
                Come experience the energy, meet the teachers, and see the smiles for yourself.
              </p>
              
              {/* UPDATED CTA: 
                 1. "Find" = Low Friction (Discovery)
                 2. "Your Free Trial" = Matches Ad Offer + Ownership
              */}
              <Button onClick={onStart} className="w-full text-lg py-4 shadow-lg hover:shadow-xl transform transition hover:-translate-y-1 animate-pulse-slow">
                Find Your Trial Class →
              </Button>
              
              <p className="text-xs text-gray-400">
                100% Risk Free • Beginner Friendly
              </p>

              {/* Divider */}
              <div className="w-1/2 mx-auto border-t border-gray-200"></div>

              {/* Mini Testimonial */}
              <div>
                <div className="flex justify-center text-dance-gold mb-1 text-lg">★★★★★</div>
                <p className="text-gray-600 italic text-sm">
                  "My daughter walks out of every class beaming with confidence."
                </p>
                <p className="text-gray-900 font-bold text-xs mt-1">— Sarah M., Nolensville Mom</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- FAQ SECTION --- */}
        <div className="mt-16 max-w-3xl mx-auto border-t border-gray-100 pt-10">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Common Questions
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
              q="My child has never danced before. Is that okay?"
              a="Absolutely! We specialize in beginners. Our teachers are experts at breaking down steps and making new dancers feel confident from minute one."
            />
            <FaqItem 
              isOpen={openFaq === 2} 
              onClick={() => toggleFaq(2)}
              q="Do I need to stay during the class?"
              a="For young dancers (ages 2-6), we ask parents to stay in our lobby. You'll be able to see them, but it helps them focus on the teacher and make new friends!"
            />
            <FaqItem 
              isOpen={openFaq === 3} 
              onClick={() => toggleFaq(3)}
              q="Is there any obligation to join?"
              a="None at all. We want you to experience our studio culture first. If it's a fit, we'd love to have you, but there is zero pressure."
            />
          </div>
        </div>

        {/* --- FOOTER LINK --- */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-2 text-sm">
            Ready to join the Elite family?
          </p>
          <button 
            onClick={onStart}
            className="text-dance-purple font-bold hover:underline"
          >
            Let's find your class
          </button>
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function BenefitItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dance-purple/10 flex items-center justify-center mt-1">
        <svg className="w-5 h-5 text-dance-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {/* Heart Icon for "Care/Love/Passion" vibe */}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <div>
        <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
        <p className="text-gray-600 mt-1 leading-relaxed">
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