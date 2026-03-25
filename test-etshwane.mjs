// e-Tshwane Streetlight Reporter — Automation Proof of Concept
// Run with: node test-etshwane.mjs
//
// This script opens a VISIBLE browser so you can watch it work.
// Once proven, we'll move this to a headless service (Browserless.io).

import { chromium } from 'playwright';

// ---- Test data (change this to test with real data) ----
const reportData = {
  // Task & Service
  taskValue: '2',        // 2 = Street Lights
  serviceValue: '6',     // 1=Area Fault, 2=Damaged Pole, 3=High mast Light out, 4=Lights Flickering, 5=Lights on 24/7, 6=Single Light Fault, 7=Damaged high-mast pole
  
  // Contact info
  name: 'Werner',
  surname: 'Lourens',
  phone: '0832745811',
  email: 'za.werner.lourens@gmail.com',
  
  // Location
  streetName: 'Koordinaat St',
  streetNumber: '342',
  suburb: 'MEYERSPARK',
  intersection: 'Asimptote Street',
  poleId: '3',
  description: 'Streetlight not working - reported via Ward41 Streetlight Reporter',
};

async function submitToETshwane(data) {
  console.log('🚀 Launching browser...');
  
  // Launch visible browser (change headless to true for silent mode)
  const browser = await chromium.launch({ 
    headless: false,  // Set to true for production
    slowMo: 500,      // Slow down so we can see what's happening
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to lodge-query
    console.log('📄 Navigating to e-Tshwane...');
    await page.goto('https://www.e-tshwane.co.za/lodge-query', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log('✅ Page loaded');

    // Step 2: Click "Energy and Electricity"
    console.log('⚡ Clicking Energy and Electricity...');
    await page.waitForSelector('text=Energy and Electricity', { timeout: 10000 });
    await page.click('text=Energy and Electricity');
    await page.waitForTimeout(2000); // Wait for form to load
    console.log('✅ Energy and Electricity selected');

    // Step 3: Select Task - "Street Lights"
    console.log('💡 Selecting Street Lights task...');
    // PrimeFaces dropdown - need to click it to open, then select
    const taskDropdown = page.locator('label:has-text("Please select Task")').first();
    if (await taskDropdown.isVisible()) {
      await taskDropdown.click();
      await page.waitForTimeout(500);
      await page.click('text=Street Lights');
      await page.waitForTimeout(1000);
    } else {
      // Try direct select if it's a regular dropdown
      const taskSelect = page.locator('select').first();
      await taskSelect.selectOption(data.taskValue);
      await page.waitForTimeout(1000);
    }
    console.log('✅ Task selected');

    // Step 4: Select Service type
    console.log('🔧 Selecting service type...');
    const serviceDropdown = page.locator('label:has-text("Please select Service")').first();
    if (await serviceDropdown.isVisible()) {
      await serviceDropdown.click();
      await page.waitForTimeout(500);
      await page.click('li:has-text("Single Light Fault")');
      await page.waitForTimeout(1000);
    }
    console.log('✅ Service selected');

    // Step 5: Fill contact information
    console.log('👤 Filling contact info...');
    
    // Name
    const nameInput = page.locator('input[id*="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(data.name);
    } else {
      await page.fill('input[placeholder*="Name"]', data.name);
    }

    // Surname
    const surnameInput = page.locator('input[id*="surname"]').first();
    if (await surnameInput.isVisible()) {
      await surnameInput.fill(data.surname);
    } else {
      await page.fill('input[placeholder*="Surname"]', data.surname);
    }

    // Contact number
    const phoneInput = page.locator('input[id*="contactNum"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(data.phone);
    } else {
      await page.fill('input[placeholder*="Contact"]', data.phone);
    }

    // Email
    const emailInput = page.locator('input[id*="j_idt247"], input[placeholder*="Email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(data.email);
    }

    console.log('✅ Contact info filled');

    // Step 6: Fill query details
    console.log('📍 Filling location details...');

    // Street Name
    const streetInput = page.locator('input[id*="j_idt252"], input[placeholder*="Street Name"]').first();
    if (await streetInput.isVisible()) {
      await streetInput.fill(data.streetName);
    }

    // Street Number
    const numberInput = page.locator('input[id*="j_idt253"], input[placeholder*="Street Number"]').first();
    if (await numberInput.isVisible()) {
      await numberInput.fill(data.streetNumber);
    }

    // Suburb (autocomplete field)
    const suburbInput = page.locator('input[id*="filterQueryLocationEntityListCopy_input"], input[placeholder*="Suburb"]').first();
    if (await suburbInput.isVisible()) {
      await suburbInput.fill('');
      await suburbInput.type(data.suburb, { delay: 100 });
      await page.waitForTimeout(1500); // Wait for autocomplete
      // Click the first suggestion
      const suggestion = page.locator('.ui-autocomplete-panel li').first();
      if (await suggestion.isVisible()) {
        await suggestion.click();
        await page.waitForTimeout(500);
      }
    }

    // Nearest Intersection
    const intersectionInput = page.locator('input[id*="intersectionInput"]').first();
    if (await intersectionInput.isVisible()) {
      await intersectionInput.fill(data.intersection);
    }

    // Pole ID
    const poleInput = page.locator('input[id*="poleIDInput"]').first();
    if (await poleInput.isVisible()) {
      await poleInput.fill(data.poleId);
    }

    // Description
    const descInput = page.locator('textarea[id*="j_idt256"], textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill(data.description);
    }

    console.log('✅ Location details filled');

    // Step 7: Take a screenshot before submitting
    await page.screenshot({ path: 'etshwane-before-submit.png' });
    console.log('📸 Screenshot saved: etshwane-before-submit.png');

    // Step 8: Submit the form
    console.log('📤 Submitting form...');
    
    // DON'T ACTUALLY SUBMIT YET - uncomment the lines below when ready
    // For now, just pause so you can verify the form looks correct
    
    console.log('');
    console.log('⚠️  FORM FILLED BUT NOT SUBMITTED');
    console.log('⚠️  Check the browser window to verify everything looks correct.');
    console.log('⚠️  To enable actual submission, edit this script and uncomment the submit section.');
    console.log('');
    console.log('Press Ctrl+C to close when done inspecting.');
    
    // ---- UNCOMMENT BELOW TO ACTUALLY SUBMIT ----
    // const submitBtn = page.locator('button:has-text("Submit"), input[type="submit"]').first();
    // await submitBtn.click();
    // 
    // // Wait for redirect to success page
    // await page.waitForURL('**/Query-Success**', { timeout: 15000 });
    // console.log('✅ Form submitted!');
    // 
    // // Step 9: Extract reference number
    // const pageText = await page.textContent('body');
    // const refMatch = pageText.match(/reference number[:\s]+(\d+)/i);
    // if (refMatch) {
    //   const refNumber = refMatch[1];
    //   console.log('🎉 Reference number: ' + refNumber);
    //   await page.screenshot({ path: 'etshwane-success.png' });
    //   return refNumber;
    // } else {
    //   console.log('❌ Could not find reference number on the page');
    //   await page.screenshot({ path: 'etshwane-result.png' });
    //   return null;
    // }
    
    // Keep browser open for inspection
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'etshwane-error.png' });
  } finally {
    await browser.close();
  }
}

// Run it
submitToETshwane(reportData);
