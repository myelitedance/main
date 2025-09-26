import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      parentFirst,
      parentLast,
      parentPhone,
      email,
      dancerFirst,
      dancerLast,
      age,
      interest,
      notes,
      utm,
      page,
    } = await req.json();

    const GHL_API = "https://services.leadconnectorhq.com";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_KEY        = need("GHL_API_KEY");
const LOCATION_ID    = need("GHL_LOCATION_ID");

    // 1) Upsert the contact (safe if they already exist)
    const upsertRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_KEY}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        LOCATION_ID,
        firstName: parentFirst,
        lastName: parentLast,
        email,
        phone: parentPhone,
        source: utm?.source || "Website",
        tags: ["Website Lead", interest].filter(Boolean),
        // Include dancer info in custom fields if you have them set up in GHL:
        // customFields: [{ id: "<DANCER_FIRST_CF_ID>", value: dancerFirst }, ...]
      }),
    });

    const upsertJson = await upsertRes.json();
    if (!upsertRes.ok) {
      // Surface the upstream error so the client shows your "Something went wrong" path
      return NextResponse.json({ error: upsertJson }, { status: upsertRes.status });
    }

    const contactId =
      upsertJson?.contact?.id || upsertJson?.id || upsertJson?.data?.id; // handle different shapes

    // 2) Add the message as a Note on the contact (so staff can see it in CRM)
    if (contactId && notes) {
      await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_KEY}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          body:
            `${notes}\n\n` +
            `Interest: ${interest}\n` +
            (dancerFirst || dancerLast ? `Dancer: ${[dancerFirst, dancerLast].filter(Boolean).join(" ")}${age ? `, Age ${age}` : ""}\n` : "") +
            (page ? `Page: ${page}\n` : "") +
            (utm?.campaign || utm?.medium || utm?.source
              ? `UTM: ${utm?.source || ""} / ${utm?.medium || ""} / ${utm?.campaign || ""}`
              : ""),
        }),
      });
    }

    return NextResponse.json({ ok: true, contactId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}