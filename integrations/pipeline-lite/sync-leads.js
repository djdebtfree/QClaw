#!/usr/bin/env node
/**
 * sync-leads.js — Pull waitlist leads from Data Driver Supabase → push to GHL contacts
 *
 * Queries:  data_driver_leads WHERE status='waitlist' AND synced_to_ghl=false
 * Creates:  GHL contact with parsed name, email, tags, source
 * Updates:  Supabase row with synced_to_ghl=true, ghl_contact_id
 */
require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');
const { ghlRequest, GHL_LOCATION_ID } = require('./ghl-client');

const supabase = createClient(
  process.env.SUPABASE_DD_URL,
  process.env.SUPABASE_DD_KEY
);

function parseName(fullName) {
  if (!fullName) return { firstName: 'Unknown', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

async function syncLeads() {
  console.log('[sync-leads] Starting lead sync from Data Driver → GHL');

  // 1. Fetch unsynced waitlist leads
  const { data: leads, error } = await supabase
    .from('data_driver_leads')
    .select('*')
    .eq('status', 'waitlist')
    .eq('synced_to_ghl', false)
    .limit(100);

  if (error) {
    console.error('[sync-leads] Supabase query error:', error.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log('[sync-leads] No unsynced waitlist leads found. Nothing to do.');
    return { synced: 0, errors: 0 };
  }

  console.log(`[sync-leads] Found ${leads.length} lead(s) to sync`);

  let synced = 0;
  let errors = 0;

  for (const lead of leads) {
    const { firstName, lastName } = parseName(lead.name);
    const email = lead.email;

    if (!email) {
      console.warn(`[sync-leads] Skipping lead id=${lead.id} — no email`);
      errors++;
      continue;
    }

    try {
      // 2. Create contact in GHL
      const contact = await ghlRequest('POST', '/contacts/', {
        firstName,
        lastName,
        email,
        tags: ['data-driver', 'waitlist', 'unverified'],
        source: 'Data Driver Standalone',
        locationId: GHL_LOCATION_ID,
      });

      const ghlContactId = contact.contact?.id || contact.id;
      console.log(`[sync-leads] Created GHL contact ${ghlContactId} for ${email}`);

      // 3. Update Supabase row
      const { error: updateError } = await supabase
        .from('data_driver_leads')
        .update({
          synced_to_ghl: true,
          ghl_contact_id: ghlContactId,
          synced_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error(`[sync-leads] Failed to update Supabase for lead ${lead.id}:`, updateError.message);
        errors++;
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`[sync-leads] GHL error for ${email}:`, err.message);
      if (err.body) console.error('  Response:', JSON.stringify(err.body));
      errors++;
    }
  }

  console.log(`[sync-leads] Complete — synced: ${synced}, errors: ${errors}`);
  return { synced, errors };
}

// Run if called directly
if (require.main === module) {
  syncLeads().catch((err) => {
    console.error('[sync-leads] Fatal:', err);
    process.exit(1);
  });
}

module.exports = { syncLeads };
