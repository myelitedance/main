// app/api/akada/students/route.ts

import { NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export async function GET() {
  try {
    const res = await akadaFetch("/studio/students");

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Akada error", details: text },
        { status: res.status }
      );
    }

    const text = await res.text();
    const json = JSON.parse(text);

    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
