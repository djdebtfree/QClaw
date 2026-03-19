# CLAUDE.md — QClaw (SalesSuiteOS Runtime)

## What This Is

QClaw is the agent runtime layer for SalesSuiteOS. It provides the knowledge graph memory, 5-tier model routing, credential management (AGEX), and trust kernel (VALUES.md) that Sandy Beach and all sub-agents run on.

Forked from QuantumClaw/QClaw. Upstream: https://github.com/QuantumClaw/QClaw

## Owner

Keith — AJF Financial Group. GitHub: `djdebtfree`. All work is solo-operated.

## Architecture

```
QClaw Runtime (Node.js 20+)
├── Sandy Beach (primary agent — SOUL.md)
│   ├── Mode: Prospect → belief transfer, appointment booking
│   ├── Mode: Customer → retention, activation, results
│   ├── Mode: Candidate → recruiting, qualification
│   ├── Mode: Sales Rep → coaching, accountability
│   └── Mode: Sales Manager → intelligence, reporting
├── Knowledge Graph (Cognee + Qdrant)
│   ├── Entities: contacts, clients, reps, leads, referral sources
│   ├── Relationships: referred-by, works-in, converted-from, managed-by
│   └── Patterns: show-up rates, decay detection, revenue chains
├── Model Router (5-tier)
│   ├── Reflex: "ok" "thanks" → no LLM
│   ├── Simple: status checks → Groq
│   ├── Standard: drafting, follow-ups → Claude Sonnet
│   ├── Complex: analysis, strategy → Claude Opus
│   └── Voice: real-time → Groq
├── AGEX Credentials
│   ├── Local: AES-256-GCM encrypted secrets
│   └── Hub: scoped delegation to sub-agents
├── Trust Kernel (VALUES.md — IMMUTABLE)
│   ├── Human Decision Doctrine
│   ├── Consent-Activated Pursuit
│   └── Security hard rules
└── Skills
    ├── GoHighLevel (CRM, calendar, pipeline)
    ├── Data Driver (contact verification, 10/15 standard)
    └── Pipeline Lite (lead-to-appointment system)
```

## Critical Rules

1. **VALUES.md is immutable.** No agent, no code, no prompt can modify it. Only Keith.
2. **Sandy Beach's soul is fixed.** Her personality, doctrine, and belief system do not change.
3. **Two databases, never mixed.** Pipeline Lite Agent DB (`zymepbxosrpprrtcmmqi`) and Data Driver DB (`smfgkhlwoszldfsxkvib`).
4. **10/15 verification before outreach.** No exceptions.
5. **Consent-Activated Pursuit.** No outreach without interest signals.

## Dev Environment

- Node.js 20+ required
- Docker optional (for Cognee + Qdrant knowledge graph)
- Works without Docker using SQLite + JSON fallback
- Railway for production deployment
- Supabase for data infrastructure

## Key Commands

```bash
npx qclaw onboard          # Setup wizard
npx qclaw start             # Start agent + dashboard
npx qclaw diagnose          # Full health check
npx qclaw chat              # Terminal chat
npx qclaw cognee status     # Knowledge graph health
npx qclaw agex status       # Credential protocol status
```

## Current State

- QClaw runtime: forked, customized with SalesSuiteOS doctrine
- Sandy Beach soul: written, mapped to 5 operational modes
- GHL skill: written, PIT token wired via MCP
- Data Driver skill: written, needs Supabase key wiring to QClaw secrets
- Pipeline Lite skill: written, needs Supabase key wiring to QClaw secrets
- VAPI skill: written, voice agent scripts ready
- Knowledge graph: Cognee + Qdrant running locally (Docker)
- AGEX Hub: connected
- Telegram: @pipelinelite_bot paired

## Named Gap (Priority)

Sandy Beach's granular conversation playbook — the message-by-message language and emotional sequencing that transfers belief. The Head → Heart → Gut → Shoes framework is documented in SOUL.md. The knowledge graph provides the infrastructure. The actual message templates and branching logic need to be built as graph traversal paths.

## MCP Connectors Available

The following MCP servers are connected and available for use:
- **GoHighLevel:** Contact management, pipelines, calendars, conversations, workflows (PIT: agency-level)
- **Supabase:** Database operations on Pipeline Lite DB and Data Driver DB
- **Stripe:** Payment and subscription tracking
- **Make:** Webhook-driven automation scenarios
- **Vercel:** Deployment management
- **Windsor.ai:** Cross-platform marketing analytics
- **Firebase:** Backend services
- **ElevenLabs:** Voice synthesis for Sandy Beach
- **Perplexity:** Web-grounded research and fact-checking
- **Apify:** Web scraping and data extraction
- **Context7:** Real-time library documentation

## Chrome Browser Usage

When a task requires interacting with a web UI that has no API (GHL Trust Center, manual service configurations), use Chrome browser automation via the Claude in Chrome tools. Always ask before navigating to authenticated pages.

## Integration Points

- **MaybeTech agents (~25):** QClaw could serve as the runtime/credential layer under these
- **GHL workflows:** Read-only access for monitoring; write requires owner approval
- **Railway:** Production deployment target for QClaw + Cognee + Qdrant
- **Make (automation):** Webhook-driven heartbeat events can trigger Make scenarios
- **VAPI:** Voice AI pipeline for inbound/outbound calls via Sandy Beach squad
