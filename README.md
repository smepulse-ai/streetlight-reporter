# Community Service Delivery Tracker

A community-driven web app for reporting and tracking municipal service delivery faults. Residents can log faults on a map, track municipal reference numbers, and verify when issues are resolved.

Built for **City of Tshwane Ward 41** and designed to be deployed for any municipal ward.

> **Note:** This template was developed against the **City of Tshwane e-Tshwane reporting portal**. Other municipalities may require customisation.

---

## Features

- Interactive map with colour-coded fault markers
- Address search restricted to your ward boundary
- Fault reporting with municipal reference number tracking
- Community verification when faults are resolved
- Accountability dashboard and shame board
- Configurable per ward — name, boundary, fault types, cooldown period

---

## Tech Stack

- React + Vite
- Supabase (database)
- Google Maps (geocoding + display)
- Cloudflare Workers (hosting)
- GitHub Actions (CI/CD)

---

## Setup

This project requires the following — all under your own accounts and billing:

- Supabase — database (free tier at time of writing)
- Google Maps API — geocoding + map display (free tier at time of writing)
- Cloudflare — hosting (free tier at time of writing)
- GitHub — CI/CD via GitHub Actions (free tier at time of writing)
- VPS server — automated municipal fault submission (monthly cost)
- Domain name — your ward's web address (annual renewal)

A `ward.config.js` file controls all ward-specific settings.

**Need help setting this up for your ward?** Get in touch — we offer a done-for-you setup service.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned phases.

---

## License

MIT — see [LICENSE](LICENSE).
