# HEARTBEAT.md — SalesSuiteOS Pulse

## Pipeline Check
Check GHL for new leads added in the last 30 minutes. If any are unverified against the 10/15 standard, flag them. Summarise new qualified leads in memory.

## Relationship Decay
Query the knowledge graph for contacts not touched in 14+ days (leads) or 30+ days (clients). Flag any that have revenue or referral history. Surface the top 3 re-engagement opportunities.

## Appointment Watch
Check GHL calendar for appointments in the next 2 hours. Send confirmation reminders where configured. Flag any no-show patterns — if a prospect has missed before, note it.

## Agent Fleet Health
Check status of active MaybeTech agents. If any Sandy Beach SMS agent (DD-SandyBeach or similar) has gone unresponsive on Railway, flag immediately.

## Data Driver Verification Queue
Check for contacts in the Data Driver DB that are pending verification. Report count and any that have been pending > 24 hours.

## Revenue Intelligence (Weekly — Monday 9am)
Traverse the knowledge graph for:
- Most profitable referral chains this month
- Client segments with highest lifetime value
- Upcoming contract renewals (next 30 days)
- Lead sources trending up or down

## Doctrine Compliance Audit (Daily — 6am)
Query the knowledge graph for any outbound messages sent in the last 24 hours. Check each against:
1. Did the correct agent handle the message based on pipeline state? (RULE 1)
2. Were any leads contacted by more than one agent in the same interaction window? (RULE 0)
3. Did any agent advance a lead's stage directly (vs. behavioral trigger)? (Guardrail #1)
4. Were any messages sent without passing DoctrineKernelEnforcer? (compliance bypass)
5. Did Human Texture get applied to SMS messages? (texture compliance)
Flag violations. Surface the top 3 issues in the morning brief.
