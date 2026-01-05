// app/api/akada/students/search-wildcard/route.ts

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { query } = await req.json()

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query too short' },
      { status: 400 }
    )
  }

  // Call Akada student search (same credentials you already use)
  const res = await fetch(
    `${process.env.AKADA_BASE_URL}/students/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AKADA_API_KEY}`,
      },
      body: JSON.stringify({
        search: query, // or however Akada supports wildcard
      }),
    }
  )

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Akada search failed' },
      { status: 500 }
    )
  }

  const students = await res.json()

  // Normalize output
  const mapped = students.map((s: any) => ({
    studentId: s.studentId,
    studentFirstName: s.studentFirstName,
    studentLastName: s.studentLastName,
  }))

  return NextResponse.json(mapped)
}
