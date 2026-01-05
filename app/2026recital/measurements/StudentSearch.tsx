'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface MeasurementStudent {
  studentId: string
  firstName: string
  lastName: string
}

interface StudentSearchProps {
  onSelect: (student: MeasurementStudent) => void
}

export default function StudentSearch({ onSelect }: StudentSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MeasurementStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    if (query.trim().length < 2) {
      setError('Enter at least 2 characters.')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const res = await fetch('/api/akada/students/search-wildcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()

      const mapped: MeasurementStudent[] = Array.isArray(data)
        ? data.map((s: any) => ({
            studentId: String(s.studentId),
            firstName: String(s.studentFirstName || ''),
            lastName: String(s.studentLastName || ''),
          }))
        : []

      if (!mapped.length) {
        setError('No students found.')
      } else {
        setResults(mapped)
      }
    } catch (err) {
      console.error(err)
      setError('Error searching students.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardContent className="space-y-4 p-6">
        <h2 className="text-xl font-semibold text-purple-600">
          Search Student for Measurements
        </h2>

        <Input
          placeholder="Search by first or last name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />

        <Button onClick={search} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </Button>

        {error && <p className="text-red-600">{error}</p>}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((s) => (
              <div
                key={s.studentId}
                onClick={() => onSelect(s)}
                className="p-3 border rounded cursor-pointer hover:bg-purple-50 transition"
              >
                <div className="font-medium">
                  {s.firstName} {s.lastName}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
