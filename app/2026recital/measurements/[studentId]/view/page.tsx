'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

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
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
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

        setMeasurement(data.measurement ?? null)
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{studentName}</h1>

        <button
          onClick={() =>
            router.push(`/2026recital/measurements/${studentId}/remeasure`)
          }
          className="text-purple-600 font-semibold"
        >
          Re-measure →
        </button>
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
                  {cell(measurement?.heightIn, ' in')}
                </td>
                <td className="py-2 px-3">
                  {cell(measurement?.girth, ' in')}
                </td>
                <td className="py-2 px-3">
                  {cell(measurement?.hips, ' in')}
                </td>
                <td className="py-2 px-3">
                  {cell(measurement?.shoeSize)}
                </td>
                <td className="py-2 px-3">
                  {cell(measurement?.waist, ' in')}
                </td>
                <td className="py-2 px-3">
                  {cell(measurement?.bust, ' in')}
                </td>
                <td className="py-2 px-3">
  {measurement?.photoUrl ? (
    <a
      href={measurement.photoUrl}
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

          {measurement?.recordedAt && (
            <p className="mt-4 text-sm text-gray-500">
              Recorded on{' '}
              {new Date(measurement.recordedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
