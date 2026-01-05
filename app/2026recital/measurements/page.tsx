'use client'

import { useRouter } from 'next/navigation'
import StudentSearch, { MeasurementStudent } from './StudentSearch'

export default function MeasurementsHomePage() {
  const router = useRouter()

  function handleSelect(student: MeasurementStudent) {
    router.push(`/2026recital/measurements/${student.studentId}`)
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <StudentSearch onSelect={handleSelect} />
    </div>
  )
}
