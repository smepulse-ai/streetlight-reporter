# Community Service Delivery Tracker

A community-driven web app for reporting and tracking municipal service delivery faults. Residents can log faults on a map, track municipal reference numbers, and verify when issues are resolved.

Built for **City of Tshwane Wards** and designed to be deployed for any municipal ward in City of Tshwane.

> **Municipal Compatibility**
> This template was developed and tested against the **City of Tshwane e-Tshwane reporting portal**. For other municipalities, customisation or additional development may be required at an additional fee. Your municipality must support electronic fault submissions for the automated reporting features to function.

---

## Features

- Interactive map with colour-coded fault markers
- Address search restricted to your ward boundary
- Fault reporting with municipal reference number tracking
- Community verification when faults are resolved
- Accountability dashboard and shame board
- Configurable per ward — name, boundary, fault types, cooldown period

---


## Setup

This project requires the following — (We do not provide hosted services yet, for now you will be required to sign up and make direct payment to the individual providers) :
The developers are in no way financially responsible for any of the services you use and the providers could at any time change their respective billing models.

- Cloudflare — hosting (free tier at time of writing - https://www.cloudflare.com/plans/free/)
- Domain name — your ward's web address (annual domain renewal ~ R100 per year)
- GitHub — CI/CD via GitHub Actions (free tier at time of writing - https://docs.github.com/get-started/learning-about-github/githubs-products)
- Google Maps API — geocoding + map display (Essentials: Up to 10,000 free calls per SKU per month - https://mapsplatform.google.com/)
- Supabase — database (free tier at time of writing. Limits apply - https://supabase.com/pricing)
- VPS server hosted in South Africa — automated municipal fault submission (monthly server cost ~ R100 per month)

**Need help setting this up for your ward?** Get in touch — we offer a done-for-you setup service.
📧 [smepulseai@gmail.com](mailto:smepulseai@gmail.com)

| Service | Cost |
|---------|------|
| Once-off ward setup | R2,500.00 no VAT |
| Software support & updates | R350.00 no VAT |

* Support covers the application software and updates only.
* Bug fixes will not be charged.
* Third-party infrastructure (VPS, domain, Google Maps, Supabase, Cloudflare) is the responsibility of the ward and is not included. The developer will not get involved in, or support billing disputes.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned phases.

---

## License

MIT — see [LICENSE](LICENSE).
