'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardRow } from "@/lib/types/dashboard";


// ----------------------------
// Types
// ----------------------------

type DashboardClientProps = {
  data: DashboardRow[];
};

type Filter = 'all' | 'missing' | 'complete';

// ----------------------------
// Small UI Component
// ----------------------------
function Stat({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        active
          ? "border-purple-600 bg-purple-50"
          : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </button>
  );
}

// ----------------------------
// Main Component
// ----------------------------
export default function DashboardClient({ data }: DashboardClientProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const missing = data.filter(d => !d.is_complete).length;
    return {
      total: data.length,
      missing,
      complete: data.length - missing,
    };
  }, [data]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'missing':
        return data.filter(d => !d.is_complete);
      case 'complete':
        return data.filter(d => d.is_complete);
      default:
        return data;
    }
  }, [filter, data]);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3>">
        <Stat
          label="Registered"
          value={counts.total}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <Stat
          label="Missing Info"
          value={counts.missing}
          active={filter === 'missing'}
          onClick={() => setFilter('missing')}
        />
        <Stat
          label="Complete"
          value={counts.complete}
          active={filter === 'complete'}
          onClick={() => setFilter('complete')}
        />
      </div>

      {/* Table */}
      <table className="rounded-lg border bg-white shadow-sm">
        <thead>
          <tr className="border-b text-sm text-gray-600">
            <th className="py-2 text-left">Student</th>
            <th>Height</th>
            <th>Shoe</th>
            <th>Girth</th>
            <th>Photo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.measurement_event_id} className="border-b">
              <td className="py-2">
                {row.last_name}, {row.first_name}
              </td>
              <td className="text-center">{row.has_height ? "✅" : "❌"}</td>
              <td className="text-center">{row.has_shoe_size ? "✅" : "❌"}</td>
              <td className="text-center">{row.has_girth ? "✅" : "❌"}</td>
              <td className="text-center">{row.has_photo ? "✅" : "❌"}</td>
              <td className="text-right">
                <Link
                  href={`/2026recital/measurements/${row.external_id}/view`}
                  className="text-sm text-purple-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
