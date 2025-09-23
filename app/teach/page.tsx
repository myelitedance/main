// =============================
// app/teach/page.tsx
// =============================
"use client";
import React, { useState } from "react";
import Link from "next/link";

// Tailwind color note:
// Your tailwind.config.js should include these custom colors to match Elite Dance & Music brand.
// theme.extend.colors = {
//   'dance-purple': '#8B5CF6',
//   'dance-pink': '#EC4899',
//   'dance-blue': '#3B82F6',
//   'dance-gold': '#F59E0B',
//   'dance-green': '#32B486'
// }

export default function TeachApplyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setSuccess("Thanks! Your application was sent.");
      form.reset();
      setFileName("");
    } catch (err: any) {
      setError(err.message || "We couldn't send your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-white text-gray-900">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-dance-pink/10 text-dance-pink text-sm font-semibold">
            We’re hiring instructors
          </span>
          <h1 className="mt-6 text-4xl md:text-5xl font-extrabold leading-tight">
            Share your talent. <span className="text-dance-purple">Inspire the next generation.</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Elite Dance & Music in Nolensville is growing—join a supportive, creative faculty that celebrates students and teachers alike.
          </p>
          <a href="#apply" className="mt-8 inline-block bg-dance-purple hover:bg-dance-pink transition text-white font-semibold px-8 py-3 rounded-xl shadow">
            Apply to Teach
          </a>
        </div>
      </section>

      {/* Why Teach */}
      <section className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8">Why teach at Elite?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { t: "Supportive Culture", d: "Kind, organized, and uplifting. You’ll feel part of a team." },
              { t: "Flexible Scheduling", d: "After-school/evening blocks, with some morning options." },
              { t: "Creative Freedom", d: "Bring your style while aligning with our recital direction." },
              { t: "Growing Enrollment", d: "New classes & private lessons opening as we expand." },
              { t: "Clear Communication", d: "Expectations, subs list, and quick responses." },
              { t: "Impact that Matters", d: "Help students grow in skill and confidence." },
            ].map((card, i) => (
              <div key={i} className="p-6 rounded-2xl border bg-white">
                <h3 className="font-semibold text-lg">{card.t}</h3>
                <p className="text-gray-600 mt-2">{card.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8">Open roles & typical hours</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border">
              <h3 className="font-semibold text-xl text-dance-purple">Dance Instructor</h3>
              <p className="text-gray-600 mt-2">Ballet • Tap • Jazz/Lyrical • Hip Hop • Contemporary • Acro</p>
              <p className="text-gray-600 mt-2"><strong>Hours:</strong> Mon–Thu late afternoon/evening; Sat mornings as needed.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border">
              <h3 className="font-semibold text-xl text-dance-blue">Voice Instructor</h3>
              <p className="text-gray-600 mt-2">Beginner–intermediate voice; performance and audition prep.</p>
              <p className="text-gray-600 mt-2"><strong>Hours:</strong> Afternoons/evenings; some daytime availability ideal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* What We're Looking For */}
      <section className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-6">What we’re looking for</h2>
          <ul className="grid md:grid-cols-2 gap-3 text-gray-700">
            <li>• Great with kids/teens; positive classroom energy</li>
            <li>• Reliable, punctual, and collaborative</li>
            <li>• Lesson planning & safe, age-appropriate choreography</li>
            <li>• Aligns recital pieces with studio direction</li>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {["Apply online", "Quick intro chat", "Demo/try-out"].map((title, i) => (
              <div key={i} className="p-6 bg-white rounded-2xl border">
                <div className={"text-sm font-semibold " + (i === 0 ? "text-dance-purple" : i === 1 ? "text-dance-pink" : "text-dance-blue")}>Step {i + 1}</div>
                <h3 className="font-semibold text-lg mt-1">{title}</h3>
                <p className="text-gray-600 mt-2">
                  {i === 0 && "Tell us your disciplines, availability, and experience."}
                  {i === 1 && "We’ll compare openings with your strengths."}
                  {i === 2 && "Show us your teaching style with a short class."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application */}
      <section id="apply" className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold">Apply to Teach</h2>
          <p className="text-gray-600 mt-2">We can’t wait to meet you!</p>

          <form onSubmit={onSubmit} className="mt-8 grid gap-4 text-left bg-gray-50 p-6 rounded-2xl" encType="multipart/form-data">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <input name="firstName" required className="mt-1 w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <input name="lastName" required className="mt-1 w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" name="email" required className="mt-1 w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input name="phone" className="mt-1 w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Disciplines</label>
              <select name="disciplines" className="mt-1 w-full border rounded-lg px-3 py-2">
                <option>Dance - Ballet</option>
                <option>Dance - Tap</option>
                <option>Dance - Jazz/Lyrical</option>
                <option>Dance - Hip Hop</option>
                <option>Dance - Contemporary</option>
                <option>Dance - Acro</option>
                <option>Voice</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Availability</label>
              <textarea name="availability" rows={3} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="e.g., Mon–Thu 4–8pm; Sat mornings" />
            </div>
            <div>
              <label className="text-sm font-medium">Link to resume or teaching reel (optional)</label>
              <input name="links" className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="URL to Drive, Dropbox, YouTube, etc." />
            </div>

            {/* New: Upload a file to attach to the email */}
            <div>
              <label className="text-sm font-medium">Upload resume (PDF, DOCX, up to 10MB)</label>
              <input
                type="file"
                name="attachment"
                accept=".pdf,.doc,.docx,.rtf,.txt,.jpg,.jpeg,.png"
                className="mt-1 w-full border rounded-lg px-3 py-2 bg-white"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
              />
              {fileName && (
                <p className="text-xs text-gray-500 mt-1">Selected: {fileName}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex items-center justify-center bg-dance-blue hover:bg-dance-purple transition text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Submit application"}
            </button>
            <input type="hidden" name="source" value="teach-page" />
          </form>

          {success && <p className="text-sm text-dance-green mt-4">{success}</p>}
          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <p className="text-sm text-gray-500 mt-4">
            Prefer email? Send your resume to {" "}
            <a className="text-dance-blue underline" href="mailto:info@myelitedance.com">info@myelitedance.com</a>
          </p>
        </div>
      </section>

      {/* Small footer CTA */}
      <section className="py-10 bg-gray-100">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-700">
            Questions? Message us on Facebook or email {" "}
            <a className="text-dance-blue underline" href="mailto:info@myelitedance.com">info@myelitedance.com</a>.
          </p>
        </div>
      </section>

      {/* Global Footer (minimal stub—link to your real component/footer) */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent mb-4">Elite Dance & Music</h3>
              <p className="text-gray-300 mb-4">Nurturing dancers of all ages with world-class training in a warm, family-friendly environment in Nolensville, TN.</p>
              <div className="flex space-x-4 text-sm">
                <Link href="https://www.facebook.com/profile.php?id=61573876559298" className="text-gray-400 hover:text-white transition-colors">Facebook</Link>
                <Link href="https://www.instagram.com/elitedancetn/" className="text-gray-400 hover:text-white transition-colors">Instagram</Link>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link href="/#about" className="hover:text-dance-purple transition-colors">About</Link></li>
                <li><Link href="/#classes" className="hover:text-dance-purple transition-colors">Classes</Link></li>
                <li><Link href="/calendar" className="hover:text-dance-purple transition-colors">Calendar</Link></li>
                <li><Link href="/team" className="hover:text-dance-purple transition-colors">Meet the Team</Link></li>
                <li><Link href="/#contact" className="hover:text-dance-purple transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="text-gray-300 space-y-2 text-sm">
                <p>7177 Nolensville Rd Suite B-3</p>
                <p>Nolensville, TN</p>
                <p>(615) 776-4202</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
              <span>© {new Date().getFullYear()} Elite Dance & Music</span>
              <Link href="/privacy-policy" className="hover:text-dance-purple underline">Privacy Policy</Link>
              <Link href="/terms-and-conditions" className="hover:text-dance-purple underline">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
