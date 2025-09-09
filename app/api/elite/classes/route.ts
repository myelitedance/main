// /app/api/elite/classes/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // TODO: Replace with Akada v3 fetch + cache; filter to current season/open spots
  const classes = [
    { id: "cls_mm_34_mon_930", name: "Mini Movers (3–4)", ageMin: 3, ageMax: 4, day: "Mon", time: "9:30 AM" },
    { id: "cls_pb_45_wed_400", name: "Pre-Ballet (4–5)", ageMin: 4, ageMax: 5, day: "Wed", time: "4:00 PM" },
    { id: "cls_hh_56_thu_500", name: "Hip Hop Kids (5–6)", ageMin: 5, ageMax: 6, day: "Thu", time: "5:00 PM" },
    { id: "cls_jl_79_tue_600", name: "Jazz/Lyrical I (7–9)", ageMin: 7, ageMax: 9, day: "Tue", time: "6:00 PM" },
  ];

  // helpful for debugging: add a response header to show it’s from stub
  return NextResponse.json({ classes }, { headers: { "x-source": "stub-static" } });
}