// e-Tshwane Automation via Browserless v3 - Home page session approach
// Run: node test-browserless-v3.mjs
// Submit: node test-browserless-v3.mjs --submit

import { chromium } from 'playwright-core';

const TOKEN = '2UDE9LWbbgM0DzL5001e3172ba2b25db3328ce2fff4dfc151';
const WS = `wss://production-sfo.browserless.io/chromium?token=${TOKEN}&timeout=60000`;

const PREFIX = 'reportGroup:noneRegisteredUserQuery:inputPanelGroupId:reportForm:reportCustForm:';
const esc = (id) => id.replace(/:/g, '\\:');

const data = {
  name: 'Werner', surname: 'Lourens', phone: '0832745811',
  email: 'za.werner.lourens@gmail.com', streetName: 'Koordinaat St',
  streetNumber: '342', suburb: 'MEYERSPARK', intersection: 'Asimptote Street',
  poleId: '3', description: 'Streetlight not working - Ward41 automated report',
  taskIndex: 1, serviceIndex: 6,
};

async function run() {
  console.log('🚀 Connecting to Browserless...');
  const browser = await chromium.connectOverCDP(WS);
  console.log('✅ Connected');

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // Start from home page to establish proper session
    console.log('📄 Loading e-Tshwane home page...');
    await page.goto('https://www.e-tshwane.co.za', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('✅ Home page loaded');

    // Click "I want to report"
    console.log('📋 Clicking I want to report...');
    await page.click('text=I want to report');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'bl-step1-report.png' });
    console.log('✅ Report page loaded');

    // Click Energy and Electricity
    console.log('⚡ Clicking Energy and Electricity...');
    await page.click('text=Energy and Electricity');
    console.log('⏳ Waiting for form to load...');
    await page.waitForTimeout(8000);
    
    await page.screenshot({ path: 'bl-step2-energy.png', fullPage: true });
    console.log('📸 Screenshots saved');

    // Check if form loaded
    const hasForm = await page.locator('#' + esc(PREFIX + 'j_idt237_label')).count();
    console.log('Task dropdown found:', hasForm > 0);

    if (hasForm === 0) {
      console.log('⚠️ Form not visible yet. Waiting 10 more seconds...');
      await page.waitForTimeout(10000);
      await page.screenshot({ path: 'bl-step2b-wait.png', fullPage: true });
      
      const hasForm2 = await page.locator('#' + esc(PREFIX + 'j_idt237_label')).count();
      if (hasForm2 === 0) {
        // Check what we see
        const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log('Page text:', bodySnippet);
        console.log('❌ Form did not load. Check screenshots.');
        return null;
      }
    }

    // Select Task dropdown
    console.log('💡 Selecting Task...');
    await page.click('#' + esc(PREFIX + 'j_idt237_label'));
    await page.waitForTimeout(500);
    await page.click('#' + esc(PREFIX + 'j_idt237_') + data.taskIndex);
    await page.waitForTimeout(2000);
    console.log('✅ Task: Street Lights');

    // Select Service dropdown
    console.log('🔧 Selecting Service...');
    await page.click('#' + esc(PREFIX + 'j_idt240_label'));
    await page.waitForTimeout(500);
    await page.click('#' + esc(PREFIX + 'j_idt240_') + data.serviceIndex);
    await page.waitForTimeout(1000);
    console.log('✅ Service selected');

    // Fill contact info
    console.log('👤 Filling contact...');
    await page.fill('#' + esc(PREFIX + 'name'), data.name);
    await page.fill('#' + esc(PREFIX + 'surname'), data.surname);
    await page.fill('#' + esc(PREFIX + 'contactNum'), data.phone);
    await page.fill('#' + esc(PREFIX + 'j_idt247'), data.email);
    console.log('✅ Contact filled');

    // Fill location
    console.log('📍 Filling location...');
    await page.fill('#' + esc(PREFIX + 'j_idt252'), data.streetName);
    await page.fill('#' + esc(PREFIX + 'j_idt253'), data.streetNumber);

    // Suburb autocomplete
    const subSel = '#' + esc(PREFIX + 'j_idt254:filterQueryLocationEntityListCopy_input');
    await page.click(subSel);
    await page.fill(subSel, '');
    await page.type(subSel, data.suburb, { delay: 100 });
    await page.waitForTimeout(2000);
    const ac = page.locator('.ui-autocomplete-panel:visible li').first();
    if (await ac.isVisible()) await ac.click();
    await page.waitForTimeout(500);

    await page.fill('#' + esc(PREFIX + 'intersectionInput'), data.intersection);
    await page.fill('#' + esc(PREFIX + 'poleIDInput'), data.poleId);
    await page.fill('#' + esc(PREFIX + 'j_idt256'), data.description);
    console.log('✅ All filled');

    await page.screenshot({ path: 'bl-step3-filled.png', fullPage: true });
    console.log('📸 Screenshot: bl-step3-filled.png');

    if (process.argv.includes('--submit')) {
      console.log('📤 Submitting...');
      await page.click('#' + esc(PREFIX + 'j_idt259:commandButton'));
      console.log('⏳ Waiting for response...');
      await page.waitForTimeout(10000);

      const bodyText = await page.textContent('body');
      const ref = bodyText.match(/reference number[:\s]+(\d+)/i);
      if (ref) {
        console.log('');
        console.log('🎉🎉🎉 REFERENCE NUMBER: ' + ref[1] + ' 🎉🎉🎉');
        console.log('');
        await page.screenshot({ path: 'bl-step4-success.png' });
        return ref[1];
      }
      console.log('❌ No ref found. URL:', page.url());
      await page.screenshot({ path: 'bl-step4-result.png', fullPage: true });
      return null;
    }

    console.log('');
    console.log('✅ FORM FILLED VIA BROWSERLESS');
    console.log('Run with --submit to submit');
    return 'OK';

  } catch (e) {
    console.error('❌ Error:', e.message);
    await page.screenshot({ path: 'bl-error.png' }).catch(() => {});
    return null;
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run().then(r => console.log('Result:', r));
