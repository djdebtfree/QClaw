require('dotenv').config();
const fetch = require('node-fetch');

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = process.env.GHL_BASE_URL;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_VERSION = '2021-07-28';

const ghlHeaders = {
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Version': API_VERSION,
  'Content-Type': 'application/json'
};

async function ghlGet(path) {
  const url = `${GHL_BASE_URL}${path}`;
  const res = await fetch(url, { headers: ghlHeaders });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL API error ${res.status} for ${path}: ${text}`);
  }
  return res.json();
}

/**
 * Load full contact details from GHL
 */
async function loadContact(contactId) {
  const data = await ghlGet(`/contacts/${contactId}`);
  return data.contact || data;
}

/**
 * Load all conversation history for a contact
 */
async function loadConversationHistory(contactId) {
  try {
    // Search for conversations with this contact
    const searchData = await ghlGet(
      `/conversations/search?contactId=${contactId}&locationId=${GHL_LOCATION_ID}`
    );

    const conversations = searchData.conversations || [];
    const allMessages = [];

    for (const conv of conversations) {
      try {
        const msgData = await ghlGet(`/conversations/${conv.id}/messages`);
        const messages = (msgData.messages || []).map(m => ({
          direction: m.direction,
          type: m.type || 'sms',
          body: m.body,
          dateAdded: m.dateAdded,
          status: m.status
        }));
        allMessages.push(...messages);
      } catch (err) {
        console.warn(`Failed to load messages for conversation ${conv.id}:`, err.message);
      }
    }

    // Sort by date
    allMessages.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    return allMessages;
  } catch (err) {
    console.warn('Failed to load conversation history:', err.message);
    return [];
  }
}

/**
 * Load pipeline stage from opportunities
 */
async function loadPipelineStage(contactId) {
  try {
    const data = await ghlGet(
      `/opportunities/search?location_id=${GHL_LOCATION_ID}&contact_id=${contactId}`
    );
    const opportunities = data.opportunities || [];
    if (opportunities.length === 0) return { stage: 'New Lead', opportunity: null };

    // Get the most recent opportunity
    const latest = opportunities.sort(
      (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)
    )[0];

    return {
      stage: latest.pipelineStageId || latest.status || 'Unknown',
      stageName: latest.pipelineStageName || latest.monetaryValue || '',
      opportunity: latest
    };
  } catch (err) {
    console.warn('Failed to load pipeline stage:', err.message);
    return { stage: 'New Lead', opportunity: null };
  }
}

/**
 * Load calendar events for contact
 */
async function loadCalendarEvents(contactId) {
  try {
    const data = await ghlGet(
      `/calendars/events?contactId=${contactId}&locationId=${GHL_LOCATION_ID}`
    );
    return (data.events || []).map(e => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      status: e.status,
      calendarId: e.calendarId
    }));
  } catch (err) {
    console.warn('Failed to load calendar events:', err.message);
    return [];
  }
}

/**
 * Summarize conversation history into a concise string for VAPI metadata
 */
function summarizeConversations(messages) {
  if (!messages.length) return 'No prior conversations.';

  const recent = messages.slice(-20); // Last 20 messages
  const summary = recent.map(m => {
    const dir = m.direction === 'outbound' ? 'Sandy' : 'Lead';
    const date = m.dateAdded ? new Date(m.dateAdded).toLocaleDateString() : '';
    return `[${date} ${dir}]: ${(m.body || '').substring(0, 200)}`;
  }).join('\n');

  return `Last ${recent.length} messages:\n${summary}`;
}

/**
 * Determine call purpose based on pipeline stage
 */
function determineCallPurpose(stageName) {
  const stageMap = {
    'New Lead': { purpose: 'reach_out', role: 'Reach Out Agent' },
    'Contacted': { purpose: 'intent_declaration', role: 'Intent Declaration Agent' },
    'Engaged': { purpose: 'discovery', role: 'Discovery Agent' },
    'Education Sent': { purpose: 'scheduling', role: 'Scheduling Agent' },
    'Education Consumed': { purpose: 'scheduling', role: 'Scheduling Agent' },
    'Interview Scheduled': { purpose: 'reminder', role: 'Reminder Agent' },
    'No Show': { purpose: 'recovery', role: 'Recovery Agent' },
    'Opted Out': { purpose: 'none', role: 'Exit Agent' }
  };

  return stageMap[stageName] || { purpose: 'discovery', role: 'Discovery Agent' };
}

/**
 * Load ALL context for a contact — the main export
 */
async function loadFullContext(contactId) {
  console.log(`Loading full context for contact ${contactId}...`);

  const [contact, messages, pipeline, events] = await Promise.all([
    loadContact(contactId),
    loadConversationHistory(contactId),
    loadPipelineStage(contactId),
    loadCalendarEvents(contactId)
  ]);

  const conversationSummary = summarizeConversations(messages);
  const callPurpose = determineCallPurpose(pipeline.stage);

  // Extract key contact fields
  const firstName = contact.firstName || contact.name?.split(' ')[0] || 'there';
  const lastName = contact.lastName || '';
  const phone = contact.phone || '';
  const email = contact.email || '';
  const tags = contact.tags || [];
  const customFields = contact.customFields || {};

  // Check for upcoming appointments
  const upcomingEvents = events.filter(e => new Date(e.startTime) > new Date());

  const context = {
    contact: {
      id: contactId,
      firstName,
      lastName,
      phone,
      email,
      tags,
      customFields
    },
    pipeline: {
      stage: pipeline.stage,
      stageName: pipeline.stageName,
      opportunity: pipeline.opportunity
    },
    conversations: {
      totalMessages: messages.length,
      summary: conversationSummary,
      lastMessage: messages[messages.length - 1] || null
    },
    calendar: {
      upcomingEvents,
      hasUpcoming: upcomingEvents.length > 0,
      nextEvent: upcomingEvents[0] || null
    },
    callPurpose: callPurpose.purpose,
    agentRole: callPurpose.role,

    // Pre-built VAPI variable values
    vapiVariables: {
      first_name: firstName,
      pipeline_stage: pipeline.stage,
      conversation_history: conversationSummary,
      operational_mission: `Remote sales recruiting for AJF Financial Group. Stage: ${pipeline.stage}. Role: ${callPurpose.role}.`
    },

    // Pre-built VAPI metadata
    vapiMetadata: {
      ghl_contact_id: contactId,
      ghl_location_id: GHL_LOCATION_ID,
      pipeline_stage: pipeline.stage,
      call_purpose: callPurpose.purpose,
      agent_role: callPurpose.role
    }
  };

  console.log(`Context loaded: ${firstName} ${lastName} | Stage: ${pipeline.stage} | Role: ${callPurpose.role} | Messages: ${messages.length}`);
  return context;
}

module.exports = {
  loadFullContext,
  loadContact,
  loadConversationHistory,
  loadPipelineStage,
  loadCalendarEvents,
  summarizeConversations,
  determineCallPurpose
};

// CLI usage
if (require.main === module) {
  const contactId = process.argv[2];
  if (!contactId) {
    console.error('Usage: node context-loader.js <contact_id>');
    process.exit(1);
  }
  loadFullContext(contactId)
    .then(ctx => console.log(JSON.stringify(ctx, null, 2)))
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
