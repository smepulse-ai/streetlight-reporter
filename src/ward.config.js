const config = {
  // Branding
  appName: 'Community Service Delivery Tracker',
  wardName: 'Ward 41',
  municipality: 'City of Tshwane',

  // Default location details used in geocoding and form defaults
  defaultSuburb: 'Meyerspark',
  defaultCity: 'Pretoria',
  defaultCountry: 'South Africa',

  // Map starting position
  map: {
    center: { lat: -25.7461, lng: 28.2881 },
    zoom: 15,
  },

  // Search boundary — addresses outside this box are rejected
  boundary: {
    north: -25.720,
    south: -25.760,
    east:  28.340,
    west:  28.290,
  },

  // Reporting settings
  reporting: {
    cooldownDays: 7,
    verificationsNeeded: 1,
    email: 'streetlights@tshwane.gov.za',
    faultTypes: [
      'Area Fault',
      'Damaged Pole',
      'High mast Light out (Apollo)',
      'Lights Flickering',
      'Lights on 24/7',
      'Single Light Fault',
      'Damaged high-mast pole',
    ],
  },
};

export default config;
