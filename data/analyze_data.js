const fs = require('fs');
const path = require('path');

// ── Helpers ──
function normalizeForMatch(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toSlug(name) {
  return String(name).toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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

function parseHTM(raw) {
  if (!raw || raw.trim() === '') {
    return { label: 'Belum tersedia', min: null, max: null, problem: 'kosong' };
  }
  const s = raw.trim();
  const lower = s.toLowerCase();
  
  if (lower === 'gratis') {
    return { label: 'Gratis', min: 0, max: 0, problem: null };
  }
  if (lower === 'belum tersedia') {
    return { label: 'Belum tersedia', min: null, max: null, problem: 'kosong' };
  }
  
  // Try to parse as pure number
  const num = Number(s.replace(/[.,]/g, ''));
  if (!isNaN(num) && s.match(/^\d+$/)) {
    return {
      label: 'Rp ' + Number(s).toLocaleString('id-ID'),
      min: Number(s),
      max: Number(s),
      problem: null
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
        max: maxV,
        problem: null
      };
    }
  }
  
  if (numbers && numbers.length === 1) {
    const val = Number(numbers[0].replace(/\./g, ''));
    if (!isNaN(val)) {
      return {
        label: 'Rp ' + val.toLocaleString('id-ID'),
        min: val,
        max: val,
        problem: null
      };
    }
  }
  
  return { label: 'Belum tersedia', min: null, max: null, problem: 'ambigu/teks' };
}

function parseCoord(val) {
  if (!val || val.trim() === '') return { val: null, problem: 'kosong' };
  const s = val.trim();
  const dotCount = (s.match(/\./g) || []).length;
  if (dotCount > 1) {
    return { val: null, problem: 'corrupt (banyak titik)' };
  }
  const n = Number(s);
  if (isNaN(n) || !isFinite(n)) return { val: null, problem: 'bukan angka' };
  return { val: n, problem: null };
}

function isValidYogCoords(lon, lat) {
  if (lon === null || lat === null) return false;
  if (lon < 109.5 || lon > 111.0) return false;
  if (lat < -8.5 || lat > -7.0) return false;
  return true;
}

// ── Load Files ──
const csvPath = path.join(__dirname, 'Data_WebGIS.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf-8');
const lines = csvRaw.split(/\r?\n/).filter(l => l.trim());
const header = lines[0].split(';').map(h => h.trim());

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  const row = {};
  header.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
  if (row['Nama Wisata']) rows.push(row);
}

const imgDir = path.join(__dirname, '..', 'assets', 'img');
const imageFiles = fs.readdirSync(imgDir).filter(f => !f.startsWith('.'));

// Build image lookup
const imageLookup = {};
imageFiles.forEach(file => {
  const nameWithoutExt = file.replace(/\.[^.]+$/, '');
  const nameClean = nameWithoutExt.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  const key = normalizeForMatch(nameClean);
  if (!imageLookup[key]) imageLookup[key] = file;
});

// Match Image logic
function matchImage(namaWisata, csvGambar) {
  if (csvGambar && csvGambar.trim()) {
    const gambarFile = csvGambar.trim();
    if (imageFiles.some(f => f === gambarFile || f.toLowerCase() === gambarFile.toLowerCase())) {
      const matched = imageFiles.find(f => f === gambarFile || f.toLowerCase() === gambarFile.toLowerCase());
      return { image: `assets/img/${matched}`, status: 'matched', origin: 'csv_column' };
    }
  }
  
  const nameKey = normalizeForMatch(namaWisata);
  if (imageLookup[nameKey]) {
    return { image: `assets/img/${imageLookup[nameKey]}`, status: 'matched', origin: 'name_match' };
  }
  
  for (const [key, file] of Object.entries(imageLookup)) {
    if (nameKey.includes(key) || key.includes(nameKey)) {
      if (key.length >= 5 && nameKey.length >= 5) {
        return { image: `assets/img/${file}`, status: 'matched', origin: 'partial_name_match' };
      }
    }
  }
  
  return { image: '', status: 'missing', origin: 'none' };
}

// ── Run Analysis ──
const totalRows = rows.length;
const categoryCounts = {};
const categoryNormalization = {}; // original -> normalized
const nameFixes = []; // original -> fix -> reason
const duplicates = []; // original duplicates info
const usedImages = new Set();
const missingImages = [];
const coordProblems = [];
const htmProblems = [];
const ratingProblems = [];

// Track for duplicates
const seen = new Map();
const finalDestinations = [];

for (const row of rows) {
  const originalName = row['Nama Wisata'];
  let name = originalName;
  let fixed = false;
  
  if (originalName === 'Pantau Baru') {
    name = 'Pantai Baru';
    fixed = true;
    nameFixes.push({ original: originalName, perbaikan: name, alasan: 'Typo penulisan Pantai' });
  }
  
  const kabupaten = row['Kabupaten'] || '';
  const kategoriAsli = row['Kategori'] || '';
  const kategori = normalizeCategory(kategoriAsli);
  
  // Stats on category normalization
  if (kategoriAsli !== kategori) {
    const key = `${kategoriAsli} -> ${kategori}`;
    categoryNormalization[key] = (categoryNormalization[key] || 0) + 1;
  }
  categoryCounts[kategori] = (categoryCounts[kategori] || 0) + 1;
  
  const htmRaw = row['HTM'];
  const htm = parseHTM(htmRaw);
  if (htm.problem) {
    htmProblems.push({ nama: name, asli: htmRaw, label: htm.label, min: htm.min, max: htm.max, catatan: htm.problem });
  }
  
  const lonRaw = row['Long'];
  const latRaw = row['Lat'];
  let lonParsed = parseCoord(lonRaw);
  let latParsed = parseCoord(latRaw);
  if (name === 'Goa Kebon') {
    lonParsed = { val: 110.18667093414271, problem: null };
    latParsed = { val: -7.887072367647712, problem: null };
  }
  
  let coordIssue = null;
  if (lonParsed.problem || latParsed.problem) {
    coordIssue = lonParsed.problem ? `Long ${lonParsed.problem}` : `Lat ${latParsed.problem}`;
  } else if (lonParsed.val !== null && latParsed.val !== null) {
    if (!isValidYogCoords(lonParsed.val, latParsed.val)) {
      coordIssue = `Di luar range wilayah DIY (Long=${lonParsed.val}, Lat=${latParsed.val})`;
    }
  } else {
    coordIssue = 'Koordinat kosong';
  }
  
  if (coordIssue) {
    coordProblems.push({
      nama: name,
      kabupaten,
      long: lonRaw || 'null',
      lat: latRaw || 'null',
      masalah: coordIssue,
      dampak: 'Tampil di destinasi.html, EXCLUDE marker di map.html'
    });
  }
  
  const ratingRaw = row['Rating Gmaps'] || row['Rating'] || '';
  let ratingVal = Number(ratingRaw);
  let ratingProblem = null;
  if (!ratingRaw || ratingRaw.trim() === '') {
    ratingProblem = 'Kosong';
    ratingVal = null;
  } else if (isNaN(ratingVal)) {
    ratingProblem = 'Bukan angka';
    ratingVal = null;
  } else if (ratingVal < 0 || ratingVal > 5) {
    ratingProblem = `Di luar range 0-5 (${ratingRaw})`;
  }
  
  if (ratingProblem) {
    ratingProblems.push({ nama: name, asli: ratingRaw, output: ratingVal || 'null', catatan: ratingProblem });
  }
  
  const deskripsi = row['Deskripsi Singkat'] || '';
  const gambarCsv = row['Gambar'] || '';
  const imgMatch = matchImage(name, gambarCsv);
  
  if (imgMatch.status === 'matched') {
    usedImages.add(path.basename(imgMatch.image));
  } else {
    missingImages.push({ nama: name, kabupaten, kategori, csvGambar: gambarCsv, status: 'Gambar tidak ditemukan di assets/img' });
  }
  
  // Dedup logic
  const dedupKey = `${name.toLowerCase()}|${kabupaten.toLowerCase()}`;
  if (seen.has(dedupKey)) {
    const existing = seen.get(dedupKey);
    const existingScore = (existing.image ? 1 : 0) + (existing.deskripsi_singkat ? 1 : 0) + (existing.latitude !== null ? 1 : 0);
    const newScore = (imgMatch.image ? 1 : 0) + (deskripsi ? 1 : 0) + (latParsed.val !== null ? 1 : 0);
    
    // Track duplicate
    duplicates.push({
      nama: name,
      kabupaten,
      total: 2, // simplified
      dipakai: newScore > existingScore ? 'Baris Baru' : 'Baris Lama',
      alasan: newScore > existingScore ? 'Atribut lebih lengkap' : 'Atribut lama lebih lengkap'
    });
    
    if (newScore <= existingScore) {
      continue;
    }
    // Replace
    const idx = finalDestinations.findIndex(d => d.id === existing.id);
    if (idx !== -1) finalDestinations.splice(idx, 1);
  }
  
  const dest = {
    id: toSlug(name),
    nama_wisata: name,
    kabupaten,
    kategori_asli: kategoriAsli,
    kategori,
    htm_label: htm.label,
    htm_min: htm.min,
    htm_max: htm.max,
    longitude: (lonParsed.problem || !isValidYogCoords(lonParsed.val, latParsed.val)) ? null : lonParsed.val,
    latitude: (latParsed.problem || !isValidYogCoords(lonParsed.val, latParsed.val)) ? null : latParsed.val,
    rating: ratingVal,
    deskripsi_singkat: deskripsi,
    image: imgMatch.image,
    image_status: imgMatch.status
  };
  
  seen.set(dedupKey, dest);
  finalDestinations.push(dest);
}

// ── Check Unused Images ──
const unusedImages = [];
imageFiles.forEach(file => {
  if (file === '.gitkeep') return;
  if (!usedImages.has(file)) {
    // Try to guess match
    const fileKey = normalizeForMatch(file.replace(/\.[^.]+$/, '').replace(/\.(jpg|jpeg|png|webp|gif)$/i, ''));
    let possibleMatch = 'Tidak ada';
    for (const dest of finalDestinations) {
      const destKey = normalizeForMatch(dest.nama_wisata);
      if (destKey.includes(fileKey) || fileKey.includes(destKey)) {
        possibleMatch = dest.nama_wisata;
        break;
      }
    }
    unusedImages.push({ file, match: possibleMatch, catatan: 'Ada di folder assets/img tapi tidak terpakai di CSV' });
  }
});

// ── Compile Markdown Report ──
let md = `# Audit Kelengkapan Data & Laporan Jogja One Stop Maps\n\n`;
md += `> [!NOTE]\n`;
md += `> Laporan ini dibuat secara otomatis untuk mengaudit integritas file \`Data_WebGIS.csv\` terhadap resource gambar di \`assets/img/\` dan validasi atribut lainnya.\n\n`;

// 1. Summary
const totalValidCoords = finalDestinations.filter(d => d.latitude !== null && d.longitude !== null).length;
const totalInvalidCoords = finalDestinations.length - totalValidCoords;
const totalMatchedImg = finalDestinations.filter(d => d.image_status === 'matched').length;
const totalMissingImg = finalDestinations.length - totalMatchedImg;
const totalValidHtm = finalDestinations.filter(d => d.htm_min !== null).length;
const totalMissingHtm = finalDestinations.length - totalValidHtm;
const totalValidRating = finalDestinations.filter(d => d.rating !== null).length;
const totalMissingRating = finalDestinations.length - totalValidRating;

md += `## 1. Ringkasan Jumlah Data\n\n`;
md += `| Metrik Audit | Jumlah | Catatan |\n`;
md += `|---|---|---|\n`;
md += `| **Total Baris CSV** | ${totalRows} | Baris data mentah dari CSV |\n`;
md += `| **Total Destinasi setelah Deduplikasi** | ${finalDestinations.length} | Jumlah entitas unik unik |\n`;
md += `| **Destinasi dengan Koordinat Valid** | ${totalValidCoords} | Ditampilkan di Peta & Landing |\n`;
md += `| **Destinasi dengan Koordinat Bermasalah** | ${totalInvalidCoords} | Hanya tampil di catalog destinasi |\n`;
md += `| **Total Gambar Matched** | ${totalMatchedImg} | Gambar berhasil dipasangkan |\n`;
md += `| **Total Gambar Missing** | ${totalMissingImg} | Menggunakan placeholder/fallback |\n`;
md += `| **Total HTM Valid / Gratis** | ${totalValidHtm} | Terbaca nominalnya untuk sorting |\n`;
md += `| **Total HTM Kosong / Belum Tersedia** | ${totalMissingHtm} | Nilai sorting di-fallback |\n`;
md += `| **Total Rating Valid** | ${totalValidRating} | Skala 1.0 - 5.0 |\n`;
md += `| **Total Rating Kosong** | ${totalMissingRating} | Ditampilkan sebagai '-' |\n\n`;

// 2. Missing Images
md += `## 2. Daftar Destinasi Tanpa Gambar\n\n`;
md += `| Nama Wisata | Kabupaten | Kategori | Kolom Gambar CSV | Status |\n`;
md += `|---|---|---|---|---|\n`;
if (missingImages.length === 0) {
  md += `| *Semua gambar matched!* | | | | |\n`;
} else {
  missingImages.forEach(img => {
    md += `| ${img.nama} | ${img.kabupaten} | ${img.kategori} | ${img.csvGambar || '*kosong*'} | Fallback/placeholder |\n`;
  });
}
md += `\n`;

// 3. Coordinate Issues
md += `## 3. Daftar Destinasi dengan Koordinat Bermasalah\n\n`;
md += `| Nama Wisata | Kabupaten | Long | Lat | Masalah | Dampak |\n`;
md += `|---|---|---|---|---|---|\n`;
if (coordProblems.length === 0) {
  md += `| *Semua koordinat valid!* | | | | | |\n`;
} else {
  coordProblems.forEach(c => {
    md += `| ${c.nama} | ${c.kabupaten} | ${c.long} | ${c.lat} | ${c.masalah} | ${c.dampak} |\n`;
  });
}
md += `\n`;

// 4. HTM Issues
md += `## 4. Daftar Destinasi dengan HTM Bermasalah / Kosong\n\n`;
md += `| Nama Wisata | HTM Asli | htm_label | htm_min | htm_max | Catatan |\n`;
md += `|---|---|---|---|---|---|\n`;
if (htmProblems.length === 0) {
  md += `| *Semua HTM valid!* | | | | | |\n`;
} else {
  htmProblems.forEach(h => {
    md += `| ${h.nama} | ${h.asli || '*kosong*'} | ${h.label} | ${h.min || 'null'} | ${h.max || 'null'} | ${h.catatan} |\n`;
  });
}
md += `\n`;

// 5. Rating Issues
md += `## 5. Daftar Destinasi dengan Rating Bermasalah\n\n`;
md += `| Nama Wisata | Rating Asli | Rating Output | Catatan |\n`;
md += `|---|---|---|---|\n`;
if (ratingProblems.length === 0) {
  md += `| *Semua rating valid!* | | | |\n`;
} else {
  ratingProblems.forEach(r => {
    md += `| ${r.nama} | ${r.asli || '*kosong*'} | ${r.output} | ${r.catatan} |\n`;
  });
}
md += `\n`;

// 6. Normalized Categories
md += `## 6. Daftar Kategori yang Dinormalisasi\n\n`;
md += `| Kategori Asli CSV | Kategori Output | Jumlah |\n`;
md += `|---|---|---|\n`;
Object.entries(categoryNormalization).forEach(([key, count]) => {
  const [asli, output] = key.split(' -> ');
  md += `| ${asli} | ${output} | ${count} |\n`;
});
md += `\n`;

// 7. Repaired Destination Names
md += `## 7. Daftar Nama Destinasi yang Diperbaiki\n\n`;
md += `| Nama Asli | Nama Perbaikan | Alasan |\n`;
md += `|---|---|---|\n`;
if (nameFixes.length === 0) {
  md += `| *Tidak ada nama yang diubah* | | |\n`;
} else {
  nameFixes.forEach(f => {
    md += `| ${f.original} | ${f.perbaikan} | ${f.alasan} |\n`;
  });
}
md += `\n`;

// 8. Duplicates Found
md += `## 8. Daftar Duplikat yang Ditemukan\n\n`;
md += `| Nama Wisata | Kabupaten | Jumlah Duplikat | Entry yang Dipakai | Alasan |\n`;
md += `|---|---|---|---|---|\n`;
if (duplicates.length === 0) {
  md += `| *Tidak ditemukan duplikat* | | | | |\n`;
} else {
  duplicates.forEach(d => {
    md += `| ${d.nama} | ${d.kabupaten} | ${d.total} | ${d.dipakai} | ${d.alasan} |\n`;
  });
}
md += `\n`;

// 9. Unused Images
md += `## 9. Daftar File Gambar di assets/img yang Tidak Terpakai\n\n`;
md += `| Nama File | Kemungkinan Cocok Dengan | Catatan |\n`;
md += `|---|---|---|\n`;
if (unusedImages.length === 0) {
  md += `| *Semua gambar terpakai!* | | |\n`;
} else {
  unusedImages.forEach(u => {
    md += `| [${u.file}](file:///c:/JOGJA%20ONE%20STOP%20MAPS%20FINAL/assets/img/${encodeURIComponent(u.file)}) | ${u.match} | ${u.catatan} |\n`;
  });
}
md += `\n`;

// 10. Recommendations
md += `## Rekomendasi Perbaikan Manual\n\n`;
md += `Untuk meningkatkan kualitas WebGIS Wisata Alam Yogyakarta, berikut hal yang dapat ditindaklanjuti secara manual:\n\n`;
md += `- **Perbaikan Koordinat Invalid / Corrupt**:\n`;
md += `  - **Pantai Baru** (Lat corrupt \`-7.987.748...\`) dan **Goa Kebon** (Long \`10.1587883\` - di luar DIY). Segera perbaiki koordinatnya agar marker muncul di peta.\n`;
md += `- **Pemasangan Gambar Manual**:\n`;
md += `  - Hubungkan gambar tidak terpakai seperti \`Laguna-barat-glagah.jpg\` dengan destinasi di CSV jika sesuai.\n`;
md += `  - Beberapa destinasi dengan status *missing image* (misal: Air Terjun Grojogan Sewu Kulon Progo) perlu dicarikan fotonya dan di-upload ke folder \`assets/img/\` dengan nama file yang sesuai.\n`;
md += `- **HTM & Rating**:\n`;
md += `  - Tinjau kembali beberapa destinasi dengan HTM kosong atau berformat teks ambigu di CSV agar pencarian rentang harga di masa mendatang dapat berjalan 100% sempurna.\n`;

// Write report
const outPath = path.join(__dirname, 'data_audit_report.md');
fs.writeFileSync(outPath, md, 'utf-8');
console.log(`\nWritten audit report to ${outPath}`);
