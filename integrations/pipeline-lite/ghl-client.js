/**
 * GHL API Client — shared HTTP helper for all Pipeline Lite scripts
 */
require('dotenv').config({ path: __dirname + '/.env' });
const fetch = require('node-fetch');

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const headers = {
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
};

async function ghlRequest(method, path, body = null) {
  const url = `${GHL_BASE}${path}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(`GHL ${method} ${path} → ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

module.exports = { ghlRequest, GHL_LOCATION_ID, GHL_BASE, headers };
