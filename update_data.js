const fs = require('fs');

const csvFilePath = 'data/Data_WebGIS.csv';
const jsFilePath = 'data/destinations.js';

try {
  // 1. Baca file CSV
  const csvData = fs.readFileSync(csvFilePath, 'utf8');
  
  // 2. Pisahkan per baris dan bersihkan
  const lines = csvData.trim().split(/\r?\n/);
  
  // 3. Ambil header di baris pertama
  const headers = lines[0].split(';');
  
  const destinations = [];
  
  // 4. Proses baris sisanya
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // lewati baris kosong
    
    // Asumsi dipisah dengan titik koma (;)
    const columns = lines[i].split(';');
    
    // Mapping dari CSV ke Object JS
    const nama_wisata = columns[0] ? columns[0].trim() : '';
    const kabupaten = columns[1] ? columns[1].trim() : '';
    const kategori = columns[2] ? columns[2].trim() : '';
    const htm_raw = columns[3] ? columns[3].trim() : '';
    const longitude = columns[4] ? parseFloat(columns[4].trim()) : 0;
    const latitude = columns[5] ? parseFloat(columns[5].trim()) : 0;
    const rating = columns[6] ? parseFloat(columns[6].trim()) : 0;
    const deskripsi = columns[7] ? columns[7].trim() : '';
    
    // Format ID dan label HTM
    const id = nama_wisata.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let htm_label = htm_raw;
    let htm_min = 0;
    if (htm_raw.toLowerCase() === 'gratis' || htm_raw === '0') {
      htm_label = 'Gratis';
    } else if (!isNaN(htm_raw) && htm_raw.length > 0) {
      htm_label = 'Rp ' + Number(htm_raw).toLocaleString('id-ID');
      htm_min = Number(htm_raw);
    }
    
    destinations.push({
      id: id,
      nama_wisata: nama_wisata,
      kabupaten: kabupaten,
      kategori_asli: kategori,
      kategori: kategori,
      htm_label: htm_label,
      htm_min: htm_min,
      htm_max: htm_min,
      longitude: longitude,
      latitude: latitude,
      rating: rating,
      deskripsi_singkat: deskripsi,
      // Default image path, akan otomatis diganti fallback jika tidak ada gambar
      image: `assets/img/${nama_wisata.replace(/[^a-zA-Z0-9]/g, '-')}.jpg`,
      image_status: "matched",
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nama_wisata + ', ' + kabupaten + ', Yogyakarta')}`
    });
  }

  // 5. Ubah object jadi teks JSON dan bungkus dalam variabel JS
  const jsonContent = JSON.stringify(destinations, null, 2);
  const finalJsContent = `/* Data destinasi Jogja One Stop Maps - generated dari Data_WebGIS.csv */\nconst destinations = ${jsonContent};\n\nwindow.JOSM_DESTINATIONS = destinations;\n`;

  // 6. Simpan/Tulis ke data/destinations.js
  fs.writeFileSync(jsFilePath, finalJsContent, 'utf8');
  console.log(`\u2705 BERHASIL! File ${jsFilePath} telah diupdate dengan data terbaru dari Excel (CSV). Total: ${destinations.length} destinasi.`);
  
} catch (err) {
  console.error('\u274C Gagal memproses file:', err.message);
}
