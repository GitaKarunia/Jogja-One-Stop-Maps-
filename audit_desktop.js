// Full desktop popup audit using the EXACT same logic as the live map.js
const fs = require('fs');
const dataJs = fs.readFileSync('data/destinations.js', 'utf8');
let dests = [];
try {
  const window = {};
  eval(dataJs);
  dests = window.JOSM_DESTINATIONS || [];
} catch(e) { console.error('Failed to eval data:', e); process.exit(1); }

// === Mirror EXACTLY from map.js ===
function cleanText(text = '') {
  return String(text).replace(/\s+/g, ' ').replace(/\.\.\.+/g, '.').trim();
}
function ensurePeriod(text = '') {
  const clean = cleanText(text).replace(/[,\-–;:]+$/g, '').trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}
function trimAtWord(text = '', maxLength = 125) {
  const clean = cleanText(text);
  if (!clean) return '';
  if (clean.length <= maxLength) return ensurePeriod(clean);
  const sliced = clean.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  const safe = lastSpace > 45 ? sliced.slice(0, lastSpace) : sliced;
  return ensurePeriod(safe);
}
function firstSentenceOrTrim(text = '', maxLength = 125) {
  const clean = cleanText(text);
  if (!clean) return '';
  const sentenceMatch = clean.match(/[^.!?]+[.!?]/);
  if (sentenceMatch && sentenceMatch[0].length <= maxLength) {
    return ensurePeriod(sentenceMatch[0]);
  }
  return trimAtWord(clean, maxLength);
}
function isBrokenDesktopDescription(text) {
  if (!text || text.length < 45) return true;
  if (/[0-9\u00b1\u00b0+\-][.?!]$/.test(text.trim())) return true;
  const badEnders = [
    'dengan.', 'yang.', 'di.', 'dan.', 'atau.', 'untuk.', 'antara.',
    'pada.', 'ke.', 'dari.', 'serta.', 'karena.', 'sebagai.', 'menjadi.',
    'dalam.', 'oleh.', 'juga.', 'hingga.', 'saat.', 'ketika.'
  ];
  const lower = text.trim().toLowerCase();
  for (const e of badEnders) {
    if (lower.endsWith(e)) return true;
  }
  return false;
}
function getDesktopFallbackDescription(dest) {
  const name = dest.nama_wisata || 'Destinasi ini';
  const regency = dest.kabupaten || 'Yogyakarta';
  const nameLower = name.toLowerCase();
  if (/(sungai|river|kali|hilir)/.test(nameLower)) return `${name} merupakan destinasi sungai di ${regency} dengan suasana alam terbuka yang cocok untuk rekreasi dan relaksasi.`;
  if (/(bendungan|waduk|dam)/.test(nameLower)) return `${name} merupakan destinasi bendungan di ${regency} yang menawarkan pemandangan perairan dan perbukitan yang menenangkan.`;
  if (/(camp|camping|river camp)/.test(nameLower)) return `${name} merupakan area rekreasi alam di ${regency} yang ideal untuk berkemah dan menikmati suasana alam.`;
  if (/(park|taman)/.test(nameLower)) return `${name} merupakan taman wisata di ${regency} dengan fasilitas rekreasi dan suasana alam yang nyaman.`;
  if (/(lembah)/.test(nameLower)) return `${name} merupakan destinasi lembah di ${regency} dengan panorama alam dan aliran sungai yang menyegarkan.`;
  if (/(candi|keraton|malioboro)/.test(nameLower)) return `${name} merupakan destinasi budaya di ${regency} dengan nilai sejarah tinggi dan daya tarik wisata yang khas.`;
  if (/(pinus|hutan)/.test(nameLower)) return `${name} merupakan destinasi hutan di ${regency} dengan suasana sejuk dan ruang rekreasi alam yang asri.`;
  if (/(goa|gua)/.test(nameLower)) return `${name} merupakan destinasi goa di ${regency} dengan keindahan stalaktit-stalagmit dan pengalaman petualangan yang khas.`;
  if (/(air terjun|grojogan|curug)/.test(nameLower)) return `${name} merupakan destinasi air terjun di ${regency} dengan aliran air yang segar dan suasana alam yang asri.`;
  if (/(pantai)/.test(nameLower)) return `${name} merupakan destinasi pantai di ${regency} dengan panorama pesisir selatan dan suasana yang cocok untuk rekreasi.`;
  if (/(bukit|puncak|gunung)/.test(nameLower)) return `${name} merupakan destinasi bukit di ${regency} dengan panorama alam luas yang cocok untuk bersantai dan menikmati udara segar.`;
  const cat = (dest.kategori || '').toLowerCase();
  if (cat === 'pantai') return `${name} merupakan destinasi pantai di ${regency} dengan panorama pesisir yang cocok untuk rekreasi.`;
  if (cat === 'bukit') return `${name} merupakan destinasi bukit di ${regency} dengan panorama alam yang cocok untuk bersantai.`;
  if (cat === 'goa') return `${name} merupakan destinasi goa di ${regency} dengan suasana petualangan alam yang khas.`;
  if (cat === 'air terjun') return `${name} merupakan destinasi air terjun di ${regency} dengan suasana alam yang segar.`;
  if (cat === 'hutan') return `${name} merupakan destinasi hutan di ${regency} dengan suasana sejuk dan ruang rekreasi alam.`;
  return `${name} merupakan destinasi wisata di ${regency} dengan daya tarik alam yang cocok untuk dikunjungi.`;
}
function getPopupDescription(dest) {
  if (dest.popup_summary) return firstSentenceOrTrim(dest.popup_summary, 125);
  const raw = cleanText(dest.deskripsi_singkat || dest.deskripsi || '');
  if (raw) {
    const result = firstSentenceOrTrim(raw, 150);
    if (!isBrokenDesktopDescription(result)) return result;
  }
  return getDesktopFallbackDescription(dest);
}
// === End mirror ===

// QC check for desktop popup
function qcCheck(result) {
  const reasons = [];
  if (!result || result.length < 45) reasons.push('Too short');
  if (result.includes('...')) reasons.push('Contains ellipsis');
  if (/[0-9\u00b1\u00b0+\-][.?!]$/.test(result.trim())) reasons.push('Ends with number');
  const badEnders = ['dengan.', 'yang.', 'di.', 'dan.', 'atau.', 'untuk.', 'antara.', 'pada.', 'ke.', 'dari.', 'serta.', 'karena.', 'sebagai.', 'menjadi.', 'dalam.'];
  const lower = result.trim().toLowerCase();
  for (const e of badEnders) {
    if (lower.endsWith(e)) { reasons.push(`Ends with: "${e}"`); break; }
  }
  return reasons;
}

// Run audit on all 117 destinations
let stats = { total: dests.length, pass: 0, fail: 0 };
let allRows = [];

dests.forEach((dest, i) => {
  const before = cleanText(dest.deskripsi_singkat || dest.deskripsi || '').slice(0, 100);
  const after = getPopupDescription(dest);
  const reasons = qcCheck(after);
  const qc = reasons.length === 0 ? 'PASS' : 'FAIL';
  if (qc === 'PASS') stats.pass++; else stats.fail++;
  allRows.push({ no: i+1, nama: dest.nama_wisata, kategori: dest.kategori, kabupaten: dest.kabupaten, before, after, qc, reason: reasons.join('; ') });
});

console.log('\n=== STATS ===');
console.log(JSON.stringify(stats, null, 2));

// Show all FAILs
const fails = allRows.filter(r => r.qc === 'FAIL');
if (fails.length) {
  console.log('\n=== FAIL ITEMS (' + fails.length + ') ===');
  fails.forEach(r => {
    console.log(`[FAIL] ${r.nama}`);
    console.log(`  BEFORE: ${r.before}`);
    console.log(`  AFTER:  ${r.after}`);
    console.log(`  REASON: ${r.reason}`);
  });
} else {
  console.log('\nAll ' + stats.total + ' destinations PASS.');
}

// Show 20 specific acceptance checks
const checks = [
  'Bukit Klangon', 'Goa Sriti', 'Goa Jomblang', 'Air Terjun Sri Gethuk',
  'Grojogan Watu Purbo', 'Hutan Pinus Pengger', 'Waduk Sermo', 'Bendungan Ancol',
  'Lembah Oyo, Kedung Jati', 'Bukit Teletubbies', 'Bukit Kosakora',
  'Pantai Indrayanti', 'Pantai Samas', 'Gunung Api Purba Nglanggeran',
  'Puncak Tugu Batara Sriten', 'Kebun Teh Nglinggo', 'Bukit Isis',
  'Goa Gelatik Lorong Sewu', 'Putrobayan River Camp', 'Pantai Parangtritis'
];

console.log('\n=== SPECIFIC ACCEPTANCE CHECKS ===');
checks.forEach(name => {
  const dest = dests.find(d => d.nama_wisata === name);
  if (!dest) { console.log(`[NOT FOUND] ${name}`); return; }
  const result = getPopupDescription(dest);
  const qc = qcCheck(result).length === 0 ? 'PASS' : 'FAIL';
  console.log(`[${qc}] ${name}`);
  console.log(`  -> ${result}`);
});
