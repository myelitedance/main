// app/api/akada/studentclasshistory/route.ts

import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json(
      { error: "Missing studentId parameter" },
      { status: 400 }
    );
  }

  try {
    const res = await akadaFetch(
      `/studio/studentclasshistory/student/${studentId}`
    );

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: "Akada error", details: text },
        { status: res.status }
      );
    }

    const json = JSON.parse(text);
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
