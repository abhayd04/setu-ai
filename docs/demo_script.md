# SETU-AI Demo Script (Milestone 7)

Target: 4-5 minutes, matching the spec's demo scenario. This script is
written against what's ACTUALLY built in this codebase — every step below
maps to a real endpoint/screen, not an aspiration. If something here
doesn't work when you rehearse, that's a real bug to fix before demo day,
not a script problem.

## Setup before you go on stage

- [ ] Backend running, `/api/health` returns 200
- [ ] Database seeded (6 schemes, 5 partners)
- [ ] `GEMINI_API_KEY` valid and not rate-limited
- [ ] Frontend loaded on a device with a working microphone (or have typed
      fallback text ready if venue wifi/mic is unreliable)
- [ ] Browser location permission pre-approved OR know the Indore fallback
      coordinates will kick in automatically

## Script

**[0:00-0:20] Opening**
"SETU-AI isn't another scheme finder — it's the delivery layer that's
missing between a citizen being eligible and actually getting funded."
(State the differentiation up front, per your spec's core positioning.)

**[0:20-1:00] Hindi voice input**
Tap 🎤 on the citizen page, say (or have typed as backup):
"मुझे ₹4 लाख का लोन चाहिए। मैं मोबाइल रिपेयर की दुकान शुरू करना चाहता हूँ। मेरी सालाना पारिवारिक आय ₹3.2 लाख है।"
→ Show the extracted profile appearing (purpose, business_type, income,
requested_amount) — narrate: "This is LLM extraction only — it hasn't
decided anything yet."

**[1:00-1:45] Eligibility + recommendation**
Tap "Find My Best Scheme" → ranked scheme cards appear with match scores
and ✓ reasons. Expand "why weren't other schemes recommended" to show the
failed_rules for an ineligible scheme (e.g. Micro Finance rejected on
income/amount).
→ Narrate: "Every recommendation is explainable — this came from a
deterministic policy engine, not an LLM guess."

**[1:45-2:15] EMI calculator**
Tap "Calculate EMI" on the recommended scheme → show monthly EMI, total
interest, moratorium handling.

**[2:15-3:15] Partner routing + map**
Tap "Find Best Route" → map appears with recommended + alternative
partners, routing reasons shown (authorization, capacity, distance,
processing performance).
→ Narrate explicitly: "Nearest is not always best — and any partner
capacity/performance numbers you see are clearly labeled simulated,
since we don't have live access to NBCFDC's internal partner MIS."

**[3:15-4:00] Document upload**
Upload a sample income certificate image → OCR extracts fields, validates
against the stated income, shows ✓/⚠ per check.
→ Have 1-2 real test images ready (a phone photo of a printed test
document works fine) — do NOT rely on a screenshot, actually test the
upload flow the way a judge might poke at it.

**[4:00-4:30] Government dashboard**
Switch to the admin dashboard → show total applications, by-scheme
breakdown, credit access gap metric, partner workload table.
→ Narrate: "These are real counts from this session's own database, not
canned numbers — if we run the demo twice, the counts go up."

**[4:30-5:00] Closing**
"From eligibility to delivery, in one flow — voice-first, explainable at
every step, and honest about what's real government data versus what's
simulated for this prototype."

## What to explicitly call out as simulated (don't let a judge "catch" this)

- Partner capacity/utilization/processing-performance numbers
  (`backend/data/partners.json`, all flagged `is_simulated_data: true`)
- Partner branch existence/location (plausible but not verified real
  branches)
- NPA/fund-utilization eligibility filtering (not implemented — out of
  scope for this prototype, mention it as a roadmap item if asked)

## What to have a real answer ready for, if asked

- "Where did your scheme figures come from?" → NBCFDC's official site,
  cross-checked against the PS text; three schemes flagged in
  `backend/data/schemes.json`'s `source_note` fields as needing final
  verification (New Swarnima's tiered rate, General Term Loan's exact
  figures, Micro Finance's income threshold approximation)
- "Is this connected to real government systems?" → No — this is a
  prototype architected so demo/simulated data can be swapped for
  authenticated government APIs later without rewriting the core engines
  (policy engine, routing engine, calculator all take structured data,
  not hardcoded sources)
- "How does your RAG assistant work?" → Local TF-IDF retrieval (tested,
  imperfect on close-call queries — be honest if pressed) + Gemini for
  grounded answer generation, not a hosted vector DB (deliberate speed
  tradeoff for a 3-week build)

## Freeze checklist (do this ~2 days before Sept 30, not the night before)

- [ ] Stop adding new features — bug fixes only from this point
- [ ] Re-run the full demo script end-to-end, 3 times, on the actual
      device you'll present with
- [ ] Have a backup: screen recording of a successful full run, in case
      live demo fails on stage
- [ ] Prepare answers for the "what's simulated" and "where's your data
      from" questions above — don't let your team be caught flat-footed
- [ ] Confirm every team member can explain the policy-engine-vs-LLM
      separation in one sentence — judges will likely test this
      understanding directly, not just the demo
