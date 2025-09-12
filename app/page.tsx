"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TrialButton from "../components/TrialButton";

/* Simple FAQ model */
type FAQ = { q: string; a: string };

const faqs: FAQ[] = [
  {
    q: "What age groups do you serve?",
    a: "We welcome dancers from age 2 through 18! Our Tiny Dancers program starts at age 2, and we have classes for preschoolers, elementary, middle school, high school, and adults. Each age group has specially designed curriculum appropriate for their developmental stage.",
  },
  {
    q: "Do you offer trial classes?",
    a: "Yes! Your first class is always free. We believe it's important for both dancers and parents to experience our studio culture and teaching style before making a commitment. Just contact us to schedule your trial class.",
  },
  {
    q: "What's the difference between recreational and competitive programs?",
    a: "Recreational classes focus on fun, fundamentals, and building a love of dance with one annual recital. Competitive programs involve more intensive training, multiple competitions throughout the year, and require auditions. Both maintain our high standards of instruction - it's about finding the right fit for your dancer's goals and commitment level.",
  },
  {
    q: "What should my child wear to class?",
    a: "Each class has specific dress code requirements that will be provided upon registration. Generally, comfortable fitted clothing that allows for movement, with hair pulled back securely. We have dancewear available for purchase at the studio, and our staff is happy to help new families with dress code questions.",
  },
  {
    q: "Do you offer family discounts?",
    a: "Absolutely! We offer discounts for multiple children from the same family, and we also have payment plan options to help make dance accessible for all families. Contact us to discuss the best options for your family's situation.",
  },
];

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  const yearRange = useMemo(() => "2025–2026", []);

  return (
    <main className="scroll-smooth">
      {/* NAV */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent">
                Elite Dance &amp; Music
              </h1>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <button
                  onClick={() => scrollTo("home")}
                  className="text-dance-purple font-semibold"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollTo("about")}
                  className="text-gray-700 hover:text-dance-purple transition-colors"
                >
                  About
                </button>
                <button
                  onClick={() => scrollTo("classes")}
                  className="text-gray-700 hover:text-dance-purple transition-colors"
                >
                  Classes
                </button>
                <Link
                  href="/calendar.html"
                  className="block px-3 py-2 text-gray-700 hover:text-dance-purple"
                >
                  Calendar
                </Link>
                <Link
                  href="/team.html"
                  className="block px-3 py-2 text-gray-700 hover:text-dance-purple"
                >
                  Meet the Team
                </Link>
                <button
                  onClick={() => scrollTo("contact")}
                  className="text-gray-700 hover:text-dance-purple transition-colors"
                >
                  Contact
                </button>
              </div>
            </div>

            <button
              aria-label="Open menu"
              className="md:hidden p-2"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden ${mobileOpen ? "" : "hidden"} bg-white border-t`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <button
              onClick={() => scrollTo("home")}
              className="text-dance-purple font-semibold underline underline-offset-4"
            >
              Home
            </button>
            <button
              onClick={() => scrollTo("about")}
              className="block px-3 py-2 text-gray-700 hover:text-dance-purple"
            >
              About
            </button>
            <button
              onClick={() => scrollTo("classes")}
              className="block px-3 py-2 text-gray-700 hover:text-dance-purple"
            >
              Classes
            </button>
            <Link
              href="/calendar.html"
              className="block px-3 py-2 text-gray-700 hover:text-dance-purple"
              onClick={() => setMobileOpen(false)}
            >
              Calendar
            </Link>
            <Link
              href="/team.html"
              className="block px-3 py-2 text-gray-700 hover:text-dance-purple"
              onClick={() => setMobileOpen(false)}
            >
              Meet the Team
            </Link>
            <button
              onClick={() => scrollTo("contact")}
              className="block px-3 py-2 text-gray-700 hover:text-dance-purple"
            >
              Contact
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="home"
        className="min-h-screen pt-16 bg-gradient-to-tr from-dance-purple via-dance-pink to-dance-blue flex items-center justify-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/20" />

        {/* Silhouettes */}
        <div className="absolute top-20 left-10 opacity-10">
          <svg width="100" height="120" viewBox="0 0 100 120" fill="white">
            <path d="M50 10 C60 15, 70 25, 65 40 C60 55, 55 70, 50 85 C45 70, 40 55, 35 40 C30 25, 40 15, 50 10 Z" />
            <circle cx="50" cy="8" r="6" />
            <path d="M35 40 C25 45, 15 50, 20 65 M65 40 C75 45, 85 50, 80 65" />
            <path d="M50 85 C45 95, 40 105, 35 115 M50 85 C55 95, 60 105, 65 115" />
          </svg>
        </div>
        <div className="absolute bottom-20 right-10 opacity-10">
          <svg width="80" height="100" viewBox="0 0 80 100" fill="white">
            <path d="M40 5 C45 10, 50 20, 45 30 C40 40, 35 50, 40 65 C45 50, 50 40, 45 30 C50 20, 45 10, 40 5 Z" />
            <circle cx="40" cy="3" r="5" />
            <path d="M25 30 C15 35, 10 40, 15 50 M55 30 C65 35, 70 40, 65 50" />
            <path d="M40 65 C35 75, 30 85, 25 95 M40 65 C45 75, 50 85, 55 95" />
          </svg>
        </div>

        {/* Floating collage */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="hidden md:block absolute top-28 left-[12%] -rotate-[12deg]">
            <div className="bg-gradient-to-br from-dance-purple via-dance-pink to-dance-blue p-1 rounded-2xl shadow-2xl">
              <img
                src="/assets/mini-movers.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                className="block w-[300px] md:w-[340px] lg:w-[380px] h-auto rounded-[14px] object-cover"
              />
            </div>
          </div>
          <div className="hidden md:block absolute top-20 right-[15%] rotate-[10deg]">
            <div className="bg-gradient-to-br from-dance-blue via-dance-purple to-dance-pink p-1 rounded-2xl shadow-2xl">
              <img
                src="/assets/jazz-class.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                className="block w-[220px] md:w-[240px] lg:w-[260px] h-auto rounded-[14px] object-cover"
              />
            </div>
          </div>
          <div className="hidden md:block absolute bottom-20 left-[18%] rotate-[15deg]">
            <div className="bg-gradient-to-br from-dance-green via-dance-blue to-dance-purple p-1 rounded-2xl shadow-2xl">
              <img
                src="/assets/ballet-barre.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                className="block w-[320px] md:w-[360px] lg:w-[400px] h-auto rounded-[14px] object-cover"
              />
            </div>
          </div>
          <div className="hidden lg:block absolute bottom-16 right-[20%] -rotate-[18deg]">
            <div className="bg-gradient-to-br from-dance-pink via-dance-gold to-dance-purple p-1 rounded-2xl shadow-2xl">
              <img
                src="/assets/hiphop-kids.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                className="block w-[320px] md:w-[360px] lg:w-[420px] h-auto rounded-[14px] object-cover"
              />
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            Elite Dance &amp; Music in Nolensville, TN
          </h1>
          <h2 className="text-2xl md:text-3xl mb-8 opacity-90 max-w-2xl mx-auto">
            Where Dreams Take Flight
          </h2>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
            Nurturing dancers of all ages with world-class training in a warm, family-friendly environment
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Replaces “Register Now” with the modal trigger */}
            <TrialButton />
            <button
              onClick={() => scrollTo("about")}
              className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-dance-purple transition-all"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Our Story</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built on a foundation of excellence, community, and the transformative power of dance
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-3xl font-bold text-dance-purple mb-6">
                More Than a Studio — A Place Where Your Child Can Thrive
              </h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                At Elite Dance &amp; Music, <strong>your child is the heart of everything we do</strong>.
              </p>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Founded by the beloved Miss Cheri, our studio has long been a place where young dancers discover their
                passion, grow in confidence, and build lifelong friendships. Her legacy lives on in every class — through
                the values of hard work, grace, and encouragement.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Now under new ownership, our promise to you remains strong: To provide{" "}
                <strong>professional, high-quality dance training</strong> in an uplifting and supportive environment
                where <strong>every student feels seen, challenged, and celebrated</strong>. Whether your child dreams of
                the stage or simply wants to find joy in movement,{" "}
                <strong>Elite is where they can grow — both as dancers and as people.</strong>
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(139,92,246,0.15)]">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-dance-purple to-dance-pink rounded-full mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h4>
                <ul className="text-gray-700 space-y-2">
                  <li>✨ Excellence in every movement</li>
                  <li>🤝 Inclusive, supportive community</li>
                  <li>🌟 Individual growth and confidence</li>
                  <li>❤️ Family-centered approach</li>
                  <li>🎯 Professional training standards</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLASSES */}
      <section id="classes" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Class Offerings</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From recreational joy to competitive excellence - we have the perfect program for every dancer
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16 items-stretch">
            {/* Mini Movers */}
            <Link
              href="/downloads/mini-movers-flyer.pdf"
              target="_blank"
              className="block h-full transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="bg-gradient-to-br from-dance-green to-dance-blue p-8 rounded-2xl text-white shadow-xl cursor-pointer h-full flex flex-col">
                <div className="flex-grow">
                  <h3 className="text-3xl font-bold mb-6">Mini Movers</h3>
                  <p className="mb-6 opacity-90">
                    A weekday creative movement program that blends dance, music, and play in a joyful, nurturing
                    environment. Ideal for children ages 3–6 (must be potty trained).
                  </p>
                  <ul className="space-y-2 opacity-90 mb-6">
                    <li>• Offered M/W/F – 9:01 AM to 12:00 PM</li>
                    <li>• 1 Day – $250/mo | 2 Days – $400/mo | 3 Days – $550/mo</li>
                    <li>• $35/day Annual Supply Fee</li>
                    <li>• $75 Registration per student ($85 per family)</li>
                    <li>• Enrichment Classes included: Art, Music, Tumbling, and Dance</li>
                  </ul>
                </div>
                <div className="mt-auto">
                  <span className="inline-block bg-white text-dance-blue font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-dance-gold hover:text-white transition-colors duration-200">
                    Download the Flyer
                  </span>
                </div>
              </div>
            </Link>

            {/* Recreational */}
            <Link
              href="/downloads/class-list-flyer.pdf"
              target="_blank"
              className="block h-full transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="bg-gradient-to-br from-dance-purple to-dance-pink p-8 rounded-2xl text-white shadow-xl cursor-pointer h-full flex flex-col">
                <div className="flex-grow">
                  <h3 className="text-3xl font-bold mb-6">Recreational Programs</h3>
                  <p className="mb-6 opacity-90">
                    Perfect for dancers who want to explore their passion in a fun, supportive environment. Build
                    confidence, make friends, and develop a lifelong love of dance.
                  </p>
                  <ul className="space-y-2 opacity-90 mb-6">
                    <li>• Ages 2-18</li>
                    <li>• Flexible scheduling options</li>
                    <li>• Performance opportunities</li>
                    <li>• Focus on fun and fundamentals</li>
                  </ul>
                </div>
                <div className="mt-auto">
                  <span className="inline-block bg-white text-dance-purple font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-dance-gold hover:text-white transition-colors duration-200">
                    Download the Flyer
                  </span>
                </div>
              </div>
            </Link>

            {/* Competitive */}
            <Link
              href="/downloads/dance-team-update.pdf"
              target="_blank"
              className="block h-full transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="bg-gradient-to-br from-dance-purple to-dance-green p-8 rounded-2xl text-white shadow-xl cursor-pointer h-full flex flex-col">
                <div className="flex-grow">
                  <h3 className="text-3xl font-bold mb-6">Competitive Programs</h3>
                  <p className="mb-6 opacity-90">
                    For dedicated dancers ready to take their skills to the next level. Intensive training, competition
                    opportunities, and advanced technique development.
                  </p>
                  <ul className="space-y-2 opacity-90 mb-6">
                    <li>• Audition-based placement</li>
                    <li>• Regional and national competitions</li>
                    <li>• Advanced technique training</li>
                    <li>• Scholarship opportunities</li>
                  </ul>
                </div>
                <div className="mt-auto">
                  <span className="inline-block bg-white text-dance-blue font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-dance-gold hover:text-white transition-colors duration-200">
                    Download the Flyer
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Styles grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: "🩰", title: "Ballet", text: "Classical foundation with proper technique, grace, and artistry" },
              { emoji: "👠", title: "Tap", text: "Rhythm, musicality, and precision in this classic American art form" },
              { emoji: "🎭", title: "Jazz", text: "High-energy movement with style, attitude, and performance quality" },
              { emoji: "🎤", title: "Hip Hop", text: "Urban styles with creativity, self-expression, and culture" },
              { emoji: "🤸", title: "Acro", text: "Athletic dance combining tumbling skills with dance technique" },
              { emoji: "✨", title: "& More!", text: "Contemporary, lyrical, musical theater, and specialty workshops" },
            ].map((s) => (
              <div key={s.title} className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-dance-purple rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl">{s.emoji}</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h4>
                <p className="text-gray-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE & REGISTRATION */}
      <section id="schedule" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Schedule &amp; Registration</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to start your dance journey? We make it easy to find the perfect class and get registered
            </p>
          </div>

          <div className="mt-12">
            <h4 className="text-2xl font-bold text-dance-purple mb-4 text-center">📄 View Full Class Schedule</h4>
            <p className="text-gray-700 text-center mb-6">
              Explore our full {yearRange} season schedule right here. Flip through classes, days, and times all in one
              place.
            </p>

            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden shadow-md border border-gray-200">
              <iframe
                src="/downloads/class-list-flyer.pdf#toolbar=0"
                width="100%"
                height="100%"
                className="w-full h-full"
                style={{ border: "none" }}
                title="Class Schedule PDF"
              />
            </div>

            <div className="text-center mt-4">
              <Link
                href="/downloads/class-list-flyer.pdf"
                target="_blank"
                className="inline-block bg-gradient-to-r from-dance-purple to-dance-pink text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition"
              >
                Download Schedule PDF
              </Link>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(139,92,246,0.15)] mt-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Class Information</h3>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-dance-purple mb-2">🗓️ Class Periods</h4>
                <p className="text-gray-700">
                  Fall Session: August - December
                  <br />
                  Spring Session: January - May
                  <br />
                  Summer intensives: June - July
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-dance-purple mb-2">💰 Tuition &amp; Fees</h4>
                <p className="text-gray-700">
                  Competitive rates with family discounts available. Payment plans offered to make dance accessible for
                  all families.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-dance-purple mb-2">👕 Dress Code</h4>
                <p className="text-gray-700">
                  Specific attire requirements by class level. Dancewear available for purchase at the studio.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-dance-purple mb-2">📋 Trial Classes</h4>
                <p className="text-gray-700">
                  First class is always free! Come see if Elite Dance &amp; Music is the right fit for your dancer.
                </p>
              </div>
            </div>

            {/* Big CTA now uses the modal */}
            <div className="flex justify-center mt-12 px-4">
              <div className="className=inline-block bg-gradient-to-r from-dance-purple to-dance-pink text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition">
                <TrialButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQS */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">
              Everything new families want to know about joining Elite Dance &amp; Music
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((f, i) => {
              const open = i === openFaq;
              return (
                <div key={f.q} className="bg-white rounded-lg shadow-sm">
                  <button
                    className="w-full text-left p-6 focus:outline-none"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={`faq-${i}`}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">{f.q}</h3>
                      <svg
                        className={`w-5 h-5 text-gray-500 transform transition-transform ${open ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </button>
                  <div id={`faq-${i}`} className={`${open ? "" : "hidden"} px-6 pb-6`}>
                    <p className="text-gray-700">{f.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Get In Touch</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to join the Elite Dance &amp; Music family? We&apos;d love to hear from you!
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <div className="bg-gray-50 p-8 rounded-2xl mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Studio Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-6 h-6 text-dance-purple mt-1">📍</div>
                    <div className="ml-4">
                      <p className="font-semibold text-gray-900">Location</p>
                      <p className="text-gray-700">
                        7177 Nolensville Rd Suite B-3
                        <br />
                        Nolensville, TN
                        <br />
                        Convenient to Brentwood, Franklin, and surrounding areas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 text-dance-purple mt-1">📞</div>
                    <div className="ml-4">
                      <p className="font-semibold text-gray-900">Phone</p>
                      <p className="text-gray-700">(615) 776-4202</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-dance-purple to-dance-pink p-8 rounded-2xl text-white">
                <h3 className="text-2xl font-bold mb-4">Follow Us</h3>
                <p className="mb-6 opacity-90">
                  Stay connected for class updates, performance videos, and behind-the-scenes moments!
                </p>
                <div className="flex space-x-4">
                  <Link
                    href="https://www.facebook.com/profile.php?id=61573876559298"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.675 0h-21.35C.599 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.325 24h11.49v-9.294H9.69V11.01h3.125V8.413c0-3.1 1.894-4.788 4.66-4.788 1.325 0 2.462.099 2.793.143v3.24h-1.917c-1.504 0-1.796.715-1.796 1.763v2.31h3.587l-.467 3.696h-3.12V24h6.116C23.4 24 24 23.4 24 22.674V1.326C24 .599 23.4 0 22.675 0z" />
                    </svg>
                  </Link>
                  <Link
                    href="https://www.instagram.com/elitedancetn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.95.24 2.408.415a4.92 4.92 0 011.675 1.092 4.92 4.92 0 011.092 1.675c.175.458.361 1.238.415 2.408.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.95-.415 2.408a4.92 4.92 0 01-1.092 1.675 4.92 4.92 0 01-1.675 1.092c-.458.175-1.238.361-2.408.415-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.95-.24-2.408-.415a4.902 4.902 0 01-2.767-2.767c-.175-.458-.361-1.238-.415-2.408C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.95.415-2.408a4.902 4.902 0 012.767-2.767c.458-.175 1.238-.361 2.408-.415C8.416 2.175 8.796 2.163 12 2.163zm0 3.675A6.162 6.162 0 1012 22a6.162 6.162 0 000-12.162zm6.406-1.682a1.44 1.44 0 11-2.881 0 1.44 1.44 0 012.881 0z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Simple contact form posts to /api/contact (kept same behavior) */}
            <div className="bg-gray-50 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Want more information?</h3>
              <ContactMessageForm />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent mb-4">
                Elite Dance &amp; Music
              </h3>
              <p className="text-gray-300 mb-4">
                Nurturing dancers of all ages with world-class training in a warm, family-friendly environment in
                Nolensville, TN.
              </p>
              <div className="flex space-x-4">
                <Link href="https://www.facebook.com/profile.php?id=61573876559298" className="text-gray-400 hover:text-white transition-colors">
                  Facebook
                </Link>
                <Link href="https://www.instagram.com/elitedancetn/" className="text-gray-400 hover:text-white transition-colors">
                  Instagram
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <button onClick={() => scrollTo("about")} className="hover:text-dance-purple transition-colors">
                    About
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo("classes")} className="hover:text-dance-purple transition-colors">
                    Classes
                  </button>
                </li>
                <li>
                  <Link href="/calendar.html" className="hover:text-dance-purple transition-colors">
                    Calendar
                  </Link>
                </li>
                <li>
                  <Link href="/team.html" className="hover:text-dance-purple transition-colors">
                    Meet the Team
                  </Link>
                </li>
                <li>
                  <button onClick={() => scrollTo("contact")} className="hover:text-dance-purple transition-colors">
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="text-gray-300 space-y-2">
                <p>7177 Nolensville Rd Suite B-3</p>
                <p>Nolensville, TN</p>
                <p>(615) 776-4202</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
              <span>&copy; 2025 Elite Dance &amp; Music</span>
              <Link href="/privacy-policy.html" className="hover:text-dance-purple underline">
                Privacy Policy
              </Link>
              <Link href="/terms-and-conditions.html" className="hover:text-dance-purple underline">
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/** CONTACT side form from the bottom of the page (posts to /api/contact like before) */
function ContactMessageForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    parent: "",
    phone: "",
    email: "",
    dancer: "",
    interest: "Trial Class",
    message:
      "Tell us about your dancer's experience level, interests, or any questions you have...",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.parent,
          email: form.email,
          message: `Phone: ${form.phone}\nDancer: ${form.dancer}\nInterested In: ${form.interest}\n\n${form.message}`,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setDone(true);
      setForm({
        parent: "",
        phone: "",
        email: "",
        dancer: "",
        interest: "Trial Class",
        message:
          "Tell us about your dancer's experience level, interests, or any questions you have...",
      });
      setTimeout(() => setDone(false), 4000);
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Parent/Guardian Name</label>
          <input
            value={form.parent}
            onChange={(e) => setForm({ ...form, parent: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dance-purple focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dance-purple focus:border-transparent"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dance-purple focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Dancer&apos;s Name &amp; Age</label>
        <input
          value={form.dancer}
          onChange={(e) => setForm({ ...form, dancer: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dance-purple focus:border-transparent"
          placeholder="e.g., Emma Smith, Age 8"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Interested In</label>
        <select
          value={form.interest}
          onChange={(e) => setForm({ ...form, interest: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dance-purple focus:border-transparent"
        >
          <option>Trial Class</option>
          <option>Recreational Programs</option>
          <option>Competitive Programs</option>
          <option>Schedule Information</option>
          <option>General Questions</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
        <textarea
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dance-purple focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-gradient-to-r from-dance-purple to-dance-pink text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-60"
      >
        {busy ? "Sending..." : "Send Message"}
      </button>
      {done && <p className="text-green-600 font-medium mt-4">Thanks! We&apos;ll be in touch shortly.</p>}
    </form>
  );
}