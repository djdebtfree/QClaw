require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { loadFullContext } = require('./context-loader');
const { markCallComplete } = require('./auto-dialer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = process.env.GHL_BASE_URL;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const ghlHeaders = {
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json'
};

/**
 * Update a GHL contact's tags
 */
async function updateContactTags(contactId, addTags = [], removeTags = []) {
  try {
    // Get current contact
    const getRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      headers: ghlHeaders
    });
    const contactData = await getRes.json();
    const currentTags = contactData.contact?.tags || [];

    // Build new tag list
    let newTags = [...currentTags];
    for (const tag of addTags) {
      if (!newTags.includes(tag)) newTags.push(tag);
    }
    for (const tag of removeTags) {
      newTags = newTags.filter(t => t !== tag);
    }

    // Update contact
    const updateRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      method: 'PUT',
      headers: ghlHeaders,
      body: JSON.stringify({ tags: newTags })
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      console.error(`Failed to update tags for ${contactId}:`, text);
    }
  } catch (err) {
    console.error(`Error updating tags for ${contactId}:`, err.message);
  }
}

/**
 * Add a note/message to a GHL conversation
 */
async function addConversationNote(contactId, message, type = 'TYPE_CALL') {
  try {
    // Search for conversation
    const searchRes = await fetch(
      `${GHL_BASE_URL}/conversations/search?contactId=${contactId}&locationId=${GHL_LOCATION_ID}`,
      { headers: ghlHeaders }
    );
    const searchData = await searchRes.json();
    const conversations = searchData.conversations || [];

    if (conversations.length === 0) {
      console.log(`No conversation found for contact ${contactId}. Skipping note.`);
      return;
    }

    const convId = conversations[0].id;

    await fetch(`${GHL_BASE_URL}/conversations/messages`, {
      method: 'POST',
      headers: ghlHeaders,
      body: JSON.stringify({
        type: type,
        contactId: contactId,
        conversationId: convId,
        message: message
      })
    });
  } catch (err) {
    console.error(`Error adding conversation note for ${contactId}:`, err.message);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sandy-beach-vapi-webhook', timestamp: new Date().toISOString() });
});

/**
 * Main VAPI webhook endpoint
 */
app.post('/webhook/vapi', async (req, res) => {
  const event = req.body;
  const eventType = event.message?.type || event.type || 'unknown';
  const callId = event.message?.call?.id || event.call?.id || 'unknown';
  const metadata = event.message?.call?.metadata || event.call?.metadata || {};
  const contactId = metadata.ghl_contact_id;

  console.log(`\n[${new Date().toISOString()}] VAPI Event: ${eventType} | Call: ${callId} | Contact: ${contactId || 'unknown'}`);

  try {
    switch (eventType) {
      case 'call-started':
      case 'call.started':
        await handleCallStarted(contactId, callId, metadata);
        break;

      case 'call-ended':
      case 'call.ended':
      case 'end-of-call-report':
        await handleCallEnded(contactId, callId, event, metadata);
        break;

      case 'transcript':
      case 'transcript.complete':
        await handleTranscript(contactId, callId, event, metadata);
        break;

      case 'assistant-request':
      case 'assistant.request':
        // Dynamic system prompt injection per-call
        const contextResponse = await handleAssistantRequest(event);
        return res.json(contextResponse);

      case 'function-call':
        console.log('Function call received:', JSON.stringify(event.message?.functionCall || {}));
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error(`Error handling ${eventType}:`, err.message);
  }

  res.json({ status: 'ok' });
});

/**
 * Handle call started — tag contact as on_call
 */
async function handleCallStarted(contactId, callId, metadata) {
  console.log(`  Call started. Purpose: ${metadata.call_purpose || 'unknown'}`);

  if (contactId) {
    await updateContactTags(contactId, ['on_call', 'sandy_called'], []);
    await addConversationNote(
      contactId,
      `Sandy Beach voice call started. Purpose: ${metadata.call_purpose || 'outbound'}. Call ID: ${callId}`
    );
  }
}

/**
 * Handle call ended — update GHL with summary
 */
async function handleCallEnded(contactId, callId, event, metadata) {
  const callData = event.message?.call || event.call || {};
  const endedReason = event.message?.endedReason || callData.endedReason || 'unknown';
  const duration = callData.duration || 0;
  const summary = event.message?.analysis?.summary || event.analysis?.summary || '';
  const transcript = event.message?.transcript || event.transcript || '';

  console.log(`  Call ended. Reason: ${endedReason} | Duration: ${duration}s`);

  if (contactId) {
    // Remove on_call tag
    await updateContactTags(contactId, ['sandy_call_complete'], ['on_call']);

    // Mark call complete for rate limiting
    markCallComplete(contactId);

    // Build call summary
    const callSummary = [
      `Sandy Beach call completed.`,
      `Duration: ${duration}s | Ended: ${endedReason}`,
      `Purpose: ${metadata.call_purpose || 'unknown'}`,
      summary ? `Summary: ${summary}` : '',
      `Call ID: ${callId}`
    ].filter(Boolean).join('\n');

    await addConversationNote(contactId, callSummary);

    // Save transcript if available
    if (transcript) {
      const transcriptText = typeof transcript === 'string'
        ? transcript
        : JSON.stringify(transcript);
      await addConversationNote(
        contactId,
        `[TRANSCRIPT]\n${transcriptText.substring(0, 5000)}`
      );
    }

    // Determine if pipeline stage should be updated based on call outcome
    await evaluateStageTransition(contactId, metadata, endedReason, summary, duration);
  }
}

/**
 * Evaluate whether to transition pipeline stage after a call
 */
async function evaluateStageTransition(contactId, metadata, endedReason, summary, duration) {
  const currentStage = metadata.pipeline_stage;

  // Only transition on meaningful calls (>30 seconds, not voicemail/no-answer)
  if (duration < 30 || endedReason === 'voicemail' || endedReason === 'no-answer') {
    console.log(`  No stage transition: ${endedReason}, ${duration}s`);
    return;
  }

  // Log the suggested transition — actual transition should be reviewed
  const transitions = {
    'New Lead': 'Contacted',
    'Contacted': 'Engaged',
    'No Show': 'Contacted'
  };

  const suggestedNext = transitions[currentStage];
  if (suggestedNext) {
    console.log(`  Suggested stage transition: ${currentStage} -> ${suggestedNext}`);
    await updateContactTags(contactId, [`stage_suggest_${suggestedNext.toLowerCase().replace(/\s/g, '_')}`], []);
  }
}

/**
 * Handle transcript events
 */
async function handleTranscript(contactId, callId, event, metadata) {
  const transcript = event.message?.transcript || event.transcript || '';
  console.log(`  Transcript received. Length: ${typeof transcript === 'string' ? transcript.length : JSON.stringify(transcript).length}`);
}

/**
 * Handle assistant request — dynamic context injection
 */
async function handleAssistantRequest(event) {
  const callMetadata = event.message?.call?.metadata || {};
  const contactId = callMetadata.ghl_contact_id;

  if (!contactId) {
    console.log('  No contact ID in assistant request. Using defaults.');
    return {};
  }

  console.log(`  Loading context for dynamic injection: ${contactId}`);

  try {
    const context = await loadFullContext(contactId);

    return {
      assistantOverrides: {
        variableValues: context.vapiVariables
      }
    };
  } catch (err) {
    console.error(`  Context loading failed:`, err.message);
    return {};
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`\nSandy Beach VAPI Webhook Handler`);
  console.log(`Listening on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/vapi`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nReady to receive VAPI events.\n`);
});

module.exports = app;
