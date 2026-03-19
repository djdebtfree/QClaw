# GHL Domain Setup

## Purpose
Automated .com domain purchase and email sending domain configuration for GoHighLevel subaccounts. Sandy Beach uses this to provision new client domains without manual intervention.

## API Base
https://ghl-domain-agent-production.up.railway.app

## Endpoints

### POST /api/setup (Full Flow)
Purchase a .com domain AND set up email sending domain in one request.
- locationId (required): GHL location/sub-account ID
- domain (required): Desired domain with TLD (e.g. tiko.com). Only .com supported.
- prefixes (optional): Fallback prefixes if exact domain unavailable. e.g. ["use","get","try","my","go"]. Recommend 10-15.
- webhookUrl (optional): URL for POST notification on completion

Response: { jobId, status: "queued", message }

### POST /api/purchase (Domain Only)
Purchase a .com domain on GHL without email setup.
- locationId (required)
- domain (required)
- prefixes (optional)
- webhookUrl (optional)

### POST /api/email (Email Setup Only)
Set up email sending domain for an already-purchased domain.
- locationId (required)
- domain (required): The purchased domain (e.g. gettiko.com). Do NOT include "emails." prefix.
- webhookUrl (optional)

### GET /api/status/:jobId
Poll job status. Returns current status and full result when complete.
Statuses: queued, running, completed, failed

### GET /api/jobs
List all jobs sorted by newest first.

### GET /api/health
Health check. Returns { status: "ok", queued, processing }

## Domain Availability Logic
If exact domain is taken, system tries each prefix in order:
tiko.com X -> usetiko.com X -> gettiko.com -> Purchase gettiko.com

## Job Statuses
- queued: Waiting in line
- running: Browser automation in progress
- completed: All steps finished successfully
- failed: Error occurred -- check the error field

## Webhook Notifications
Fired for both completed and failed jobs. Endpoint must return 2xx.

## When Sandy Uses This
- New client onboarding: Purchase domain + setup email in one shot
- Client requests custom domain: Purchase only, then setup email later
- Existing domain needs email: Email setup only
- Always recommend 10-15 prefixes as fallback
- Always provide webhookUrl so Sandy gets notified automatically
- Poll /api/status/:jobId if no webhook configured

## Rules
- Only .com domains supported
- One job runs at a time; others queue
- Email setup retries SSL verification up to 5 times
- Do NOT purchase domains without explicit client/Keith approval (VALUES.md RULE 0)
