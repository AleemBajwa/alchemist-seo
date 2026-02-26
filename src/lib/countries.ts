/**
 * ISO 3166-1 alpha-2 to DataForSEO location_code mapping.
 * DataForSEO uses location_code = ISO numeric + 2000 for most countries.
 * Some explicit overrides from DataForSEO docs (e.g. Sweden, Denmark) are set.
 * Russia (ru) and Belarus (by) are excluded per DataForSEO policy.
 */

export type CountryOption = { value: string; label: string; locationCode: number };

/** Explicit DataForSEO location codes (from API/docs) - override formula where different */
const EXPLICIT_LOCATION_CODES: Record<string, number> = {
  us: 2840,
  uk: 2826,
  ca: 2124,
  au: 2036,
  de: 2276,
  fr: 2250,
  it: 2380,
  es: 2724,
  nl: 2528,
  se: 2518,
  no: 2578,
  dk: 2148,
  pl: 2616,
  br: 2076,
  mx: 2514,
  ar: 2032,
  in: 2356,
  jp: 2392,
  kr: 2410,
  sg: 2702,
  ae: 2784,
  za: 2710,
  nz: 2554,
};

/** ISO 3166-1 alpha-2 to numeric (for countries not in explicit map). location_code = numeric + 2000 */
const ISO_NUMERIC: Record<string, number> = {
  af: 4, al: 8, dz: 12, ad: 20, ao: 24, ag: 28, am: 51, at: 40, az: 31, bs: 44, bh: 48,
  bd: 50, bb: 52, be: 56, bz: 84, bj: 204, bt: 64, bo: 68, ba: 70,
  bw: 72, bn: 96, bg: 100, bf: 854, bi: 108, cv: 132, kh: 116, cn: 156,
  cm: 120, ky: 136, cf: 140, td: 148, cl: 152, cx: 162, cc: 166, co: 170, km: 174,
  cg: 178, cd: 180, ck: 184, cr: 188, ci: 384, hr: 191, cu: 192, cy: 196, cz: 203,
  dj: 262, dm: 212, do: 214, ec: 218, eg: 818, sv: 222, gq: 226, er: 232, ee: 233,
  sz: 748, et: 231, fk: 238, fo: 234, fj: 242, fi: 246, gf: 254, pf: 258, tf: 260,
  ga: 266, gm: 270, ge: 268, gh: 288, gi: 292, gr: 300, gl: 304, gd: 308, gp: 312,
  gu: 316, gt: 320, gg: 831, gn: 324, gw: 624, gy: 328, ht: 332, hm: 334, va: 336,
  hn: 340, hk: 344, hu: 348, is: 352, id: 360, ir: 364, iq: 368, ie: 372, im: 833,
  il: 376, jm: 388, je: 832, jo: 400, kz: 398, ke: 404, ki: 296, kp: 408, kw: 414,
  kg: 417, la: 418, lv: 428, lb: 422, ls: 426, lr: 430, ly: 434, li: 438, lt: 440,
  lu: 442, mo: 446, mg: 450, mw: 454, my: 458, mv: 462, ml: 466, mt: 470, mh: 584,
  mq: 474, mr: 478, mu: 480, yt: 175, mx: 484, fm: 583, md: 498, mc: 492, mn: 496,
  me: 499, ms: 500, ma: 504, mz: 508, mm: 104, na: 516, nr: 520, np: 524, nc: 540,
  ni: 558, ne: 562, ng: 566, nu: 570, nf: 574, mk: 807, mp: 580, om: 512, pk: 586,
  pw: 585, ps: 275, pa: 591, pg: 598, py: 600, pe: 604, ph: 608, pn: 612, pt: 620,
  pr: 630, qa: 634, re: 638, ro: 642, ru: 643, rw: 646, bl: 652, sh: 654, kn: 659,
  lc: 662, mf: 663, pm: 666, vc: 670, ws: 882, sm: 674, st: 678, sa: 682, sn: 686,
  rs: 688, sc: 690, sl: 694, sx: 534, sk: 703, si: 705, sb: 90, so: 706, za: 710,
  gs: 239, ss: 728, lk: 144, sd: 729, sr: 740, sj: 744, ch: 756, sy: 760, tw: 158,
  tj: 762, tz: 834, th: 764, tl: 626, tg: 768, tk: 772, to: 776, tt: 780, tn: 788,
  tr: 792, tm: 795, tc: 796, tv: 798, ug: 800, ua: 804, ae: 784, gb: 826, um: 581,
  us: 840, uy: 858, uz: 860, vu: 548, ve: 862, vn: 704, vg: 92, vi: 850, wf: 876,
  eh: 732, ye: 887, zm: 894, zw: 716,
};

/** Countries to exclude (DataForSEO no longer supports) */
const EXCLUDED = new Set(["ru", "by"]);

function getLocationCode(alpha2: string): number | null {
  if (EXCLUDED.has(alpha2.toLowerCase())) return null;
  const lower = alpha2.toLowerCase();
  if (EXPLICIT_LOCATION_CODES[lower] != null) return EXPLICIT_LOCATION_CODES[lower];
  const numeric = ISO_NUMERIC[lower];
  if (numeric != null) return numeric + 2000;
  return null;
}

/** Full country list: ISO alpha-2 + English name. Sorted by name. */
const COUNTRY_NAMES: [string, string][] = [
  ["af", "Afghanistan"], ["al", "Albania"], ["dz", "Algeria"], ["ad", "Andorra"], ["ao", "Angola"],
  ["ag", "Antigua and Barbuda"], ["ar", "Argentina"], ["am", "Armenia"], ["au", "Australia"],
  ["at", "Austria"], ["az", "Azerbaijan"], ["bs", "Bahamas"], ["bh", "Bahrain"], ["bd", "Bangladesh"],
  ["bb", "Barbados"], ["be", "Belgium"], ["bz", "Belize"], ["bj", "Benin"], ["bt", "Bhutan"],
  ["bo", "Bolivia"], ["ba", "Bosnia and Herzegovina"], ["bw", "Botswana"], ["br", "Brazil"],
  ["bn", "Brunei"], ["bg", "Bulgaria"], ["bf", "Burkina Faso"], ["bi", "Burundi"], ["kh", "Cambodia"],
  ["cm", "Cameroon"], ["ca", "Canada"], ["cv", "Cape Verde"], ["cf", "Central African Republic"],
  ["td", "Chad"], ["cl", "Chile"], ["cn", "China"], ["co", "Colombia"], ["km", "Comoros"],
  ["cg", "Congo"], ["cd", "DR Congo"], ["cr", "Costa Rica"], ["ci", "Côte d'Ivoire"], ["hr", "Croatia"],
  ["cu", "Cuba"], ["cy", "Cyprus"], ["cz", "Czech Republic"], ["dk", "Denmark"], ["dj", "Djibouti"],
  ["dm", "Dominica"], ["do", "Dominican Republic"], ["ec", "Ecuador"], ["eg", "Egypt"],
  ["sv", "El Salvador"], ["gq", "Equatorial Guinea"], ["er", "Eritrea"], ["ee", "Estonia"],
  ["sz", "Eswatini"], ["et", "Ethiopia"], ["fj", "Fiji"], ["fi", "Finland"], ["fr", "France"],
  ["ga", "Gabon"], ["gm", "Gambia"], ["ge", "Georgia"], ["de", "Germany"], ["gh", "Ghana"],
  ["gr", "Greece"], ["gd", "Grenada"], ["gt", "Guatemala"], ["gn", "Guinea"], ["gw", "Guinea-Bissau"],
  ["gy", "Guyana"], ["ht", "Haiti"], ["hn", "Honduras"], ["hk", "Hong Kong"], ["hu", "Hungary"],
  ["is", "Iceland"], ["in", "India"], ["id", "Indonesia"], ["ir", "Iran"], ["iq", "Iraq"],
  ["ie", "Ireland"], ["il", "Israel"], ["it", "Italy"], ["jm", "Jamaica"], ["jp", "Japan"],
  ["jo", "Jordan"], ["kz", "Kazakhstan"], ["ke", "Kenya"], ["ki", "Kiribati"], ["kp", "North Korea"],
  ["kr", "South Korea"], ["kw", "Kuwait"], ["kg", "Kyrgyzstan"], ["la", "Laos"], ["lv", "Latvia"],
  ["lb", "Lebanon"], ["ls", "Lesotho"], ["lr", "Liberia"], ["ly", "Libya"], ["li", "Liechtenstein"],
  ["lt", "Lithuania"], ["lu", "Luxembourg"], ["mo", "Macau"], ["mg", "Madagascar"], ["mw", "Malawi"],
  ["my", "Malaysia"], ["mv", "Maldives"], ["ml", "Mali"], ["mt", "Malta"], ["mh", "Marshall Islands"],
  ["mr", "Mauritania"], ["mu", "Mauritius"], ["mx", "Mexico"], ["fm", "Micronesia"], ["md", "Moldova"],
  ["mc", "Monaco"], ["mn", "Mongolia"], ["me", "Montenegro"], ["ma", "Morocco"], ["mz", "Mozambique"],
  ["mm", "Myanmar"], ["na", "Namibia"], ["nr", "Nauru"], ["np", "Nepal"], ["nl", "Netherlands"],
  ["nz", "New Zealand"], ["ni", "Nicaragua"], ["ne", "Niger"], ["ng", "Nigeria"], ["mk", "North Macedonia"],
  ["no", "Norway"], ["om", "Oman"], ["pk", "Pakistan"], ["pw", "Palau"], ["ps", "Palestine"],
  ["pa", "Panama"], ["pg", "Papua New Guinea"], ["py", "Paraguay"], ["pe", "Peru"], ["ph", "Philippines"],
  ["pl", "Poland"], ["pt", "Portugal"], ["qa", "Qatar"], ["ro", "Romania"], ["rw", "Rwanda"],
  ["kn", "Saint Kitts and Nevis"], ["lc", "Saint Lucia"], ["vc", "Saint Vincent and the Grenadines"],
  ["ws", "Samoa"], ["sm", "San Marino"], ["st", "São Tomé and Príncipe"], ["sa", "Saudi Arabia"],
  ["sn", "Senegal"], ["rs", "Serbia"], ["sc", "Seychelles"], ["sl", "Sierra Leone"], ["sg", "Singapore"],
  ["sk", "Slovakia"], ["si", "Slovenia"], ["sb", "Solomon Islands"], ["so", "Somalia"], ["za", "South Africa"],
  ["ss", "South Sudan"], ["es", "Spain"], ["lk", "Sri Lanka"], ["sd", "Sudan"], ["sr", "Suriname"],
  ["se", "Sweden"], ["ch", "Switzerland"], ["sy", "Syria"], ["tw", "Taiwan"], ["tj", "Tajikistan"],
  ["tz", "Tanzania"], ["th", "Thailand"], ["tl", "Timor-Leste"], ["tg", "Togo"], ["to", "Tonga"],
  ["tt", "Trinidad and Tobago"], ["tn", "Tunisia"], ["tr", "Turkey"], ["tm", "Turkmenistan"], ["tv", "Tuvalu"],
  ["ug", "Uganda"], ["ua", "Ukraine"], ["ae", "United Arab Emirates"], ["gb", "United Kingdom"],
  ["uk", "United Kingdom"], ["us", "United States"], ["uy", "Uruguay"], ["uz", "Uzbekistan"],
  ["vu", "Vanuatu"], ["ve", "Venezuela"], ["vn", "Vietnam"], ["ye", "Yemen"], ["zm", "Zambia"], ["zw", "Zimbabwe"],
];

export function getAllCountries(): CountryOption[] {
  const seen = new Set<string>();
  const result: CountryOption[] = [];
  for (const [code, name] of COUNTRY_NAMES) {
    const lower = code.toLowerCase();
    if (seen.has(lower)) continue;
    const loc = getLocationCode(lower);
    if (loc == null) continue;
    seen.add(lower);
    result.push({ value: lower, label: name, locationCode: loc });
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function getCountryLocationCode(country: string): number {
  const loc = getLocationCode(country.toLowerCase());
  return loc ?? EXPLICIT_LOCATION_CODES.us;
}
