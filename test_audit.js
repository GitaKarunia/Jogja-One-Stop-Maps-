// Audit script: final verification that all 117 destinations produce clean template descriptions
const fs = require('fs');

const dataJs = fs.readFileSync('data/destinations.js', 'utf8');
let dests = [];
try {
  const window = {};
  eval(dataJs);
  dests = window.JOSM_DESTINATIONS || (typeof destinations !== 'undefined' ? destinations : []);
} catch (e) {
  console.error('Failed to eval data:', e);
  process.exit(1);
}

if (!dests.length) {
  console.log('No destinations found.');
  process.exit(1);
}

// ---- Mirror the exact functions from map.js ----
function inferMobilePlaceType(dest) {
  const name = (dest.nama_wisata || '').toLowerCase();
  if (/(sungai|river|kali|hilir)/.test(name)) return 'sungai';
  if (/(bendungan|waduk|dam)/.test(name)) return 'bendungan';
  if (/(camp|camping|river camp)/.test(name)) return 'camping';
  if (/(park|taman)/.test(name)) return 'taman';
  if (/(lembah)/.test(name)) return 'lembah';
  if (/(candi|keraton|malioboro)/.test(name)) return 'budaya';
  if (/(pinus|hutan)/.test(name)) return 'hutan';
  if (/(goa|gua)/.test(name)) return 'goa';
  if (/(air terjun|grojogan|curug)/.test(name)) return 'air terjun';
  if (/(pantai)/.test(name)) return 'pantai';
  if (/(bukit|puncak|gunung)/.test(name)) return 'bukit';
  return (dest.kategori || '').toLowerCase();
}

function getCategoryFallbackDescription(dest) {
  const name = dest.nama_wisata || 'Destinasi ini';
  const regency = dest.kabupaten || 'Yogyakarta';
  const type = inferMobilePlaceType(dest);
  if (type === 'pantai') return `${name} merupakan destinasi pantai di ${regency} dengan panorama pesisir yang cocok untuk rekreasi.`;
  if (type === 'bukit') return `${name} merupakan destinasi bukit di ${regency} dengan panorama alam yang cocok untuk bersantai.`;
  if (type === 'goa') return `${name} merupakan destinasi goa di ${regency} dengan suasana petualangan alam yang khas.`;
  if (type === 'air terjun') return `${name} merupakan destinasi air terjun di ${regency} dengan suasana alam yang segar.`;
  if (type === 'hutan') return `${name} merupakan destinasi hutan di ${regency} dengan suasana sejuk dan ruang rekreasi alam.`;
  if (type === 'sungai') return `${name} merupakan destinasi sungai di ${regency} dengan suasana alam yang cocok untuk rekreasi.`;
  if (type === 'bendungan') return `${name} merupakan destinasi bendungan di ${regency} dengan suasana terbuka untuk kunjungan singkat.`;
  if (type === 'camping') return `${name} merupakan area rekreasi alam di ${regency} dengan suasana terbuka untuk berkemah dan bersantai.`;
  if (type === 'taman') return `${name} merupakan taman wisata di ${regency} dengan suasana alam yang cocok untuk rekreasi.`;
  if (type === 'lembah') return `${name} merupakan destinasi lembah di ${regency} dengan panorama alam dan suasana terbuka.`;
  if (type === 'budaya') return `${name} merupakan destinasi budaya di ${regency} dengan nilai sejarah dan daya tarik wisata.`;
  return `${name} merupakan destinasi wisata di ${regency} yang cocok untuk kunjungan singkat.`;
}

// THE NEW getMobileDetailDescription — always returns template
function getMobileDetailDescription(dest) {
  return getCategoryFallbackDescription(dest);
}

function getRawOriginal(dest) {
  return String(dest.deskripsi_singkat || dest.deskripsi || '').replace(/\s+/g, ' ').trim();
}

// QC validator
function qcCheck(after) {
  const reasons = [];
  if (!after.endsWith('.')) reasons.push('No period end');
  if (after.includes('...')) reasons.push('Contains ellipsis');
  if (after.toLowerCase().includes('menawarkan suasana')) reasons.push('Contains "menawarkan suasana"');
  if (after.toLowerCase().includes('ruang rekreasi yang cocok')) reasons.push('Contains "ruang rekreasi yang cocok"');
  if (after.toLowerCase().includes('wisata populer')) reasons.push('Contains "wisata populer"');
  if (after.toLowerCase().includes('di mana sinar')) reasons.push('Contains "di mana sinar"');
  if (after.length > 160) reasons.push('Too long (>160)');
  if (after.length < 40) reasons.push('Too short (<40)');
  return reasons;
}

// Type counter
const typeCount = {};
let stats = { total: dests.length, changed: 0, unchanged: 0, pass: 0, fail: 0 };

// Build CSV
let csv = 'No,id,nama_wisata,kategori,kabupaten,Before,After,PlaceType,Status,QC,Alasan\n';

dests.forEach((dest, i) => {
  const before = getRawOriginal(dest);
  const after = getMobileDetailDescription(dest);
  const placeType = inferMobilePlaceType(dest);
  typeCount[placeType] = (typeCount[placeType] || 0) + 1;

  const reasons = qcCheck(after);
  const qc = reasons.length === 0 ? 'PASS' : 'FAIL';
  const status = after !== before ? 'CHANGED' : 'UNCHANGED';

  if (qc === 'PASS') stats.pass++; else stats.fail++;
  if (status === 'CHANGED') stats.changed++; else stats.unchanged++;

  csv += `${i+1},${dest.id},"${dest.nama_wisata}","${dest.kategori}","${dest.kabupaten}","${before.replace(/"/g, '""')}","${after.replace(/"/g, '""')}","${placeType}","${status}","${qc}","${reasons.join('; ')}"\n`;
});

// Save CSV in project root
fs.writeFileSync('mobile-description-audit.csv', csv);

// Verify specific acceptance cases from Fase 5
const acceptanceCases = [
  'Lembah Oyo, Kedung Jati',
  'Batu Kapal Park',
  'Hutan Pinus Pengger',
  'Putrobayan River Camp',
  'Bendungan Ancol',
  'Hilir Sungai Opak',
  'Grojogan Watu Purbo',
  'Pantai Parangtritis',
  'Goa Sriti',
  'Air Terjun Sri Gethuk'
];

console.log('\n=== STATS ===');
console.log(JSON.stringify(stats, null, 2));

console.log('\n=== TYPE COUNTS ===');
Object.entries(typeCount).sort((a,b) => b[1]-a[1]).forEach(([t,c]) => console.log(`  ${t}: ${c}`));

console.log('\n=== FASE 5 ACCEPTANCE CHECK ===');
dests.filter(d => acceptanceCases.includes(d.nama_wisata)).forEach(d => {
  const after = getMobileDetailDescription(d);
  const type = inferMobilePlaceType(d);
  const qc = qcCheck(after).length === 0 ? 'PASS' : 'FAIL';
  console.log(`[${qc}] ${d.nama_wisata} (${type}) → ${after}`);
});

console.log('\nCSV saved to: mobile-description-audit.csv');
