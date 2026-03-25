// Test Browserless.io connection with our e-Tshwane automation
// Run: node test-browserless.mjs
// Submit: node test-browserless.mjs --submit

import { chromium } from 'playwright-core';

const BROWSERLESS_TOKEN = '2UDE9LWbbgM0DzL5001e3172ba2b25db3328ce2fff4dfc151';
const BROWSERLESS_WS = `wss://production-sfo.browserless.io/chromium?token=${BROWSERLESS_TOKEN}&timeout=60000`;

const PREFIX = 'reportGroup:noneRegisteredUserQuery:inputPanelGroupId:reportForm:reportCustForm:';

const data = {
  name: 'Werner', surname: 'Lourens', phone: '0832745811',
  email: 'za.werner.lourens@gmail.com', streetName: 'Koordinaat St',
  streetNumber: '342', suburb: 'MEYERSPARK', intersection: 'Asimptote Street',
  poleId: '3', description: 'Streetlight not working - Ward41 automated report',
  taskIndex: 1, serviceIndex: 6, faultLabel: 'Single Light Fault',
};

const esc = (id) => id.replace(/:/g, '\\:');

async function run() {
  console.log('🚀 Connecting to Browserless.io...');
  
  let browser;
  try {
    browser = await chromium.connectOverCDP(BROWSERLESS_WS);
    console.log('✅ Connected to remote browser');
  } catch (e) {
    console.error('❌ Could not connect to Browserless:', e.message);
    console.log('Make sure your API key is correct and you have sessions available.');
    return null;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('📄 Loading e-Tshwane...');
    await page.goto('https://www.e-tshwane.co.za/lodge-query', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded');

    console.log('⚡ Clicking Energy and Electricity...');
    await page.click('text=Energy and Electricity');
    await page.waitForTimeout(3000);
    console.log('✅ Done');

    console.log('💡 Selecting Task...');
    await page.click('#' + esc(PREFIX + 'j_idt237_label'));
    await page.waitForTimeout(500);
    await page.click('#' + esc(PREFIX + 'j_idt237_') + data.taskIndex);
    await page.waitForTimeout(2000);
    console.log('✅ Task: Street Lights');

    console.log('🔧 Selecting Service...');
    await page.click('#' + esc(PREFIX + 'j_idt240_label'));
    await page.waitForTimeout(500);
    await page.click('#' + esc(PREFIX + 'j_idt240_') + data.serviceIndex);
    await page.waitForTimeout(1000);
    console.log('✅ Service: ' + data.faultLabel);

    console.log('👤 Filling contact...');
    await page.fill('#' + esc(PREFIX + 'name'), data.name);
    await page.fill('#' + esc(PREFIX + 'surname'), data.surname);
    await page.fill('#' + esc(PREFIX + 'contactNum'), data.phone);
    await page.fill('#' + esc(PREFIX + 'j_idt247'), data.email);
    console.log('✅ Contact filled');

    console.log('📍 Filling location...');
    await page.fill('#' + esc(PREFIX + 'j_idt252'), data.streetName);
    await page.fill('#' + esc(PREFIX + 'j_idt253'), data.streetNumber);

    const suburbSel = '#' + esc(PREFIX + 'j_idt254:filterQueryLocationEntityListCopy_input');
    await page.click(suburbSel);
    await page.fill(suburbSel, '');
    await page.type(suburbSel, data.suburb, { delay: 100 });
    await page.waitForTimeout(2000);
    const ac = page.locator('.ui-autocomplete-panel:visible li').first();
    if (await ac.isVisible()) await ac.click();
    await page.waitForTimeout(500);

    await page.fill('#' + esc(PREFIX + 'intersectionInput'), data.intersection);
    await page.fill('#' + esc(PREFIX + 'poleIDInput'), data.poleId);
    await page.fill('#' + esc(PREFIX + 'j_idt256'), data.description);
    console.log('✅ All fields filled');

    if (process.argv.includes('--submit')) {
      console.log('📤 Submitting...');
      await page.click('#' + esc(PREFIX + 'j_idt259:commandButton'));
      console.log('⏳ Waiting for response...');
      await page.waitForTimeout(10000);

      const bodyText = await page.textContent('body');
      const refMatch = bodyText.match(/reference number[:\s]+(\d+)/i);
      if (refMatch) {
        console.log('');
        console.log('🎉 REFERENCE NUMBER: ' + refMatch[1]);
        console.log('');
        return refMatch[1];
      } else {
        console.log('❌ No reference number found');
        console.log('URL:', page.url());
        return null;
      }
    } else {
      console.log('');
      console.log('✅ FORM FILLED VIA BROWSERLESS (remote browser)');
      console.log('Run with --submit to actually submit');
      return 'TEST_OK';
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
    return null;
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

const result = await run();
console.log('Result:', result);
