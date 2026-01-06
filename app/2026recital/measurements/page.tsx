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

      </div>
  )
}

