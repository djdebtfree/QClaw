require('dotenv').config();
const fetch = require('node-fetch');
const { dialBatch, canCall } = require('./auto-dialer');
const { loadPipelineStage, loadCalendarEvents } = require('./context-loader');

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = process.env.GHL_BASE_URL;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const ghlHeaders = {
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json'
};

// Business hours: 9am-7pm EST, Monday-Friday
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 19;
const BUSINESS_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

/**
 * Check if current time is within business hours (EST)
 */
function isBusinessHours() {
  const now = new Date();
  const estOffset = -5;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const est = new Date(utc + (3600000 * estOffset));

  const day = est.getDay();
  const hour = est.getHours();

  if (!BUSINESS_DAYS.includes(day)) {
    console.log(`Outside business days (${est.toLocaleDateString('en-US', { weekday: 'long' })})`);
    return false;
  }

  if (hour < BUSINESS_START_HOUR || hour >= BUSINESS_END_HOUR) {
    console.log(`Outside business hours (${hour}:00 EST, window is ${BUSINESS_START_HOUR}-${BUSINESS_END_HOUR})`);
    return false;
  }

  return true;
}

/**
 * Check if it's business hours in the contact's timezone
 */
function isContactBusinessHours(timezone) {
  if (!timezone) return true; // Default to allowing if no timezone

  try {
    const now = new Date();
    const contactTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const hour = contactTime.getHours();
    const day = contactTime.getDay();

    if (!BUSINESS_DAYS.includes(day)) return false;
    if (hour < BUSINESS_START_HOUR || hour >= BUSINESS_END_HOUR) return false;
    return true;
  } catch {
    return true; // Allow if timezone parsing fails
  }
}

/**
 * Query contacts by pipeline stage from GHL
 */
async function queryContactsByStage(pipelineId, stageId) {
  try {
    const url = `${GHL_BASE_URL}/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${pipelineId}&pipeline_stage_id=${stageId}&limit=50`;
    const res = await fetch(url, { headers: ghlHeaders });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Failed to query opportunities for stage ${stageId}:`, text);
      return [];
    }

    const data = await res.json();
    return data.opportunities || [];
  } catch (err) {
    console.error(`Error querying stage ${stageId}:`, err.message);
    return [];
  }
}

/**
 * Query all contacts and filter by tags
 */
async function queryContactsByTag(tag) {
  try {
    const url = `${GHL_BASE_URL}/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(tag)}&limit=50`;
    const res = await fetch(url, { headers: ghlHeaders });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Failed to query contacts by tag ${tag}:`, text);
      return [];
    }

    const data = await res.json();
    return (data.contacts || []).filter(c =>
      c.tags && c.tags.includes(tag) && c.phone
    );
  } catch (err) {
    console.error(`Error querying tag ${tag}:`, err.message);
    return [];
  }
}

/**
 * Get contacts needing reminder calls (appointment within 24 hours)
 */
async function getReminderCallContacts() {
  const contacts = await queryContactsByTag('interview_scheduled');
  const needsReminder = [];

  for (const contact of contacts) {
    try {
      const events = await loadCalendarEvents(contact.id);
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingAppointment = events.find(e => {
        const start = new Date(e.startTime);
        return start > now && start < in24h;
      });

      if (upcomingAppointment && !contact.tags?.includes('reminder_called')) {
        needsReminder.push(contact.id);
      }
    } catch (err) {
      console.warn(`Failed to check events for ${contact.id}:`, err.message);
    }
  }

  return needsReminder;
}

/**
 * Get contacts needing follow-up calls (replied but no call yet)
 */
async function getFollowUpContacts() {
  const contacts = await queryContactsByTag('contacted');
  return contacts
    .filter(c => !c.tags?.includes('followup_called'))
    .map(c => c.id);
}

/**
 * Get contacts needing reach-out calls (new leads, no call in 48h)
 */
async function getReachOutContacts() {
  const contacts = await queryContactsByTag('new_lead');
  return contacts
    .filter(c => !c.tags?.includes('reach_out_called'))
    .filter(c => canCall(c.id))
    .map(c => c.id);
}

/**
 * Get no-show contacts needing recovery calls
 */
async function getNoShowContacts() {
  const contacts = await queryContactsByTag('no_show');
  return contacts
    .filter(c => !c.tags?.includes('recovery_called'))
    .filter(c => canCall(c.id))
    .map(c => c.id);
}

/**
 * Main scheduler — run all call queues
 */
async function runScheduler() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Sandy Beach Call Scheduler`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  // Check business hours
  if (!isBusinessHours()) {
    console.log('Outside business hours. No calls scheduled.');
    return { scheduled: 0, reason: 'outside_business_hours' };
  }

  // Collect contacts by priority (highest first per PRECEDENCE LADDER)
  console.log('Collecting contacts by priority...\n');

  // Priority 1: Reminder calls (protecting existing appointments)
  const reminderContacts = await getReminderCallContacts();
  console.log(`  Reminders: ${reminderContacts.length} contacts`);

  // Priority 2: Follow-up calls (active engagement)
  const followUpContacts = await getFollowUpContacts();
  console.log(`  Follow-ups: ${followUpContacts.length} contacts`);

  // Priority 3: Reach-out calls (new leads)
  const reachOutContacts = await getReachOutContacts();
  console.log(`  Reach-outs: ${reachOutContacts.length} contacts`);

  // Priority 4: Recovery calls (no-shows)
  const noShowContacts = await getNoShowContacts();
  console.log(`  Recovery: ${noShowContacts.length} contacts`);

  // Build the call queue in priority order
  const callQueue = [
    ...reminderContacts,
    ...followUpContacts,
    ...reachOutContacts,
    ...noShowContacts
  ];

  // Deduplicate
  const uniqueQueue = [...new Set(callQueue)];

  console.log(`\nTotal call queue: ${uniqueQueue.length} unique contacts`);

  if (uniqueQueue.length === 0) {
    console.log('No contacts need calls right now.');
    return { scheduled: 0, reason: 'no_contacts' };
  }

  // Dial with spacing (3 minutes between calls)
  const CALL_SPACING_MS = 3 * 60 * 1000;
  const results = await dialBatch(uniqueQueue, CALL_SPACING_MS);

  const summary = {
    scheduled: results.filter(r => r.result).length,
    skipped: results.filter(r => !r.result).length,
    total: uniqueQueue.length,
    breakdown: {
      reminders: reminderContacts.length,
      followUps: followUpContacts.length,
      reachOuts: reachOutContacts.length,
      recovery: noShowContacts.length
    }
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scheduler Summary:`);
  console.log(`  Dialed: ${summary.scheduled}`);
  console.log(`  Skipped: ${summary.skipped}`);
  console.log(`  Breakdown: ${JSON.stringify(summary.breakdown)}`);
  console.log(`${'='.repeat(60)}\n`);

  return summary;
}

/**
 * Run scheduler on interval (every 15 minutes)
 */
function startSchedulerLoop(intervalMs = 15 * 60 * 1000) {
  console.log(`Starting scheduler loop (every ${intervalMs / 60000} minutes)\n`);

  // Run immediately
  runScheduler().catch(err => console.error('Scheduler error:', err.message));

  // Then run on interval
  setInterval(() => {
    runScheduler().catch(err => console.error('Scheduler error:', err.message));
  }, intervalMs);
}

module.exports = {
  runScheduler,
  startSchedulerLoop,
  isBusinessHours,
  isContactBusinessHours
};

// CLI usage
if (require.main === module) {
  const mode = process.argv[2];

  if (mode === '--loop') {
    // Run continuously every 15 minutes
    startSchedulerLoop();
  } else {
    // Run once
    runScheduler()
      .then(summary => {
        console.log('\nDone:', JSON.stringify(summary, null, 2));
      })
      .catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
      });
  }
}
