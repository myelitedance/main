export type RecitalDate = {
  label: string;
  dateLabel: string;
  timeLabel?: string;
  note?: string;
};

export type RecitalVenue = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  notes?: string;
  mapEmbedUrl: string;
  mapLinkUrl: string;
  photoUrls: string[];
};

export type PictureWeekInfo = {
  heading: string;
  summary: string;
  windows: RecitalDate[];
};

export type SponsorshipInfo = {
  heading: string;
  details: string;
  formIntro: string;
};

export type RecitalPolicy = {
  title: string;
  detail: string;
};

export type RecitalRecord = {
  slug: string;
  title: string;
  season: string;
  intro: string;
  venue: RecitalVenue;
  keyDates: RecitalDate[];
  pictureWeek: PictureWeekInfo;
  policies: RecitalPolicy[];
  storeUrl: string;
  storeLabel: string;
  sponsorship: SponsorshipInfo;
};

export const DEFAULT_RECITAL_SLUG = "2026";

export const recitals: RecitalRecord[] = [
  {
    slug: "2026",
    title: "Elite Dance 2026 Recital Information",
    season: "2026 Recital Season",
    intro:
      "Use this page as your single source of truth for recital logistics, important dates, venue details, and recital store access.",
    venue: {
      name: "The Village Church",
      addressLine1: "7224 Old Burkitt Rd",
      addressLine2: "Nolensville, TN 37135",
      notes: "Venue details updated from the 2026 recital contract (updated 2/11/2026).",
      mapEmbedUrl:
        "https://www.google.com/maps?q=The+Village+Church+7224+Old+Burkitt+Rd+Nolensville+TN+37135&output=embed",
      mapLinkUrl:
        "https://www.google.com/maps/search/?api=1&query=The+Village+Church+7224+Old+Burkitt+Rd+Nolensville+TN+37135",
      photoUrls: [],
    },
    keyDates: [
      {
        label: "Dress Rehearsal",
        dateLabel: "Friday, May 1, 2026",
        timeLabel: "4:00 PM - 8:00 PM",
        note: "Required for all recital participants.",
      },
      {
        label: "Show Day",
        dateLabel: "Saturday, May 2, 2026",
        timeLabel: "Show starts at 2:00 PM (event block 1:00 PM - 4:00 PM)",
      },
    ],
    pictureWeek: {
      heading: "Recital Picture Weeks",
      summary:
        "Recital photos will be taken at Elite Dance during picture week. Class-by-class time slots will be shared separately.",
      windows: [
        {
          label: "Picture Week",
          dateLabel: "Saturday, February 28, 2026 - Thursday, March 5, 2026",
          note: "Please watch studio communication for your class-specific time.",
        },
      ],
    },
    policies: [
      {
        title: "Balance & Costume Deadline",
        detail:
          "Full recital balance must be paid by January 15 to avoid costume delays and possible additional shipping charges.",
      },
      {
        title: "Refund Policy",
        detail:
          "No refunds or credits are available after January 15 because custom recital items are ordered.",
      },
      {
        title: "Dress Rehearsal Requirement",
        detail:
          "Dancers must attend dress rehearsal to perform in recital (extenuating circumstances may be reviewed).",
      },
      {
        title: "Account Standing",
        detail:
          "Families with an outstanding tuition or recital balance after April 10 are not eligible to participate.",
      },
    ],
    storeUrl: "/2026recital/preorder",
    storeLabel: "Go to 2026 Recital Store",
    sponsorship: {
      heading: "Sponsorship Opportunities",
      details:
        "Interested in supporting our recital program through business sponsorships or program ad placements?",
      formIntro: "Submit the form below and our team will contact you with sponsorship options and deadlines.",
    },
  },
];

export function getRecitalBySlug(slug: string): RecitalRecord | undefined {
  return recitals.find((recital) => recital.slug === slug);
}
