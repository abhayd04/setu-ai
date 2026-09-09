"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function PartnerDashboard() {
  const [partnerId, setPartnerId] = useState("sca_mp_indore");
  const [applications, setApplications] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/partners/${partnerId}/applications`);
      setApplications(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Could not load applications");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-setu-navy mb-1">Channel Partner Dashboard</h1>
      <p className="text-gray-400 text-sm mb-6">
        Prototype dashboard — no real partner authentication. Select a demo
        partner ID (see backend/data/partners.json) to view applications
        routed to them.
      </p>

      <div className="flex gap-3 mb-6">
        <select
          className="border rounded-lg p-2 text-sm flex-1"
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
        >
          <option value="sca_mp_indore">MP SCA — Indore Branch</option>
          <option value="psb_sbi_indore_mg_road">SBI — MG Road, Indore</option>
          <option value="rrb_narmada_jhabua_indore">Narmada Jhabua Gramin Bank — Indore</option>
          <option value="nbfc_mfi_ujjivan_indore">Ujjivan (NBFC-MFI) — Indore</option>
          <option value="sca_mp_bhopal">MP SCA — Bhopal Branch</option>
        </select>
        <button className="bg-setu-navy text-white rounded-lg px-4 text-sm" onClick={loadApplications}>
          {loading ? "Loading..." : "Load Applications"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">{error}</div>}

      {applications && applications.length === 0 && (
        <p className="text-gray-400">No applications currently routed to this partner.</p>
      )}

      {applications && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((a) => (
            <div key={a.application_id} className="border rounded-xl p-4">
              <div className="flex justify-between">
                <h3 className="font-medium text-setu-navy">{a.applicant_name || "Applicant"}</h3>
                <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{a.status}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {a.scheme_name} · ₹{a.requested_amount?.toLocaleString("en-IN")}
              </p>
              {a.required_documents?.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">Required: {a.required_documents.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
