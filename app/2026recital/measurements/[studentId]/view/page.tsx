'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

type Measurement = {
  heightIn: number | null
  hasPhoto: boolean | null
  photoUrl?: string | null
  recordedAt: string | null
  girth?: number | null
  hips?: number | null
  shoeSize?: number | null
  waist?: number | null
  bust?: number | null
}

export default function MeasurementViewPage() {
  const { studentId } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [current, setCurrent] = useState<Measurement | null>(null)
  const [history, setHistory] = useState<any[]>([])

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/students/${studentId}`)
        if (!res.ok) throw new Error('Failed to load student')

        const data = await res.json()

        setStudentName(
          `${data.student.firstName} ${data.student.lastName}`
        )

        setCurrent(data.currentMeasurement ?? null)
        setHistory(data.history ?? [])

      } catch (err) {
        console.error(err)
        setError('Unable to load measurement data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [studentId])

  if (loading) {
    return <p className="text-center mt-10">Loading…</p>
  }

  if (error) {
    return (
      <p className="text-center mt-10 text-red-600">
        {error}
      </p>
    )
  }

  const cell = (value: any, suffix = '') =>
    value !== null && value !== undefined && value !== ''
      ? `${value}${suffix}`
      : 'NM'

  return (
    <div className="max-w-5xl mx-auto mt-10 space-y-6">
      {/* HEADER */}
<div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
  <h1 className="text-3xl font-bold">{studentName}</h1>

  <div className="flex items-center gap-4">
    <Link
      href="/2026recital/measurements/dashboard"
      className="text-sm text-gray-600 hover:text-purple-600 font-medium"
    >
      ← Dashboard
    </Link>

    <button
      onClick={() =>
        router.push(`/2026recital/measurements/${studentId}/remeasure`)
      }
      className="text-purple-600 font-semibold hover:underline"
    >
      Re-measure →
    </button>
  </div>
</div>


      {/* TABLE */}
      <Card>
        <CardContent className="p-6 overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-3">Height</th>
                <th className="py-2 px-3">Girth</th>
                <th className="py-2 px-3">Hips</th>
                <th className="py-2 px-3">Shoe Size</th>
                <th className="py-2 px-3">Waist</th>
                <th className="py-2 px-3">Bust</th>
                <th className="py-2 px-3">Photo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3">
                  {cell(current?.heightIn, ' in')}
                </td>
                <td className="py-2 px-3">
                  {cell(current?.girth, ' in')}
                </td>
                <td className="py-2 px-3">
                  {cell(current?.hips, ' in')}
                </td>
                <td className="py-2 px-3">
                  {cell(current?.shoeSize)}
                </td>
                <td className="py-2 px-3">
                  {cell(current?.waist, ' in')}
                </td>
                <td className="py-2 px-3">
                  {cell(current?.bust, ' in')}
                </td>
                <td className="py-2 px-3">
  {current?.photoUrl ? (
    <a
      href={current.photoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-600 font-semibold underline"
    >
      Yes
    </a>
  ) : (
    'NM'
  )}
</td>

              </tr>
            </tbody>
          </table>

          {current?.recordedAt && (
            <p className="mt-4 text-sm text-gray-500">
              Recorded on{' '}
              {new Date(current.recordedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
  <CardContent className="p-6">
    <h2 className="text-lg font-semibold mb-4">Measurement History</h2>

    <div className="space-y-4">
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No history found.</p>
      ) : (
        history.map((h) => (
          <div
            key={h.eventId}
            className="rounded border p-4 text-sm bg-gray-50"
          >
            <p className="font-medium">
              {h.recordedAt
                ? new Date(h.recordedAt).toLocaleString()
                : 'Unknown date'}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              <div>Height: {h.heightIn ?? 'NM'}</div>
              <div>Girth: {h.values?.girth ?? 'NM'}</div>
              <div>Hips: {h.values?.hips ?? 'NM'}</div>
              <div>Shoe: {h.values?.shoeSize ?? 'NM'}</div>
              <div>Waist: {h.values?.waist ?? 'NM'}</div>
              <div>Bust: {h.values?.bust ?? 'NM'}</div>

              <div>
                Photo:{' '}
                {h.photoUrl ? (
                  <a
                    href={h.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-purple-600"
                  >
                    Yes
                  </a>
                ) : (
                  'NM'
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </CardContent>
</Card>

    </div>
  )
}
