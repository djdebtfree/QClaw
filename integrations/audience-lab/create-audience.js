#!/usr/bin/env node
/**
 * create-audience.js — Headless Playwright automation for Audience Lab
 *
 * Usage: node create-audience.js "insurance sales people seeking crm"
 *
 * Process:
 * 1. Generates smart audience name from keywords (not literal text)
 * 2. Logs into Audience Lab
 * 3. Creates audience with Keyword method
 * 4. Uses AI Intent Keyword Generator
 * 5. Sets High intent score
 * 6. Generates the audience
 * 7. Returns audience ID + name
 */
require('dotenv').config({ path: __dirname + '/.env' });
const { chromium } = require('playwright');

const AUDIENCE_LAB_URL = 'https://build.audiencelab.io';
const AUDIENCE_LAB_EMAIL = process.env.AUDIENCE_LAB_EMAIL || 'keith.fonseca@gmail.com';
const AUDIENCE_LAB_PASSWORD = process.env.AUDIENCE_LAB_PASSWORD;

// Generate a smart audience name from keyword description
function generateAudienceName(keywords) {
  // Parse the keyword description into a concise audience name
  const kw = keywords.toLowerCase();

  // Common patterns
  const patterns = [
    { match: /insurance.*crm|crm.*insurance/, name: 'Insurance CRM Seekers' },
    { match: /insurance.*sales/, name: 'Insurance Sales Professionals' },
    { match: /real estate.*agent|realtor/, name: 'Real Estate Agent Prospects' },
    { match: /solar.*install|solar.*panel/, name: 'Solar Installation Seekers' },
    { match: /roofing|roof repair/, name: 'Roofing Service Seekers' },
    { match: /hvac|heating.*cooling/, name: 'HVAC Service Seekers' },
    { match: /plumb/, name: 'Plumbing Service Seekers' },
    { match: /landscap|lawn care/, name: 'Landscaping Service Seekers' },
    { match: /clean.*service/, name: 'Cleaning Service Seekers' },
    { match: /medicare|health insurance/, name: 'Medicare & Health Insurance Seekers' },
    { match: /life insurance/, name: 'Life Insurance Seekers' },
    { match: /auto insurance/, name: 'Auto Insurance Seekers' },
    { match: /legal.*personal injury|injury lawyer/, name: 'Personal Injury Legal Seekers' },
    { match: /legal.*family|family law/, name: 'Family Law Seekers' },
    { match: /loan.*business|business.*loan/, name: 'Business Loan Seekers' },
    { match: /loan.*home|mortgage/, name: 'Home Loan Seekers' },
    { match: /gym|fitness/, name: 'Fitness & Gym Seekers' },
    { match: /beauty|spa|skincare/, name: 'Beauty & Spa Service Seekers' },
    { match: /saas|software.*service/, name: 'SaaS Solution Seekers' },
    { match: /ai|artificial intelligence/, name: 'AI Technology Seekers' },
    { match: /crm/, name: 'CRM Solution Seekers' },
    { match: /home.*security/, name: 'Home Security Seekers' },
    { match: /pest.*control/, name: 'Pest Control Service Seekers' },
    { match: /electric/, name: 'Electrical Service Seekers' },
  ];

  for (const p of patterns) {
    if (p.match.test(kw)) return p.name;
  }

  // Fallback: extract key nouns and title-case them
  const stopWords = new Set(['a','an','the','and','or','for','to','in','on','at','by','with','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','can','could','who','what','where','when','why','how','their','them','they','people','seeking','looking','searching','want','need']);
  const words = kw.split(/\s+/).filter(w => !stopWords.has(w) && w.length > 2);
  const titleCase = words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return `${titleCase} Seekers`;
}

async function createAudience(keywordDescription) {
  const audienceName = generateAudienceName(keywordDescription);
  console.log(`[audience-lab] Creating audience: "${audienceName}"`);
  console.log(`[audience-lab] Keywords: "${keywordDescription}"`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // Load saved cookies if they exist
  const fs = require('fs');
  const cookiePath = __dirname + '/cookies.json';
  if (fs.existsSync(cookiePath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
    await context.addCookies(cookies);
    console.log('[audience-lab] Loaded saved session cookies');
  }

  const page = await context.newPage();

  try {
    // Step 1: Navigate to Audience Lab
    console.log('[audience-lab] Navigating to Audience Lab...');
    await page.goto(`${AUDIENCE_LAB_URL}/home/data-driver`, { waitUntil: 'networkidle', timeout: 30000 });

    // Check if we need to login
    if (page.url().includes('login') || page.url().includes('start') || page.url().includes('auth')) {
      console.log('[audience-lab] Login required...');

      if (!AUDIENCE_LAB_PASSWORD) {
        throw new Error('AUDIENCE_LAB_PASSWORD not set in .env');
      }

      // Try to find and fill login form
      // Audience Lab uses various auth methods — try email/password first
      await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email"]', { timeout: 10000 });
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', AUDIENCE_LAB_EMAIL);

      // Look for password field or "continue" button
      const passwordField = await page.$('input[type="password"]');
      if (passwordField) {
        await passwordField.fill(AUDIENCE_LAB_PASSWORD);
      }

      // Click login/continue button
      await page.click('button[type="submit"], button:has-text("Log in"), button:has-text("Continue"), button:has-text("Sign in")');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

      // Save cookies for next time
      const cookies = await context.cookies();
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
      console.log('[audience-lab] Login successful, cookies saved');
    }

    // Step 2: Click "Create" button
    console.log('[audience-lab] Clicking Create button...');
    await page.waitForSelector('button:has-text("Create")', { timeout: 15000 });
    await page.click('button:has-text("Create")');

    // Step 3: Fill audience name in modal
    console.log(`[audience-lab] Entering audience name: "${audienceName}"`);
    await page.waitForSelector('input[placeholder*="name"], input[type="text"]', { timeout: 10000 });
    // Clear any existing text and type the name
    const nameInput = await page.$('div:has-text("Create Audience") input[type="text"], div:has-text("Name") input');
    if (nameInput) {
      await nameInput.fill(audienceName);
    } else {
      // Fallback: find the input in the modal
      await page.fill('input', audienceName);
    }

    // Click Create in modal
    await page.waitForTimeout(500);
    // The modal has Cancel and Create buttons - click the Create one
    const createButtons = await page.$$('button:has-text("Create")');
    // Click the last/modal Create button (not the top-right one)
    if (createButtons.length > 1) {
      await createButtons[createButtons.length - 1].click();
    } else {
      await createButtons[0].click();
    }

    console.log('[audience-lab] Audience created, waiting for builder...');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Step 4: Intent modal should appear — select "Keyword" method
    console.log('[audience-lab] Selecting Keyword method...');
    await page.waitForSelector('text=Keyword', { timeout: 10000 });
    await page.click('text=Keyword');
    await page.waitForTimeout(500);

    // Step 5: Fill AI Intent Keyword Generator description
    console.log(`[audience-lab] Entering keyword description: "${keywordDescription}"`);
    // Find the textarea for "Describe your audience intent"
    const textarea = await page.$('textarea, input[placeholder*="Describe"]');
    if (textarea) {
      await textarea.fill(keywordDescription);
    } else {
      // Try to find by label
      await page.fill('textarea', keywordDescription);
    }

    // Step 6: Click Generate
    console.log('[audience-lab] Clicking Generate to get AI keywords...');
    await page.click('button:has-text("Generate")');

    // Wait for keywords to be generated (AI takes a few seconds)
    await page.waitForTimeout(5000);
    // Wait for the "Generated Keywords" confirmation
    await page.waitForSelector('text=Generated Keywords', { timeout: 30000 }).catch(() => {
      console.log('[audience-lab] Warning: "Generated Keywords" text not found, continuing...');
    });
    console.log('[audience-lab] Keywords generated');

    // Step 7: Set Minimum Score to "High"
    console.log('[audience-lab] Setting intent to High...');
    await page.click('button:has-text("High"), text=High');
    await page.waitForTimeout(500);

    // Step 8: Click Continue
    console.log('[audience-lab] Clicking Continue...');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(3000);

    // Step 9: Wait for preview, then click "Generate Audience"
    console.log('[audience-lab] Waiting for preview...');
    await page.waitForSelector('button:has-text("Generate Audience")', { timeout: 30000 });
    console.log('[audience-lab] Clicking Generate Audience...');
    await page.click('button:has-text("Generate Audience")');

    // Step 10: Wait for confirmation
    await page.waitForTimeout(3000);

    // Extract audience ID from URL
    const url = page.url();
    const audienceIdMatch = url.match(/audience\/([a-f0-9-]+)/);
    const audienceId = audienceIdMatch ? audienceIdMatch[1] : 'unknown';

    // Save cookies for future runs
    const finalCookies = await context.cookies();
    fs.writeFileSync(cookiePath, JSON.stringify(finalCookies, null, 2));

    console.log('[audience-lab] Audience creation initiated!');
    console.log(`[audience-lab] Audience Name: ${audienceName}`);
    console.log(`[audience-lab] Audience ID: ${audienceId}`);
    console.log(`[audience-lab] URL: ${url}`);
    console.log('[audience-lab] Audience is now hydrating. Check /audiences API for status.');

    return {
      success: true,
      audienceName,
      audienceId,
      url,
      keywordDescription
    };

  } catch (err) {
    // Take screenshot on error for debugging
    await page.screenshot({ path: __dirname + '/error-screenshot.png', fullPage: true });
    console.error(`[audience-lab] Error: ${err.message}`);
    console.error('[audience-lab] Screenshot saved to error-screenshot.png');
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}

// CLI entry point
if (require.main === module) {
  const keywords = process.argv.slice(2).join(' ');
  if (!keywords) {
    console.error('Usage: node create-audience.js "keyword description"');
    console.error('Example: node create-audience.js "insurance sales people seeking crm"');
    process.exit(1);
  }
  createAudience(keywords).then(result => {
    if (!result.success) process.exit(1);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createAudience, generateAudienceName };
