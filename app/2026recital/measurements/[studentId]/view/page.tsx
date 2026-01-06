'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type Measurement = {
  heightIn: number | null
  hasPhoto: boolean | null
  recordedAt: string | null
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
        setMeasurement(data.measurement)
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

  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{studentName}</h1>

        <button
          onClick={() =>
            router.push(`/2026recital/measurements/${studentId}`)
          }
          className="text-purple-600 font-semibold"
        >
          Re-measure →
        </button>
      </div>

      {/* TABLE */}
      <Card>
        <CardContent className="p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Measurement</th>
                <th className="text-left py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Height</td>
                <td className="py-2">
                  {measurement?.heightIn
                    ? `${measurement.heightIn} in`
                    : 'NM'}
                </td>
              </tr>

              <tr className="border-b">
                <td className="py-2">Photo</td>
                <td className="py-2">
                  {measurement?.hasPhoto ? 'Yes' : 'NM'}
                </td>
              </tr>

              <tr>
                <td className="py-2">Recorded</td>
                <td className="py-2">
                  {measurement?.recordedAt
                    ? new Date(
                        measurement.recordedAt
                      ).toLocaleString()
                    : 'NM'}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
