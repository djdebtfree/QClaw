# Sandy Beach Pipeline OS — 10-Agent Architecture

## Target State for MaybeTech Fleet Integration

This document maps the 10 specialized agent roles to pipeline stages, MaybeTech template IDs (where they exist), and behavioral rules. Sandy Beach currently operates as a single agent with 5 modes in QClaw. The target architecture decomposes her into 10 agents with strict jurisdictions.

## The Principle

Each agent has ONE job. Agents cannot cross jurisdictional boundaries. The Orchestrator routes by pipeline state (RULE 1: STATE > CONTENT). Only one agent speaks at a time (RULE 0: SINGLE VOICE LAW).

## Agent Map

| # | Agent | Type | Pipeline Stage | MaybeTech ID | Role |
|---|-------|------|---------------|-------------|------|
| 1 | Reach Out Agent | Speaking | New Lead | Sandy_FirstReplyAgent_v1 (yWtZ9Tgmv) | Opens conversation with Canonical Texts 1-3. Never explains. Never qualifies. Only job: get a reply. |
| 2 | Intent Declaration Agent | Speaking | Contacted | AgentZero_Onboarding_v1 (wsUh25dRz) | Confirms interest without selling. States purpose after permission. "I'm reaching out because..." |
| 3 | Discovery Agent | Speaking | Engaged | (unmapped — build next) | Learns how the lead thinks. Uses FORM method (Family, Occupation, Recreation, Motivation) as fallback. Maps to Head→Heart→Gut emotional discovery. |
| 4 | Clarity & FAQ Agent | Speaking | Education Sent | (unmapped — build next) | Delivers CEO Story video. Answers factual questions. Never motivates. Never persuades. Information only. |
| 5 | Objection Agent | Speaking | Objection | ReplyClassifierAgent_v1 (i6Cm69ytv) routes here | Normalizes resistance. Acknowledges once. Challenges once. Then silence. Never chases. Q1-Q20 objection system. |
| 6 | Alignment Detection Agent | Silent | (parallel) | LifecycleStateController_v1 (F0ytC-Kb9) | Scores readiness from behavioral signals. Never speaks to leads. Feeds data to Orchestrator for state transitions. |
| 7 | Scheduling Agent | Speaking | Education Consumed | (unmapped — build next) | Books the Zoom/call appointment. ONLY agent that schedules. Uses "locking it down" — confirms specific time, sends calendar invite, gets verbal commitment. |
| 8 | Reminder Agent | Speaking | Interview Scheduled | (unmapped — build next) | Protects show-up rates. Day-before, day-of, hour-before. Frames as SERVICE not reminder. Maps to Vapi Sandy_Confirmation agent for voice. |
| 9 | Exit Agent | Speaking | Opted Out | AudiencePermissionEnforcer_v1 (sveY-k_gu) | Handles opt-outs with integrity. "Got it. Appreciate your time." No guilt. No follow-up drip. Clean close is doctrine. |
| 10 | Orchestrator | Silent | (all) | DoctrineKernelEnforcer_v1 (BDqboZ5WQ) | Routes everything by state. Enforces SINGLE VOICE LAW, STATE > CONTENT, and PRECEDENCE LADDER. Never speaks to leads. |

## Existing MaybeTech Agents That Map to Other Roles

| Template ID | Name | Maps To |
|------------|------|---------|
| SR0fuP2V4 | ActivationGatekeeper_v1 | Gate between stages — works with Orchestrator |
| Puf0H86sA | MetricsEventLogger_v1 | KPI logging for Mother Collector |
| 3cqgQL0MM | DataDriver_FetchAgent_v1 | Data retrieval — feeds Discovery and Alignment agents |
| XIR4QIVwo | LocalLearningAgent_v1 | Self-learning loop — feeds Mother Collector |

## State Transitions

New Lead → [Reach Out Agent sends Canonical Text 1]
  ↓ (reply received)
Contacted → [Intent Declaration Agent confirms interest]
  ↓ (interest confirmed)
Engaged → [Discovery Agent runs FORM + Head→Heart→Gut]
  ↓ (discovery complete)
Education Sent → [Clarity Agent delivers CEO Story]
  ↓ (video watched — behavioral signal from Alignment Agent)
Education Consumed → [Scheduling Agent books appointment]
  ↓ (appointment booked)
Interview Scheduled → [Reminder Agent protects show-up]
  ↓ (showed up)
Showed Up → [Post-meeting follow-up — outside current scope]
  ↓ (opted out at ANY stage)
Opted Out → [Exit Agent — clean close, no guilt]

EVERY transition is triggered by LEAD BEHAVIOR, never by agent decision. No agent advances a lead's stage — only the lead's behavior advances the stage. This is the first guardrail of the Sandy Beach Manifesto.

## Voice Agent Mapping

The 5 Vapi voice agents (Session 9) map to this architecture:
- Sandy_Router → Orchestrator (voice equivalent)
- Sandy_Prospect → Discovery Agent + Clarity Agent (inbound combines both)
- Sandy_Recovery → Reach Out Agent (re-engagement variant)
- Sandy_Confirmation → Reminder Agent (voice channel)
- Sandy_PostMeeting → Beyond current scope (post-show-up)

## What's Built vs. What's Next

BUILT (live in beta):
- Sandy Beach as unified agent with 5 modes (QClaw)
- 5 Vapi voice agents
- 10 active MaybeTech templates (v1 series)
- DoctrineKernelEnforcer running compliance checks
- LifecycleStateController managing state transitions

NEXT SPRINT:
- Decompose Sandy Beach modes into discrete QClaw sub-agents
- Map remaining unmapped MaybeTech slots to Discovery, Clarity, Scheduling, Reminder agents
- Wire the Orchestrator to enforce SINGLE VOICE LAW across SMS + Telegram + Voice
- Build the Mother Collector Supabase aggregation layer
- Enable fleet-wide doctrine push (blocked by MaybeTech API — may need Playwright fallback)
