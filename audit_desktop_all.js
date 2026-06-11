const fs = require('fs');
const path = require('path');

// 1. Read destinations.js to get the destinations data
const dataJs = fs.readFileSync('data/destinations.js', 'utf8');
let destinations = [];
try {
  const window = {};
  eval(dataJs);
  destinations = window.JOSM_DESTINATIONS || [];
} catch (e) {
  console.error('Failed to load destinations:', e);
  process.exit(1);
}

const vm = require('vm');
const mapJs = fs.readFileSync('map.js', 'utf8');

const sandbox = {
  window: { JOSM_DESTINATIONS: destinations },
  destinations: destinations,
  L: {
    latLngBounds: () => ({ extend: () => {} }),
    marker: () => ({ getLatLng: () => ({}) }),
    icon: () => ({}),
    map: () => ({
      setView: () => {},
      fitBounds: () => {},
      addLayer: () => {},
      on: () => {}
    }),
    tileLayer: () => ({ addTo: () => {} }),
    geoJSON: () => ({ addTo: () => {} }),
    featureGroup: () => ({ addTo: () => {} }),
    Browser: { mobile: false }
  },
  document: {
    addEventListener: () => {},
    querySelector: () => ({ addEventListener: () => {}, setAttribute: () => {}, classList: { toggle: () => {} } }),
    querySelectorAll: () => [],
    getElementById: () => ({ addEventListener: () => {} }),
    createElement: () => ({})
  },
  navigator: { userAgent: '' },
  lucide: { createIcons: () => {} },
  console: console
};

// Bind functions to global scope of our eval context
try {
  const sandboxCode = `
    const window = this.window;
    const destinations = this.destinations;
    const L = this.L;
    const document = this.document;
    const navigator = this.navigator;
    const lucide = this.lucide;
    
    ${mapJs}
    
    // Export functions we want to test
    this.cleanText = cleanText;
    this.ensurePeriod = ensurePeriod;
    this.trimAtWord = trimAtWord;
    this.firstSentenceOrTrim = firstSentenceOrTrim;
    this.inferMobilePlaceType = inferMobilePlaceType;
    this.getDesktopFallbackDescription = getDesktopFallbackDescription;
    this.isBrokenDesktopDescription = isBrokenDesktopDescription;
    this.isAwkwardDesktopEnding = isAwkwardDesktopEnding;
    this.isAwkwardDesktopPhrase = isAwkwardDesktopPhrase;
    this.getPopupDescription = getPopupDescription;
    this.getMobileDetailDescription = getMobileDetailDescription;
    this.getCategoryFallbackDescription = getCategoryFallbackDescription;
  `;
  
  vm.runInNewContext(sandboxCode, sandbox);
} catch (e) {
  console.error('Failed to eval map.js:', e);
  process.exit(1);
}

// Extract the evaluated functions from the context object
const {
  cleanText,
  ensurePeriod,
  trimAtWord,
  firstSentenceOrTrim,
  inferMobilePlaceType,
  getDesktopFallbackDescription,
  isBrokenDesktopDescription,
  isAwkwardDesktopEnding,
  isAwkwardDesktopPhrase,
  getPopupDescription,
  getMobileDetailDescription,
  getCategoryFallbackDescription
} = sandbox;

// 3. QC validation rule helper
function qcValidate(text) {
  if (!text) return { pass: false, reason: 'Text is empty/null' };
  if (text.length < 60) return { pass: false, reason: `Too short (${text.length} chars, min 60)` };
  if (text.length > 170) return { pass: false, reason: `Too long (${text.length} chars, max 170)` };
  if (text.includes('...') || text.includes('\u2026')) return { pass: false, reason: 'Contains ellipsis (...)' };
  if (!/[.!?]$/.test(text.trim())) return { pass: false, reason: 'Does not end with a period' };
  
  // Check numbers/symbols ending (e.g. ±1.)
  if (/[0-9±°+\-][.?!]$/.test(text.trim())) return { pass: false, reason: 'Ends with number/symbol' };
  
  // Check awkward phrases
  const lower = text.toLowerCase();
  const badPhrases = ['oligo-miosen', 'umur tersier', 'juta tahun yang lalu'];
  for (const p of badPhrases) {
    if (lower.includes(p)) return { pass: false, reason: `Contains awkward phrase: "${p}"` };
  }
  
  // Check awkward ending words/phrases
  const cleaned = text.trim().replace(/[.!?\s\u2026]+$/, '');
  const words = cleaned.split(/\s+/);
  if (words.length > 0) {
    const lastWord = words[words.length - 1].toLowerCase();
    const badWords = [
      'yang', 'masih', 'dengan', 'dan', 'atau', 'untuk', 'di', 'ke', 'dari',
      'menjadi', 'berupa', 'panorama', 'spot foto', 'serta', 'pada', 'oleh',
      'karena', 'sebagai', 'hingga', 'dalam', 'juga'
    ];
    if (badWords.includes(lastWord)) return { pass: false, reason: `Ends with awkward word: "${lastWord}"` };
  }
  
  const lowerCleaned = cleaned.toLowerCase();
  const badEndingPhrases = [
    'yang masih',
    'dan panorama',
    'cocok untuk bersantai',
    'menjadikannya spot foto',
    'dan lain-lain',
    'dan sebagainya'
  ];
  for (const phrase of badEndingPhrases) {
    if (lowerCleaned.endsWith(phrase)) return { pass: false, reason: `Ends with awkward phrase: "${phrase}"` };
  }
  
  return { pass: true, reason: '' };
}

// 4. Perform the audit on all 117 destinations
let stats = {
  total: destinations.length,
  originalUsed: 0,
  fallbackUsed: 0,
  pass: 0,
  fail: 0
};

const rows = [];

destinations.forEach((dest, index) => {
  const beforeRaw = cleanText(dest.deskripsi_singkat || dest.deskripsi || '');
  const before = beforeRaw.slice(0, 120);
  
  const after = getPopupDescription(dest);
  
  // Determine if original or fallback was used
  // If after is same as fallback, then fallback was used. Let's verify
  const fallbackVal = getDesktopFallbackDescription(dest);
  const sourceUsed = (after === fallbackVal) ? 'fallback' : 'original';
  
  if (sourceUsed === 'fallback') {
    stats.fallbackUsed++;
  } else {
    stats.originalUsed++;
  }
  
  const placeType = inferMobilePlaceType(dest);
  const qcResult = qcValidate(after);
  const qcStatus = qcResult.pass ? 'PASS' : 'FAIL';
  
  if (qcResult.pass) {
    stats.pass++;
  } else {
    stats.fail++;
  }
  
  rows.push({
    No: index + 1,
    id: dest.id,
    nama_wisata: dest.nama_wisata,
    kategori: dest.kategori,
    kabupaten: dest.kabupaten,
    before: beforeRaw.replace(/"/g, '""'), // escape quotes for CSV
    after: after.replace(/"/g, '""'),
    placeType: placeType,
    sourceUsed: sourceUsed,
    QC: qcStatus,
    reason: qcResult.reason
  });
});

// 5. Generate CSV file content
let csvContent = 'No,id,nama_wisata,kategori,kabupaten,before,after,placeType,sourceUsed,QC,reason\n';
rows.forEach(r => {
  csvContent += `"${r.No}","${r.id}","${r.nama_wisata}","${r.kategori}","${r.kabupaten}","${r.before}","${r.after}","${r.placeType}","${r.sourceUsed}","${r.QC}","${r.reason}"\n`;
});

// Save to root directory
fs.writeFileSync('desktop-popup-description-audit.csv', csvContent, 'utf8');

// Print stats
console.log('=== AUDIT STATS ===');
console.log(JSON.stringify(stats, null, 2));

// Report all failures
const fails = rows.filter(r => r.QC === 'FAIL');
if (fails.length > 0) {
  console.log(`\n=== FAIL DETAILS (${fails.length}) ===`);
  fails.forEach(f => {
    console.log(`No. ${f.No}: ${f.nama_wisata} (${f.kategori})`);
    console.log(`  BEFORE: ${f.before}`);
    console.log(`  AFTER:  ${f.after}`);
    console.log(`  REASON: ${f.reason}`);
  });
  process.exit(1);
} else {
  console.log('\nAll 117 destinations successfully PASS the audit!');
}
