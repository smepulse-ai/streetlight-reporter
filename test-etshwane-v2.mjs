// e-Tshwane Streetlight Reporter — Automation Proof of Concept v2
// Run with: node test-etshwane.mjs
// To actually submit: node test-etshwane.mjs --submit

import { chromium } from 'playwright';

const reportData = {
  name: 'Werner',
  surname: 'Lourens',
  phone: '0832745811',
  email: 'za.werner.lourens@gmail.com',
  streetName: 'Koordinaat St',
  streetNumber: '342',
  suburb: 'MEYERSPARK',
  intersection: 'Asimptote Street',
  poleId: '3',
  description: 'Streetlight not working - reported via Ward41 Streetlight Reporter',
  faultLabel: 'Single Light Fault',
};

async function submitToETshwane(data) {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  
  try {
    console.log('📄 Navigating to e-Tshwane...');
    await page.goto('https://www.e-tshwane.co.za/lodge-query', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded');

    console.log('⚡ Clicking Energy and Electricity...');
    await page.click('text=Energy and Electricity');
    await page.waitForTimeout(3000);
    console.log('✅ Energy and Electricity selected');

    // PrimeFaces dropdowns - click trigger then select from panel
    console.log('💡 Selecting Street Lights task...');
    const taskTrigger = page.locator('.ui-selectonemenu-trigger').first();
    await taskTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('.ui-selectonemenu-panel:visible li:has-text("Street Lights")').click();
    await page.waitForTimeout(2000);
    console.log('✅ Task selected');

    console.log('🔧 Selecting service type...');
    const serviceTrigger = page.locator('.ui-selectonemenu-trigger').nth(1);
    await serviceTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('.ui-selectonemenu-panel:visible li:has-text("' + data.faultLabel + '")').click();
    await page.waitForTimeout(1000);
    console.log('✅ Service selected');

    console.log('👤 Filling contact info...');
    await page.fill('input[id*="name"]', data.name);
    await page.fill('input[id*="surname"]', data.surname);
    await page.fill('input[id*="contactNum"]', data.phone);
    try { await page.fill('input[id*="j_idt247"]', data.email); } catch {
      const fields = page.locator('input[type="text"]');
      for (let i = 0; i < await fields.count(); i++) {
        const ph = (await fields.nth(i).getAttribute('placeholder')) || '';
        if (ph.toLowerCase().includes('email')) { await fields.nth(i).fill(data.email); break; }
      }
    }
    console.log('✅ Contact info filled');

    console.log('📍 Filling location details...');
    try { await page.fill('input[id*="j_idt252"]', data.streetName); } catch {
      const fields = page.locator('input[type="text"]');
      for (let i = 0; i < await fields.count(); i++) {
        const ph = (await fields.nth(i).getAttribute('placeholder')) || '';
        if (ph.toLowerCase().includes('street name')) { await fields.nth(i).fill(data.streetName); break; }
      }
    }
    try { await page.fill('input[id*="j_idt253"]', data.streetNumber); } catch {
      const fields = page.locator('input[type="text"]');
      for (let i = 0; i < await fields.count(); i++) {
        const ph = (await fields.nth(i).getAttribute('placeholder')) || '';
        if (ph.toLowerCase().includes('street number')) { await fields.nth(i).fill(data.streetNumber); break; }
      }
    }

    console.log('🏘️ Selecting suburb...');
    const suburbInput = page.locator('input[id*="filterQueryLocationEntityListCopy_input"]');
    if (await suburbInput.isVisible()) {
      await suburbInput.click();
      await suburbInput.fill('');
      await suburbInput.type(data.suburb, { delay: 150 });
      await page.waitForTimeout(2000);
      const acItem = page.locator('.ui-autocomplete-panel:visible li').first();
      if (await acItem.isVisible()) { await acItem.click(); console.log('✅ Suburb selected'); }
      else console.log('⚠️ Suburb typed but no autocomplete match');
    }
    await page.waitForTimeout(500);

    try { await page.fill('input[id*="intersectionInput"]', data.intersection); } catch {
      const fields = page.locator('input[type="text"]');
      for (let i = 0; i < await fields.count(); i++) {
        const ph = (await fields.nth(i).getAttribute('placeholder')) || '';
        if (ph.toLowerCase().includes('intersection')) { await fields.nth(i).fill(data.intersection); break; }
      }
    }
    try { await page.fill('input[id*="poleIDInput"]', data.poleId); } catch {
      const fields = page.locator('input[type="text"]');
      for (let i = 0; i < await fields.count(); i++) {
        const ph = (await fields.nth(i).getAttribute('placeholder')) || '';
        if (ph.toLowerCase().includes('pole')) { await fields.nth(i).fill(data.poleId); break; }
      }
    }

    const ta = page.locator('textarea');
    if (await ta.count() > 0) await ta.first().fill(data.description);

    console.log('✅ All fields filled');
    await page.screenshot({ path: 'etshwane-filled.png', fullPage: true });
    console.log('📸 Screenshot: etshwane-filled.png');

    if (process.argv.includes('--submit')) {
      console.log('📤 SUBMITTING...');
      const btn = page.locator('button:has-text("Submit")').first();
      if (await btn.isVisible()) await btn.click();
      else await page.locator('[id*="commandButton"]').first().click();
      
      console.log('⏳ Waiting for confirmation...');
      await page.waitForTimeout(10000);
      
      const bodyText = await page.textContent('body');
      const refMatch = bodyText.match(/reference number[:\s]+(\d+)/i);
      if (refMatch) {
        console.log('🎉 REFERENCE NUMBER: ' + refMatch[1]);
        await page.screenshot({ path: 'etshwane-success.png' });
        return refMatch[1];
      } else {
        console.log('❌ Could not find reference number');
        await page.screenshot({ path: 'etshwane-result.png', fullPage: true });
        return null;
      }
    } else {
      console.log('');
      console.log('========================================');
      console.log('  FORM FILLED - NOT SUBMITTED');
      console.log('  Check the browser. Ctrl+C to close.');
      console.log('  To submit: node test-etshwane.mjs --submit');
      console.log('========================================');
      await page.waitForTimeout(300000);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'etshwane-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

const ref = await submitToETshwane(reportData);
if (ref) console.log('Returned reference:', ref);
