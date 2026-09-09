"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useVoiceInput } from "@/lib/useVoiceInput";

const PartnerMap = dynamic(() => import("@/components/PartnerMap").then((m) => m.PartnerMap), {
  ssr: false, // Leaflet needs `window` — must not render on the server
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
};

const FIELD_LABELS: Record<string, { en: string; hi: string }> = {
  income: { en: "Annual family income", hi: "वार्षिक पारिवारिक आय" },
  category: { en: "Category (e.g. SC)", hi: "श्रेणी (जैसे SC)" },
  purpose: { en: "Purpose (business/education)", hi: "उद्देश्य (व्यवसाय/शिक्षा)" },
  business_type: { en: "Business type", hi: "व्यवसाय का प्रकार" },
  project_cost: { en: "Estimated project cost", hi: "अनुमानित परियोजना लागत" },
  requested_amount: { en: "Loan amount needed", hi: "आवश्यक ऋण राशि" },
  education_status: { en: "Course/education level", hi: "शिक्षा स्तर" },
};

// Fallback if browser geolocation is denied/unavailable — Indore, matching
// the spec's demo persona. Swap for a real IP-geolocation lookup later.
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

  // Milestone 3 additions
  const [selectedScheme, setSelectedScheme] = useState<Recommendation | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [routing, setRouting] = useState<any>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, any>>({});
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

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
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || "Extraction failed. Check the backend is running and GEMINI_API_KEY is set.");
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
      const res = await api.post("/api/schemes/recommend", {
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

      // Persist the profile, then create an application, then route.
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

  const stillMissing = missingFields.filter((f) => !manualValues[f]);

  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-setu-navy">{t("Tell us what you need", "हमें बताएं आपको क्या चाहिए")}</h1>
        <div className="flex gap-2">
          <button className={`px-3 py-1 rounded ${language === "hi" ? "bg-setu-navy text-white" : "bg-gray-100"}`} onClick={() => setLanguage("hi")}>
            हिंदी
          </button>
          <button className={`px-3 py-1 rounded ${language === "en" ? "bg-setu-navy text-white" : "bg-gray-100"}`} onClick={() => setLanguage("en")}>
            EN
          </button>
        </div>
      </div>

      {!profile && (
        <div className="space-y-3">
          <textarea
            className="w-full border rounded-xl p-4 min-h-[100px]"
            placeholder={t(
              "e.g. I need a 4 lakh loan to start a mobile repair shop, my family income is 3.2 lakh",
              "जैसे मुझे मोबाइल रिपेयर की दुकान शुरू करने के लिए ₹4 लाख का लोन चाहिए, मेरी सालाना आय ₹3.2 लाख है"
            )}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="flex gap-3">
            <button className="flex-1 bg-setu-navy text-white rounded-xl py-3 font-medium disabled:opacity-50" disabled={!inputText.trim() || loading} onClick={() => handleExtract(inputText)}>
              {loading ? t("Processing...", "प्रोसेस हो रहा है...") : t("Submit", "जमा करें")}
            </button>
            <button className={`px-5 rounded-xl font-medium ${isListening ? "bg-red-500 text-white" : "bg-setu-saffron text-white"}`} onClick={handleVoiceClick}>
              {isListening ? t("Listening... tap to stop", "सुन रहा हूं... रोकने के लिए टैप करें") : t("Speak", "बोलें")} 🎤
            </button>
          </div>
          {voiceError && <p className="text-red-500 text-sm">{voiceError}</p>}
        </div>
      )}

      {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 my-4">{errorMsg}</div>}

      {profile && !recommendations && (
        <div className="mt-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h2 className="font-semibold text-setu-navy mb-2">{t("Here's what we understood:", "हमने यह समझा:")}</h2>
            <ul className="text-sm text-gray-700 space-y-1">
              {Object.entries(profile)
                .filter(([k, v]) => v && k !== "language" && k !== "raw_input_text")
                .map(([k, v]) => (
                  <li key={k}>
                    <span className="text-gray-500">{FIELD_LABELS[k]?.[language] || k}:</span> <span className="font-medium">{String(v)}</span>
                  </li>
                ))}
            </ul>
          </div>

          {stillMissing.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-yellow-800 mb-3">{t("A few more details will help us find the right scheme:", "सही योजना खोजने के लिए कुछ और जानकारी चाहिए:")}</p>
              <div className="space-y-2">
                {stillMissing.map((field) => (
                  <input key={field} className="w-full border rounded-lg p-2 text-sm" placeholder={FIELD_LABELS[field]?.[language] || field} onChange={(e) => updateManualField(field, e.target.value)} />
                ))}
              </div>
            </div>
          )}

          <button className="w-full bg-setu-teal text-white rounded-xl py-3 font-medium disabled:opacity-50" disabled={stillMissing.length > 0 || loading} onClick={handleGetRecommendations}>
            {loading ? t("Finding schemes...", "योजनाएं खोजी जा रही हैं...") : t("Find My Best Scheme", "मेरी सर्वश्रेष्ठ योजना खोजें")}
          </button>
        </div>
      )}

      {recommendations && !selectedScheme && (
        <div className="mt-6 space-y-4">
          <h2 className="font-semibold text-setu-navy">{t("Recommended schemes", "अनुशंसित योजनाएं")}</h2>
          {recommendations
            .filter((r) => r.eligible)
            .map((rec) => (
              <div key={rec.scheme_id} className="border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-setu-navy">{rec.scheme_name}</h3>
                  <span className="text-sm bg-setu-teal text-white rounded-full px-2 py-0.5">{rec.match_score}% {t("match", "मैच")}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t("Up to", "अधिकतम")} ₹{rec.max_loan_amount.toLocaleString("en-IN")} · {rec.interest_rate}% p.a. · {rec.moratorium_months} {t("month moratorium", "महीने की मोहलत")}
                </p>
                <ul className="text-xs text-green-700 mt-2 space-y-0.5">
                  {rec.reasons.map((r, i) => (
                    <li key={i}>✓ {r}</li>
                  ))}
                </ul>
                <div className="flex gap-3 mt-3">
                  <button className="text-sm text-setu-navy underline" onClick={() => handleShowEmi(rec)}>
                    {t("Calculate EMI", "EMI की गणना करें")}
                  </button>
                  <button className="text-sm bg-setu-navy text-white rounded-lg px-3 py-1" onClick={() => handleFindRoute(rec)} disabled={loading}>
                    {t("Find Best Route", "सर्वश्रेष्ठ मार्ग खोजें")}
                  </button>
                </div>
                {emiFor?.scheme_id === rec.scheme_id && emiResult && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
                    <p>{t("Monthly EMI", "मासिक EMI")}: <b>₹{emiResult.monthly_emi.toLocaleString("en-IN")}</b></p>
                    <p>{t("Total interest", "कुल ब्याज")}: ₹{emiResult.total_interest.toLocaleString("en-IN")}</p>
                    <p>{t("Repayment starts month", "पुनर्भुगतान शुरू महीना")} #{emiResult.repayment_start_month}</p>
                    {emiResult.assumption_note && <p className="text-xs text-gray-400 mt-1">{emiResult.assumption_note}</p>}
                  </div>
                )}
              </div>
            ))}
          {recommendations.filter((r) => r.eligible).length === 0 && (
            <p className="text-gray-500">{t("No schemes matched your current details.", "कोई योजना मेल नहीं खाई।")}</p>
          )}
          <details className="text-sm text-gray-400">
            <summary className="cursor-pointer">{t("Why weren't other schemes recommended?", "अन्य योजनाएं क्यों नहीं?")}</summary>
            <ul className="mt-2 space-y-2">
              {recommendations.filter((r) => !r.eligible).map((r) => (
                <li key={r.scheme_id}><b>{r.scheme_name}:</b> {r.failed_rules.join("; ")}</li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {selectedScheme && routing && userCoords && (
        <div className="mt-6 space-y-4">
          <h2 className="font-semibold text-setu-navy">{t("Recommended channel partner", "अनुशंसित चैनल पार्टनर")}</h2>
          <PartnerMap userLat={userCoords.lat} userLng={userCoords.lng} recommended={routing.recommended_partner} alternatives={routing.alternatives} />
          <div className="border rounded-xl p-4">
            <h3 className="font-medium text-setu-navy">{routing.recommended_partner.partner_name}</h3>
            <p className="text-sm text-gray-500">{routing.recommended_partner.partner_type} · {routing.recommended_partner.distance_km} km · {t("Score", "स्कोर")}: {routing.recommended_partner.score}</p>
            <ul className="text-xs text-green-700 mt-2 space-y-0.5">
              {routing.recommended_partner.reasons.map((r: string, i: number) => (
                <li key={i}>✓ {r}</li>
              ))}
            </ul>
            {routing.recommended_partner.is_simulated_data && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded p-2">
                {t(
                  "Partner capacity/performance data shown here is simulated for this prototype demo.",
                  "यहां दिखाया गया पार्टनर डेटा इस डेमो के लिए सिम्युलेटेड है।"
                )}
              </p>
            )}
          </div>

          {applicationStatus && (
            <p className="text-sm text-gray-500">{t("Application status", "आवेदन स्थिति")}: <b>{applicationStatus}</b> · ID: {applicationId}</p>
          )}

          {checklist && (
            <div className="border rounded-xl p-4">
              <h3 className="font-medium text-setu-navy mb-3">{t("Required documents", "आवश्यक दस्तावेज़")}</h3>
              <div className="space-y-3">
                {checklist.missing_documents.concat(checklist.uploaded_documents).map((docType: string) => {
                  const uploaded = uploadStatus[docType];
                  return (
                    <div key={docType} className="text-sm">
                      <label className="block mb-1 text-gray-600">{docType.replace(/_/g, " ")}</label>
                      {!uploaded && (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleUploadDocument(docType, e.target.files[0])}
                        />
                      )}
                      {uploaded?.loading && <p className="text-gray-400">{t("Uploading & scanning...", "अपलोड और स्कैन हो रहा है...")}</p>}
                      {uploaded?.validation_status && (
                        <p className={uploaded.validation_status === "valid" ? "text-green-600" : "text-amber-600"}>
                          {uploaded.validation_status === "valid" ? "✓" : "⚠"} {uploaded.validation_status}
                        </p>
                      )}
                      {uploaded?.error && <p className="text-red-500">{uploaded.error}</p>}
                    </div>
                  );
                })}
              </div>
              {checklist.all_present && (
                <p className="text-green-700 text-sm mt-3 font-medium">{t("All required documents received.", "सभी आवश्यक दस्तावेज़ प्राप्त हुए।")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
