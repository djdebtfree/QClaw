#!/usr/bin/env node
/**
 * check-appointments.js — Sandy Beach heartbeat: upcoming appointments + no-show detection
 *
 * 1. Fetches all calendars for the location
 * 2. Queries events for each calendar in the next 2 hours
 * 3. Flags contacts whose appointment start time has passed (potential no-shows)
 */
require('dotenv').config({ path: __dirname + '/.env' });
const { ghlRequest, GHL_LOCATION_ID } = require('./ghl-client');

async function getCalendarIds() {
  const result = await ghlRequest('GET', `/calendars/?locationId=${GHL_LOCATION_ID}`);
  return (result.calendars || []).map((c) => ({ id: c.id, name: c.name }));
}

async function checkAppointments() {
  const now = Date.now();
  const twoHoursFromNow = now + 2 * 60 * 60 * 1000;

  console.log('[check-appointments] Checking upcoming appointments (next 2 hours)');
  console.log(`  Window: ${new Date(now).toISOString()} -> ${new Date(twoHoursFromNow).toISOString()}`);

  // 1. Get all calendars
  const calendars = await getCalendarIds();
  if (calendars.length === 0) {
    console.log('[check-appointments] No calendars found for this location.');
    return { upcoming: [], noShows: [] };
  }
  console.log(`[check-appointments] Found ${calendars.length} calendar(s)`);

  const upcoming = [];
  const noShows = [];

  // 2. Query events for each calendar
  for (const cal of calendars) {
    const params = new URLSearchParams({
      locationId: GHL_LOCATION_ID,
      calendarId: cal.id,
      startTime: String(now),
      endTime: String(twoHoursFromNow),
    });

    try {
      const result = await ghlRequest('GET', `/calendars/events?${params}`);
      const events = result.events || [];

      for (const event of events) {
        const startTime = new Date(event.startTime || event.start).getTime();
        const contactId = event.contactId || event.contact?.id || 'unknown';
        const contactName = event.contact?.name || event.title || 'Unknown';
        const status = event.appointmentStatus || event.status || 'unknown';

        const entry = {
          eventId: event.id,
          contactId,
          contactName,
          startTime: new Date(startTime).toISOString(),
          status,
          calendarId: cal.id,
          calendarName: cal.name,
        };

        upcoming.push(entry);

        // Flag as potential no-show if start time has passed and not confirmed/showed
        if (startTime < now && !['confirmed', 'showed', 'completed'].includes(status)) {
          noShows.push(entry);
          console.warn(`  ! POTENTIAL NO-SHOW: ${contactName} (${contactId}) -- scheduled at ${entry.startTime}`);
        } else {
          console.log(`  OK ${contactName} -- ${entry.startTime} [${status}]`);
        }
      }
    } catch (err) {
      console.error(`[check-appointments] Error fetching events for calendar ${cal.name}:`, err.message);
    }
  }

  console.log(`[check-appointments] Summary: ${upcoming.length} upcoming, ${noShows.length} potential no-show(s)`);
  return { upcoming, noShows };
}

if (require.main === module) {
  checkAppointments().catch((err) => {
    console.error('[check-appointments] Fatal:', err.message);
    if (err.body) console.error('  Response:', JSON.stringify(err.body, null, 2));
    process.exit(1);
  });
}

module.exports = { checkAppointments };
