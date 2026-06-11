/**
 * Generate destinations.js from Data_WebGIS.csv
 * Run: node generate_destinations.js
 */
const fs = require('fs');
const path = require('path');

// ── Read CSV ──
const csvPath = path.join(__dirname, 'Data_WebGIS.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf-8');
const lines = csvRaw.split(/\r?\n/).filter(l => l.trim());

// Parse header
const header = lines[0].split(';').map(h => h.trim());
console.log('Header:', header);

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  const row = {};
  header.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
  if (row['Nama Wisata']) rows.push(row);
}
console.log(`Parsed ${rows.length} rows from CSV`);

// ── List image files ──
const imgDir = path.join(__dirname, '..', 'assets', 'img');
const imageFiles = fs.readdirSync(imgDir).filter(f => !f.startsWith('.'));
console.log(`Found ${imageFiles.length} image files`);

// ── Normalize function for matching ──
function normalizeForMatch(str) {
  return String(str).toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// ── Build image lookup ──
const imageLookup = {};
imageFiles.forEach(file => {
  const nameWithoutExt = file.replace(/\.[^.]+$/, '');
  // Also handle double extensions like .jpg.jpg
  const nameClean = nameWithoutExt.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  const key = normalizeForMatch(nameClean);
  if (!imageLookup[key]) imageLookup[key] = file;
});

// ── Slug generation ──
function toSlug(name) {
  return String(name).toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Category normalization ──
function normalizeCategory(cat) {
  if (!cat) return 'Lainnya';
  const c = cat.trim();
  const lower = c.toLowerCase();
  if (lower === 'pantai') return 'Pantai';
  if (lower === 'bukit') return 'Bukit';
  if (lower === 'goa') return 'Goa';
  if (lower === 'air terjun') return 'Air Terjun';
  if (lower === 'hutan') return 'Hutan';
  if (lower === 'gunung') return 'Bukit';
  if (lower === 'sungai') return 'Lainnya';
  if (lower === 'air') return 'Lainnya';
  if (lower === 'geologi') return 'Lainnya';
  if (lower === 'waduk') return 'Lainnya';
  if (lower === 'perkebunan') return 'Lainnya';
  if (lower === 'lainnya') return 'Lainnya';
  return 'Lainnya';
}

// ── HTM parsing ──
function parseHTM(raw) {
  if (!raw || raw.trim() === '') {
    return { label: 'Belum tersedia', min: null, max: null };
  }
  const s = raw.trim();
  const lower = s.toLowerCase();
  
  if (lower === 'gratis') {
    return { label: 'Gratis', min: 0, max: 0 };
  }
  if (lower === 'belum tersedia') {
    return { label: 'Belum tersedia', min: null, max: null };
  }
  
  // Try to parse as pure number
  const num = Number(s.replace(/[.,]/g, ''));
  if (!isNaN(num) && s.match(/^\d+$/)) {
    return {
      label: 'Rp ' + Number(s).toLocaleString('id-ID'),
      min: Number(s),
      max: Number(s)
    };
  }
  
  // Try to extract numbers from text like "Rp 25.000 - Rp 50.000"
  const numbers = s.match(/\d[\d.]*\d|\d+/g);
  if (numbers && numbers.length >= 2) {
    const vals = numbers.map(n => Number(n.replace(/\./g, ''))).filter(n => !isNaN(n));
    if (vals.length >= 2) {
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      return {
        label: `Rp ${minV.toLocaleString('id-ID')} – Rp ${maxV.toLocaleString('id-ID')}`,
        min: minV,
        max: maxV
      };
    }
  }
  
  if (numbers && numbers.length === 1) {
    const val = Number(numbers[0].replace(/\./g, ''));
    if (!isNaN(val)) {
      return {
        label: 'Rp ' + val.toLocaleString('id-ID'),
        min: val,
        max: val
      };
    }
  }
  
  return { label: 'Belum tersedia', min: null, max: null };
}

// ── Parse coordinates ──
function parseCoord(val) {
  if (!val || val.trim() === '') return null;
  const s = val.trim();
  // Check for corrupt values like -7.987.748.030.561.820
  const dotCount = (s.match(/\./g) || []).length;
  if (dotCount > 1) {
    console.warn(`  Corrupt coordinate: ${s}`);
    return null;
  }
  const n = Number(s);
  if (isNaN(n) || !isFinite(n)) return null;
  return n;
}

// ── Validate coordinates for Yogyakarta area ──
function isValidYogCoords(lon, lat) {
  if (lon === null || lat === null) return false;
  // Yogyakarta roughly: lon 109.5-111.0, lat -8.3 to -7.4
  if (lon < 109.5 || lon > 111.0) return false;
  if (lat < -8.5 || lat > -7.0) return false;
  return true;
}

// ── Match image ──
function matchImage(namaWisata, csvGambar) {
  // Priority 1: CSV Gambar column
  if (csvGambar && csvGambar.trim()) {
    const gambarFile = csvGambar.trim();
    // Check if file exists
    if (imageFiles.some(f => f === gambarFile || f.toLowerCase() === gambarFile.toLowerCase())) {
      const matched = imageFiles.find(f => f === gambarFile || f.toLowerCase() === gambarFile.toLowerCase());
      return { image: `assets/img/${matched}`, status: 'matched' };
    }
  }
  
  // Priority 2: Normalize name matching
  const nameKey = normalizeForMatch(namaWisata);
  if (imageLookup[nameKey]) {
    return { image: `assets/img/${imageLookup[nameKey]}`, status: 'matched' };
  }
  
  // Try partial matches
  for (const [key, file] of Object.entries(imageLookup)) {
    if (nameKey.includes(key) || key.includes(nameKey)) {
      if (key.length >= 5 && nameKey.length >= 5) { // avoid false positives
        return { image: `assets/img/${file}`, status: 'matched' };
      }
    }
  }
  
  return { image: '', status: 'missing' };
}

// ── Google Maps URL ──
function googleMapsUrl(namaWisata, kabupaten) {
  const query = [namaWisata, kabupaten, 'Yogyakarta'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// ── Fix known issues ──
function fixName(name) {
  if (name === 'Pantau Baru') return 'Pantai Baru';
  return name;
}

// ── Process all rows ──
const seen = new Map(); // For dedup: key = slug
const destinations = [];
let matchedCount = 0;
let missingCount = 0;

for (const row of rows) {
  const namaWisata = fixName(row['Nama Wisata']);
  const kabupaten = row['Kabupaten'] || '';
  const kategoriAsli = row['Kategori'] || '';
  const kategori = normalizeCategory(kategoriAsli);
  const htm = parseHTM(row['HTM']);
  let longitude = parseCoord(row['Long']);
  let latitude = parseCoord(row['Lat']);
  if (namaWisata === 'Goa Kebon') {
    longitude = 110.18667093414271;
    latitude = -7.887072367647712;
  }
  const ratingRaw = row['Rating Gmaps'] || row['Rating'] || '';
  const rating = Number(ratingRaw) || null;
  const deskripsi = row['Deskripsi Singkat'] || '';
  const gambarCsv = row['Gambar'] || '';
  
  const id = toSlug(namaWisata);
  const validCoords = isValidYogCoords(longitude, latitude);
  
  // Image matching
  const imgMatch = matchImage(namaWisata, gambarCsv);
  if (imgMatch.status === 'matched') matchedCount++;
  else missingCount++;
  
  // Dedup check
  const dedupKey = `${namaWisata.toLowerCase()}|${kabupaten.toLowerCase()}`;
  if (seen.has(dedupKey)) {
    const existing = seen.get(dedupKey);
    // Keep the one with more complete attributes
    const existingScore = (existing.image ? 1 : 0) + (existing.deskripsi_singkat ? 1 : 0) + (existing.latitude !== null ? 1 : 0);
    const newScore = (imgMatch.image ? 1 : 0) + (deskripsi ? 1 : 0) + (latitude !== null ? 1 : 0);
    if (newScore <= existingScore) {
      console.log(`  Skipping duplicate: ${namaWisata} (${kabupaten})`);
      continue;
    }
    // Replace
    const idx = destinations.findIndex(d => d.id === existing.id);
    if (idx !== -1) destinations.splice(idx, 1);
    console.log(`  Replacing duplicate: ${namaWisata} (${kabupaten})`);
  }
  
  const dest = {
    id,
    nama_wisata: namaWisata,
    kabupaten,
    kategori_asli: kategoriAsli,
    kategori,
    htm_label: htm.label,
    htm_min: htm.min,
    htm_max: htm.max,
    longitude: validCoords ? longitude : null,
    latitude: validCoords ? latitude : null,
    rating,
    deskripsi_singkat: deskripsi,
    image: imgMatch.image,
    image_status: imgMatch.status,
    google_maps_url: googleMapsUrl(namaWisata, kabupaten)
  };
  
  seen.set(dedupKey, dest);
  destinations.push(dest);
  
  if (!validCoords) {
    console.warn(`  Invalid coords for "${namaWisata}": lon=${longitude}, lat=${latitude}`);
  }
}

console.log(`\nTotal destinations: ${destinations.length}`);
console.log(`Images matched: ${matchedCount}`);
console.log(`Images missing: ${missingCount}`);

// ── Write output ──
const output = `/* Data destinasi Jogja One Stop Maps — generated from Data_WebGIS.csv */
const destinations = ${JSON.stringify(destinations, null, 2)};

window.JOSM_DESTINATIONS = destinations;
`;

const outPath = path.join(__dirname, 'destinations.js');
fs.writeFileSync(outPath, output, 'utf-8');
console.log(`\nWritten to ${outPath}`);
