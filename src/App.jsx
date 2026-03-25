import { useState, useEffect, useCallback, useRef } from 'react';
const GMAP_KEY = 'AIzaSyCx3bJdyxewE8bvlzSAnJlxxblySfqJZrY';
import { supabase } from './supabaseClient';
import './App.css';

const CENTER = [-25.7461, 28.2881];
const ZOOM = 15;
const COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const FAULT_TYPES = ['Area Fault','Damaged Pole','High mast Light out (Apollo)','Lights Flickering','Lights on 24/7','Single Light Fault','Damaged high-mast pole'];
const COLORS = { working: '#22c55e', not_working: '#ef4444', reported: '#f97316', pending_verify: '#eab308' };
const LABELS = { working: 'Working', not_working: 'Not Working', reported: 'Reported (<72h)', pending_verify: 'Pending Verification' };
const VERIFY_NEEDED = 3;

// ---- Helpers ----
const canReport = (reports) => {
  if (!reports || !reports.length) return true;
  return Date.now() - new Date(reports[reports.length - 1].reported_at).getTime() > COOLDOWN;
};
const cooldownLeft = (reports) => {
  if (!reports || !reports.length) return 0;
  return Math.max(0, COOLDOWN - (Date.now() - new Date(reports[reports.length - 1].reported_at).getTime()));
};
const fmtCountdown = (ms) => Math.floor(ms/3600000) + 'h ' + Math.floor((ms%3600000)/60000) + 'm';
const daysSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

const getStatus = (light) => {
  if (!light.reports || !light.reports.length) return 'working';
  const last = light.reports[light.reports.length - 1];
  if (last.resolved) return 'working';
  const vCount = (light.verifications || []).filter(v => v.report_id === last.id).length;
  if (vCount > 0 && vCount < VERIFY_NEEDED) return 'pending_verify';
  if (cooldownLeft(light.reports) > 0) return 'reported';
  return 'not_working';
};

const getVerifyCount = (light) => {
  if (!light.reports || !light.reports.length) return 0;
  const last = light.reports[light.reports.length - 1];
  return (light.verifications || []).filter(v => v.report_id === last.id).length;
};

const wasEverResolved = (reports) => (reports || []).some(r => r.resolved);

const genMailBody = (light, r) => {
  return 'Dear City of Tshwane Streetlights Division,\n\nI wish to report a faulty streetlight:\n\nPole Number: ' + light.pole_number +
    '\nStreet: ' + (light.street_number ? light.street_number + ' ' : '') + light.street_name +
    '\nSuburb: ' + (light.suburb || 'Meyerspark') +
    '\nNearest Intersection: ' + (light.nearest_intersection || 'N/A') +
    '\nFault Type: ' + r.faultType +
    '\nDescription: ' + (r.description || 'N/A') +
    '\n\nReporter: ' + r.reporterName + ' ' + r.reporterSurname +
    '\nContact: ' + r.reporterPhone + (r.reporterEmail ? ' / ' + r.reporterEmail : '') +
    '\n\nGPS: ' + light.lat.toFixed(6) + ', ' + light.lng.toFixed(6) +
    '\n\nReported via Tshwane Streetlight Reporter';
};

const genMailto = (light, r) => {
  const subj = encodeURIComponent('Faulty Streetlight — Pole ' + light.pole_number + ' — ' + light.street_name);
  const body = encodeURIComponent(genMailBody(light, r));
  return 'mailto:streetlights@tshwane.gov.za?subject=' + subj + '&body=' + body;
};

const genClipboardData = (light, r) => JSON.stringify({
  task: 'Street Lights',
  service: r.faultType,
  name: r.reporterName,
  surname: r.reporterSurname,
  phone: r.reporterPhone,
  email: r.reporterEmail || '',
  streetName: light.street_name,
  streetNumber: light.street_number || '',
  suburb: light.suburb || 'Meyerspark',
  intersection: light.nearest_intersection || '',
  poleId: light.pole_number,
  description: r.description || 'Faulty streetlight - ' + r.faultType
});

// ---- Supabase ----
async function fetchLights() {
  const { data, error } = await supabase.from('streetlights').select('*, reports(*), verifications(*)').order('created_at', { ascending: false });
  if (error) { console.error('Fetch error:', error); return []; }
  return (data || []).map(l => ({
    ...l,
    reports: (l.reports || []).sort((a, b) => new Date(a.reported_at) - new Date(b.reported_at)),
    verifications: l.verifications || []
  }));
}

async function insertLight(d) {
  const { data, error } = await supabase.from('streetlights').insert({
    pole_number: d.poleNumber, street_name: d.streetName, street_number: d.streetNumber || null,
    suburb: d.suburb || 'Meyerspark', nearest_intersection: d.nearestIntersection || null,
    lat: d.lat, lng: d.lng, photo_url: d.photo || null
  }).select().single();
  if (error) { console.error('Insert error:', error); return null; }
  return data;
}

async function insertReport(sid, r, isRereport) {
  const { data, error } = await supabase.from('reports').insert({
    streetlight_id: sid, fault_type: r.faultType, description: r.description || null,
    photo_url: r.photo || null, reporter_name: r.reporterName, reporter_surname: r.reporterSurname,
    reporter_phone: r.reporterPhone, reporter_email: r.reporterEmail || null,
    email_sent: r.emailSent || false, is_rereport: isRereport || false
  }).select().single();
  if (error) { console.error('Report error:', error); return null; }
  return data;
}

async function updateRef(reportId, ref) {
  const { error } = await supabase.from('reports').update({ etshwane_ref: ref }).eq('id', reportId);
  return !error;
}

async function insertVerification(streetlightId, reportId, name, phone) {
  const { data, error } = await supabase.from('verifications').insert({
    streetlight_id: streetlightId, report_id: reportId,
    verified_by_name: name, verified_by_phone: phone
  }).select().single();
  if (error) {
    if (error.code === '23505') { alert('You have already verified this light.'); return null; }
    console.error('Verify error:', error); return null;
  }
  return data;
}

async function resolveReport(reportId) {
  const { error } = await supabase.from('reports').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', reportId);
  return !error;
}

async function deleteLight(id) { const { error } = await supabase.from('streetlights').delete().eq('id', id); return !error; }

// ---- MapView (Google Maps) ----
function MapView({ lights, onMapClick, onMarkerClick, selectedId, flyTo }) {
  const mapRef = useRef(null);
  const mapI = useRef(null);
  const markers = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const cbRef = useRef({ click: onMapClick, marker: onMarkerClick });
  cbRef.current = { click: onMapClick, marker: onMarkerClick };

  useEffect(() => {
    if (mapI.current || !mapRef.current) return;
    const init = () => {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: -25.7400, lng: 28.3140 }, zoom: ZOOM,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
        disableDefaultUI: false, zoomControl: true, mapTypeControl: false,
        streetViewControl: false, fullscreenControl: false,
      });
      map.addListener('click', (e) => cbRef.current.click({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
      mapI.current = map;
      setMapReady(true);
    };
    if (window.google && window.google.maps) { init(); }
    else {
      const s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + GMAP_KEY;
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (mapI.current && flyTo) { mapI.current.panTo({ lat: flyTo.lat, lng: flyTo.lng }); mapI.current.setZoom(18); }
  }, [flyTo]);

  useEffect(() => {
    if (!mapReady || !mapI.current || !window.google) return;
    markers.current.forEach(m => m.setMap(null)); markers.current = [];
    lights.forEach(light => {
      const status = getStatus(light); const color = COLORS[status];
      const sel = light.id === selectedId; const sz = sel ? 14 : 9;
      const marker = new window.google.maps.Marker({
        position: { lat: light.lat, lng: light.lng }, map: mapI.current,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: sz, fillColor: color, fillOpacity: 1, strokeColor: sel ? '#1a1b23' : 'rgba(0,0,0,0.3)', strokeWeight: sel ? 3 : 2 },
        title: 'Pole ' + light.pole_number,
      });
      marker.addListener('click', () => cbRef.current.marker(light.id));
      markers.current.push(marker);
    });
  }, [lights, selectedId, mapReady]);

  return <div ref={mapRef} className="map-container" />;
}

// ---- SearchBar (Google Geocoding + existing poles) ----
function SearchBar({ onResult, onExisting, lights }) {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const timer = useRef(null);

  const doSearch = async (val) => {
    if (!val || val.trim().length < 2) { setSuggestions([]); return; }
    const poles = lights.filter(l =>
      l.pole_number.toLowerCase().includes(val.toLowerCase()) ||
      l.street_name.toLowerCase().includes(val.toLowerCase()) ||
      (l.street_number && l.street_number.includes(val))
    );
    const poleSugg = poles.slice(0,3).map(l => ({ type:'pole', id:l.id, label:'Pole '+l.pole_number, sub:l.street_name+(l.street_number?' '+l.street_number:'')+' '+(getStatus(l)==='working'?'✅':'🔴') }));
    if (val.trim().length < 3) { setSuggestions(poleSugg); return; }
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      const fullQ = (val.toLowerCase().includes('pretoria') || val.toLowerCase().includes('meyerspark')) ? val : val + ', Meyerspark, Pretoria, South Africa';
      try {
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode({ address: fullQ, region: 'za' }, (results, status) => {
            if (status === 'OK' && results.length > 0) resolve(results); else reject(status);
          });
        });
        const addrSugg = result.slice(0,3).map(r => ({ type:'addr', lat: r.geometry.location.lat(), lng: r.geometry.location.lng(), label: r.formatted_address.split(',')[0], sub: r.formatted_address.split(',').slice(0,3).join(',') }));
        setSuggestions([...poleSugg, ...addrSugg]);
      } catch { setSuggestions(poleSugg.length > 0 ? poleSugg : []); }
    } else { setSuggestions(poleSugg); }
  };

  const handleChange = (val) => {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(val), 400);
  };

  const handleSelect = (s) => {
    setQ(''); setSuggestions([]);
    if (s.type === 'pole') onExisting(s.id);
    else onResult(s.lat, s.lng, s.sub || s.label);
  };

  return (
    <div className="search-bar"><div style={{position:'relative'}}>
      <input placeholder="Search address or pole number..." value={q}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && suggestions.length) handleSelect(suggestions[0]); }}
        onBlur={() => setTimeout(() => setSuggestions([]), 200)} />
      {suggestions.length > 0 && <div className="search-suggestions">{suggestions.map((s,i) => (
        <div key={i} className="search-suggestion" onMouseDown={() => handleSelect(s)}>
          <div>{s.label}</div><div className="search-suggestion-sub">{s.sub}</div>
        </div>
      ))}</div>}
    </div></div>
  );
}

// ---- PhotoUpload ----
function PhotoUpload({ label, value, onChange }) {
  const ref = useRef(null);
  const handle = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 800/img.width); c.width = img.width*s; c.height = img.height*s; c.getContext('2d').drawImage(img,0,0,c.width,c.height); onChange(c.toDataURL('image/jpeg',0.7)); }; img.src = ev.target.result; }; r.readAsDataURL(f); };
  return (
    <div className="form-group"><label className="form-label">{label}</label>
      <div className="photo-upload" onClick={() => ref.current?.click()}>{value ? <img src={value} className="photo-preview" alt="" /> : <><div style={{fontSize:20,marginBottom:4}}>📷</div><div>Click to add photo</div></>}</div>
      <input ref={ref} type="file" accept="image/*" capture="environment" onChange={handle} style={{display:'none'}} />
      {value && <button className="btn-danger btn-sm" onClick={() => onChange(null)}>Remove</button>}
    </div>
  );
}

// ---- AddLightPanel ----
function AddLightPanel({ coords, onSave, onCancel, saving }) {
  const [f, setF] = useState({ poleNumber:'', streetName: coords.address || '', streetNumber:'', suburb:'Meyerspark', nearestIntersection:'', photo:null, isWorking:true, faultType:FAULT_TYPES[5], etshwaneRef:'', description:'' });
  const ok = f.poleNumber.trim() && f.streetName.trim();
  return (<>
    <div className="panel-header"><span className="panel-title">Add Streetlight</span><button className="btn-close" onClick={onCancel}>✕</button></div>
    <div className="panel-body">
      <div className="banner banner-success">📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
      <div className="form-group"><label className="form-label">Pole Number *</label><input className="form-input" placeholder="e.g. 3" value={f.poleNumber} onChange={e => setF({...f, poleNumber: e.target.value})} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Street Name *</label><input className="form-input" placeholder="e.g. Koordinaat St" value={f.streetName} onChange={e => setF({...f, streetName: e.target.value})} /></div>
        <div className="form-group" style={{maxWidth:100}}><label className="form-label">Number</label><input className="form-input" placeholder="342" value={f.streetNumber} onChange={e => setF({...f, streetNumber: e.target.value})} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Suburb</label><input className="form-input" value={f.suburb} onChange={e => setF({...f, suburb: e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Nearest Intersection</label><input className="form-input" placeholder="e.g. Asimptote St" value={f.nearestIntersection} onChange={e => setF({...f, nearestIntersection: e.target.value})} /></div>
      </div>
      <PhotoUpload label="Photo of Pole" value={f.photo} onChange={v => setF({...f, photo: v})} />
      <div className="form-group"><label className="form-label">Status</label>
        <div className="status-toggle">
          <button type="button" className={f.isWorking ? 'btn-primary' : 'btn-secondary'} onClick={() => setF({...f, isWorking:true})}>✅ Working</button>
          <button type="button" className={!f.isWorking ? 'btn-primary not-working-active' : 'btn-secondary'} onClick={() => setF({...f, isWorking:false})}>❌ Not Working</button>
        </div>
      </div>
      {!f.isWorking && (<>
        <div className="form-group"><label className="form-label">Fault Type *</label>
          <select className="form-select" value={f.faultType} onChange={e => setF({...f, faultType: e.target.value})}>{FAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
        </div>
        <div className="form-group"><label className="form-label">e-Tshwane Reference Number (auto-filled if left blank)</label><input className="form-input" placeholder="e.g. 6001397783" value={f.etshwaneRef} onChange={e => setF({...f, etshwaneRef: e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" placeholder="Optional details..." value={f.description} onChange={e => setF({...f, description: e.target.value})} /></div>
      </>)}
      <button className="btn-primary" disabled={!ok||saving} onClick={() => onSave(f)}>{saving ? 'Saving...' : 'Save Streetlight'}</button>
      <button className="btn-secondary" onClick={onCancel}>Cancel</button>
    </div>
  </>);
}

// ---- LightDetailPanel ----
function LightDetailPanel({ light, onClose, onUpdateStatus, onDelete, onVerify }) {
  const status = getStatus(light); const color = COLORS[status];
  const vCount = getVerifyCount(light);
  const lastReport = light.reports?.length ? light.reports[light.reports.length - 1] : null;
  const broken = lastReport && !lastReport.resolved ? daysSince(lastReport.reported_at) : 0;

  return (<>
    <div className="panel-header"><span className="panel-title">Pole {light.pole_number}</span><button className="btn-close" onClick={onClose}>✕</button></div>
    <div className="panel-body">
      <div className="detail-top">
        <span className="badge" style={{background:color+'22',color}}>{LABELS[status]}</span>
        {broken > 0 && <span className="badge" style={{background:'#ef444422',color:'#ef4444'}}>{broken} days broken</span>}
      </div>
      {light.photo_url && <img src={light.photo_url} className="photo-preview" alt="" />}
      <div className="detail-section">
        <div className="text-muted text-xs">Address</div>
        <div>{light.street_number ? light.street_number + ' ' : ''}{light.street_name}</div>
        <div className="text-muted">{light.suburb}{light.nearest_intersection ? ' • Near ' + light.nearest_intersection : ''}</div>
      </div>
      <div className="text-muted text-xs">GPS: {light.lat.toFixed(5)}, {light.lng.toFixed(5)}</div>
      <div className="divider" />

      {status === 'pending_verify' && (
        <div className="banner banner-info">
          <div>Verification: {vCount}/{VERIFY_NEEDED}</div>
          <div className="verify-progress" style={{justifyContent:'center'}}>
            {[0,1,2].map(i => <div key={i} className={'verify-dot' + (i < vCount ? ' filled' : '')}>{i < vCount ? '✓' : ''}</div>)}
          </div>
        </div>
      )}

      {status === 'working' && (
        <button className="btn-primary not-working-active" onClick={() => onUpdateStatus('not_working')}>🚨 Report as Not Working</button>
      )}

      {(status === 'not_working' || status === 'reported') && (
        <button className="btn-primary not-working-active" onClick={() => onUpdateStatus('not_working')}>🚨 Report Again (New Reference)</button>
      )}

      {(status === 'not_working' || status === 'reported' || status === 'pending_verify') && (
        <button className="btn-secondary" onClick={onVerify}>✅ Verify Fixed ({vCount}/{VERIFY_NEEDED})</button>
      )}

      <button className="btn-danger" onClick={onDelete}>Remove Streetlight</button>

      {light.reports && light.reports.length > 0 && (<>
        <div className="divider" /><div className="form-label">Report History ({light.reports.length})</div>
        {[...light.reports].reverse().map(r => (
          <div key={r.id} className="report-card">
            <div className="report-card-header">
              <span className="report-type">{r.fault_type}{r.is_rereport ? <span className="rereport-badge">Re-report</span> : ''}</span>
              <span className="text-muted text-xs">{new Date(r.reported_at).toLocaleDateString()}</span>
            </div>
            {r.description && <div className="report-notes">{r.description}</div>}
            {r.etshwane_ref && <div className="ref-number">Ref: {r.etshwane_ref}</div>}
            <div className="text-muted text-xs" style={{marginTop:4}}>
              {r.resolved ? 'Resolved ✓' : 'Open'}
            </div>
          </div>
        ))}
      </>)}
    </div>
  </>);
}

// ---- UpdateStatusPanel ----
function UpdateStatusPanel({ light, onBack, onSubmit, saving }) {
  const [f, setF] = useState({ faultType: FAULT_TYPES[5], etshwaneRef: '', description: '' });
  const isRereport = wasEverResolved(light.reports);
  const ok = true;
  return (<>
    <div className="panel-header"><div style={{display:'flex',alignItems:'center',gap:8}}><button className="btn-close" onClick={onBack}>←</button><span className="panel-title">Report — Pole {light.pole_number}</span></div></div>
    <div className="panel-body">
      {isRereport && <div className="banner banner-rereport">⚠️ RE-REPORT: This light was previously marked as fixed</div>}
      <div className="banner banner-info">Report this fault on e-Tshwane first, then enter the reference number below.</div>
      <button className="btn-etshwane" onClick={() => window.open('https://www.e-tshwane.co.za/lodge-query', '_blank')}>🏢 Open e-Tshwane Portal</button>
      <div className="divider" />
      <div className="form-group"><label className="form-label">Fault Type *</label>
        <select className="form-select" value={f.faultType} onChange={e => setF({...f, faultType: e.target.value})}>{FAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
      </div>
      <div className="form-group"><label className="form-label">e-Tshwane Reference Number (auto-filled if left blank)</label><input className="form-input" placeholder="e.g. 6001397783" value={f.etshwaneRef} onChange={e => setF({...f, etshwaneRef: e.target.value})} /></div>
      <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" placeholder="Optional details..." value={f.description} onChange={e => setF({...f, description: e.target.value})} /></div>
      <button className="btn-primary" disabled={!ok||saving} onClick={() => onSubmit({...f, isRereport})}>{saving ? 'Saving...' : '💾 Save Report'}</button>
    </div>
  </>);
}

// ---- RefEntryPanel ----
function RefEntryPanel({ report, onSave, onSkip }) {
  const [ref, setRef] = useState('');
  return (
    <div style={{padding:16}}>
      <div className="banner banner-info">📝 Enter the e-Tshwane reference number</div>
      <div className="ref-input-group">
        <input className="form-input" placeholder="e.g. 6001397783" value={ref} onChange={e => setRef(e.target.value)} />
        <button className="btn-primary" style={{width:'auto'}} disabled={!ref.trim()} onClick={() => onSave(ref.trim())}>Save</button>
      </div>
      <button className="btn-secondary" style={{marginTop:8}} onClick={onSkip}>Skip for now</button>
    </div>
  );
}

// ---- VerifyPanel ----
function VerifyPanel({ light, onBack, onVerified, saving }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const ok = name.trim() && phone.trim();
  return (<>
    <div className="panel-header"><div style={{display:'flex',alignItems:'center',gap:8}}><button className="btn-close" onClick={onBack}>←</button><span className="panel-title">Verify Fixed — Pole {light.pole_number}</span></div></div>
    <div className="panel-body">
      <div className="banner banner-success">Confirm this streetlight is now working</div>
      <div className="verify-progress" style={{justifyContent:'center',marginBottom:16}}>
        {[0,1,2].map(i => <div key={i} className={'verify-dot' + (i < getVerifyCount(light) ? ' filled' : '')}>{i < getVerifyCount(light) ? '✓' : ''}</div>)}
      </div>
      <div className="form-group"><label className="form-label">Your Name *</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Your Phone *</label><input className="form-input" placeholder="Used to prevent duplicate votes" value={phone} onChange={e => setPhone(e.target.value)} /></div>
      <button className="btn-primary" disabled={!ok||saving} onClick={() => onVerified(name, phone)}>{saving ? 'Verifying...' : '✅ Confirm Light is Working'}</button>
    </div>
  </>);
}

// ---- Dashboard ----
function Dashboard({ lights }) {
  const total = lights.length;
  const working = lights.filter(l => getStatus(l)==='working').length;
  const faulty = lights.filter(l => ['not_working','reported','pending_verify'].includes(getStatus(l))).length;
  const allReports = lights.flatMap(l => l.reports || []);
  const totalReports = allReports.length;
  const rereports = allReports.filter(r => r.is_rereport).length;
  const rereportRate = totalReports > 0 ? Math.round(rereports/totalReports*100) : 0;

  const brokenLights = lights.filter(l => { const s = getStatus(l); return s !== 'working'; }).map(l => {
    const firstFault = (l.reports||[]).find(r => !r.resolved);
    return { ...l, daysBroken: firstFault ? daysSince(firstFault.reported_at) : 0, reportCount: (l.reports||[]).length, refs: (l.reports||[]).filter(r => r.etshwane_ref).map(r => r.etshwane_ref) };
  }).sort((a,b) => b.daysBroken - a.daysBroken);

  const over30 = brokenLights.filter(l => l.daysBroken > 30).length;
  const over60 = brokenLights.filter(l => l.daysBroken > 60).length;
  const over90 = brokenLights.filter(l => l.daysBroken > 90).length;
  const avgDays = brokenLights.length ? Math.round(brokenLights.reduce((a,l) => a+l.daysBroken, 0) / brokenLights.length) : 0;

  const fc = {}; FAULT_TYPES.forEach(f => fc[f]=0);
  allReports.forEach(r => { if(fc[r.fault_type]!==undefined) fc[r.fault_type]++; });
  const mx = Math.max(1, ...Object.values(fc));

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Accountability Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{total}</div><div className="stat-label">Total Lights</div></div>
        <div className="stat-card"><div className="stat-value" style={{color:'#22c55e'}}>{working}</div><div className="stat-label">Working</div></div>
        <div className="stat-card"><div className="stat-value" style={{color:'#ef4444'}}>{faulty}</div><div className="stat-label">Faulty</div></div>
        <div className="stat-card"><div className="stat-value" style={{color:'#f97316'}}>{totalReports}</div><div className="stat-label">Total Reports</div></div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value" style={{color:'#ef4444'}}>{rereports}</div><div className="stat-label">Re-Reports</div></div>
        <div className="stat-card"><div className="stat-value" style={{color:'#ef4444'}}>{rereportRate}%</div><div className="stat-label">Re-Report Rate</div></div>
        <div className="stat-card"><div className="stat-value">{avgDays}</div><div className="stat-label">Avg Days Broken</div></div>
        <div className="stat-card"><div className="stat-value" style={{color:'#ef4444'}}>{over30}</div><div className="stat-label">&gt;30 Days Broken</div></div>
      </div>

      <div className="dashboard-section">
        <div className="form-label" style={{color:'#ef4444',fontSize:14}}>🚨 Shame Board — Longest Broken Lights</div>
        {brokenLights.length === 0 ? <div className="empty-state">No broken lights 🎉</div> :
          brokenLights.slice(0,10).map((l,i) => (
            <div key={l.id} className="shame-row">
              <div><span style={{color:'#71717a',marginRight:8}}>#{i+1}</span><strong>Pole {l.pole_number}</strong><div className="text-muted text-xs">{l.street_name} • {l.reportCount} reports</div>{l.refs.length > 0 && <div className="ref-number">Refs: {l.refs.join(', ')}</div>}</div>
              <div className="shame-days">{l.daysBroken}d</div>
            </div>
          ))
        }
      </div>

      <div className="dashboard-section">
        <div className="form-label">Fault Breakdown</div>
        {FAULT_TYPES.map(f => (
          <div key={f} className="bar-row"><div className="bar-header"><span className="text-muted">{f}</span><span className="bar-value">{fc[f]}</span></div><div className="bar-track"><div className="bar-fill" style={{width:(fc[f]/mx)*100+'%'}} /></div></div>
        ))}
      </div>
    </div>
  );
}

// ---- CSV Export ----
function exportCSV(lights) {
  const h = ['Pole','Street','Number','Suburb','Intersection','Lat','Lng','Status','Days Broken','Reports','Re-Reports','Ref Numbers'];
  const rows = lights.map(l => {
    const s = getStatus(l); const reps = l.reports||[];
    const firstFault = reps.find(r => !r.resolved);
    const days = firstFault ? daysSince(firstFault.reported_at) : 0;
    const reReps = reps.filter(r => r.is_rereport).length;
    const refs = reps.filter(r => r.etshwane_ref).map(r => r.etshwane_ref).join('; ');
    return [l.pole_number,'"'+l.street_name+'"',l.street_number||'',l.suburb||'','"'+(l.nearest_intersection||'')+'"',l.lat.toFixed(6),l.lng.toFixed(6),s,days,reps.length,reReps,'"'+refs+'"'].join(',');
  });
  const blob = new Blob([[h.join(','),...rows].join('\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'streetlights_accountability_'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
}

// ---- Main App ----
export default function App() {
  const [lights, setLights] = useState([]);
  const [view, setView] = useState('map');
  const [panel, setPanel] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flyTo, setFlyTo] = useState(null);
  const [pendingReport, setPendingReport] = useState(null);
  const [reporter, setReporter] = useState(() => {
    try { const s = localStorage.getItem('reporter-v2'); return s ? JSON.parse(s) : {name:'',surname:'',phone:'',email:''}; }
    catch { return {name:'',surname:'',phone:'',email:''}; }
  });

  const reload = async () => { const d = await fetchLights(); setLights(d); return d; };

  useEffect(() => { reload().then(() => { setLoading(false); setTimeout(() => setLights(l => [...l]), 500); }); }, []);
  useEffect(() => {
    const ch = supabase.channel('rt2')
      .on('postgres_changes',{event:'*',schema:'public',table:'streetlights'},() => reload())
      .on('postgres_changes',{event:'*',schema:'public',table:'reports'},() => reload())
      .on('postgres_changes',{event:'*',schema:'public',table:'verifications'},() => reload())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const handleMapClick = useCallback(coords => { if(panel?.type==='report'||panel?.type==='verify') return; setPanel({type:'add',data:coords}); setSelectedId(null); }, [panel]);
  const handleMarkerClick = useCallback(id => { const l=lights.find(x=>x.id===id); if(l){setPanel({type:'detail',data:l});setSelectedId(id);} }, [lights]);
  const goToLight = (id) => { const l=lights.find(x=>x.id===id); if(l){setFlyTo({lat:l.lat,lng:l.lng});setPanel({type:'detail',data:l});setSelectedId(id);} };

  const handleSaveLight = async (form) => {
    setSaving(true);
    const nl = await insertLight({...form, lat: panel.data.lat, lng: panel.data.lng});
    if (nl && !form.isWorking) {
      await insertReport(nl.id, { faultType: form.faultType, description: form.description || null, reporterName: 'Community', reporterSurname: '', reporterPhone: '-', reporterEmail: '', emailSent: false }, false);
      if (form.etshwaneRef) {
        const reps = await supabase.from('reports').select().eq('streetlight_id', nl.id).order('reported_at', { ascending: false }).limit(1);
        if (reps.data && reps.data[0]) await updateRef(reps.data[0].id, form.etshwaneRef);
      }
    }
    const upd = await reload(); setSaving(false);
    if (nl) { const ul=upd.find(l=>l.id===nl.id); if(ul){setPanel({type:'detail',data:ul});setSelectedId(ul.id);} }
  };

  const handleReport = async (form) => {
    setSaving(true);
    const isRR = form.isRereport || false;
    const r = await insertReport(selectedId, { faultType: form.faultType, description: form.description || null, reporterName: 'Community', reporterSurname: '', reporterPhone: '-', reporterEmail: '', emailSent: false }, isRR);
    if (r && form.etshwaneRef) { await updateRef(r.id, form.etshwaneRef); }
    const upd = await reload(); setSaving(false);
    const ul = upd.find(l=>l.id===selectedId);
    if(ul) setPanel({type:'detail',data:ul});
  };

  const handleSaveRef = async (ref) => {
    if (pendingReport) { await updateRef(pendingReport.id, ref); }
    setPendingReport(null);
    const upd = await reload();
    const ul = upd.find(l=>l.id===selectedId);
    if(ul) setPanel({type:'detail',data:ul});
  };

  const handleSkipRef = async () => {
    setPendingReport(null);
    const upd = await reload();
    const ul = upd.find(l=>l.id===selectedId);
    if(ul) setPanel({type:'detail',data:ul});
  };

  const handleVerify = async (name, phone) => {
    const light = panel.data;
    const lastReport = light.reports[light.reports.length - 1];
    if (!lastReport) return;
    setSaving(true);
    const v = await insertVerification(light.id, lastReport.id, name, phone);
    if (v) {
      const currentCount = (light.verifications||[]).filter(x=>x.report_id===lastReport.id).length + 1;
      if (currentCount >= VERIFY_NEEDED) { await resolveReport(lastReport.id); }
    }
    const upd = await reload(); setSaving(false);
    const ul = upd.find(l=>l.id===light.id);
    if(ul) { setPanel({type:'detail',data:ul}); }
  };

  const handleDelete = async (id) => { if(!window.confirm('Remove this streetlight?')) return; if(await deleteLight(id)){await reload();setPanel(null);setSelectedId(null);} };

  if (loading) return <div className="loading-screen"><div className="logo-icon">💡</div><div className="text-muted">Loading...</div></div>;

  return (
    <div className="app">
      <header className="header">
        <div className="logo"><div className="logo-icon">💡</div><div><div className="logo-text">Streetlight Reporter</div><div className="logo-sub">Meyerspark • City of Tshwane</div></div></div>
        <nav className="nav-btns">
          <button className={'nav-btn'+(view==='map'?' active':'')} onClick={()=>setView('map')}>🗺 Map</button>
          <button className={'nav-btn'+(view==='dashboard'?' active':'')} onClick={()=>setView('dashboard')}>📊 Dashboard</button>
        </nav>
      </header>
      <main className="body">
        {view === 'map' ? (<>
          <div className="map-area">
            <SearchBar onResult={(lat,lng,addr) => {setFlyTo({lat,lng});setPanel({type:'add',data:{lat,lng,address:addr}});setSelectedId(null);}} onExisting={goToLight} lights={lights} />
            <MapView lights={lights} onMapClick={handleMapClick} onMarkerClick={handleMarkerClick} selectedId={selectedId} flyTo={flyTo} />
            <div className="legend">{Object.entries(COLORS).map(([k,c])=>(<div key={k} className="legend-item"><div className="legend-dot" style={{background:c}} />{LABELS[k]}</div>))}<div className="legend-item"><strong style={{color:'#1a1b23'}}>{lights.length}</strong> total</div></div>
          </div>
          {panel && <aside className="panel">
            {panel.type==='add' && <AddLightPanel coords={panel.data} onSave={handleSaveLight} onCancel={()=>{setPanel(null);setSelectedId(null)}} saving={saving} />}
            {panel.type==='detail' && <LightDetailPanel light={panel.data} onClose={()=>{setPanel(null);setSelectedId(null)}} onUpdateStatus={() => setPanel({type:'updatestatus',data:panel.data})} onDelete={()=>handleDelete(panel.data.id)} onVerify={()=>setPanel({type:'verify',data:panel.data})} />}
            {panel.type==='updatestatus' && <UpdateStatusPanel light={panel.data} onBack={()=>setPanel({type:'detail',data:panel.data})} onSubmit={handleReport} saving={saving} />}
            {panel.type==='verify' && <VerifyPanel light={panel.data} onBack={()=>setPanel({type:'detail',data:panel.data})} onVerified={handleVerify} saving={saving} />}
          </aside>}
        </>) : <Dashboard lights={lights} />}
      </main>
    </div>
  );
}
