"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function GovDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/dashboard/overview")
      .then((res) => setOverview(res.data))
      .catch((e) => setError(e?.response?.data?.detail || "Could not load dashboard"));
    api
      .get("/api/dashboard/partners")
      .then((res) => setPartners(res.data))
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-setu-navy mb-1">Government / MoSJE Dashboard</h1>
      <p className="text-gray-400 text-sm mb-6">
        All figures below are computed live from this prototype's own database.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">{error}</div>}

      {!overview && !error && <p className="text-gray-400">Loading...</p>}

      {overview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Applications" value={overview.total_applications} />
            <StatCard label="Eligible (scheme matched)" value={overview.eligible_applications} />
            <StatCard label="Routed to Partner" value={overview.routed_applications} />
            <StatCard label="Pending" value={overview.pending_applications} />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="border rounded-xl p-4">
              <h2 className="font-semibold text-setu-navy mb-3">By Scheme</h2>
              {overview.by_scheme.length === 0 && <p className="text-gray-400 text-sm">No applications yet.</p>}
              {overview.by_scheme.map((row: any) => (
                <div key={row.scheme_name} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{row.scheme_name}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="border rounded-xl p-4">
              <h2 className="font-semibold text-setu-navy mb-3">By District</h2>
              {overview.by_district.length === 0 && <p className="text-gray-400 text-sm">No applications yet.</p>}
              {overview.by_district.map((row: any) => (
                <div key={row.district} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{row.district}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="border rounded-xl p-4">
              <h2 className="font-semibold text-setu-navy mb-1">Credit Access Gap</h2>
              <p className="text-sm text-gray-500 mb-2">
                Eligible beneficiaries with no viable partner route ÷ total eligible
              </p>
              <p className="text-2xl font-bold text-setu-navy">
                {overview.credit_access_gap !== null ? `${(overview.credit_access_gap * 100).toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className="border rounded-xl p-4">
              <h2 className="font-semibold text-setu-navy mb-1">Document Rejection Rate</h2>
              <p className="text-sm text-gray-500 mb-2">Invalid/needs-review ÷ total documents scanned</p>
              <p className="text-2xl font-bold text-setu-navy">
                {overview.document_rejection_rate !== null ? `${(overview.document_rejection_rate * 100).toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>

          <div className="border rounded-xl p-4">
            <h2 className="font-semibold text-setu-navy mb-3">Partner Workload</h2>
            {partners.length === 0 && <p className="text-gray-400 text-sm">No partner data.</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1">Partner</th>
                  <th>Applications Routed</th>
                  <th>Capacity %</th>
                  <th>Avg Processing (days)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.partner_id} className="border-b last:border-0">
                    <td className="py-1">{p.partner_name}</td>
                    <td>{p.applications_routed_here}</td>
                    <td>{p.capacity_pct}%</td>
                    <td>{p.avg_processing_days}</td>
                    <td>{p.is_simulated_data && <span className="text-xs text-amber-600">simulated</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-6">{overview.data_note}</p>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-setu-navy">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
