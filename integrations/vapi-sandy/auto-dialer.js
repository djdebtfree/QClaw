require('dotenv').config();
const fetch = require('node-fetch');
const { loadFullContext } = require('./context-loader');

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const SANDY_ASSISTANT_ID = process.env.SANDY_ASSISTANT_ID;
const TWILIO_PHONE_ID = process.env.TWILIO_PHONE_ID;
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = process.env.GHL_BASE_URL;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

// Rate limiting state
const callLog = new Map(); // contactId -> last call timestamp
const activeCalls = new Set(); // currently active call contactIds
const MAX_CONCURRENT_CALLS = 5;
const CALL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if a contact can be called (rate limiting)
 */
function canCall(contactId) {
  // Check concurrent limit
  if (activeCalls.size >= MAX_CONCURRENT_CALLS) {
    console.log(`Rate limit: ${MAX_CONCURRENT_CALLS} concurrent calls active. Waiting.`);
    return false;
  }

  // Check 24-hour cooldown
  const lastCall = callLog.get(contactId);
  if (lastCall && (Date.now() - lastCall) < CALL_COOLDOWN_MS) {
    const hoursAgo = ((Date.now() - lastCall) / (1000 * 60 * 60)).toFixed(1);
    console.log(`Rate limit: Contact ${contactId} was called ${hoursAgo}h ago. Skipping.`);
    return false;
  }

  return true;
}

/**
 * Initiate a VAPI outbound call for a contact
 */
async function dialContact(contactId) {
  if (!canCall(contactId)) return null;

  // Load full context
  const context = await loadFullContext(contactId);

  // Don't call opted-out contacts
  if (context.callPurpose === 'none') {
    console.log(`Skipping ${context.contact.firstName}: opted out.`);
    return null;
  }

  // Don't call contacts without phone numbers
  if (!context.contact.phone) {
    console.log(`Skipping ${context.contact.firstName}: no phone number.`);
    return null;
  }

  console.log(`\nDialing ${context.contact.firstName} ${context.contact.lastName} (${context.contact.phone})`);
  console.log(`  Stage: ${context.pipeline.stage} | Role: ${context.agentRole} | Purpose: ${context.callPurpose}`);

  const callPayload = {
    assistantId: SANDY_ASSISTANT_ID,
    phoneNumberId: TWILIO_PHONE_ID,
    customer: {
      number: context.contact.phone,
      name: `${context.contact.firstName} ${context.contact.lastName}`.trim()
    },
    assistantOverrides: {
      variableValues: context.vapiVariables
    },
    metadata: context.vapiMetadata
  };

  try {
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`  Call failed:`, JSON.stringify(data));
      return null;
    }

    // Track rate limiting
    callLog.set(contactId, Date.now());
    activeCalls.add(contactId);

    console.log(`  Call initiated! Call ID: ${data.id}`);
    console.log(`  Status: ${data.status}`);

    // Auto-remove from active calls after max duration + buffer
    setTimeout(() => {
      activeCalls.delete(contactId);
    }, 11 * 60 * 1000); // 11 minutes (10 min max + 1 min buffer)

    return data;
  } catch (err) {
    console.error(`  Call error:`, err.message);
    return null;
  }
}

/**
 * Mark a call as completed (called from webhook handler)
 */
function markCallComplete(contactId) {
  activeCalls.delete(contactId);
}

/**
 * Query GHL for contacts that need outbound calls
 */
async function getContactsNeedingCalls(tag = 'needs_call') {
  const url = `${GHL_BASE_URL}/contacts/?locationId=${GHL_LOCATION_ID}&query=${tag}&limit=20`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Failed to query contacts:', text);
      return [];
    }

    const data = await res.json();
    return data.contacts || [];
  } catch (err) {
    console.error('Error querying contacts:', err.message);
    return [];
  }
}

/**
 * Dial a batch of contacts with spacing
 */
async function dialBatch(contactIds, spacingMs = 180000) {
  console.log(`\n=== Starting batch dial: ${contactIds.length} contacts ===`);
  console.log(`Spacing: ${spacingMs / 1000}s between calls`);
  console.log(`Max concurrent: ${MAX_CONCURRENT_CALLS}`);
  console.log(`Cooldown: 24 hours per contact\n`);

  const results = [];

  for (let i = 0; i < contactIds.length; i++) {
    const contactId = contactIds[i];
    console.log(`\n--- Contact ${i + 1}/${contactIds.length} ---`);

    const result = await dialContact(contactId);
    results.push({ contactId, result });

    // Wait between calls (except last)
    if (i < contactIds.length - 1 && result) {
      const waitSec = spacingMs / 1000;
      console.log(`\nWaiting ${waitSec}s before next call...`);
      await new Promise(resolve => setTimeout(resolve, spacingMs));
    }
  }

  const successful = results.filter(r => r.result).length;
  const skipped = results.filter(r => !r.result).length;
  console.log(`\n=== Batch complete: ${successful} dialed, ${skipped} skipped ===`);

  return results;
}

module.exports = {
  dialContact,
  dialBatch,
  getContactsNeedingCalls,
  markCallComplete,
  canCall,
  activeCalls,
  callLog
};

// CLI usage
if (require.main === module) {
  const contactId = process.argv[2];

  if (contactId) {
    // Dial a specific contact
    dialContact(contactId)
      .then(result => {
        if (result) {
          console.log('\nCall result:', JSON.stringify(result, null, 2));
        }
      })
      .catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
      });
  } else {
    // Query and dial contacts tagged needs_call
    (async () => {
      const contacts = await getContactsNeedingCalls();
      if (contacts.length === 0) {
        console.log('No contacts need calls right now.');
        return;
      }
      console.log(`Found ${contacts.length} contacts needing calls.`);
      const ids = contacts.map(c => c.id);
      await dialBatch(ids);
    })().catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
  }
}
