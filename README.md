# Community Service Delivery Tracker

A community-driven web app for reporting and tracking service delivery faults (e.g. streetlights) in a municipal ward. Residents can add infrastructure items to a map, report faults, submit reference numbers, and verify when issues are resolved.

Built with React + Vite, Supabase (database), and Google Maps.

---

## Features

- Interactive map with colour-coded status markers
- Address search restricted to your ward boundary
- Fault reporting with reporter details for municipal submission
- e-Tshwane / municipal reference number tracking
- Community verification when faults are resolved
- Accountability dashboard with shame board
- 7-day (configurable) cooldown between re-reports
- Auto-deploy via GitHub Actions to Cloudflare Workers

---

## Setup for a New Ward

### 1. Prerequisites

- [Node.js](https://nodejs.org) v20+
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Google Cloud](https://console.cloud.google.com) account with billing enabled
- A [Cloudflare](https://cloudflare.com) account (free tier is fine)
- A GitHub account

---

### 2. Clone the repo

```bash
git clone https://github.com/smepulse-ai/streetlight-reporter.git my-ward
cd my-ward
npm install
```

---

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. In the SQL editor, create these three tables:

```sql
create table streetlights (
  id uuid primary key default gen_random_uuid(),
  pole_number text not null,
  street_name text not null,
  street_number text,
  suburb text,
  nearest_intersection text,
  lat double precision not null,
  lng double precision not null,
  photo_url text,
  created_at timestamptz default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  streetlight_id uuid references streetlights(id) on delete cascade,
  fault_type text,
  description text,
  photo_url text,
  reporter_name text,
  reporter_surname text,
  reporter_phone text,
  reporter_email text,
  email_sent boolean default false,
  is_rereport boolean default false,
  etshwane_ref text,
  reported_at timestamptz default now(),
  resolved boolean default false,
  resolved_at timestamptz
);

create table verifications (
  id uuid primary key default gen_random_uuid(),
  streetlight_id uuid references streetlights(id) on delete cascade,
  report_id uuid references reports(id) on delete cascade,
  verified_by_name text,
  verified_by_phone text,
  verified_at timestamptz default now(),
  unique(report_id, verified_by_phone)
);
```

3. Enable Row Level Security (RLS) on all three tables and add these policies:

**streetlights:** SELECT (public), INSERT (public)
**reports:** SELECT (public), INSERT (public), UPDATE (public)
**verifications:** SELECT (public), INSERT (public)

4. Note your **Project URL** and **Publishable (anon) key** from Settings → API.

---

### 4. Set up Google Maps

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Maps JavaScript API** and **Geocoding API**
3. Create an API key and restrict it to:
   - **HTTP referrers:** your deployed domain + `http://localhost:5173/*`
   - **APIs:** Maps JavaScript API, Geocoding API only
4. Set a billing alert under Billing → Budgets & Alerts

---

### 5. Configure your ward

Edit `src/ward.config.js`:

```js
const config = {
  appName: 'Community Service Delivery Tracker',
  wardName: 'Ward XX',               // your ward name
  municipality: 'Your Municipality',

  defaultSuburb: 'Your Suburb',
  defaultCity: 'Your City',
  defaultCountry: 'South Africa',

  map: {
    center: { lat: -25.7461, lng: 28.2881 },  // map starting coordinates
    zoom: 15,
  },

  boundary: {
    // Bounding box for your ward — addresses outside this are rejected
    // Use Google Maps to find coordinates: right-click any point → "What's here?"
    north: -25.720,
    south: -25.760,
    east:  28.340,
    west:  28.290,
  },

  reporting: {
    cooldownDays: 7,               // days before a re-report is allowed
    verificationsNeeded: 1,        // verifications needed to mark as fixed
    email: 'faults@yourmuni.gov.za', // municipal email for fault reports
    faultTypes: [
      'Area Fault',
      'Damaged Pole',
      // add or remove fault types as needed
    ],
  },
};
```

**Finding your ward boundary coordinates:**
1. Open Google Maps
2. Right-click the north-most point of your ward → copy coordinates
3. Repeat for south, east, and west extremes

---

### 6. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GMAP_KEY=your-google-maps-key
```

Never commit `.env.local` — it is git-ignored.

---

### 7. Test locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

### 8. Deploy to Cloudflare Workers

1. Create a Cloudflare account and a new Workers project connected to your GitHub repo
2. Create a Cloudflare API token (Edit Cloudflare Workers template)
3. Add these secrets to your GitHub repo under Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `VITE_GMAP_KEY` | your Google Maps API key |
| `CLOUDFLARE_API_TOKEN` | your Cloudflare API token |

4. Push to `main` — GitHub Actions will build and deploy automatically.
5. Add your custom domain in Cloudflare Workers → your project → Custom Domains.

---

## How it works

| Status | Colour | Meaning |
|--------|--------|---------|
| Working | Green | No open fault reports |
| Not Working | Red | Fault reported, cooldown expired (can re-report) |
| Reported | Orange | Fault reported, within cooldown window |
| Pending Verification | Yellow | Fixed by municipality, awaiting community verification |

**Status is calculated from the reports and verifications history — it is never stored directly on the record.** This preserves the full accountability trail.

---

## License

MIT — free to use, modify, and deploy for your ward.
