# MaybeTech

AI agent fleet management. Sandy Beach's template stack runs on MaybeTech.

## Auth

- Type: API key
- Key: `{{secrets.maybetech_api_key}}`
- Note: Read operations functional. Write operations require PartnerAdmin auth or Agent Builder UI.

## What MaybeTech Does

Hosts and manages the fleet of ~25 AI agents that power SalesSuiteOS. Each agent runs from templates that are governed by the Human Decision Doctrine and Consent-Activated Pursuit doctrine.

## Template Stack

17 templates across two modes:

### Sales Mode Templates
- Prospect qualification
- Belief transfer sequences
- Appointment booking
- Follow-up cadences
- Re-engagement (graph-driven)
- Objection handling (Head/Heart/Gut/Shoes mapped)
- Show-up confirmation
- Post-appointment follow-up

### Recruiter Mode Templates
- Candidate sourcing
- Opportunity presentation
- Cultural fit assessment
- Interview scheduling
- Onboarding sequences

## Fleet Architecture (Long-Term Vision)

```
Mother Collector (central)
├── Subaccount Agent 1 → outcomes feed back
├── Subaccount Agent 2 → outcomes feed back
├── ...
└── Subaccount Agent 25 → outcomes feed back

Mother detects KPI signals from outcomes.
Doctrine updates auto-push across all templates.
Self-learning. Self-improving. Fleet-wide.
```

## Current Limitations

- Write operations require PartnerAdmin auth or manual Agent Builder UI work
- Cannot programmatically push template updates to fleet (yet)
- GHL Private Integration Tokens needed for full workflow automation

## Rules

- Never push template changes to production without owner review.
- Sandy Beach's soul and system prompt are fixed across ALL templates.
- Templates can adjust tactical parameters (timing, channel, segment) but NOT doctrine.
- Every template change must be logged with reasoning.
