Software build prompt 
Here's a quick primer first, then your upgraded, context-window-aware MASTER PROMPT.

What's a "stub"?

A stub is a placeholder function, type, or file with the right signature but empty or minimal body—e.g.,

func fetchPracticeData(lastNDays n: Int) async throws -> [(date: Date, drills: [Drill])] {
    // TODO: implement
    return []
}

Stubs make large builds tractable: define interfaces first, implement step-by-step, and test as you go.


👉 MASTER PROMPT FOR CODING AGENT (DugoutPlanner)

0) Agent Operating Rules (follow exactly)
	1.	Sequential: Read PROJECT_PROGRESS.json; pick the first task with "status":"todo", complete it, set "done", write notes.
	2.	Persist after every task:
		•	Update PROJECT_PROGRESS.json (machine state) and PROJECT_TODO.md (human checklist).
		•	Update MASTER dugout planner app build prompt v1.0.md sections 8 & 9 with current status and next task.
		•	Append a concise, immutable Task Capsule to Docs/AGENT_SUMMARY.md (see §3.3).
		•	Auto-commit and push changes to GitHub (see §0.2).
	3.	Artifacts discipline: Create/modify only files listed in that task.
	4.	Security:
		•	No secrets in code; use environment variables only.
		•	HTTPS only; no arbitrary loads.
		•	Local-first storage; secure data handling.
	5.	Determinism: Rules engine and data transforms are non-LLM. LLM used only for education copy from vetted sources.
	6.	Validation: Meet Acceptance Criteria before marking "done".
	7.	Ambiguity: Choose the minimal conservative path consistent with Context; record decision in notes.
	8.	No pauses: Do not ask questions; proceed with safe defaults from Context.
	9.	Testing: Where tests are specified, add/extend tests and ensure they pass locally.

0.1) Context-Window Management (required for enhanced complexity)
	•	Keep live context under budget by writing/reading from these docs:
	•	Docs/AGENT_SUMMARY.md (rolling, append-only); each entry ≤ 180 words.
	•	Docs/TASK_HANDOFF.md (overwritten each task): precise inputs/outputs for the next task, list of touched files, and any TODOs. ≤ 120 words.
	•	Docs/CONTEXT_WINDOW.md: a single line with current token budget estimate and guidance (update each task).
	•	Docs/FEATURE_STATE.md: current state of enhanced features (NLP models loaded, custom metrics configured, ML training status). ≤ 100 words.
	•	When starting a task:
	1.	Read only: task spec, touched files, AGENT_SUMMARY.md (last 5 capsules), TASK_HANDOFF.md, FEATURE_STATE.md.
	2.	Load additional files only if referenced by those.
	3.	For NLP/ML tasks: check model dependencies and data requirements first.
	•	When finishing a task:
	1.	Write AGENT_SUMMARY.md capsule (include any ML/NLP integration notes).
	2.	Write TASK_HANDOFF.md for the next task (include feature dependencies).
	3.	Update CONTEXT_WINDOW.md (budget + keep/discard hints).
	4.	Update FEATURE_STATE.md if enhanced features were modified.

0.2) Git Integration & Auto-Commit Protocol (required)
	•	Maintain complete development history on GitHub with automatic commits and pushes after each task.
	•	When finishing a task:
	1.	Stage all changes: `git add .`
	2.	Commit with standardized format: `git commit -m "feat(task-XX): <brief task description>"`
	3.	Push to GitHub: `git push origin main`
	4.	Handle merge conflicts gracefully (pull before push if needed)
	5.	Log Git operations in task capsule for transparency
	•	Commit Message Format:
		•	`feat(task-XX): <brief description>` - for feature implementation
		•	`test(task-XX): <brief description>` - for test additions
		•	`docs(task-XX): <brief description>` - for documentation updates
		•	`fix(task-XX): <brief description>` - for bug fixes
	•	Error Handling:
		•	If push fails due to network: retry once, log error if persistent
		•	If merge conflicts: pull with merge strategy, resolve automatically if possible
		•	Never block task completion on Git failures - log and continue
	•	Git Status Tracking:
		•	Include Git commit hash in AGENT_SUMMARY.md capsules
		•	Reference commit history when handing off complex tasks
		•	Enable rollback to any task completion point

1) Project Context (read-only)
	•	Name: DugoutPlanner (React Native/Expo, TypeScript, Cross-platform)
	•	Goal: Comprehensive baseball coaching assistant with practice planning, drill management, and interactive field visualization.
	•	Core Features:
	•	Interactive field: Visual field diagram with clickable positions and player placement
	•	Drill library: Comprehensive drill database with categorization and custom drill creation
	•	Practice planning: Time-based practice plan builder with drill sequencing
	•	Enhanced Siri input: Natural language drill logging and practice plan creation
	•	Custom metrics: User-configurable variables (player performance, weather, equipment)
	•	NLP processing: Speech-to-text storage, drill extraction, sentiment analysis on notes
	•	Deterministic rules engine: Practice plan validation, drill progression, safety guidelines
	•	Advanced ML: Player performance analysis, drill effectiveness tracking, personalized recommendations
	•	Intelligent education: RAG with personalized content ranking based on coaching style and outcomes
	•	Exports: CSV + practice plan PDF with custom metrics and performance insights
	•	Non-negotiable Safety Rules:
	1.	Weather alerts ⇒ modify outdoor plans + "indoor alternative" message
	2.	Player fatigue or injury flags ⇒ auto-adjust intensity + recovery insert
	3.	No dangerous drills, no excessive repetition, no inappropriate age-group activities
	•	Privacy/Security:
	•	Local storage with secure data handling
	•	API keys in environment variables; HTTPS only
	•	RAG is read-only; rules engine remains LLM-independent

2) Repository Layout (create exact tree)

DugoutPlanner/
├─ App.tsx
├─ PROJECT_TODO.md
├─ PROJECT_PROGRESS.json
├─ Docs/
│  ├─ AGENT_SUMMARY.md
│  ├─ TASK_HANDOFF.md
│  └─ CONTEXT_WINDOW.md
├─ Config/
│  ├─ AppConfig.ts
│  ├─ SecretsManager.ts
│  └─ MetricConfiguration.ts
├─ Data/
│  ├─ Models/
│  │  ├─ PracticeSession.ts
│  │  ├─ Drill.ts
│  │  ├─ Player.ts
│  │  ├─ CustomMetric.ts
│  │  ├─ MetricValue.ts
│  │  ├─ TranscriptAnalysis.ts
│  │  └─ PerformanceFeedback.ts
│  └─ Store/
│     ├─ LocalStore.ts
│     └─ Exporter.ts
├─ Engine/
│  ├─ PlanTypes.ts
│  ├─ RulesEngine.ts
│  ├─ PerformanceAnalyzer.ts
│  └─ Orchestrator.ts
├─ Field/
│  ├─ BaseballField.tsx
│  ├─ InteractiveField.tsx
│  ├─ FieldTypes.ts
│  └─ PositionManager.ts
├─ Intents/
│  ├─ LogDrillIntent.ts
│  ├─ AppShortcutsProvider.ts
│  └─ EnhancedSiriHandler.ts
├─ Notifications/
│  ├─ NotificationScheduler.ts
│  └─ NotificationHandler.ts
├─ NLP/
│  ├─ TranscriptProcessor.ts
│  ├─ SentimentAnalyzer.ts
│  ├─ DrillExtractor.ts
│  ├─ ConfidenceValidator.ts
│  └─ NLPModels/ (CoreML models)
├─ ML/
│  ├─ FeatureEngine.ts
│  ├─ PersonalizationModel.ts
│  ├─ EffectivenessTracker.ts
│  ├─ ModelTrainer.ts
│  └─ RecommendationEngine.ts
├─ RAG/
│  ├─ EducationClient.ts
│  ├─ LocalCards.json
│  ├─ LocalSearch.ts
│  └─ PersonalizedRanker.ts
├─ LLM/
│  ├─ LLMClient.ts
│  ├─ ChatAgent.ts
│  ├─ PlanExplainer.ts
│  └─ InsightSummarizer.ts
├─ UI/
│  ├─ Screens/
│  │  ├─ PracticePlannerView.tsx
│  │  ├─ DrillLibraryView.tsx
│  │  ├─ FieldView.tsx
│  │  ├─ ReviewView.tsx
│  │  └─ MetricConfigView.tsx
│  └─ Components/
│     ├─ DrillCard.tsx
│     ├─ PlayerSelector.tsx
│     ├─ ChartViews.tsx
│     ├─ CustomMetricInput.tsx
│     └─ SentimentDisplay.tsx
└─ Tests/
   ├─ RulesEngineTests.ts
   ├─ PerformanceAnalyzerTests.ts
   ├─ OrchestratorTests.ts
   ├─ GoldenDialogTests.ts
   ├─ ChatAgentTests.ts
   ├─ NLPProcessorTests.ts
   ├─ PersonalizationTests.ts
   └─ CustomMetricTests.ts

3) Persistent Files (create immediately)

3.1 PROJECT_PROGRESS.json

{
  "project": "DugoutPlanner",
  "version": 1,
  "timezone": "America/Detroit",
  "last_updated_iso": "",
  "tasks": [
    { "id": "K01",  "title": "Create repo structure + files (enhanced modules)",         "status": "done", "notes": "Completed - Full DugoutPlanner structure with NLP, ML, Custom Metrics modules" },
    { "id": "K02",  "title": "Write initial capsules in Docs/",                          "status": "done", "notes": "Completed - AGENT_SUMMARY.md, TASK_HANDOFF.md, CONTEXT_WINDOW.md, FEATURE_STATE.md created" },
    { "id": "K03",  "title": "Set up Git integration & GitHub sync",                      "status": "done", "notes": "Completed - GitHub remote configured, auto-commit protocol tested and working" },
    { "id": "K04",  "title": "Update master prompt with Git protocol",                   "status": "done", "notes": "Completed - Added §0.2 Git Integration & Auto-Commit Protocol" },
    { "id": "T00",  "title": "Initialize repo & Expo project",                          "status": "todo", "notes": "" },
    { "id": "T01",  "title": "Add capabilities, app.json, security",                     "status": "todo", "notes": "" },
    { "id": "T02",  "title": "Core models & LocalStore (AsyncStorage/SQLite)",            "status": "todo", "notes": "" },
    { "id": "T02b", "title": "Extended models: CustomMetric, MetricValue, TranscriptAnalysis, PerformanceFeedback", "status": "todo", "notes": "" },
    { "id": "T02c", "title": "MetricConfiguration system for user-defined variables",     "status": "todo", "notes": "" },
    { "id": "T03",  "title": "Field visualization & interaction system",                  "status": "todo", "notes": "" },
    { "id": "T04",  "title": "Practice notification with quick actions",                  "status": "todo", "notes": "" },
    { "id": "T05",  "title": "Basic App Intent (Siri) for drill logging",                "status": "todo", "notes": "" },
    { "id": "T05b", "title": "Enhanced Siri: Natural language processing with NLP pipeline", "status": "todo", "notes": "" },
    { "id": "T05c", "title": "Entity extraction for custom metrics from speech",          "status": "todo", "notes": "" },
    { "id": "T06",  "title": "PlanTypes + RulesEngine (deterministic)",                   "status": "todo", "notes": "" },
    { "id": "T06b", "title": "Enhanced RulesEngine with custom metric support",           "status": "todo", "notes": "" },
    { "id": "T07",  "title": "PerformanceAnalyzer (EWMA/CUSUM/corr/logistic)",           "status": "todo", "notes": "" },
    { "id": "T07b", "title": "Advanced analytics: Multi-variate analysis, sentiment trends", "status": "todo", "notes": "" },
    { "id": "T08",  "title": "Orchestrator (state machine + throttling)",                 "status": "todo", "notes": "" },
    { "id": "T08b", "title": "PersonalizationEngine: Drill effectiveness tracking",       "status": "todo", "notes": "" },
    { "id": "T09",  "title": "UI: PracticePlannerView, DrillLibraryView, FieldView, ReviewView", "status": "todo", "notes": "" },
    { "id": "T09b", "title": "Enhanced UI: MetricConfigView, CustomMetricInput, SentimentDisplay", "status": "todo", "notes": "" },
    { "id": "T10",  "title": "Exporter (CSV + practice plan PDF)",                        "status": "todo", "notes": "" },
    { "id": "T10b", "title": "Enhanced exports with custom metrics and performance insights", "status": "todo", "notes": "" },
    { "id": "T11",  "title": "RAG optional: EducationClient + LocalSearch",               "status": "todo", "notes": "" },
    { "id": "T11b2","title": "PersonalizedRanker for content recommendations",            "status": "todo", "notes": "" },
    { "id": "T11a", "title": "LLMClient.ts (HTTPS + environment variables)",              "status": "todo", "notes": "" },
    { "id": "T11b", "title": "ChatAgent.ts (retrieve/getPlan/getInsights/getData)",       "status": "todo", "notes": "" },
    { "id": "T11c", "title": "PlanExplainer.ts + InsightSummarizer.ts",                   "status": "todo", "notes": "" },
    { "id": "T11d", "title": "ChatView.tsx",                                              "status": "todo", "notes": "" },
    { "id": "T11e", "title": "ChatAgent safety & grounding tests",                        "status": "todo", "notes": "" },
    { "id": "T12",  "title": "Security hardening (environment variables, secure storage)", "status": "todo", "notes": "" },
    { "id": "T13",  "title": "Golden tests & unit tests",                                 "status": "todo", "notes": "" },
    { "id": "T13b", "title": "Enhanced testing: NLP, personalization, custom metrics",   "status": "todo", "notes": "" },
    { "id": "T14",  "title": "Device build & manual QA checklist",                        "status": "todo", "notes": "" },
    { "id": "T15",  "title": "ML model training pipeline and effectiveness validation",   "status": "todo", "notes": "" }
  ]
}

3.2 PROJECT_TODO.md

# DugoutPlanner – Build Checklist (America/Detroit)

## Kickoff Preparation (Completed)
- [x] K01 Create repo structure + files (enhanced modules)
- [x] K02 Write initial capsules in Docs/
- [x] K03 Set up Git integration & GitHub sync
- [x] K04 Update master prompt with Git protocol

## Phase 1: Foundation
- [ ] T00 Initialize repo & Expo project
- [ ] T01 Add capabilities, app.json, security
- [ ] T02 Core models & LocalStore (AsyncStorage/SQLite)
- [ ] T02b Extended models: CustomMetric, MetricValue, TranscriptAnalysis, PerformanceFeedback
- [ ] T02c MetricConfiguration system for user-defined variables
- [ ] T03 Field visualization & interaction system
- [ ] T04 Practice notification with quick actions
- [ ] T05 Basic App Intent (Siri) for drill logging

## Phase 2: Enhanced Intelligence
- [ ] T05b Enhanced Siri: Natural language processing with NLP pipeline
- [ ] T05c Entity extraction for custom metrics from speech
- [ ] T06 PlanTypes + RulesEngine (deterministic)
- [ ] T06b Enhanced RulesEngine with custom metric support
- [ ] T07 PerformanceAnalyzer (EWMA/CUSUM/corr/logistic)
- [ ] T07b Advanced analytics: Multi-variate analysis, sentiment trends
- [ ] T08 Orchestrator (state machine + throttling)
- [ ] T08b PersonalizationEngine: Drill effectiveness tracking

## Phase 3: User Interface & Experience
- [ ] T09 UI: PracticePlannerView, DrillLibraryView, FieldView, ReviewView
- [ ] T09b Enhanced UI: MetricConfigView, CustomMetricInput, SentimentDisplay
- [ ] T10 Exporter (CSV + practice plan PDF)
- [ ] T10b Enhanced exports with custom metrics and performance insights

## Phase 4: Advanced Features
- [ ] T11 RAG optional: EducationClient + LocalSearch
- [ ] T11b2 PersonalizedRanker for content recommendations
- [ ] T11a LLMClient.ts (HTTPS + environment variables)
- [ ] T11b ChatAgent.ts (retrieve/getPlan/getInsights/getData)
- [ ] T11c PlanExplainer.ts + InsightSummarizer.ts
- [ ] T11d ChatView.tsx
- [ ] T11e ChatAgent safety & grounding tests

## Phase 5: Security & Validation
- [ ] T12 Security hardening (environment variables, secure storage)
- [ ] T13 Golden tests & unit tests
- [ ] T13b Enhanced testing: NLP, personalization, custom metrics
- [ ] T14 Device build & manual QA checklist
- [ ] T15 ML model training pipeline and effectiveness validation

3.3 Rolling Summaries (initialize now)
	•	Docs/AGENT_SUMMARY.md: start with a one-paragraph "Init" capsule (what was created, include initial commit hash).
	•	Docs/TASK_HANDOFF.md: start with "Next: T00" and a 3-bullet plan.
	•	Docs/CONTEXT_WINDOW.md: start with budget≈short; load: PROGRESS, TODO, last-5 capsules.
	•	Docs/FEATURE_STATE.md: start with "Enhanced features: none initialized. Custom metrics: not configured. NLP models: not loaded. ML training: not started."

4) Function Build Card (use above every stub you implement)

Implement: <Type>.<function>(…)
Purpose (1 line): …
Signature: public func …
Inputs: names, types, units, valid ranges.
Output: type + invariants.
Errors: throws cases / error enum.
Behavior & Constraints: pure? idempotent? async? thread-safety; no UI; no blocking.
Algorithm (outline): 3–8 bullets.
Acceptance Tests (Given/When/Then): 3–6 decisive cases.
Perf: bounds if relevant.
Notes: security, HTTPS, America/Detroit if time-based.
Coding rules: TypeScript 5.0+, React Native frameworks only, interfaces/final classes, private helpers, no console.logs in prod.

5) Task List (Acceptance Criteria condensed)

T00 — Initialize repo & Expo
Artifacts: Expo project; folder tree; App.tsx; progress files + Docs/…
Accept: Builds; placeholder TabView (Practice Planner, Drill Library, Field, Review); progress files exist.

T01 — Capabilities & App Config
Artifacts: app.json; permissions; security defaults; usage strings.
Accept: Runs on device; no permission errors; human-readable usage strings.

T02 — Models & LocalStore
Artifacts: PracticeSession, Drill, Player; LocalStore.ts with CRUD; secure storage.
Accept: Create/read PracticeSession; idempotent upsert by date; persistent data protected.

T03 — Field visualization
Artifacts: BaseballField, InteractiveField, PositionManager; field interaction logic.
Accept: Visual field diagram; clickable positions; player placement; responsive design.

T04 — Practice notification
Artifacts: NotificationScheduler + NotificationHandler with actions.
Accept: Practice reminder notifications; quick actions write drill deltas.

T05 — App Intent (Siri)
Artifacts: LogDrillIntent + AppShortcutsProvider.
Accept: "Log drill" saves entry; returns spoken summary.

T06 — PlanTypes + RulesEngine
Artifacts: plan domain types; RulesEngine.plan(for:) deterministic.
Accept: Safe practice plans; respects weather, player fatigue, age-appropriate activities.

T07 — PerformanceAnalyzer
Artifacts: ewma, cusumLow, spearman, trainLogistic; helpers; weekly Insight writes.
Accept: Unit tests for EWMA/CUSUM/corr/logistic pass on synthetic data.

T08 — Orchestrator
Artifacts: Orchestrator state machine; notification throttling; quiet hours; copy templates.
Accept: Simulated practice transitions INIT→…→EVENING_REVIEW; ≤3 notifications/day.

T09 — UI Screens
Artifacts: PracticePlannerView, DrillLibraryView, FieldView, ReviewView; DrillCard, PlayerSelector, ChartViews.
Accept: Four tabs functional; local data flows; charts don't block UI.

T10 — Exporter
Artifacts: Exporter.exportCSV(range:), exportPDF(practicePlan:); share from ReviewView.
Accept: CSV/PDF generate; open in share sheet; expected fields present.

T11 — RAG (optional)
Artifacts: EducationClient (via HTTPS + environment variables), LocalCards.json, LocalSearch (FTS-lite).
Accept: No key ⇒ offline search works; With key ⇒ cloud returns snippets.

T11a–e — LLM integration
Artifacts: LLMClient (HTTPS + environment variables), ChatAgent tools (retrieve/getPlan/getInsights/getData), PlanExplainer, InsightSummarizer, ChatView, tests.
Accept: Agent answers only from vetted RAG or local structured data; safe responses (≤4 sentences); tests enforce grounding.

T12 — Security hardening
Artifacts: SecretsManager (environment variables, secure flows); UI to paste/remove key; verify secure storage.
Accept: No plaintext secrets; revoking key disables cloud path safely.

T13 — Tests
Artifacts: RulesEngine/Performance/Orchestrator/GoldenDialog tests.
Accept: All tests pass; golden cases stable.

T02b — Extended Data Models
Artifacts: CustomMetric, MetricValue, TranscriptAnalysis, PerformanceFeedback models; enhanced PracticeSession.
Accept: Store custom metrics with confidence scores; transcript analysis persists; performance feedback tracked.

T02c — MetricConfiguration System
Artifacts: MetricConfiguration.ts; user settings for custom variables; validation rules.
Accept: Users can define custom metrics (scale/duration/boolean/count); validation enforced; backwards compatible.

T05b — Enhanced Siri NLP
Artifacts: EnhancedSiriHandler, TranscriptProcessor, DrillExtractor; CoreML integration.
Accept: Extract drills from natural language; store full transcript; confidence validation works.

T05c — Entity Extraction
Artifacts: NLP pipeline for custom metrics; confidence scoring; fallback validation UI.
Accept: "drill batting practice, 30 minutes, weather sunny" extracts correctly; low confidence prompts user confirmation.

T06b — Enhanced RulesEngine
Artifacts: RulesEngine supports custom metrics; dynamic safety thresholds; drill tracking.
Accept: Safety rules work with custom metrics; drill effectiveness influences recommendations.

T07b — Advanced Analytics
Artifacts: Multi-variate correlation; sentiment trend analysis; drill effectiveness ML.
Accept: Sentiment scores computed; custom metric correlations calculated; effectiveness predictions generated.

T08b — PersonalizationEngine
Artifacts: PersonalizationModel, EffectivenessTracker, RecommendationEngine.
Accept: Drills ranked by past effectiveness; content recommendations personalized; adaptive timing.

T09b — Enhanced UI
Artifacts: MetricConfigView, CustomMetricInput, SentimentDisplay; enhanced charts.
Accept: Users configure custom metrics; sentiment displayed; charts show custom variables.

T10b — Enhanced Exports
Artifacts: Extended CSV/PDF with custom metrics, sentiment scores, drill effectiveness.
Accept: Exports include all custom data; sentiment insights; drill tracking; readable format.

T11b2 — PersonalizedRanker
Artifacts: PersonalizedRanker for education content; engagement tracking; effectiveness measurement.
Accept: Content ranked by relevance + past engagement; effectiveness tracked; recommendations improve.

T13b — Enhanced Testing
Artifacts: NLPProcessorTests, PersonalizationTests, CustomMetricTests; golden dialogs for NLP.
Accept: NLP extraction tested; ML models validated; custom metric flows tested; sentiment analysis verified.

T14 — Device build & QA
Artifacts: QA_CHECKLIST.md (permissions, notifications, quick action, enhanced Siri, custom metrics, NLP processing, ML recommendations).
Accept: All items pass on device; enhanced features functional; performance acceptable.

T15 — ML Training Pipeline
Artifacts: ModelTrainer, FeatureEngine; training validation; effectiveness measurement.
Accept: Models train on user data; recommendations improve over time; privacy preserved; performance measured.

6) LLM & RAG Guardrails

ChatAgent tools (enhanced)
	•	retrieve(q) ⇒ passages (EducationClient/LocalSearch with PersonalizedRanker)
	•	getPlan(date?) ⇒ deterministic plan JSON (enhanced with custom metrics)
	•	getInsights(window) ⇒ trend objects (includes custom metrics and sentiment trends)
	•	getData(metric, window) ⇒ summaries (avg practice time/drills, custom metrics, sentiment scores)
	•	getCustomMetrics() ⇒ user-configured metrics with recent values
	•	getSentiment(window) ⇒ sentiment analysis of recent transcripts
	•	getDrillEffectiveness() ⇒ personalized drill rankings

System prompt for ChatAgent (enhanced)
	•	Answer only from vetted RAG passages and/or structured local data (including custom metrics and sentiment analysis).
	•	If no source: "I don't have that information."
	•	Weather alerts ⇒ advise indoor alternatives (applies to custom metrics too).
	•	No dangerous drills/excessive repetition/inappropriate age-group activities.
	•	Personal data queries must call the proper tool (including custom metrics and sentiment data).
	•	Drill recommendations must use effectiveness data when available.
	•	Educational content must be ranked by personalization when possible.
	•	Keep answers ≤ 4 sentences; cite RAG passage titles and data confidence when used.

7) Enhanced Feature Dependencies & Context Management

7.1) Progressive Enhancement Strategy
	•	Core app (T00-T05) must work without enhanced features
	•	NLP features (T05b-T05c) require React Native Speech/NaturalLanguage frameworks
	•	ML features (T07b-T08b) require sufficient user data (≥14 days recommended)
	•	Enhanced features gracefully degrade if dependencies unavailable

7.2) Context Handoff Rules for Enhanced Tasks
	•	NLP tasks: Include model loading status, confidence thresholds, extraction patterns
	•	ML tasks: Include training data requirements, model performance metrics, feature dependencies
	•	Custom metrics: Include current user configuration, validation rules, data migration needs
	•	Always document feature interaction dependencies in TASK_HANDOFF.md

7.3) Data Migration & Backwards Compatibility
	•	Enhanced models must support legacy data (basic drills/practice plans only)
	•	Custom metrics are additive (existing users not affected)
	•	NLP processing is optional (manual entry always available)
	•	ML recommendations supplement, never replace, deterministic rules

8) Kickoff (current status)
	✅ 1.	Create repo structure + files in §2 and §3 (including enhanced modules). - COMPLETED
	✅ 2.	Write initial capsules in Docs/… (including FEATURE_STATE.md). - COMPLETED
	✅ 3.	Set up Git integration: verify remote origin, test push capability. - COMPLETED
	✅ 4.	Adapt BackRecoveryCoach architecture for baseball coaching domain. - COMPLETED
	✅ 5.	Create structured development framework with task tracking. - COMPLETED
	✅ 6.	Design enhanced project structure for baseball coaching app. - COMPLETED
	✅ 7.	Create master build prompt for dugout planner. - COMPLETED
	✅ 8.	Set up PROJECT_PROGRESS.json and tracking files. - COMPLETED

9) Current Execution Point
	•	Status: T00 Completed - Successfully initialized repo & Expo project with organized structure and TabView navigation
	•	Next Task: T01 - Add capabilities, app.json, security
	•	Context: Project structure organized according to architecture, TabView navigation implemented with placeholder screens, React Navigation dependencies added, app builds successfully
	•	Repository: Ready for GitHub setup
	•	Files Ready: Complete project structure with Config, Data, Engine, Field, UI folders, TabView navigation, and tracking system established
