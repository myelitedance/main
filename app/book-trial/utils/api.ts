"use client";

import { buildAppointmentTitle } from "./format";

/* -------------------------------------------
   CONTACT → /api/trial/contact
-------------------------------------------- */

export async function sendContact(data: {
  parentFirstName: string;
  parentLastName: string;
  email: string;
  phone: string;
  dancerFirstName: string;
  smsOptIn: boolean;
  utms: Record<string, string | null>;
}) {
  try {
    const res = await fetch("/api/trial/contact", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error("sendContact error:", err);
    return null;
  }
}

/* -------------------------------------------
   OPPORTUNITY → /api/trial/opportunity
-------------------------------------------- */

export async function sendOpportunity(data: {
  contactId: string;
  parentFirstName: string;
  parentLastName: string;
  dancerFirstName: string;
  dancerAge: number;
  selectedClass: {
    id: string;
    name: string;
  };
}) {
  try {
    const res = await fetch("/api/trial/opportunity", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error("sendOpportunity error:", err);
    return null;
  }
}

/* -------------------------------------------
   APPOINTMENT → /api/trial/appointment
-------------------------------------------- */

export async function sendAppointment(data: {
  classId: string;
  className: string;
  lengthMinutes: number;
  dancerFirstName: string;
  day: string;
  time: string;
  contactId: string;
  opportunityId: string;
}) {
  try {
    const appointmentTitle = buildAppointmentTitle(
      data.dancerFirstName,
      data.className,
      data.day,
      data.time
    );

    const payload = {
      ...data,
      appointmentTitle,
    };

    const res = await fetch("/api/trial/appointment", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error("sendAppointment error:", err);
    return null;
  }
}
