# Data Driver

Intent-based contact data platform. The "Leads" pillar of SalesSuiteOS.

## Auth

- Type: Supabase client
- Database: Data Driver DB (`smfgkhlwoszldfsxkvib`)
- Key: `{{secrets.supabase_data_driver_key}}`
- Base URL: `https://smfgkhlwoszldfsxkvib.supabase.co`
- API Gateway: `https://datadriverapi.com`

## What Data Driver Does

Provides verified, intent-based contact data to insurance recruiters and GHL agency owners. Every contact is verified against the 10/15 standard before delivery.

### The 10/15 Standard
10 out of 15 data points must be confirmed before a contact is considered verified:
1. First name
2. Last name
3. Email (deliverable)
4. Phone (connected)
5. Company/agency
6. Title/role
7. Location (state)
8. License status (where applicable)
9. LinkedIn profile
10. Industry vertical
11. Company size
12. Years in role
13. Email engagement history
14. Phone connection rate
15. Intent signals (web activity, content engagement, search behavior)

## Pricing (INTERNAL — Never quote to prospects without context)

- 14-day free trial
- $0.25/contact rebill after trial
- $497 lifetime founder pricing (INTERNAL ONLY)

## Endpoints (via API Gateway)

### Get Contacts
- GET `/api/contacts`
- Query params: `vertical`, `state`, `verified`, `limit`
- Response: `{ contacts: [{ id, firstName, lastName, email, phone, verificationScore, intentSignals }] }`

### Verify Contact
- POST `/api/contacts/{contactId}/verify`
- Runs the 10/15 verification check
- Response: `{ score, passedChecks[], failedChecks[], verified: boolean }`

### Get Verification Queue
- GET `/api/contacts/queue`
- Returns contacts pending verification
- Query params: `status`, `olderThan`

## Integration with Pipeline Lite

Data Driver feeds verified contacts INTO Pipeline Lite. The flow:
1. Data Driver verifies contact (10/15 standard)
2. Verified contact pushed to GHL via Pipeline Lite
3. Sandy Beach initiates consent-activated outreach sequence
4. Lead self-selects into appointment funnel

**Never reverse this flow.** Pipeline Lite does not feed back into Data Driver.

## Quirks

- Supabase RLS (Row Level Security) is enabled. API key determines access scope.
- Intent signals update asynchronously — a contact's score can change between queries.
- Verification is not instant. Budget 30-60 seconds per contact for full 10/15 check.
- Bulk verification: max 50 contacts per batch to avoid rate limiting on upstream providers.
