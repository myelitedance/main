'use client';

import React, { useState } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  Heart,
  Calendar,
  ArrowRight
} from 'lucide-react';

// ===============================================
// CLASS DATA – 2026 STRUCTURE (CLEAN + INTENTIONAL)
// ===============================================
const CLASS_DATA = {
  "pre-dance": {
    title: "Pre-Dance",
    ages: "Ages 2–5",
    description:
      "A joyful introduction to movement, rhythm, and classroom structure. Dancers explore ballet, tap, and tumbling while building confidence and coordination.",
    image: "/api/placeholder/600/400",
    levels: [
      {
        name: "Pre-Dance",
        schedule: ["Mon 3:30 PM", "Sat 9:00 AM"],
        spots: 6
      }
    ]
  },

  "foundations": {
    title: "Dance Foundations",
    ages: "Ages 6–8",
    description:
      "Ballet-based training that builds strong technique, musicality, and discipline. This is where structured dance education begins.",
    image: "/api/placeholder/600/400",
    levels: [
      {
        name: "Ballet & Jazz",
        schedule: ["Tue 4:00 PM", "Thu 4:00 PM"],
        spots: 8
      }
    ]
  },

  "skill-development": {
    title: "Skill Development",
    ages: "Ages 8–11",
    description:
      "Dancers strengthen technique, coordination, and consistency while exploring additional styles in a supportive environment.",
    image: "/api/placeholder/600/400",
    levels: [
      {
        name: "Jazz & Contemporary",
        schedule: ["Mon 5:30 PM", "Wed 5:30 PM"],
        spots: 6
      }
    ]
  },

  "performance-readiness": {
    title: "Performance Readiness",
    ages: "Ages 11–14",
    description:
      "Focused training for dancers ready to grow in performance quality, musicality, and accountability. Team opportunities become available at this stage.",
    image: "/api/placeholder/600/400",
    levels: [
      {
        name: "Performance Training",
        schedule: ["Tue 6:30 PM", "Thu 6:30 PM"],
        spots: 4
      }
    ]
  },

  "advanced-training": {
    title: "Advanced Technique",
    ages: "Ages 14+",
    description:
      "High-level technical training emphasizing refinement, artistry, and commitment for dedicated dancers.",
    image: "/api/placeholder/600/400",
    levels: [
      {
        name: "Advanced Ballet & Jazz",
        schedule: ["Mon 7:30 PM"],
        spots: 3
      }
    ]
  },

  "elite-mentorship": {
    title: "Elite Mentorship",
    ages: "Invitation",
    description:
      "Leadership-focused training for advanced dancers. Opportunities include student teaching, mentorship, and paid assistance to help offset dance expenses.",
    image: "/api/placeholder/600/400",
    levels: [
      {
        name: "Mentorship Track",
        schedule: ["Wed 7:30 PM"],
        spots: 2
      }
    ]
  },

  "adult-dance": {
    title: "Adult Dance",
    ages: "Ages 18+",
    description:
      "Dance for adults who want to move, reconnect, and enjoy music in a welcoming, pressure-free environment. No experience required—just a willingness to show up.",
    image: "/api/placeholder/600/400",
    levels: [
      {
        name: "Adult Ballet & Movement",
        schedule: ["Tue 7:30 PM"],
        spots: 12
      },
      {
        name: "Adult Jazz & Contemporary",
        schedule: ["Thu 7:30 PM"],
        spots: 14
      }
    ]
  }
};

// ===============================================
// NAVIGATION
// ===============================================
const Navigation = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 bg-black/90 backdrop-blur-md border-b border-[#8032ff]/30">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] to-[#8032ff] uppercase italic">
          Elite Dance & Music
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#classes" className="text-white hover:text-[#ff00ff]">Classes</a>
          <a href="#about" className="text-white hover:text-[#ff00ff]">About</a>
          <a href="#contact" className="bg-[#ff00ff] px-6 py-2 rounded-full text-white font-bold hover:bg-[#8032ff]">
            Get Stared
          </a>
        </div>

        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-black px-6 pb-4 space-y-2">
          <a href="#classes" className="block text-white">Classes</a>
          <a href="#about" className="block text-white">About</a>
          <a href="#contact" className="block text-[#ff00ff] font-bold">Get Started</a>
        </div>
      )}
    </nav>
  );
};

// ===============================================
// HERO
// ===============================================
const Hero = () => (
  <section className="h-screen bg-black flex items-center justify-center text-center relative">
    {/*<div className="absolute inset-0 bg-gradient-to-tr from-[#8032ff]/30 to-[#ff00ff]/30 blur-3xl"></div>*/}
    <div className="relative z-10 max-w-4xl px-4">
      <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] via-white to-[#8032ff] drop-shadow-[0_0_25px_rgba(255,0,255,0.4)]">
        EXPRESSION
        </span>
        <span className="block text-4xl md:text-5xl font-light mt-2">WITHOUT LIMITS</span>
      </h1>
      <p className="text-gray-300 text-xl">
        Encouraged. Supported. Cheered for.
        <br />
        <span className="text-[#ff00ff] font-semibold">Find your place at Elite Dance.</span>
      </p>
       <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
        <button className="px-8 py-4 bg-[#ff00ff] text-white font-bold rounded-full hover:bg-[#8032ff] transition-all shadow-[0_0_20px_rgba(255,0,255,0.4)]">
            Get Started Now
        </button>
      </div>
    </div>
  </section>
);

// ===============================================
// CLASS CARD
// ===============================================
const ClassCard = ({ data }: any) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div
        className="h-56 bg-cover bg-center relative cursor-pointer"
        style={{ backgroundImage: `url(${data.image})` }}
        onClick={() => setOpen(!open)}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>
        <div className="absolute bottom-4 left-4">
          <span className="bg-[#8032ff] px-3 py-1 rounded-full text-xs font-bold text-white">
            {data.ages}
          </span>
          <h3 className="text-2xl font-bold text-white mt-2">{data.title}</h3>
        </div>
        <div className="absolute bottom-4 right-4 text-white">
          {open ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>

      <div className="p-6">
        <p className="text-gray-400 mb-4">{data.description}</p>

        {open && (
          <div className="space-y-3">
            {data.levels.map((lvl: any, i: number) => (
              <div key={i} className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg">
                <div>
                  <div className="text-white font-medium">{lvl.name}</div>
                  <div className="text-xs text-gray-400">{lvl.schedule.join(', ')}</div>
                </div>
                <button className="bg-[#8032ff] px-4 py-2 text-xs font-bold rounded hover:bg-[#ff00ff]">
                  Select
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===============================================
// ABOUT
// ===============================================
const About = () => (
  <section id="about" className="py-24 bg-zinc-950">
    <div className="max-w-5xl mx-auto text-center text-gray-400">
      <h2 className="text-4xl font-black text-white mb-6">
        HEART OF <span className="text-[#8032ff]">EXPRESSION</span>
      </h2>
      <p className="mb-4">
        Dance is a powerful outlet for creativity, confidence, and growth. At Elite Dance,
        dancers are encouraged, supported, and challenged at every stage.
      </p>
      <p>
        We believe expression doesn’t have an age limit—dance is for anyone willing to move,
        grow, and belong.
      </p>
    </div>
  </section>
);

// ===============================================
// PAGE
// ===============================================
export default function Page2026() {
  return (
    <div className="bg-zinc-950 text-white">
      <Navigation />
      <Hero />

      <section id="classes" className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-black text-center mb-12">
          FIND YOUR <span className="text-[#ff00ff]">RHYTHM</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {Object.values(CLASS_DATA).map((data: any, i) => (
            <ClassCard key={i} data={data} />
          ))}
        </div>
      </section>

      <About />
    </div>
  );
}
