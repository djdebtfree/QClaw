#!/usr/bin/env node
/**
 * move-stage.js — Move a contact's opportunity to a target pipeline stage
 *
 * Usage: node move-stage.js <contactId> <stageName>
 * Example: node move-stage.js abc123 "Outreach Sent"
 *
 * - Reads pipeline-config.json for pipeline/stage IDs
 * - Searches for existing opportunity or creates one
 * - Updates opportunity to the target stage
 */
require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const path = require('path');
const { ghlRequest, GHL_LOCATION_ID } = require('./ghl-client');

function loadConfig() {
  const configPath = path.join(__dirname, 'pipeline-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('[move-stage] pipeline-config.json not found. Run create-pipeline.js first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function resolveStatus(stageName) {
  if (stageName === 'Closed Won') return 'won';
  if (stageName === 'Closed Lost') return 'lost';
  return 'open';
}

async function moveStage(contactId, targetStageName) {
  const config = loadConfig();
  const stageId = config.stages[targetStageName];

  if (!stageId) {
    const valid = Object.keys(config.stages).join(', ');
    console.error(`[move-stage] Unknown stage "${targetStageName}". Valid: ${valid}`);
    process.exit(1);
  }

  console.log(`[move-stage] Moving contact ${contactId} → "${targetStageName}" (${stageId})`);

  // 1. Search for existing opportunity for this contact in this pipeline
  const searchParams = new URLSearchParams({
    location_id: GHL_LOCATION_ID,
    pipeline_id: config.pipelineId,
    contact_id: contactId,
  });

  const searchResult = await ghlRequest('GET', `/opportunities/search?${searchParams}`);
  const opportunities = searchResult.opportunities || [];

  let opportunityId;

  if (opportunities.length > 0) {
    opportunityId = opportunities[0].id;
    console.log(`[move-stage] Found existing opportunity: ${opportunityId}`);
  } else {
    // 2. Create new opportunity
    console.log('[move-stage] No existing opportunity — creating one');
    const createResult = await ghlRequest('POST', '/opportunities/', {
      pipelineId: config.pipelineId,
      pipelineStageId: stageId,
      locationId: GHL_LOCATION_ID,
      contactId,
      name: `SalesSuiteOS — ${contactId}`,
      status: resolveStatus(targetStageName),
    });

    const opp = createResult.opportunity || createResult;
    opportunityId = opp.id;
    console.log(`[move-stage] Created opportunity: ${opportunityId}`);
    return { opportunityId, stage: targetStageName, action: 'created' };
  }

  // 3. Update existing opportunity stage
  await ghlRequest('PUT', `/opportunities/${opportunityId}`, {
    pipelineStageId: stageId,
    status: resolveStatus(targetStageName),
  });

  console.log(`[move-stage] Updated opportunity ${opportunityId} → "${targetStageName}"`);
  return { opportunityId, stage: targetStageName, action: 'updated' };
}

if (require.main === module) {
  const [, , contactId, ...stageWords] = process.argv;
  const targetStageName = stageWords.join(' ');

  if (!contactId || !targetStageName) {
    console.error('Usage: node move-stage.js <contactId> <stageName>');
    console.error('Example: node move-stage.js abc123 "Outreach Sent"');
    process.exit(1);
  }

  moveStage(contactId, targetStageName).catch((err) => {
    console.error('[move-stage] Fatal:', err.message);
    if (err.body) console.error('  Response:', JSON.stringify(err.body, null, 2));
    process.exit(1);
  });
}

module.exports = { moveStage };
