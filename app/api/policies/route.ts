import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Example: read from a repo file. Swap this to fetch() your CMS if you prefer.
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "content", "studio-policies.txt"); // <- you decide the path
    const text = await fs.readFile(filePath, "utf8");
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new NextResponse("Studio Policies are temporarily unavailable.", { status: 200 });
  }
}