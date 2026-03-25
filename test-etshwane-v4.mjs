// e-Tshwane Automation POC v4 - Exact selectors from cURL data
// Run: node test-etshwane-v4.mjs
// Submit for real: node test-etshwane-v4.mjs --submit

import { chromium } from 'playwright';

const PREFIX = 'reportGroup:noneRegisteredUserQuery:inputPanelGroupId:reportForm:reportCustForm:';

const data = {
  name: 'Werner', surname: 'Lourens', phone: '0832745811',
  email: 'za.werner.lourens@gmail.com', streetName: 'Koordinaat St',
  streetNumber: '342', suburb: 'MEYERSPARK', intersection: 'Asimptote Street',
  poleId: '3', description: 'Streetlight not working - reported via Ward41',
  taskIndex: 1,    // 0=placeholder, 1=Street Lights
  serviceIndex: 6, // 0=placeholder, 1=Area Fault, 2=Damaged Pole, 3=High mast, 4=Flickering, 5=Lights on 24/7, 6=Single Light Fault, 7=Damaged high-mast
};

// PrimeFaces escapes colons in IDs with \\:
const esc = (id) => id.replace(/:/g, '\\:');

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const page = await browser.newPage();
  
  try {
    console.log('📄 Loading...');
    await page.goto('https://www.e-tshwane.co.za/lodge-query', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('⚡ Clicking Energy and Electricity...');
    await page.click('text=Energy and Electricity');
    await page.waitForTimeout(3000);
    console.log('✅ Form loaded');

    // ---- Task dropdown (PrimeFaces SelectOneMenu) ----
    console.log('💡 Opening Task dropdown...');
    const taskId = PREFIX + 'j_idt237';
    // Click the label/trigger to open the dropdown
    await page.click('#' + esc(taskId) + '_label');
    await page.waitForTimeout(500);
    // Click the correct item by index
    await page.click('#' + esc(taskId) + '_' + data.taskIndex);
    await page.waitForTimeout(2000);
    console.log('✅ Task: Street Lights');

    // ---- Service dropdown ----
    console.log('🔧 Opening Service dropdown...');
    const serviceId = PREFIX + 'j_idt240';
    await page.click('#' + esc(serviceId) + '_label');
    await page.waitForTimeout(500);
    await page.click('#' + esc(serviceId) + '_' + data.serviceIndex);
    await page.waitForTimeout(1000);
    console.log('✅ Service selected');

    // ---- Contact info ----
    console.log('👤 Filling contact info...');
    await page.fill('#' + esc(PREFIX + 'name'), data.name);
    await page.fill('#' + esc(PREFIX + 'surname'), data.surname);
    await page.fill('#' + esc(PREFIX + 'contactNum'), data.phone);
    await page.fill('#' + esc(PREFIX + 'j_idt247'), data.email);
    console.log('✅ Contact filled');

    // ---- Location ----
    console.log('📍 Filling location...');
    await page.fill('#' + esc(PREFIX + 'j_idt252'), data.streetName);
    await page.fill('#' + esc(PREFIX + 'j_idt253'), data.streetNumber);

    // Suburb autocomplete
    console.log('🏘️ Selecting suburb...');
    const suburbSel = '#' + esc(PREFIX + 'j_idt254:filterQueryLocationEntityListCopy_input');
    await page.click(suburbSel);
    await page.fill(suburbSel, '');
    await page.type(suburbSel, data.suburb, { delay: 150 });
    await page.waitForTimeout(2000);
    // Click first autocomplete suggestion
    const acPanel = page.locator('.ui-autocomplete-panel:visible li').first();
    if (await acPanel.isVisible()) {
      await acPanel.click();
      console.log('✅ Suburb selected');
    } else {
      console.log('⚠️ No suburb autocomplete - typed manually');
    }
    await page.waitForTimeout(500);

    await page.fill('#' + esc(PREFIX + 'intersectionInput'), data.intersection);
    await page.fill('#' + esc(PREFIX + 'poleIDInput'), data.poleId);
    await page.fill('#' + esc(PREFIX + 'j_idt256'), data.description);
    console.log('✅ Location filled');

    await page.screenshot({ path: 'etshwane-filled.png', fullPage: true });
    console.log('📸 Screenshot: etshwane-filled.png');

    if (process.argv.includes('--submit')) {
      console.log('📤 SUBMITTING...');
      const submitSel = '#' + esc(PREFIX + 'j_idt259:commandButton');
      await page.click(submitSel);
      
      console.log('⏳ Waiting for response...');
      await page.waitForTimeout(10000);
      
      const bodyText = await page.textContent('body');
      const refMatch = bodyText.match(/reference number[:\s]+(\d+)/i);
      
      if (refMatch) {
        console.log('');
        console.log('🎉🎉🎉 REFERENCE NUMBER: ' + refMatch[1] + ' 🎉🎉🎉');
        console.log('');
        await page.screenshot({ path: 'etshwane-success.png' });
        await browser.close();
        return refMatch[1];
      } else {
        console.log('❌ No reference number found');
        console.log('URL:', page.url());
        await page.screenshot({ path: 'etshwane-result.png', fullPage: true });
      }
    } else {
      console.log('');
      console.log('==========================================');
      console.log('  ✅ FORM FILLED SUCCESSFULLY');
      console.log('  Check the browser window to verify.');
      console.log('  To submit: node test-etshwane-v4.mjs --submit');
      console.log('  Ctrl+C to close.');
      console.log('==========================================');
      await page.waitForTimeout(300000);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    await page.screenshot({ path: 'etshwane-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run();
