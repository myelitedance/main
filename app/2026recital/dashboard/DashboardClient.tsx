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
      className={`rounded-lg border p-6 text-left transition ${
        active
          ? "border-purple-600 bg-purple-50"
          : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">
        {value}
      </div>
    </button>
  );
}

// ----------------------------
// Main Component
// ----------------------------
export default function DashboardClient({ data }: DashboardClientProps) {
  const [filter, setFilter] = useState<Filter>('all');

  // counts must come from the SAME source data
  const counts = useMemo(() => {
    const missing = data.filter(d => !d.is_complete).length;
    return {
      total: data.length,
      missing,
      complete: data.length - missing,
    };
  }, [data]);

  // derived filtered data (never store this in state)
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
      {/* Stats + Actions */}
<div className="flex items-start justify-between">
  {/* Stats */}
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
    <Stat
      label="Registered"
      value={counts.total}
      active={filter === "all"}
      onClick={() => setFilter("all")}
    />
    <Stat
      label="Missing Info"
      value={counts.missing}
      active={filter === "missing"}
      onClick={() => setFilter("missing")}
    />
    <Stat
      label="Complete"
      value={counts.complete}
      active={filter === "complete"}
      onClick={() => setFilter("complete")}
    />
  </div>

  {/* Action button */}
  <button
    onClick={() => {
      window.location.href =
        "/api/reports/measurements?performanceId=af7ee279-ee4e-4a91-83ef-36f95e78fa11";
    }}
    className="ml-4 rounded border border-purple-600 bg-white px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50"
  >
    Download Measurement Report
  </button>
</div>


      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm font-medium text-gray-600">
              <th className="px-6 py-3">Student</th>
              <th className="px-4 py-3 text-center">Height</th>
              <th className="px-4 py-3 text-center">Shoe</th>
              <th className="px-4 py-3 text-center">Girth</th>
              <th className="px-4 py-3 text-center">Photo</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((row) => (
              <tr key={row.student_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {row.last_name}, {row.first_name}
                </td>
                <td className="px-4 py-4 text-center">
                  {row.has_height ? "✅" : "❌"}
                </td>
                <td className="px-4 py-4 text-center">
                  {row.has_shoe_size ? "✅" : "❌"}
                </td>
                <td className="px-4 py-4 text-center">
                  {row.has_girth ? "✅" : "❌"}
                </td>
                <td className="px-4 py-4 text-center">
                  {row.has_photo ? "✅" : "❌"}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/2026recital/measurements/${row.external_id}/view`}
                    className="text-sm font-medium text-purple-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
