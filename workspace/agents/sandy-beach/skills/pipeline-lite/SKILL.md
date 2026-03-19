# Pipeline Lite

Belief-first lead-to-appointment system. The "Connect" pillar of SalesSuiteOS.

## Auth

- Type: Supabase client
- Database: Pipeline Lite Agent DB (`zymepbxosrpprrtcmmqi`)
- Key: `{{secrets.supabase_pipeline_lite_key}}`
- Base URL: `https://zymepbxosrpprrtcmmqi.supabase.co`

## What Pipeline Lite Does

Converts cold data into warm leads into booked appointments into people who actually show up. The key differentiator: Consent-Activated Pursuit. No outreach without a signal of interest.

## The Funnel

```
Cold Data (from Data Driver, verified 10/15)
    ↓
Warm Lead (responded to initial outreach, showed interest)
    ↓
Booked Appointment (scheduled via GHL calendar)
    ↓
Show-Up (actually appeared — this is the metric that matters)
```

## Consent-Activated Pursuit Doctrine

- Initial contact: soft, value-first message. No CTA. No pitch.
- Wait for response signal (reply, click, engagement).
- Only after consent signal: proceed with belief transfer sequence.
- If no signal after sequence completes: mark cold. Do not chase.
- Re-engagement only via graph-driven triggers (relationship decay detection).

## Sandy Beach SMS Agent (DD-SandyBeach)

- Deployed on Railway
- Dual Supabase architecture (Pipeline Lite DB + Data Driver DB)
- Handles automated SMS sequences within consent-activated parameters
- Never sends to unverified contacts
- Never sends outside approved sequence templates

## MaybeTech Template Stack

17 templates across Sales and Recruiter modes. Governed by:
- Human Decision Doctrine
- Consent-Activated Pursuit doctrine
- Sandy Beach soul (fixed, never altered by templates)

Templates require owner review before push to production fleet.

## Outreach Channels

- SMS (primary) via Twilio
- WhatsApp via Twilio (16MB media cap, ~$0.016/message for marketing templates)
- Email via GHL Domain Setup (automated domain purchase & email sending domain config)

## Quirks

- Pipeline Lite DB and Data Driver DB are SEPARATE systems. Never cross-query.
- Show-up rate is the north star metric, not appointment count.
- Lead temperature is inferred from engagement patterns, not self-reported.
- The knowledge graph should track referral chains: who referred whom, which source produces the highest show-up rate.
