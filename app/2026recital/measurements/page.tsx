'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import StudentSearch from './StudentSearch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type MeasuredStudent = {
  studentId: string
  firstName: string
  lastName: string
  measuredAt: string
}

type UnmeasuredStudent = {
  studentId: string
  firstName: string
  lastName: string
}

export default function MeasurementsDashboardPage() {
  const router = useRouter()

  const [measured, setMeasured] = useState<MeasuredStudent[]>([])
  const [unmeasured, setUnmeasured] = useState<UnmeasuredStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/measurements/dashboard')
    const data = await res.json()

    setMeasured(data.measured || [])
    setUnmeasured(data.unmeasured || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard, refreshKey])

  // This allows child pages (measurement entry) to force refresh
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1)
    window.addEventListener('measurement-saved', handler)
    return () => window.removeEventListener('measurement-saved', handler)
  }, [])

  return (
    <div className="max-w-5xl mx-auto mt-10 space-y-10">
      {/* STUDENT SEARCH */}
      <StudentSearch
        onSelect={(s) =>
          router.push(`/2026recital/measurements/${s.studentId}`)
        }
      />

      {/* DASHBOARD */}
      {loading ? (
        <p className="text-center text-gray-500">Loading measurements…</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold">
            Measurement Progress ({measured.length} /{' '}
            {measured.length + unmeasured.length})
          </h1>

          {/* UNMEASURED */}
          <Card>
            <CardHeader>
              <CardTitle>Not Measured</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unmeasured.length === 0 && (
                <p className="text-sm text-gray-500">
                  All students have been measured 🎉
                </p>
              )}

              {unmeasured.map((s) => (
                <div
                  key={s.studentId}
                  className="flex justify-between items-center border-b py-2"
                >
                  <div>
                    {s.firstName} {s.lastName}
                  </div>
                  <button
                    onClick={() =>
                      router.push(
                        `/2026recital/measurements/${s.studentId}`
                      )
                    }
                    className="text-purple-600 font-semibold"
                  >
                    Measure
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* MEASURED */}
<Card>
  <CardHeader>
    <CardTitle>Measured</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    {measured.map((s) => (
      <div
        key={s.studentId}
        className="flex justify-between items-center border-b py-2"
      >
        <div>
          <div className="font-medium">
            {s.firstName} {s.lastName}
          </div>
          <div className="text-sm text-gray-500">
            Completed on{' '}
            {new Date(s.measuredAt).toLocaleDateString()}
          </div>
        </div>

        <button
          onClick={() =>
            router.push(`/2026recital/measurements/${s.studentId}`)
          }
          className="text-gray-600 font-semibold"
        >
          View
        </button>
      </div>
    ))}
  </CardContent>
</Card>

        </>
      )}
    </div>
  )
}
