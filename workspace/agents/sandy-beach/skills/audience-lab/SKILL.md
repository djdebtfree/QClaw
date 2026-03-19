# Audience Lab — Intent Data Lead Generation

## Purpose
Audience Lab provides real-time intent-based audience data. Sandy Beach uses this to source fresh leads matching specific verticals, demographics, and intent signals for Pipeline Lite clients.

## API Base
https://api.audiencelab.io

## Auth
Header: x-api-key: {AUDIENCE_LAB_API_KEY}

## Endpoints

### GET /audiences
List all audiences with metadata.
Returns: id, name, next_scheduled_refresh, refresh_interval, scheduled_refresh, webhook_url

### GET /audiences/:id
Get audience details + paginated lead records.
Query params: page (default 1), page_size (default 100)
Returns: total_records, page, page_size, total_pages, data[]

### Lead Record Fields
- FIRST_NAME, LAST_NAME, GENDER, AGE_RANGE
- PERSONAL_EMAILS, BUSINESS_EMAIL, BUSINESS_VERIFIED_EMAILS
- DIRECT_NUMBER, DIRECT_NUMBER_DNC (Y/N — respect DNC!)
- MOBILE_PHONE, MOBILE_PHONE_DNC
- COMPANY_NAME, COMPANY_DOMAIN, COMPANY_INDUSTRY, COMPANY_REVENUE, COMPANY_EMPLOYEE_COUNT
- JOB_TITLE, DEPARTMENT, HEADLINE
- CITY, STATE, ZIP, COUNTRY
- HOMEOWNER (Y/N), CHILDREN (Y/N), INCOME_RANGE
- LINKEDIN_URL, FACEBOOK_URL
- INTERESTS

## Current Audiences (46 total)
Key verticals: GHL Agencies, SaaS Seekers, Remote Sales Work, Insurance (Life, Health, Auto, P&C, Medicare, Final Expense, IUL, Mortgage Protection), Real Estate, Legal, Home Services (HVAC, Plumbing, Roofing, Electrical, Cleaning, Pest Control, Landscaping), Beauty Services, Auto (Luxury, Trucks, Electric, Parts), Loans (Business, Home, Personal), and more.

## Sandy's Rules for Audience Lab
1. NEVER call leads where DIRECT_NUMBER_DNC = "Y" or MOBILE_PHONE_DNC = "Y"
2. Always check DNC status before adding to any outreach list
3. Match audience to client vertical before pulling leads
4. Prefer leads with verified emails (BUSINESS_VERIFIED_EMAILS or PERSONAL_EMAILS)
5. Respect refresh schedules — audiences refresh daily at 8am UTC
6. When syncing to GHL, tag with audience name + "audience-lab" source
7. Do NOT bulk-import without Keith's approval (VALUES.md RULE 0)

## Integration Flow
1. Client onboards → identify their vertical
2. Match to Audience Lab audience (or create custom)
3. Pull leads with pagination (100 per page)
4. Filter: has email + has phone + NOT DNC
5. Sync qualified leads to GHL via Pipeline Lite sync-leads.js
6. Sandy begins outreach sequence via auto-dialer or SMS

## Audience Creation (via Playwright Automation)

Sandy can create new audiences on demand using headless browser automation.

### Command
```bash
cd ~/QClaw/integrations/audience-lab && node create-audience.js "keyword description"
```

### How It Works
1. Sandy generates a smart audience name from the keyword description (not literal text)
2. Playwright logs into Audience Lab headlessly
3. Creates audience with Keyword method
4. Uses AI Intent Keyword Generator with the provided description
5. Always selects HIGH intent score
6. Generates the audience and waits for hydration

### Naming Convention
- "insurance sales people seeking crm" -> "Insurance CRM Seekers"
- "solar panel installers in florida" -> "Solar Installation Seekers"
- "ai tools for marketing agencies" -> "AI Technology Seekers"
- Names are auto-generated based on keyword patterns, NEVER use literal user text

### Rules for Creation
1. Always describe the audience intent clearly -- the AI keyword generator needs good input
2. Always use HIGH intent score
3. After creation, poll GET /audiences/:id to check hydration status
4. Do NOT create duplicate audiences -- check existing list first
5. Requires AUDIENCE_LAB_PASSWORD in .env for login
