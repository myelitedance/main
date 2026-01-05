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
            Student ID: {student.external_id}
          </p>
        </CardContent>
      </Card>

      {/* Measurement form will go here next */}
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500 text-sm">
            Measurement form coming next…
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
