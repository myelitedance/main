import Image from "next/image";
import type { Metadata } from "next";

/**
 * Elite Dance & Music — Meet the Team (Next.js / React, Server Component)
 * - Directors featured on top, instructors (Mini-Movers first), owners at bottom
 * - No "use client" so metadata export is allowed
 * - Uses <details>/<summary> for expandable bios (no client state needed)
 */

const brand = {
  purple: "#8B5CF6",
  pink: "#EC4899",
  blue: "#3B82F6",
};

export type Person = {
  id: string;
  name: string;
  headshot: string;
  roles: string[];
  categories?: string[];
  bio: string;
  isOwner?: boolean;
  isFeaturedDirector?: boolean;
  social?: { instagram?: string; facebook?: string };
};

// --- Data (replace with CMS later) ---
const TEAM: Person[] = [
  {
    id: "kiana",
    name: "Kiana Renae",
    headshot: "/images/Kiana_Renae.jpg",
    roles: ["Dance Team Director", "Dance Instructor"],
    categories: ["Contemporary"],
    isFeaturedDirector: true,
    bio:
      "Kiana Renae is a dance educator, adjudicator, and coach from Southern New Hampshire. She trained with Saving Grace Dance Ensemble and Boston Community Dance Project, performing in NYC and Boston at venues like Alvin Ailey Studios and Times Square. She toured the Northeast teaching and managing events for Step Up 2 Dance and has adjudicated for KAR, NexStar, and Sheer Elite. Now based in Nashville with Fresh Talent Group, Kiana is also an ICF-certified life coach, musician, and board member of Satellite School of the Arts. Her passion is inspiring others through dance, music, and storytelling.",
  },
  {
    id: "lisa-hays",
    name: "Lisa Hays",
    headshot: "/images/lisa_hays.webp",
    roles: ["Dance Instructor"],
    categories: ["Mini-Movers"],
    bio:
      "Lisa began dancing at the age of four with The Dorothy Frankovitch School of Theatrical Arts in Las Vegas, Nevada. By the age of ten, she was giving solo performances in pointe and flamenco dance... Ms. Lisa believes that every dancer should have a strong foundation in ballet and pulls her teaching style mainly from the Russian Vaganova school. Besides teaching at Elite, Lisa is currently competing in Irish dance and gives private lessons in flute, piano, and harp.",
  },
  {
    id: "stacia-simonsen",
    name: "Stacia Simonsen",
    headshot: "/images/stacia_simonsen.webp",
    roles: ["Dance Instructor"],
    categories: ["Creative Movement"],
    bio:
      "Stacia Simonsen trained in modern dance and ballet with The Young DanceMakers and Classical Ballet Conservatory in Utah. She studied children's dance teaching methods in college, majoring in Humanities and minoring in Modern Dance... She has taught dance and preschool in Nolensville since 2021.",
  },
  {
    id: "molly-pena",
    name: "Molly Pena",
    headshot: "/images/Molly_Pena.jpeg",
    roles: ["Dance Instructor"],
    categories: ["Contemporary"],
    bio:
      "Molly holds an MFA in Dance from the University of Arizona and a BA in Dance Performance from Chapman University. She has taught at Gus Giordano Jazz Dance School, CSUF, Grossmont College, and MTSU as an adjunct professor. As a performer, Molly was a principal dancer with Royal Flux (NBC's World of Dance) and with Talia Favia’s company, The Difference Between.",
  },
  {
    id: "kylie-koeppen",
    name: "Kylie Koeppen",
    headshot: "/images/Kylie_Koeppen.webp",
    roles: ["Dance Instructor"],
    categories: ["Jazz", "Contemporary"],
    bio:
      "Kylie is a Nashville-based professional dancer and instructor with training from Joffrey Ballet School’s Jazz & Contemporary trainee program. She teaches multiple styles across the city and performs with Fresh Talent Group.",
  },
  {
    id: "maggie-pelton",
    name: "Maggie Pelton",
    headshot: "/images/Mag Headshot.jpg",
    roles: ["Dance Instructor"],
    categories: ["Ballet", "Modern"],
    bio:
      "Maggie grew up with New Jersey Ballet and holds a BFA from The Juilliard School with additional training at the Martha Graham and José Limón schools. She danced with Ailey II and Alvin Ailey American Dance Theater and currently teaches across Nashville including Belmont University and Lipscomb University.",
  },
  {
    id: "jason-pond",
    name: "Jason Pond",
    headshot: "/images/Jason_Bio_Pic.jpg",
    roles: ["Co-Owner"],
    isOwner: true,
    bio:
      "Jason is one half of the leadership duo behind Elite Dance & Music. A visionary entrepreneur with a passion for helping people grow, he brings energy, creativity, and big-picture thinking to the studio. He’s all about building a space where kids thrive and families feel at home.",
  },
  {
    id: "tashara-pond",
    name: "Tashara Pond",
    headshot: "/images/Tashara_Bio_Pic.jpg",
    roles: ["Co-Owner"],
    isOwner: true,
    bio:
      "Tashara is the heart and calm center of Elite Dance & Music. With a head for details and a heart for people, she keeps everything running smoothly behind the scenes—finances, operations, and team support—all with grace.",
  },
];

// --- Sorting helpers ---
const CATEGORY_PRIORITY = [
  "Mini-Movers",
  "Creative Movement",
  "Ballet",
  "Jazz",
  "Tap",
  "Contemporary",
  "Hip Hop",
  "Acro",
];

function byCategoryPriority(a?: string[], b?: string[]) {
  const pa = a?.length ? CATEGORY_PRIORITY.indexOf(a[0]) : 999;
  const pb = b?.length ? CATEGORY_PRIORITY.indexOf(b[0]) : 999;
  return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
}

// --- UI bits (server-friendly) ---
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl sm:text-4xl font-semibold text-center mb-10 bg-gradient-to-r from-dance-purple to-dance-pink bg-clip-text text-transparent">
      {children}
    </h2>
  );
}

function Bio({ text }: { text: string }) {
  return (
    <details>
      <summary className="mt-3 cursor-pointer text-dance-purple font-semibold hover:underline">
        More...
      </summary>
      <p className="text-gray-700 leading-relaxed mt-2">{text}</p>
    </details>
  );
}

function Card({ person }: { person: Person }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col sm:flex-row gap-8 items-center">
      <div className="sm:w-1/2 w-full">
        <div className="relative w-full max-w-md aspect-[4/5] mx-auto">
          <Image
            src={person.headshot}
            alt={person.name}
            fill
            className="object-cover rounded-xl"
            sizes="(max-width: 768px) 90vw, 40vw"
            priority={person.isFeaturedDirector}
          />
        </div>
      </div>
      <div className="sm:w-1/2 w-full">
        <h3 className="text-2xl font-semibold text-dance-purple">{person.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{person.roles.join(" · ")}</p>
        <Bio text={person.bio} />
      </div>
    </div>
  );
}

function DirectorsHero({ directors }: { directors: Person[] }) {
  if (!directors.length) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
      <div
        className="rounded-3xl p-1"
        style={{
          background: `linear-gradient(135deg, ${brand.purple}, ${brand.pink}, ${brand.blue})`,
        }}
      >
        <div className="bg-white rounded-3xl p-8 sm:p-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-center mb-8 text-dance-purple">
            Meet the Team
          </h1>
          <SectionTitle>Artistic / Dance Team Director</SectionTitle>
          <div className="grid gap-8 md:grid-cols-2">
            {directors.map((p) => (
              <Card key={p.id} person={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Instructors({ instructors }: { instructors: Person[] }) {
  if (!instructors.length) return null;
  const sorted = [...instructors].sort((a, b) => {
    const byCat = byCategoryPriority(a.categories, b.categories);
    if (byCat !== 0) return byCat;
    return a.name.localeCompare(b.name);
  });

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionTitle>Instructors</SectionTitle>
      <div className="grid gap-8 md:grid-cols-2">
        {sorted.map((p) => (
          <Card key={p.id} person={p} />
        ))}
      </div>
    </section>
  );
}

function Owners({ owners }: { owners: Person[] }) {
  if (!owners.length) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <SectionTitle>Studio Owners</SectionTitle>
      <div className="grid gap-8 md:grid-cols-2">
        {owners.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl shadow-xl p-6 flex gap-6 items-center">
            <div className="relative w-32 h-40 flex-shrink-0">
              <Image src={p.headshot} alt={p.name} fill className="object-cover rounded-xl" sizes="128px" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-dance-purple">{p.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{p.roles.join(" · ")}</p>
              <Bio text={p.bio} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export const metadata: Metadata = {
  title: "Meet the Team | Elite Dance & Music Teachers in Nolensville",
  description:
    "Get to know the Elite Dance & Music faculty in Nolensville—experienced, encouraging instructors dedicated to helping dancers grow in skill and confidence.",
  openGraph: {
    title: "Meet the Team | Elite Dance & Music Teachers in Nolensville",
    description:
      "Meet the Elite Dance & Music faculty—experienced, encouraging instructors dedicated to your dancer’s growth.",
    url: "https://www.myelitedance.com/team",
    siteName: "Elite Dance & Music",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet the Team | Elite Dance & Music Teachers in Nolensville",
    description: "Get to know the Elite Dance & Music faculty.",
  },
  themeColor: brand.purple,
};

export default function Page() {
  const directors = TEAM.filter((p) => p.isFeaturedDirector);
  const instructors = TEAM.filter((p) => !p.isOwner && !p.isFeaturedDirector);
  const owners = TEAM.filter((p) => p.isOwner);

  return (
    <main className="bg-gray-50 text-gray-800 pb-16">
      <DirectorsHero directors={directors} />
      <Instructors instructors={instructors} />
      <Owners owners={owners} />
      {/* JSON-LD can be moved to app/layout.tsx if you prefer. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DanceSchool",
            name: "Elite Dance & Music",
            url: "https://www.myelitedance.com/",
            logo: "https://www.myelitedance.com/assets/img/social-card.jpg",
            telephone: "(615) 776-4202",
            address: {
              "@type": "PostalAddress",
              streetAddress: "7177 Nolensville Rd Suite B-3",
              addressLocality: "Nolensville",
              addressRegion: "TN",
              postalCode: "",
              addressCountry: "US",
            },
            sameAs: [
              "https://www.facebook.com/profile.php?id=61573876559298",
              "https://www.instagram.com/elitedancetn/",
            ],
          }),
        }}
      />
    </main>
  );
}