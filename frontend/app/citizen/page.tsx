"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useVoiceInput } from "@/lib/useVoiceInput";

const PartnerMap = dynamic(() => import("@/components/PartnerMap").then((m) => m.PartnerMap), {
  ssr: false,
});

type Profile = {
  purpose?: string;
  business_type?: string;
  income?: number;
  requested_amount?: number;
  project_cost?: number;
  category?: string;
  gender?: string;
  education_status?: string;
  location?: string;
  name?: string;
  language: string;
};

type Recommendation = {
  scheme_id: string;
  scheme_name: string;
  eligible: boolean;
  reasons: string[];
  failed_rules: string[];
  max_loan_amount: number;
  interest_rate: number;
  tenure_months: number;
  moratorium_months: number;
  match_score: number;
  description?: string;
  url?: string;
};

const FIELD_LABELS: Record<string, { en: string; hi: string }> = {
  income: { en: "Annual family income", hi: "वार्षिक पारिवारिक आय" },
  category: { en: "Category (e.g. SC)", hi: "श्रेणी (जैसे SC)" },
  purpose: { en: "Purpose", hi: "उद्देश्य" },
  business_type: { en: "Business type", hi: "व्यवसाय का प्रकार" },
  project_cost: { en: "Estimated project cost", hi: "अनुमानित परियोजना लागत" },
  requested_amount: { en: "Loan amount needed", hi: "आवश्यक ऋण राशि" },
  education_status: { en: "Course/education level", hi: "शिक्षा स्तर" },
};

const FALLBACK_LOCATION = { lat: 22.7196, lng: 75.8577 };

export default function CitizenIntake() {
  const [language, setLanguage] = useState<"en" | "hi">("hi");
  const [inputText, setInputText] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emiFor, setEmiFor] = useState<Recommendation | null>(null);
  const [emiResult, setEmiResult] = useState<any>(null);

  const [selectedScheme, setSelectedScheme] = useState<Recommendation | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [routing, setRouting] = useState<any>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, any>>({});
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  
  // NEW: Track which partner the user has explicitly selected from the list
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);

  // Email draft states
  const [emailDraft, setEmailDraft] = useState<any>(null);
  const [emailSending, setEmailSending] = useState(false);

  const { isListening, error: voiceError, start, stop } = useVoiceInput(language);
  const t = (en: string, hi: string) => (language === "hi" ? hi : en);

  async function handleExtract(text: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post("/api/intent/extract", { text });
      setProfile(res.data.profile);
      setMissingFields(res.data.missing_fields);
      setRecommendations(null);
      setManualValues({});
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || "Extraction failed. Check backend is running and GEMINI_API_KEY is set.");
    } finally {
      setLoading(false);
    }
  }

  function handleVoiceClick() {
    if (isListening) {
      stop();
      return;
    }
    start((transcript) => {
      setInputText(transcript);
      handleExtract(transcript);
    });
  }

  function updateManualField(field: string, value: string) {
    setManualValues((prev) => ({ ...prev, [field]: value }));
  }

  function mergedProfile(): Profile {
    if (!profile) return { language };
    const merged: any = { ...profile };
    for (const [k, v] of Object.entries(manualValues)) {
      if (v) merged[k] = ["income", "requested_amount", "project_cost"].includes(k) ? Number(v) : v;
    }
    return merged;
  }

  async function handleGetRecommendations() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const p = mergedProfile();
      const res = await await api.post("/api/schemes/recommend", {
        income: p.income,
        category: p.category,
        gender: p.gender,
        purpose: p.purpose,
        project_cost: p.project_cost,
        requested_amount: p.requested_amount,
      });
      setRecommendations(res.data);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || "Recommendation request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleShowEmi(rec: Recommendation) {
    if (emiFor?.scheme_id === rec.scheme_id) {
      setEmiFor(null);
      setEmiResult(null);
      return;
    }
    setEmiFor(rec);
    setEmiResult(null);
    try {
      const p = mergedProfile();
      const res = await api.post("/api/calculator/emi", {
        principal: p.requested_amount || rec.max_loan_amount,
        interest_rate: rec.interest_rate,
        tenure_months: rec.tenure_months,
        moratorium_months: rec.moratorium_months,
      });
      setEmiResult(res.data);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || "EMI calculation failed.");
    }
  }

  function getUserLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(FALLBACK_LOCATION);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(FALLBACK_LOCATION),
        { timeout: 4000 }
      );
    });
  }

  async function handleFindRoute(rec: Recommendation) {
    setLoading(true);
    setErrorMsg(null);
    setSelectedScheme(rec);
    try {
      const p = mergedProfile();
      const coords = await getUserLocation();
      setUserCoords(coords);

      const profileRes = await api.post("/api/profile", {
        name: p.name,
        income: p.income,
        category: p.category,
        location: p.location,
        lat: coords.lat,
        lng: coords.lng,
        purpose: p.purpose,
        business_type: p.business_type,
        project_cost: p.project_cost,
        requested_amount: p.requested_amount,
        education_status: p.education_status,
        language: p.language,
      });
      const profileId = profileRes.data.profile_id;

      const appRes = await api.post("/api/applications", {
        profile_id: profileId,
        scheme_id: rec.scheme_id,
      });
      const appId = appRes.data.application_id;
      setApplicationId(appId);
      setApplicationStatus(appRes.data.status);

      const routeRes = await api.post("/api/partners/route", {
        scheme_id: rec.scheme_id,
        user_lat: coords.lat,
        user_lng: coords.lng,
        application_id: appId,
      });
      setRouting(routeRes.data);
      // Automatically select the top recommendation by default
      setActivePartnerId(routeRes.data.recommended_partner.partner_id);
      setApplicationStatus("PARTNER_RECOMMENDED");

      const checklistRes = await api.get(`/api/documents/checklist/${appId}`);
      setChecklist(checklistRes.data);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || "Could not find a partner route for this scheme.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadDocument(docType: string, file: File) {
    if (!applicationId) return;
    const formData = new FormData();
    formData.append("application_id", applicationId);
    formData.append("doc_type", docType);
    formData.append("file", file);

    setUploadStatus((prev) => ({ ...prev, [docType]: { loading: true } }));
    try {
      const res = await api.post("/api/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus((prev) => ({ ...prev, [docType]: res.data }));
      const checklistRes = await api.get(`/api/documents/checklist/${applicationId}`);
      setChecklist(checklistRes.data);
    } catch (e: any) {
      setUploadStatus((prev) => ({
        ...prev,
        [docType]: { error: e?.response?.data?.detail || "Upload failed" },
      }));
    }
  }

  async function handleSubmitApplication() {
    if (!applicationId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // FIXED: Sending the selected partner_id to the backend so it assigns the application correctly!
      const res = await api.post(`/api/applications/${applicationId}/submit`, {
        partner_id: activePartnerId
      });
      setApplicationStatus(res.data.status);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || "Submission failed. Please check document validity.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDraftEmail() {
    // Rely on the actively selected partner instead of forcing the top recommendation
    if (!applicationId || !activePartnerId) return;
    setEmailSending(true);
    setErrorMsg(null);
    try {
      const res = await api.post("/api/partners/draft-email", {
        application_id: applicationId,
        partner_id: activePartnerId
      });
      setEmailDraft(res.data);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || "Failed to draft partner email.");
    } finally {
      setEmailSending(false);
    }
  }

  const isFormIncomplete = missingFields.some((f) => !manualValues[f] || String(manualValues[f]).trim() === "");

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 text-slate-800">
      <div className="flex justify-between items-center mb-8 bg-white/85 backdrop-blur-md border border-slate-200/80 p-4 rounded-2xl shadow-sm">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {t("Tell us what you need", "हमें बताएं आपको क्या चाहिए")}
        </h1>
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${language === "hi" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`} 
            onClick={() => setLanguage("hi")}
          >
            हिंदी
          </button>
          <button 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${language === "en" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`} 
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>
      </div>

      {!profile && (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <textarea
            className="w-full border border-slate-200 rounded-xl p-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[120px] text-sm sm:text-base transition-all bg-slate-50/50"
            placeholder={t(
              "e.g. I need a 4 lakh loan for my business, or education loan, or health / skill training",
              "जैसे मुझे व्यवसाय के लिए ₹4 लाख का लोन चाहिए, या शिक्षा ऋण, या स्वास्थ्य / कौशल प्रशिक्षण"
            )}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-6 font-semibold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all" 
              disabled={!inputText.trim() || loading} 
              onClick={() => handleExtract(inputText)}
            >
              {loading ? t("Processing...", "प्रोसेस हो रहा है...") : t("Submit", "जमा करें")}
            </button>
            <button 
              className={`px-6 py-3 rounded-xl font-semibold text-sm shadow-md transition-all ${isListening ? "bg-red-500 hover:bg-red-600 text-red-50 shadow-red-500/20 animate-pulse" : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"}`} 
              onClick={handleVoiceClick}
            >
              {isListening ? t("Listening... tap to stop", "सुन रहा हूं... रोकने के लिए टैप करें") : t("Speak", "बोलें")} 🎤
            </button>
          </div>
          {voiceError && <p className="text-red-500 text-xs font-medium">{voiceError}</p>}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 my-4 text-sm font-medium shadow-sm">
          {errorMsg}
        </div>
      )}

      {profile && !recommendations && (
        <div className="space-y-4">
          <button 
            onClick={() => { setProfile(null); setMissingFields([]); }}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            ← {t("Back to input", "इनपुट पर वापस जाएं")}
          </button>
          
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4">
              <h2 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                {t("Here's what we understood:", "हमने यह समझा:")}
              </h2>
              <ul className="text-sm text-slate-600 space-y-2">
                {Object.entries(profile)
                  .filter(([k, v]) => v && k !== "language" && k !== "raw_input_text")
                  .map(([k, v]) => (
                    <li key={k} className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-200/50 pb-1.5 last:border-none gap-1 sm:gap-4">
                      <span className="text-slate-400 capitalize shrink-0">{FIELD_LABELS[k]?.[language] || k}:</span> 
                      <span className="font-semibold text-slate-800 break-words text-left sm:text-right">{String(v)}</span>
                    </li>
                  ))}
              </ul>
            </div>

            {missingFields.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-800">
                  {t("A few more details will help us find the right scheme:", "सही योजना खोजने के लिए कुछ और जानकारी चाहिए:")}
                </p>
                <div className="space-y-2.5">
                  {missingFields.map((field) => (
                    <input 
                      key={field} 
                      className="w-full bg-white border border-amber-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm" 
                      placeholder={FIELD_LABELS[field]?.[language] || field} 
                      onChange={(e) => updateManualField(field, e.target.value)} 
                    />
                  ))}
                </div>
              </div>
            )}

            <button 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all" 
              disabled={isFormIncomplete || loading} 
              onClick={handleGetRecommendations}
            >
              {loading ? t("Finding schemes...", "योजनाएं खोजी जा रही हैं...") : t("Find My Best Scheme", "मेरी सर्वश्रेष्ठ योजना खोजें")}
            </button>
          </div>
        </div>
      )}

      {recommendations && !selectedScheme && (
        <div className="space-y-4">
          <button 
            onClick={() => setRecommendations(null)}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            ← {t("Back to profile", "प्रोफ़ाइल पर वापस जाएं")}
          </button>
          
          <h2 className="font-bold text-slate-900 text-lg">
            {t("Recommended schemes", "अनुशंसित योजनाएं")}
          </h2>

          <div className="space-y-4">
            {recommendations
              .filter((r) => r.eligible)
              .map((rec) => (
                <div key={rec.scheme_id} className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-bold text-slate-900 text-base">{rec.scheme_name}</h3>
                    <span className="text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/80 rounded-full px-3 py-1 shadow-sm shrink-0">
                      {rec.match_score}% {t("match", "मैच")}
                    </span>
                  </div>

                  {rec.description && (
                    <details className="group bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs">
                      <summary className="cursor-pointer font-semibold text-slate-700 select-none flex items-center justify-between">
                        <span>{t("📖 About this Scheme", "📖 इस योजना के बारे में विवरण")}</span>
                        <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="mt-2 text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2">
                        {rec.description}
                      </p>
                    </details>
                  )}

                  <p className="text-xs font-medium text-slate-500">
                    {t("Up to", "अधिकतम")} ₹{rec.max_loan_amount.toLocaleString("en-IN")} · {rec.interest_rate}% p.a. · {rec.moratorium_months} {t("month moratorium", "महीने की मोहलत")}
                  </p>
                  
                  <ul className="text-xs font-medium text-teal-700 space-y-1 bg-teal-50/50 p-3 rounded-xl border border-teal-100/50">
                    {rec.reasons.map((r, i) => (
                      <li key={i} className="flex items-center gap-1.5">✓ {r}</li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {rec.interest_rate === 0 ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60">
                        {t("100% Financial Grant (No Repayment)", "100% वित्तीय अनुदान (कोई पुनर्भुगतान नहीं)")}
                      </span>
                    ) : (
                      <button 
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4" 
                        onClick={() => handleShowEmi(rec)}
                      >
                        {emiFor?.scheme_id === rec.scheme_id ? t("Hide Breakdown", "विवरण छिपाएं") : t("Calculate EMI & Breakdown", "EMI और ऋण विवरण देखें")}
                      </button>
                    )}

                    {rec.url && (
                      <a 
                        href={rec.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
                      >
                        {t("Official Portal ↗", "आधिकारिक पोर्टल ↗")}
                      </a>
                    )}

                    <button className="ml-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all" onClick={() => handleFindRoute(rec)} disabled={loading}>
                      {t("Find Best Route", "सर्वश्रेष्ठ मार्ग खोजें")}
                    </button>
                  </div>

                  {emiFor?.scheme_id === rec.scheme_id && emiResult && (
                    <div className="mt-4 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100 rounded-xl p-4 text-xs space-y-3 shadow-inner relative">
                      <button 
                        onClick={() => { setEmiFor(null); setEmiResult(null); }}
                        className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 font-bold text-sm bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center shadow-sm"
                        title="Close"
                      >
                        ✕
                      </button>

                      <div className="border-b border-blue-200/60 pb-2 pr-6">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          💡 {t("Loan Calculation & Repayment Breakdown", "ऋण गणना और पुनर्भुगतान विवरण")}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {t("Transparent breakdown of principal, interest, tenure, and moratorium.", "मूलधन, ब्याज, अवधि और छूट अवधि का पारदर्शी विवरण।")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-slate-200/80">
                        <div>
                          <span className="text-slate-400 block text-[10px]">{t("Principal Amount", "मूलधन राशि")}</span>
                          <span className="font-bold text-slate-800">₹{emiResult.principal?.toLocaleString("en-IN") || (mergedProfile().requested_amount || rec.max_loan_amount).toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{t("Interest Rate", "ब्याज दर")}</span>
                          <span className="font-bold text-slate-800">{rec.interest_rate}% p.a.</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{t("Total Tenure", "कुल अवधि")}</span>
                          <span className="font-bold text-slate-800">{rec.tenure_months} {t("Months", "महीने")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{t("Moratorium Period", "मोहतारम अवधि")}</span>
                          <span className="font-bold text-slate-800">{rec.moratorium_months} {t("Months", "महीने")}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 bg-blue-50/60 p-3 rounded-lg border border-blue-100">
                        <p className="text-slate-700 flex justify-between">
                          <span>{t("Calculated Monthly EMI", "मासिक EMI")}:</span> 
                          <b className="text-blue-700 font-bold text-sm">₹{emiResult.monthly_emi.toLocaleString("en-IN")}</b>
                        </p>
                        <p className="text-slate-700 flex justify-between">
                          <span>{t("Total Interest Payable", "कुल देय ब्याज")}:</span> 
                          <b className="text-slate-900 font-semibold">₹{emiResult.total_interest.toLocaleString("en-IN")}</b>
                        </p>
                        <p className="text-slate-700 flex justify-between">
                          <span>{t("Repayment Starts Month", "पुनर्भुगतान शुरू महीना")}:</span> 
                          <b className="text-slate-900 font-semibold">#{emiResult.repayment_start_month}</b>
                        </p>
                      </div>

                      {emiResult.assumption_note && (
                        <p className="text-[11px] text-slate-500 italic bg-white/80 p-2 rounded border border-slate-200/60">
                          ℹ️ {emiResult.assumption_note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {recommendations.filter((r) => r.eligible).length === 0 && (
            <div className="bg-white/95 border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm">
              {t("No schemes matched your current details.", "कोई योजना मेल नहीं खाई।")}
            </div>
          )}

          <details className="text-xs text-slate-400 bg-white/50 border border-slate-200/60 rounded-xl p-4">
            <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-700">
              {t("Why weren't other schemes recommended?", "अन्य योजनाएं क्यों नहीं?")}
            </summary>
            <ul className="mt-3 space-y-2 border-t border-slate-200/60 pt-3">
              {recommendations.filter((r) => !r.eligible).map((r) => (
                <li key={r.scheme_id} className="text-slate-600">
                  <b className="text-slate-800">{r.scheme_name}:</b> {r.failed_rules.join("; ")}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {selectedScheme && routing && userCoords && (
        <div className="space-y-4">
          {applicationStatus !== "SUBMITTED" && (
            <button 
              onClick={() => { setSelectedScheme(null); setRouting(null); setChecklist(null); setActivePartnerId(null); }}
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              ← {t("Back to Recommendations", "अनुशंसाओं पर वापस जाएं")}
            </button>
          )}
          
          <h2 className="font-bold text-slate-900 text-lg">
            {t("Recommended channel partner", "अनुशंसित चैनल पार्टनर")}
          </h2>

          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <PartnerMap 
                userLat={userCoords.lat} 
                userLng={userCoords.lng} 
                recommended={routing.recommended_partner} 
                closest={routing.closest_partner}
                alternatives={routing.alternatives} 
              />
            </div>

            <div className="mt-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm mb-2 px-1">
                {t("Top Partner Options", "शीर्ष पार्टनर विकल्प")}
              </h3>
              
              {/* NEW: Selectable partner cards with Google Maps links */}
              {[routing.recommended_partner, ...(routing.alternatives || []).filter((p: any) => p.is_eligible)]
                .sort((a: any, b: any) => b.score - a.score)
                .slice(0, 3)
                .map((partner: any, index: number) => {
                  const isActive = activePartnerId === partner.partner_id;
                  
                  return (
                  <div 
                    key={partner.partner_id} 
                    className={`border rounded-xl p-4 space-y-2 transition-all ${isActive ? 'border-blue-400 bg-blue-50/40 shadow-sm' : 'border-slate-200/80 bg-white/50 opacity-70 hover:opacity-100 cursor-pointer'}`} 
                    onClick={() => setActivePartnerId(partner.partner_id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        {index === 0 ? (
                          <span className="text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-block mb-1">
                            {t("Optimal Channel Partner", "सर्वोत्तम चैनल पार्टनर")}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold tracking-wide uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full inline-block mb-1">
                            {t("Alternative Option", "वैकल्पिक विकल्प")} {index}
                          </span>
                        )}
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          {isActive && <span className="text-blue-600">✓</span>}
                          {partner.partner_name}
                        </h3>
                      </div>
                      <span className="text-xs font-bold bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm shrink-0">
                        {t("Score", "स्कोर")}: {partner.score}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-500">
                      {partner.partner_type} · {partner.distance_km} km away · 
                      NPA: <span className="font-semibold text-emerald-700">{((partner.npa_rate || 0.05) * 100).toFixed(1)}% (Healthy)</span>
                    </p>

                    <div className="flex justify-between items-center pt-2">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${partner.lat},${partner.lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📍 {t("Get Directions", "दिशा-निर्देश प्राप्त करें")}
                      </a>
                      
                      {!isActive && (
                        <button className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                          {t("Select this Branch", "इस शाखा को चुनें")}
                        </button>
                      )}
                    </div>
                  </div>
                )})}

              {routing.closest_partner && routing.closest_partner.partner_id !== routing.recommended_partner.partner_id && (
                <div className="mt-3 bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1">
                    📍 {t("Why not the physically nearest branch?", "निकटतम शाखा क्यों প্রজাতন্ত্র नहीं चुनी गई?")}
                  </p>
                  <p className="text-amber-800">
                    <strong>{routing.closest_partner.partner_name}</strong> is closer ({routing.closest_partner.distance_km} km), 
                    but {routing.closest_partner.disqualification_reason 
                      ? <span className="text-red-700 font-semibold">{routing.closest_partner.disqualification_reason.toLowerCase()}</span>
                      : "scored lower on processing capacity or fund availability"}.
                  </p>
                </div>
              )}
            </div>

            {applicationStatus && (
              <div className="text-xs text-slate-500 font-medium bg-slate-100/80 px-3 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span>{t("Application status", "आवेदन स्थिति")}: <strong className="text-slate-800">{applicationStatus}</strong></span>
                <span className="font-mono text-slate-400 text-[10px] break-all">ID: {applicationId}</span>
              </div>
            )}
          </div>

          {checklist && (
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base mb-2">
                {t("Required documents", "आवश्यक दस्तावेज़")}
              </h3>
              
              <div className="space-y-3">
                {checklist.missing_documents.concat(checklist.uploaded_documents).map((docType: string) => {
                  const uploaded = uploadStatus[docType];
                  return (
                    <div key={docType} className="border-b border-slate-100 pb-3 mb-3 text-sm last:border-none last:pb-0 last:mb-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="font-semibold text-slate-700 capitalize text-xs tracking-wide">{docType.replace(/_/g, " ")}</label>
                        {uploaded?.validation_status && (
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold shadow-sm ${uploaded.validation_status === "valid" ? "bg-teal-50 text-teal-700 border border-teal-200/60" : "bg-amber-50 text-amber-700 border border-amber-200/60"}`}>
                            {uploaded.validation_status === "valid" ? "✓ Accepted" : "⚠ " + uploaded.validation_status}
                          </span>
                        )}
                      </div>
                      
                      <input
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        className="block mt-1 w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer transition-all border border-slate-200 rounded-xl bg-slate-50/50 p-1"
                        onChange={(e) => e.target.files?.[0] && handleUploadDocument(docType, e.target.files[0])}
                      />

                      {uploaded?.loading && <p className="text-slate-400 text-[11px] font-medium mt-1 animate-pulse">{t("Uploading & scanning...", "अपलोड और स्कैन हो रहा है...")}</p>}
                      {uploaded?.error && <p className="text-red-500 text-[11px] font-medium mt-1">{uploaded.error}</p>}
                    </div>
                  );
                })}
              </div>

              {checklist.all_present && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <p className="text-teal-700 text-xs font-semibold mb-3 flex items-center gap-1.5">
                    ✓ {t("All required documents received.", "सभी आवश्यक दस्तावेज़ प्राप्त हुए।")}
                  </p>
                  
                  {applicationStatus === "SUBMITTED" ? (
                    <div className="space-y-4">
                      <div className="bg-teal-50 border border-teal-200 text-teal-900 rounded-2xl p-5 text-center shadow-sm space-y-1">
                        <p className="font-bold text-base">{t("Application Submitted Successfully!", "आवेदन सफलतापूर्वक जमा कर दिया गया है!")}</p>
                        <p className="text-xs text-teal-700">{t("Your application has been saved to the system.", "आपका आवेदन सिस्टम में सहेज लिया गया है।")}</p>
                      </div>
                      
                      {errorMsg && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-semibold mb-3">
                          ⚠️ {errorMsg}
                        </div>
                      )}

                      {!emailDraft ? (
                        <button 
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md transition-all flex justify-center gap-2 items-center"
                          onClick={handleDraftEmail}
                          disabled={emailSending}
                        >
                          ✉️ {emailSending ? t("Drafting Pitch...", "प्रस्ताव तैयार हो रहा है...") : t("Draft Partner Outreach Email", "पार्टनर आउटरीच ईमेल ड्राफ्ट करें")}
                        </button>
                      ) : (
                        <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm space-y-3">
                          <h4 className="font-bold text-slate-800 text-sm mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <span>📧</span> {t("Review Outreach Pitch", "प्रस्ताव की समीक्षा करें")}
                          </h4>
                          
                          <div className="text-xs space-y-1.5 text-slate-600">
                            <p><span className="font-semibold text-slate-700">To:</span> {emailDraft.partner_name} &lt;{emailDraft.partner_email}&gt;</p>
                            <p><span className="font-semibold text-slate-700">Subject:</span> {emailDraft.subject}</p>
                            <p><span className="font-semibold text-slate-700">Attachments:</span> {emailDraft.attached_documents.join(", ")}</p>
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                            <p className="text-xs text-slate-700 whitespace-pre-wrap font-serif leading-relaxed">
                              {emailDraft.body}
                            </p>
                          </div>
                          
                          <button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 mt-2 font-semibold text-sm shadow-md shadow-blue-500/20 transition-all"
                            onClick={() => {
                              const subject = encodeURIComponent(emailDraft.subject);
                              const body = encodeURIComponent(emailDraft.body);
                              window.location.href = `mailto:${emailDraft.partner_email}?subject=${subject}&body=${body}`;
                            }}
                          >
                            {t("Escalate to Partner", "पार्टनर को भेजें")}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
                      onClick={handleSubmitApplication}
                      disabled={loading}
                    >
                      {loading ? t("Submitting...", "जमा हो रहा है...") : t("Submit Final Application", "अंतिम आवेदन जमा करें")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}