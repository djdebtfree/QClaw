# GoHighLevel (GHL)

CRM, calendar, pipeline, and automation management for SalesSuiteOS.

## Auth

- Type: Bearer token
- Key: `{{secrets.ghl_api_key}}`
- Base URL: `https://services.leadconnectorhq.com`
- Version Header: `Version: 2021-07-28`

## Endpoints

### Contacts

#### Search Contacts
- GET `/contacts/`
- Query params: `query`, `limit`, `locationId`
- Response: `{ contacts: [{ id, firstName, lastName, email, phone, tags }] }`

#### Get Contact
- GET `/contacts/{contactId}`
- Response: Full contact object with custom fields

#### Create Contact
- POST `/contacts/`
- Body: `{ firstName, lastName, email, phone, locationId, tags[], customField[] }`
- **REQUIRES owner approval for bulk creation**

#### Update Contact
- PUT `/contacts/{contactId}`
- Body: Same as create (partial updates supported)

#### Add Tags
- POST `/contacts/{contactId}/tags`
- Body: `{ tags: ["tag1", "tag2"] }`

### Calendars

#### Get Calendar Events
- GET `/calendars/events`
- Query params: `calendarId`, `startTime`, `endTime`, `locationId`

#### Create Appointment
- POST `/calendars/events/appointments`
- Body: `{ calendarId, locationId, contactId, startTime, endTime, title }`

### Pipelines

#### Get Pipelines
- GET `/opportunities/pipelines`
- Query params: `locationId`

#### Get Opportunities
- GET `/opportunities/search`
- Query params: `pipelineId`, `stageId`, `locationId`, `query`

#### Update Opportunity Stage
- PUT `/opportunities/{opportunityId}`
- Body: `{ stageId, status }`

### Conversations

#### Get Conversations
- GET `/conversations/search`
- Query params: `contactId`, `locationId`

#### Send Message
- POST `/conversations/messages`
- Body: `{ type: "SMS"|"Email", contactId, message }`
- **REQUIRES owner approval for new outreach campaigns**
- Routine follow-ups within approved sequences are permitted

### Workflows

#### Get Workflows
- GET `/workflows/`
- Query params: `locationId`
- **Read only. Never modify production workflows without owner review.**

## Quirks

- LocationId is required on almost every endpoint. Store it in config.
- Rate limit: 100 requests per 10 seconds per location.
- DateTime format: ISO 8601 with timezone.
- Custom fields use key-value pairs: `{ customField: [{ id: "field_id", value: "value" }] }`
- Webhook events use a different auth pattern (location-level API keys vs agency-level).
- Pipeline stages are ordered by `position` field, not by name.

## SalesSuiteOS-Specific Rules

- New contacts MUST pass 10/15 verification before outreach.
- Never send SMS to contacts without a verified phone number.
- Tag taxonomy: `data-driver`, `pipeline-lite`, `verified`, `unverified`, `hot-lead`, `no-show`, `closed`.
- Subaccount operations require locationId — never operate on the wrong subaccount.
- City People Center is a separate subaccount. Never touch without explicit instruction.
