// Tshwane Streetlight Reporter — e-Tshwane Bookmarklet
// 
// HOW TO INSTALL:
// 1. Create a new bookmark in your browser
// 2. Name it: "Fill e-Tshwane"
// 3. In the URL/address field, paste the ENTIRE line below (starting with javascript:)
//
// javascript:void((async()=>{try{const d=JSON.parse(await navigator.clipboard.readText());const f=(s,v)=>{const el=document.querySelector(s);if(el){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}};const inputs=document.querySelectorAll('input[type=text],textarea');inputs.forEach(i=>{const p=i.placeholder||i.getAttribute('aria-label')||'';const pl=p.toLowerCase();if(pl.includes('name')&&!pl.includes('surname')&&!pl.includes('street'))i.value=d.name;else if(pl.includes('surname'))i.value=d.surname;else if(pl.includes('contact'))i.value=d.phone;else if(pl.includes('email'))i.value=d.email;else if(pl.includes('street name'))i.value=d.streetName;else if(pl.includes('street number'))i.value=d.streetNumber;else if(pl.includes('intersection'))i.value=d.intersection;else if(pl.includes('pole'))i.value=d.poleId;else if(pl.includes('description')||i.tagName==='TEXTAREA')i.value=d.description;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))});alert('Form filled! Please select Task: Street Lights and Service: '+d.service+' from the dropdowns, then click Submit.')}catch(e){const ref=document.body.innerText.match(/reference number[:\s]+(\d+)/i);if(ref){await navigator.clipboard.writeText(ref[1]);alert('Reference number '+ref[1]+' copied to clipboard! Paste it in the Streetlight Reporter app.')}else{alert('No clipboard data found. Copy report data from the app first, OR if you just submitted, the reference number could not be found on this page.')}}})())
//
// USAGE:
// A) On the e-Tshwane form page: Click the bookmarklet to auto-fill fields
// B) On the confirmation page: Click the bookmarklet to copy the reference number
