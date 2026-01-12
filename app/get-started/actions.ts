"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";

const LeadSchema = z
  .object({
    parentFirstName: z.string().min(1, "Parent first name is required").max(60),
    parentLastName: z.string().min(1, "Parent last name is required").max(60),
    parentEmail: z.string().email("Enter a valid email").max(254),

    parentPhone: z.string().optional().or(z.literal("")),
    smsOptIn: z.string().optional(), // checkbox sends "on" when checked

    dancerFirstName: z.string().min(1, "Dancer first name is required").max(60),
    dancerAge: z.coerce.number().int().min(2, "Age must be 2+").max(18, "Age must be 18 or less"),

    notes: z.string().optional().or(z.literal("")),
    sourcePath: z.string().optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    const optedIn = val.smsOptIn === "on";
    const phone = (val.parentPhone ?? "").trim();

    if (optedIn && phone.length < 10) {
      ctx.addIssue({
        code: "custom",
        path: ["parentPhone"],
        message: "Phone is required for SMS opt-in",
      });
    }
  });

export async function submitLead(formData: FormData) {
  const raw = {
    parentFirstName: String(formData.get("parentFirstName") ?? ""),
    parentLastName: String(formData.get("parentLastName") ?? ""),
    parentEmail: String(formData.get("parentEmail") ?? ""),
    parentPhone: String(formData.get("parentPhone") ?? ""),
    smsOptIn: formData.get("smsOptIn") ? "on" : undefined,

    dancerFirstName: String(formData.get("dancerFirstName") ?? ""),
    dancerAge: formData.get("dancerAge") ?? "",

    notes: String(formData.get("notes") ?? ""),
    sourcePath: String(formData.get("sourcePath") ?? "/get-started"),
  };

  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    // Return structured errors to the client component
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;
  const smsOptIn = v.smsOptIn === "on";

  await sql`
    INSERT INTO lead_intakes (
      parent_first_name, parent_last_name, parent_email, parent_phone,
      sms_opt_in, sms_opt_in_at,
      dancer_first_name, dancer_age,
      notes, source_path
    ) VALUES (
      ${v.parentFirstName.trim()},
      ${v.parentLastName.trim()},
      ${v.parentEmail.trim().toLowerCase()},
      ${v.parentPhone?.trim() || null},
      ${smsOptIn},
      ${smsOptIn ? sql`now()` : null},
      ${v.dancerFirstName.trim()},
      ${v.dancerAge},
      ${v.notes?.trim() || null},
      ${v.sourcePath || "/get-started"}
    );
  `;

  redirect("/get-started/thank-you");
}
