'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Student {
  id: string
  external_id: string
  first_name: string
  last_name: string
}

export default function MeasurementEntryPage() {
  const params = useParams()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStudent() {
      try {
        const res = await fetch(`/api/students/by-external-id/${studentId}`)
        if (!res.ok) {
          throw new Error('Student not found')
        }

        const data = await res.json()
        setStudent(data)
      } catch (err) {
        console.error(err)
        setError('Unable to load student')
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      loadStudent()
    }
  }, [studentId])

  if (loading) {
    return <p className="text-center mt-10">Loading student…</p>
  }

  if (error || !student) {
    return (
      <p className="text-center mt-10 text-red-600">
        {error ?? 'Student not found'}
      </p>
    )
  }

  return (
    <div className="max-w-xl mx-auto mt-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Measuring: {student.first_name} {student.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Akada ID: {student.external_id}
          </p>
        </CardContent>
      </Card>

      <Card>
  <CardHeader>
    <CardTitle>Measurements</CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* REQUIRED */}
    <div>
      <label className="block text-sm font-medium">
        Girth (in) <span className="text-red-500">*</span>
      </label>
      <input
        type="number"
        step="0.1"
        className="w-full border rounded px-3 py-2"
        placeholder="e.g. 32.5"
      />
    </div>

    <div>
      <label className="block text-sm font-medium">
        Hips (in) <span className="text-red-500">*</span>
      </label>
      <input
        type="number"
        step="0.1"
        className="w-full border rounded px-3 py-2"
        placeholder="e.g. 30.0"
      />
    </div>

    <div>
      <label className="block text-sm font-medium">
        Shoe Size (cm) <span className="text-red-500">*</span>
      </label>
      <input
        type="number"
        step="0.1"
        className="w-full border rounded px-3 py-2"
        placeholder="e.g. 21.5"
      />
    </div>

    {/* OPTIONAL */}
    <div className="pt-4 border-t">
      <p className="text-sm text-gray-500 mb-2">
        Optional (only if required for costume fit)
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">
            Waist (in)
          </label>
          <input
            type="number"
            step="0.1"
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. 24.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Bust (in)
          </label>
          <input
            type="number"
            step="0.1"
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. 28.0"
          />
        </div>
      </div>
    </div>
  </CardContent>
</Card>

    </div>
  )
}
