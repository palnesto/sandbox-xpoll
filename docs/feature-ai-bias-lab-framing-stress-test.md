# Feature Spec: AI Bias Lab (Framing Stress Test)

## Summary
Add a standalone **AI “Bias Lab”** for campaign owners to evaluate whether their **poll/trial wording** could be overly leading, confusing, or manipulation-prone.

Owners select a **specific poll or trial** and run an **adversarial framing stress test**. The AI generates multiple rewritten versions of the questions/options (different framings) and returns:
- bias/manipulation risk indicators (structured)
- clarity/comprehension scores (structured)
- “safer neutral rewrites” recommendations (optional; owner preview only)
- an audit-friendly report with model + prompt metadata

This is a new product module (a “lab”), not an incremental change to voting, polling, or onboarding.

## Why this matters (AI-trending world)
Market-facing AI research tools are moving toward **trust, transparency, and research integrity**.
Instead of only showing vote counts, owners need:
- confidence that their questions measure intent (not wording effects)
- visibility into emotional/framing triggers that may skew results
- practical rewrites to reduce ambiguity and demand higher-quality data

YouGov-style qualitative positioning focuses on “the why”; this feature focuses on **the question quality** and **how framing could bias outcomes**.

## Primary Users
1. Campaign owner / trial owner (must be authenticated)
2. Optional co-owners (if permissions allow)
3. Admin (future; not required for v1)

## Non-goals (v1)
1. No participant-facing UI (owners use this as a private lab)
2. No real-time A/B test execution in v1 (simulation + analysis only)
3. No automatic publishing of rewritten questions (owner previews + manual adoption only)
4. No sensitive personal data ingestion (debrief/interview text not required)

## Core UX / Navigation
### Entry point (v1)
Add a new owner route entry under the campaign/trial management area:
- `Campaign -> AI Bias Lab`
- `Trial -> AI Bias Lab`

### Lab screen layout
1. **Pick input**
   - Select a `trialId` (or pick a `pollId` inside a trial)
   - Preview the current question text + options (what AI will analyze)
2. **Run stress test**
   - Choose stress test type (v1 fixed presets):
     - `Neutrality Stress Test` (reduce leading language)
     - `Clarity Stress Test` (reduce ambiguity; ensure single interpretation)
     - `Persuasion Vector Scan` (detect emotional/authority cues)
   - Configure difficulty (v1: `Low / Medium / High`) which changes rewrite aggressiveness
3. **Results report**
   - Bias & manipulation risk indicators (scores + explanations)
   - Comprehension clarity score + “what users might misunderstand”
   - Generated rewrite set (up to N) with change summaries
   - “Owner action” suggestions (what to edit)
4. **Save report**
   - Persist report to the campaign for later review

## Stress Test Mechanics (v1)
Given the input:
- question/prompt text
- answer option labels (and any subtexts)
- any available metadata (e.g. category/industry/asset context if present)

The AI performs these steps:
1. **Dissect framing**
   - detect leading language, loaded terms, implied assumptions
   - identify emotional triggers (fear/hope/urgency) and authority cues
2. **Adversarial rewrites**
   - generate multiple alternative framings:
     - neutral restatements
     - “value-based” framing (for detection, not publication)
     - “evidence-first” framing (for detection, not publication)
   - each rewrite is labeled by framing type
3. **Consistency check**
   - evaluate whether the same response option meaning changes subtly across framings
4. **Risk scoring**
   - output structured scores across bias dimensions (below)

## Output Schema (strict JSON)
The client renders only from this schema.

```ts
type BiasLabReport = {
  input: {
    trialId?: string;
    pollId?: string;
    questionText: string;
    options: Array<{ optionId?: string; label: string }>;
  };
  model: {
    provider: "openai" | string;
    modelName: string;
    version: string;
    runId: string;
  };
  scores: {
    neutralityRisk: number; // 0-100 (higher = riskier)
    clarityRisk: number;    // 0-100
    persuasionVectorRisk: number; // 0-100
    assumptionLeakRisk: number; // 0-100
  };
  findings: {
    leadingLanguage: string[];
    ambiguityRisks: string[];
    emotionalTriggers: string[];
    authorityOrSocialProofCues: string[];
    assumptionList: string[];
  };
  comprehensionChecks: {
    likelyMisinterpretations: string[];
    clarifyingQuestionsForOwner: string[];
  };
  rewriteSet: Array<{
    framingLabel: "neutral" | "value" | "evidence";
    revisedQuestionText: string;
    revisedOptions: string[];
    changeSummary: string[];
    expectedEffectOnInterpretation: string;
    suitabilityRecommendation: "recommended" | "optional" | "avoid";
  }>;
  audit: {
    createdAt: string;
    seed?: string;
    promptHash?: string;
    notes?: string;
  };
};
```

## Bias Dimensions (v1 scoring rubric)
1. **Neutrality Risk**
   - leading wording, implied conclusions, “should” language, skewed framing
2. **Clarity Risk**
   - ambiguous references, double negatives, unclear scopes (“often”, “recently”)
3. **Persuasion Vector Risk**
   - manipulation/soft coercion patterns (urgency, scarcity, fear/hope)
4. **Assumption Leak Risk**
   - hidden assumptions baked into the question or option labels

## Safety & Trust Constraints
1. The lab produces **analysis and rewrites for quality**, not claims about users.
2. The AI must not generate fabricated “user misunderstandings”.
   - It may generate “likely misunderstandings” as hypothesis, clearly labeled as such.
3. No participant data required in v1.
4. Store an audit trail: model name + run id + prompt hash (if supported).

## Backend (proposed endpoints)
This module can reuse the existing LLM realtime/presign pattern or use server-side generation.

1. Create run session:
   - `POST /external/campaigns/bias-lab/suggest/presign`
   - Body:
     - `{ trialId?, pollId?, input: { questionText, options }, presetType, difficulty }`
   - Response: `{ sessionId, model, clientSecret? }`
2. Generate report:
   - `POST /external/campaigns/bias-lab/generate`
   - Body: `{ sessionId, input, presetType, difficulty }`
   - Response: `{ report: BiasLabReport }` (or streaming JSON chunks)
3. Save report:
   - `POST /external/campaigns/bias-lab/save`
   - Body: `{ campaignId, trialId?, pollId?, report }`
4. Fetch saved reports:
   - `GET /external/campaigns/bias-lab/reports?campaignId=...`

## Frontend Implementation Notes (outline)
1. **Route + layout**
   - New pages under `src/pages/campaigns/my-campaigns/[id]/bias-lab/`
2. **Lab components**
   - `BiasLabInputPicker`
   - `BiasLabRunForm`
   - `BiasLabReportView` (renders scores + findings + rewriteSet)
3. **API integration**
   - Add endpoints under `src/api/endpoints/index.ts` for the three flows:
     - presign/generate/save (and list)
4. **Permissions**
   - Use existing owner/co-owner gating patterns

## Analytics Events
Client-side events:
- `bias_lab_open`
- `bias_lab_input_selected`
- `bias_lab_run_started`
- `bias_lab_report_generated`
- `bias_lab_report_saved`
- `bias_lab_rewrite_preview_clicked` (optional)

## Edge Cases
1. Missing option labels: still run analysis using what exists.
2. Long question/option text:
   - truncate for model context, but preserve full text in the audit input
3. AI generation failure:
   - show fallback messaging and allow retry
4. Multiple polls inside a trial:
   - v1 supports either trial-level run OR single poll selection (no bulk mode)

## Rollout Plan
1. v1 MVP (simulation only)
   - owners run stress test and view report
   - reports can be saved and revisited
2. v1.1
   - add “copy-to-editor” buttons (still manual adoption)
3. v1.2
   - add a “risk trend” view across revisions (historical scoring)

## Acceptance Criteria
1. Owner can run a stress test for a selected trial/poll and get a structured report.
2. UI renders without errors only from the strict report schema.
3. Report includes:
   - 4 risk scores
   - at least 3 finding categories
   - a rewrite set with change summaries
   - audit metadata
4. On AI failure, user can retry and no partial report is saved silently.
5. No participant personal data is required in v1.

## Open Questions
1. Should owners be allowed to upload custom question text overrides, or only use existing poll/trial text?
2. Which risk scores are most actionable for owners (we can tune after first pilot)?
3. Do we want to support bulk analysis across a whole trial (v2) or keep single-input only?

