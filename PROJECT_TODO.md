# DugoutPlanner – Build Checklist (America/Detroit)

## Kickoff Preparation (Completed)
- [x] K01 Create repo structure + files (enhanced modules)
- [x] K02 Write initial capsules in Docs/
- [x] K03 Set up Git integration & GitHub sync
- [x] K04 Update master prompt with Git protocol

## Phase 1: Foundation
- [x] T00 Initialize repo & Expo project
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
