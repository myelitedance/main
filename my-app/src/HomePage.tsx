import React from "react"

export default function HomePage() {
  return (
    <main className="text-gray-800">
      {/* Hero Section */}
      <section className="bg-orange-100 py-16 px-6 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Elite Dance & Music
        </h1>
        <p className="text-lg max-w-3xl mx-auto">
          Nolensville’s home for passionate performers — honoring the past,
          inspiring the future.
        </p>
      </section>

      {/* Why Elite Section */}
      <section className="py-16 px-6 bg-white text-center">
        <h2 className="text-3xl font-semibold mb-6">💫 Why Elite?</h2>
        <ul className="max-w-3xl mx-auto space-y-4 text-lg">
          <li>✅ A safe and uplifting environment</li>
          <li>✅ Coaches and mentors who care</li>
          <li>✅ A place where kids grow in confidence and creativity</li>
        </ul>
      </section>

      {/* Programs Section */}
      <section className="py-16 px-6 bg-gray-50 text-center">
        <h2 className="text-3xl font-semibold mb-6">🩰 Our Programs</h2>
        <ul className="text-lg space-y-2">
          <li>• Recreational Dance (Ages 3–18)</li>
          <li>• Competitive Teams</li>
          <li>• Private Coaching</li>
          <li>• Music Lessons (Coming Soon!)</li>
        </ul>
        <p className="mt-4 text-sm italic">
          All skill levels welcome. Everyone has a place at Elite.
        </p>
      </section>

      {/* What’s New Section */}
      <section className="py-16 px-6 bg-white text-center">
        <h2 className="text-3xl font-semibold mb-6">📣 What’s New?</h2>
        <p className="max-w-3xl mx-auto text-lg">
          Elite Dance & Music is under new ownership — the Pond family — bringing
          20+ years of small business leadership and a deep love for the arts.
        </p>
        <ul className="mt-6 space-y-2 text-lg">
          <li>• Building on Cheri’s legacy</li>
          <li>• Creating a culture of excellence and belonging</li>
          <li>• Growing for the next generation</li>
        </ul>
      </section>

      {/* Registration Section */}
      <section className="py-16 px-6 bg-orange-50 text-center">
        <h2 className="text-3xl font-semibold mb-6">
          📅 Registration Now Open!
        </h2>
        <p className="text-lg mb-2">
          Join us for the 2025–2026 season — space is limited!
        </p>
        <ul className="text-lg space-y-1">
          <li>✅ Makeup team auditions in August</li>
          <li>✅ Calendar updates and events coming soon</li>
        </ul>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6 bg-gray-100 text-center">
        <h2 className="text-3xl font-semibold mb-6">👋 Let’s Connect</h2>
        <p className="text-lg">
          Got questions? Want a tour or a coffee chat?
        </p>
        <div className="mt-4 space-y-2 text-lg">
          <p>📧 <a href="mailto:jason@myelitedance.com" className="text-orange-600 underline">jason@myelitedance.com</a></p>
          <p>📧 <a href="mailto:tashara@myelitedance.com" className="text-orange-600 underline">tashara@myelitedance.com</a></p>
          <p>📍 Located inside the Nolensville Commons</p>
        </div>
      </section>
    </main>
  )
}