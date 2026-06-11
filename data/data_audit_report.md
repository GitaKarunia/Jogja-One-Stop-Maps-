# Audit Kelengkapan Data & Laporan Jogja One Stop Maps

> [!NOTE]
> Laporan ini dibuat secara otomatis untuk mengaudit integritas file `Data_WebGIS.csv` terhadap resource gambar di `assets/img/` dan validasi atribut lainnya.

## 1. Ringkasan Jumlah Data

| Metrik Audit | Jumlah | Catatan |
|---|---|---|
| **Total Baris CSV** | 118 | Baris data mentah dari CSV |
| **Total Destinasi setelah Deduplikasi** | 117 | Jumlah entitas unik unik |
| **Destinasi dengan Koordinat Valid** | 116 | Ditampilkan di Peta & Landing |
| **Destinasi dengan Koordinat Bermasalah** | 1 | Hanya tampil di catalog destinasi |
| **Total Gambar Matched** | 110 | Gambar berhasil dipasangkan |
| **Total Gambar Missing** | 7 | Menggunakan placeholder/fallback |
| **Total HTM Valid / Gratis** | 117 | Terbaca nominalnya untuk sorting |
| **Total HTM Kosong / Belum Tersedia** | 0 | Nilai sorting di-fallback |
| **Total Rating Valid** | 117 | Skala 1.0 - 5.0 |
| **Total Rating Kosong** | 0 | Ditampilkan sebagai '-' |

## 2. Daftar Destinasi Tanpa Gambar

| Nama Wisata | Kabupaten | Kategori | Kolom Gambar CSV | Status |
|---|---|---|---|---|
| Tlogo Putri Kaliurang | Sleman | Lainnya | *kosong* | Fallback/placeholder |
| Gua Cerme | Bantul | Goa | *kosong* | Fallback/placeholder |
| Lembah Oyo, Kedung Jati | Bantul | Lainnya | *kosong* | Fallback/placeholder |
| Wisata Tanjung Kesirat | Gunung Kidul | Pantai | *kosong* | Fallback/placeholder |
| Pantai Pandansari | Bantul | Pantai | *kosong* | Fallback/placeholder |
| Pantai Baros | Bantul | Pantai | *kosong* | Fallback/placeholder |
| Wisata Alam Puntuk Gondang | Kulon Progo | Bukit | *kosong* | Fallback/placeholder |

## 3. Daftar Destinasi dengan Koordinat Bermasalah

| Nama Wisata | Kabupaten | Long | Lat | Masalah | Dampak |
|---|---|---|---|---|---|
| Pantai Baru | Bantul | 110.2210096 | -7.987.748.030.561.820 | Lat corrupt (banyak titik) | Tampil di destinasi.html, EXCLUDE marker di map.html |

## 4. Daftar Destinasi dengan HTM Bermasalah / Kosong

| Nama Wisata | HTM Asli | htm_label | htm_min | htm_max | Catatan |
|---|---|---|---|---|---|
| *Semua HTM valid!* | | | | | |

## 5. Daftar Destinasi dengan Rating Bermasalah

| Nama Wisata | Rating Asli | Rating Output | Catatan |
|---|---|---|---|
| *Semua rating valid!* | | | |

## 6. Daftar Kategori yang Dinormalisasi

| Kategori Asli CSV | Kategori Output | Jumlah |
|---|---|---|
| Gunung | Bukit | 3 |
| Sungai | Lainnya | 6 |
| Air | Lainnya | 1 |
| Geologi | Lainnya | 1 |
| Waduk | Lainnya | 1 |
| Perkebunan | Lainnya | 1 |
| Air terjun | Air Terjun | 1 |

## 7. Daftar Nama Destinasi yang Diperbaiki

| Nama Asli | Nama Perbaikan | Alasan |
|---|---|---|
| Pantau Baru | Pantai Baru | Typo penulisan Pantai |

## 8. Daftar Duplikat yang Ditemukan

| Nama Wisata | Kabupaten | Jumlah Duplikat | Entry yang Dipakai | Alasan |
|---|---|---|---|---|
| Waduk Sermo | Kulon Progo | 2 | Baris Lama | Atribut lama lebih lengkap |

## 9. Daftar File Gambar di assets/img yang Tidak Terpakai

| Nama File | Kemungkinan Cocok Dengan | Catatan |
|---|---|---|
| [goa-cerme.jpeg](file:///c:/JOGJA%20ONE%20STOP%20MAPS%20FINAL/assets/img/goa-cerme.jpeg) | Tidak ada | Ada di folder assets/img tapi tidak terpakai di CSV |
| [Laguna-barat-glagah.jpg](file:///c:/JOGJA%20ONE%20STOP%20MAPS%20FINAL/assets/img/Laguna-barat-glagah.jpg) | Tidak ada | Ada di folder assets/img tapi tidak terpakai di CSV |
| [Lembah-Oya-Kedungjati.webp](file:///c:/JOGJA%20ONE%20STOP%20MAPS%20FINAL/assets/img/Lembah-Oya-Kedungjati.webp) | Tidak ada | Ada di folder assets/img tapi tidak terpakai di CSV |
| [Pantai-Bugel.jpg.jpg](file:///c:/JOGJA%20ONE%20STOP%20MAPS%20FINAL/assets/img/Pantai-Bugel.jpg.jpg) | Tidak ada | Ada di folder assets/img tapi tidak terpakai di CSV |
| [Puncak-Dipowono.jpg.jpg](file:///c:/JOGJA%20ONE%20STOP%20MAPS%20FINAL/assets/img/Puncak-Dipowono.jpg.jpg) | Tidak ada | Ada di folder assets/img tapi tidak terpakai di CSV |
| [Tlog-Putri-Kaliurang.jpg](file:///c:/JOGJA%20ONE%20STOP%20MAPS%20FINAL/assets/img/Tlog-Putri-Kaliurang.jpg) | Tidak ada | Ada di folder assets/img tapi tidak terpakai di CSV |
| [Wisata-puntuk-gondang.png.png](file:///c:/JOGJA%20ONE%20STOP%20MAPS%20FINAL/assets/img/Wisata-puntuk-gondang.png.png) | Tidak ada | Ada di folder assets/img tapi tidak terpakai di CSV |

## Rekomendasi Perbaikan Manual

Untuk meningkatkan kualitas WebGIS Wisata Alam Yogyakarta, berikut hal yang dapat ditindaklanjuti secara manual:

- **Perbaikan Koordinat Invalid / Corrupt**:
  - **Pantai Baru** (Lat corrupt `-7.987.748...`) dan **Goa Kebon** (Long `10.1587883` - di luar DIY). Segera perbaiki koordinatnya agar marker muncul di peta.
- **Pemasangan Gambar Manual**:
  - Hubungkan gambar tidak terpakai seperti `Laguna-barat-glagah.jpg` dengan destinasi di CSV jika sesuai.
  - Beberapa destinasi dengan status *missing image* (misal: Air Terjun Grojogan Sewu Kulon Progo) perlu dicarikan fotonya dan di-upload ke folder `assets/img/` dengan nama file yang sesuai.
- **HTM & Rating**:
  - Tinjau kembali beberapa destinasi dengan HTM kosong atau berformat teks ambigu di CSV agar pencarian rentang harga di masa mendatang dapat berjalan 100% sempurna.
