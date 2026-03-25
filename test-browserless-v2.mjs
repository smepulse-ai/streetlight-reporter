// Browserless test v2 - stealth mode + debug screenshots
import { chromium } from 'playwright-core';

const TOKEN = '2UDE9LWbbgM0DzL5001e3172ba2b25db3328ce2fff4dfc151';
const WS = `wss://production-sfo.browserless.io/chromium/stealth?token=${TOKEN}&timeout=60000`;
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
  console.log('🚀 Connecting to Browserless (stealth mode)...');
  const browser = await chromium.connectOverCDP(WS);
  console.log('✅ Connected');

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log('📄 Loading e-Tshwane...');
    await page.goto('https://www.e-tshwane.co.za/lodge-query', { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    // Wait a bit for any Cloudflare challenge to resolve
    await page.waitForTimeout(5000);
    
    // Screenshot to see what we got
    await page.screenshot({ path: 'browserless-page1.png' });
    console.log('📸 Screenshot: browserless-page1.png');
    
    // Check what page we're on
    const title = await page.title();
    const url = page.url();
    console.log('Page title:', title);
    console.log('Page URL:', url);
    
    // Check if we see the form or a challenge
    const hasEnergyBtn = await page.locator('text=Energy and Electricity').count();
    console.log('Energy button found:', hasEnergyBtn > 0);
    
    if (hasEnergyBtn === 0) {
      console.log('⚠️ Form not visible - might be Cloudflare challenge');
      console.log('Waiting 10 more seconds for challenge to resolve...');
      await page.waitForTimeout(10000);
      await page.screenshot({ path: 'browserless-page2.png' });
      console.log('📸 Screenshot: browserless-page2.png');
      
      const hasBtn2 = await page.locator('text=Energy and Electricity').count();
      if (hasBtn2 === 0) {
        console.log('❌ Still blocked. Check browserless-page1.png and browserless-page2.png');
        const bodyText = (await page.textContent('body')).substring(0, 300);
        console.log('Page text:', bodyText);
        return null;
      }
    }

// Instead of clicking through, navigate directly to the details page
    console.log('📄 Navigating directly to form page...');
    await page.goto('https://www.e-tshwane.co.za/lodge-query-details', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'browserless-direct.png', fullPage: true });
    console.log('📸 Screenshot: browserless-direct.png');
    
    // Check if the form loaded
    const hasForm = await page.locator('text=Please select Task').count();
    console.log('Form visible:', hasForm > 0);
    
    if (hasForm === 0) {
      // Try clicking Energy and Electricity if we got redirected back
      const hasEnergy = await page.locator('text=Energy and Electricity').count();
      if (hasEnergy > 0) {
        console.log('⚡ Clicking Energy and Electricity...');
        await page.click('text=Energy and Electricity');
        await page.waitForTimeout(8000);
        await page.screenshot({ path: 'browserless-after-click.png', fullPage: true });
      }
    }

    console.log('💡 Selecting Task...');

    console.log('🔧 Selecting Service...');
    await page.click('#' + esc(PREFIX + 'j_idt240_label'));
    await page.waitForTimeout(500);
    await page.click('#' + esc(PREFIX + 'j_idt240_') + data.serviceIndex);
    await page.waitForTimeout(1000);
    console.log('✅ Service selected');

    console.log('👤 Filling contact...');
    await page.fill('#' + esc(PREFIX + 'name'), data.name);
    await page.fill('#' + esc(PREFIX + 'surname'), data.surname);
    await page.fill('#' + esc(PREFIX + 'contactNum'), data.phone);
    await page.fill('#' + esc(PREFIX + 'j_idt247'), data.email);
    console.log('✅ Contact filled');

    console.log('📍 Filling location...');
    await page.fill('#' + esc(PREFIX + 'j_idt252'), data.streetName);
    await page.fill('#' + esc(PREFIX + 'j_idt253'), data.streetNumber);
    
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

    await page.screenshot({ path: 'browserless-filled.png', fullPage: true });
    console.log('📸 Screenshot: browserless-filled.png');

    if (process.argv.includes('--submit')) {
      console.log('📤 Submitting...');
      await page.click('#' + esc(PREFIX + 'j_idt259:commandButton'));
      await page.waitForTimeout(10000);
      
      const bodyText = await page.textContent('body');
      const ref = bodyText.match(/reference number[:\s]+(\d+)/i);
      if (ref) {
        console.log('🎉 REFERENCE NUMBER: ' + ref[1]);
        return ref[1];
      }
      console.log('❌ No ref found. URL:', page.url());
      await page.screenshot({ path: 'browserless-result.png', fullPage: true });
      return null;
    }

    console.log('✅ FORM FILLED VIA BROWSERLESS STEALTH');
    console.log('Run with --submit to submit');
    return 'OK';

  } catch (e) {
    console.error('❌ Error:', e.message);
    await page.screenshot({ path: 'browserless-error.png' }).catch(() => {});
    return null;
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run().then(r => console.log('Result:', r));
