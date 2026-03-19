#!/usr/bin/env node
/**
 * create-pipeline.js — One-time setup: creates SalesSuiteOS Pipeline in GHL
 *
 * Stages: New Lead → Data Verified → Outreach Sent → Engaged →
 *         Appointment Booked → Showed Up → Closed Won → Closed Lost
 *
 * Saves pipeline ID + stage IDs to pipeline-config.json
 *
 * NOTE: If the PIT token lacks the opportunities.write scope, this script
 * will attempt API creation first, then fall back to generating a placeholder
 * config. In that case, create the pipeline manually in GHL and run:
 *   node create-pipeline.js --fetch
 * to pull the IDs from the existing pipeline.
 */
require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const path = require('path');
const { ghlRequest, GHL_LOCATION_ID } = require('./ghl-client');

const STAGES = [
  { name: 'New Lead', position: 0 },
  { name: 'Data Verified', position: 1 },
  { name: 'Outreach Sent', position: 2 },
  { name: 'Engaged', position: 3 },
  { name: 'Appointment Booked', position: 4 },
  { name: 'Showed Up', position: 5 },
  { name: 'Closed Won', position: 6 },
  { name: 'Closed Lost', position: 7 },
];

const CONFIG_PATH = path.join(__dirname, 'pipeline-config.json');

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`[create-pipeline] Config saved to ${CONFIG_PATH}`);
}

async function fetchExistingPipeline() {
  console.log('[create-pipeline] Fetching existing pipelines from GHL...');
  const result = await ghlRequest('GET', `/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`);
  const pipelines = result.pipelines || [];

  const match = pipelines.find((p) => p.name === 'SalesSuiteOS Pipeline') || pipelines[0];
  if (!match) {
    console.error('[create-pipeline] No pipelines found in GHL.');
    return null;
  }

  const stageMap = {};
  for (const stage of match.stages || []) {
    stageMap[stage.name] = stage.id;
  }

  const config = {
    pipelineId: match.id,
    pipelineName: match.name,
    locationId: GHL_LOCATION_ID,
    stages: stageMap,
    stageOrder: (match.stages || []).map((s) => s.name),
    createdAt: new Date().toISOString(),
    source: 'fetched',
  };

  saveConfig(config);
  console.log(`[create-pipeline] Fetched pipeline: ${match.name} (${match.id})`);
  for (const [name, id] of Object.entries(stageMap)) {
    console.log(`    ${name}: ${id}`);
  }
  return config;
}

async function createPipeline() {
  console.log('[create-pipeline] Creating SalesSuiteOS Pipeline in GHL...');

  try {
    const result = await ghlRequest('POST', '/opportunities/pipelines', {
      name: 'SalesSuiteOS Pipeline',
      stages: STAGES,
      locationId: GHL_LOCATION_ID,
    });

    const pipeline = result.pipeline || result;
    const pipelineId = pipeline.id;

    if (!pipelineId) {
      console.error('[create-pipeline] No pipeline ID in response:', JSON.stringify(result, null, 2));
      process.exit(1);
    }

    const stageMap = {};
    for (const stage of pipeline.stages || []) {
      stageMap[stage.name] = stage.id;
    }

    const config = {
      pipelineId,
      pipelineName: 'SalesSuiteOS Pipeline',
      locationId: GHL_LOCATION_ID,
      stages: stageMap,
      stageOrder: STAGES.map((s) => s.name),
      createdAt: new Date().toISOString(),
      source: 'api-created',
    };

    saveConfig(config);
    console.log('[create-pipeline] Pipeline created successfully');
    console.log(`  Pipeline ID: ${pipelineId}`);
    for (const [name, id] of Object.entries(stageMap)) {
      console.log(`    ${name}: ${id}`);
    }
    return config;
  } catch (err) {
    if (err.status === 401) {
      console.warn('[create-pipeline] PIT token lacks opportunities.write scope.');
      console.warn('[create-pipeline] Attempting to fetch existing pipeline instead...');
      const fetched = await fetchExistingPipeline();
      if (fetched) return fetched;

      console.warn('[create-pipeline] No existing pipeline found. Saving placeholder config.');
      console.warn('[create-pipeline] ACTION REQUIRED: Create "SalesSuiteOS Pipeline" in GHL UI with these stages:');
      STAGES.forEach((s) => console.warn(`    ${s.position}. ${s.name}`));
      console.warn('[create-pipeline] Then run: node create-pipeline.js --fetch');

      const placeholder = {
        pipelineId: 'PENDING_MANUAL_CREATION',
        pipelineName: 'SalesSuiteOS Pipeline',
        locationId: GHL_LOCATION_ID,
        stages: Object.fromEntries(STAGES.map((s) => [s.name, 'PENDING'])),
        stageOrder: STAGES.map((s) => s.name),
        createdAt: new Date().toISOString(),
        source: 'placeholder',
      };
      saveConfig(placeholder);
      return placeholder;
    }
    throw err;
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode === '--fetch') {
    await fetchExistingPipeline();
  } else {
    await createPipeline();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[create-pipeline] Fatal:', err.message);
    if (err.body) console.error('  Response:', JSON.stringify(err.body, null, 2));
    process.exit(1);
  });
}

module.exports = { createPipeline, fetchExistingPipeline };
