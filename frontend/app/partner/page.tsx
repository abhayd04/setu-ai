"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function PartnerDashboard() {
  const [partnerId, setPartnerId] = useState("sca_mp_indore");
  const [applications, setApplications] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  async function handleAction(applicationId: string, action: "approve" | "reject" | "disburse") {
    setActionLoading(applicationId);
    setError(null);
    try {
      await api.post(`/api/partners/${action}`, {
        application_id: applicationId,
        partner_id: partnerId,
        rejection_reason: action === "reject" ? "Document verification failed or eligibility mismatch" : null,
      });
      // Reload applications to reflect new status
      await loadApplications();
    } catch (e: any) {
      setError(e?.response?.data?.detail || `Failed to ${action} application.`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-setu-navy mb-1">Channel Partner Dashboard</h1>
      <p className="text-gray-400 text-sm mb-6">
        Prototype dashboard — select a partner branch to view applications routed to them.
      </p>

      {/* FIXED: Mobile Responsive Flex Container */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 w-full">
        <select
          className="border border-slate-200 rounded-xl p-3 text-sm flex-1 bg-white text-slate-800 shadow-sm"
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
        >
          <option value="sca_mp_indore">MP State Cooperative Bank - Indore Central</option>
          <option value="psb_sbi_indore_old_palasia">State Bank of India - Old Palasia</option>
          <option value="rrb_mpgb_indore_sapna_sangeeta">Madhya Pradesh Gramin Bank - Sapna Sangeeta</option>
          <option value="psb_boi_indore_rajendranagar">Bank of India - Rajendra Nagar</option>
          <option value="nbfc_mfi_ujjivan_vijaynagar">Ujjivan Small Finance Bank - Vijay Nagar</option>
        </select>
        <button 
          className="bg-setu-navy hover:opacity-95 text-white rounded-xl px-5 py-3 sm:py-0 text-sm font-medium transition-all shadow-sm" 
          onClick={loadApplications}
        >
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
            <div key={a.application_id} className="border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-setu-navy">{a.applicant_name || "Applicant"}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {a.scheme_name} · ₹{a.requested_amount?.toLocaleString("en-IN")}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  a.status === "DISBURSED" ? "bg-green-100 text-green-800" :
                  a.status === "APPROVED" ? "bg-blue-100 text-blue-800" :
                  a.status === "REJECTED" ? "bg-red-100 text-red-800" :
                  "bg-amber-100 text-amber-800"
                }`}>
                  {a.status}
                </span>
              </div>

              {a.required_documents?.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">Required: {a.required_documents.join(", ")}</p>
              )}

              {/* Action buttons for loan officer lifecycle workflow */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                {a.status !== "APPROVED" && a.status !== "DISBURSED" && a.status !== "REJECTED" && (
                  <>
                    <button
                      onClick={() => handleAction(a.application_id, "approve")}
                      disabled={actionLoading === a.application_id}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                      {actionLoading === a.application_id ? "Processing..." : "Approve Application"}
                    </button>
                    <button
                      onClick={() => handleAction(a.application_id, "reject")}
                      disabled={actionLoading === a.application_id}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}

                {a.status === "APPROVED" && (
                  <button
                    onClick={() => handleAction(a.application_id, "disburse")}
                    disabled={actionLoading === a.application_id}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                  >
                    {actionLoading === a.application_id ? "Disbursing..." : "Disburse Funds"}
                  </button>
                )}

                {(a.status === "DISBURSED" || a.status === "REJECTED") && (
                  <span className="text-xs text-gray-400 italic">Workflow completed ({a.status.toLowerCase()})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}