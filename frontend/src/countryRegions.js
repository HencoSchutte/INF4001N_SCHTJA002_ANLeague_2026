export const countryRegionMap = {
  // NORTH AFRICA
  "Algeria": "North",
  "Egypt": "North",
  "Morocco": "North",
  "Tunisia": "North",
  "Libya": "North",
  "Sudan": "North",

  // WEST AFRICA
  "Senegal": "West",
  "Ghana": "West",
  "Nigeria": "West",
  "Mali": "West",
  "Ivory Coast": "West",
  "Burkina Faso": "West",
  "Guinea": "West",
  "Cape Verde": "West",
  "Gambia": "West",
  "Togo": "West",
  "Benin": "West",
  "Sierra Leone": "West",
  "Liberia": "West",
  "Niger": "West",
  "Mauritania": "West",
  "Guinea-Bissau": "West",

  // CENTRAL AFRICA
  "Cameroon": "Central",
  "DR Congo": "Central",
  "Congo": "Central",
  "Gabon": "Central",
  "Equatorial Guinea": "Central",
  "Central African Republic": "Central",
  "Chad": "Central",

  // EAST AFRICA
  "Kenya": "East",
  "Uganda": "East",
  "Tanzania": "East",
  "Ethiopia": "East",
  "Rwanda": "East",
  "Burundi": "East",
  "South Sudan": "East",
  "Somalia": "East",
  "Eritrea": "East",
  "Djibouti": "East",

  // SOUTHERN AFRICA
  "South Africa": "South",
  "Botswana": "South",
  "Namibia": "South",
  "Zimbabwe": "South",
  "Zambia": "South",
  "Angola": "South",
  "Mozambique": "South",
  "Lesotho": "South",
  "Eswatini": "South",
  "Malawi": "South",
  "Madagascar": "South",
  "Seychelles": "South",
  "Mauritius": "South",
  "Comoros": "South",

  // fallback catch — all others default Africa
};

export function getRegion(country) {
  return countryRegionMap[country] || "Africa";
}
