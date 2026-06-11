'use strict';

const categoryMeta = {
  Pantai: { icon: 'waves', color: 'var(--teal)' },
  Bukit: { icon: 'mountain', color: 'var(--gold)' },
  Goa: { icon: 'landmark', color: 'var(--purple)' },
  'Air Terjun': { icon: 'droplets', color: 'var(--blue)' },
  Hutan: { icon: 'trees', color: 'var(--leaf)' },
  Lainnya: { icon: 'compass', color: 'var(--orange)' },
};

const fallbackImages = {
  Pantai: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82',
  Bukit: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=82',
  Goa: 'https://images.unsplash.com/photo-1512036666432-2181c1f26420?auto=format&fit=crop&w=900&q=82',
  'Air Terjun': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=82',
  Hutan: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=82',
  Lainnya: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82',
};

const state = {
  query: '',
  category: 'all',
  regency: 'all',
  sort: 'rating-desc',
  visibleCount: 12,
};

function getDestinations() {
  return Array.isArray(window.destinations) ? window.destinations : (typeof destinations !== 'undefined' ? destinations : []);
}

function escapeHtml(text = '') {
  return String(text).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

const fallbacks = {
  Pantai: "Pantai dengan suasana pesisir yang cocok untuk menikmati pemandangan laut, bermain air, dan bersantai.",
  Goa: "Goa alam dengan suasana karst khas Yogyakarta yang cocok untuk wisata petualangan dan eksplorasi ringan.",
  Bukit: "Kawasan perbukitan dengan panorama alam terbuka yang cocok untuk menikmati udara sejuk dan pemandangan lanskap.",
  'Air Terjun': "Air terjun alami dengan suasana sejuk dan pemandangan hijau yang cocok untuk wisata alam.",
  Hutan: "Kawasan hutan wisata dengan suasana teduh yang cocok untuk bersantai, berjalan santai, dan menikmati alam.",
  Lainnya: "Destinasi wisata alam dengan daya tarik lokal yang cocok untuk kunjungan santai dan eksplorasi ringan."
};

function getFallbackForCategory(category) {
  return fallbacks[category] || fallbacks.Lainnya;
}

function cleanDescriptionText(text = '') {
  let cleaned = String(text).trim();
  
  // Clean outer double quotes
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }
  
  // Replace double inner quotes "" with single quote or single double quote
  cleaned = cleaned.replace(/""/g, '"');
  
  // Clean trailing ellipsis or double dots
  cleaned = cleaned.replace(/\.{2,}/g, '').trim();
  
  return cleaned;
}

function getDestinationCardDescription(dest) {
  let text = cleanDescriptionText(dest.deskripsi_singkat);
  
  if (text.length < 10) {
    return getFallbackForCategory(dest.kategori);
  }
  
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const trimmedSentences = sentences.map(s => s.trim()).filter(Boolean);
  
  if (trimmedSentences.length === 0) {
    return getFallbackForCategory(dest.kategori);
  }
  
  let firstSentence = trimmedSentences[0];
  if (!/[.!?]$/.test(firstSentence)) {
    firstSentence += '.';
  }
  
  if (firstSentence.length >= 60 && firstSentence.length <= 190) {
    return firstSentence;
  }
  
  if (firstSentence.length < 60) {
    if (trimmedSentences.length > 1) {
      let secondSentence = trimmedSentences[1];
      if (!/[.!?]$/.test(secondSentence)) {
        secondSentence += '.';
      }
      const combined = firstSentence + ' ' + secondSentence;
      if (combined.length <= 190) {
        return combined;
      }
    }
    if (firstSentence.length >= 40) {
      return firstSentence;
    }
  }
  
  return getFallbackForCategory(dest.kategori);
}

function debounce(fn, wait = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function formatRating(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(1).replace('.', ',');
}

function imageSrc(dest) {
  return dest.image || fallbackImages[dest.kategori] || fallbackImages.Lainnya;
}

function googleMapsSearchUrl(dest) {
  if (dest.google_maps_url) return dest.google_maps_url;
  const query = [dest.nama_wisata, dest.kabupaten, 'Yogyakarta'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function summarizeData(data) {
  const categories = [...new Set(data.map(d => d.kategori).filter(Boolean))];
  const regencies = [...new Set(data.map(d => d.kabupaten).filter(Boolean))];
  const ratings = data.map(d => Number(d.rating)).filter(n => !Number.isNaN(n));
  const avgRating = ratings.reduce((a, b) => a + b, 0) / Math.max(1, ratings.length);
  return { total: data.length, categories: categories.length, regencies: regencies.length, avgRating };
}

function populateFilters() {
  const data = getDestinations();
  const categoryOrder = ['Pantai', 'Bukit', 'Goa', 'Air Terjun', 'Hutan', 'Lainnya'];
  const categories = categoryOrder.filter(cat => data.some(item => item.kategori === cat));
  const regencies = [...new Set(data.map(item => item.kabupaten).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));

  const categorySelect = document.querySelector('#categorySelect');
  const regencySelect = document.querySelector('#regencySelect');

  categorySelect.innerHTML = '<option value="all">Semua kategori</option>' + categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
  regencySelect.innerHTML = '<option value="all">Semua kabupaten</option>' + regencies.map(reg => `<option value="${escapeHtml(reg)}">${escapeHtml(reg)}</option>`).join('');
}

function renderPageSummary() {
  const data = getDestinations();
  const s = summarizeData(data);
  const target = document.querySelector('#pageSummary');
  target.innerHTML = `
    <span><i data-lucide="map-pin"></i><b>${s.total}</b> destinasi</span>
    <span><i data-lucide="layout-grid"></i><b>${s.categories}</b> kategori</span>
    <span><i data-lucide="map"></i><b>${s.regencies}</b> kabupaten</span>
    <span><i data-lucide="star"></i><b>${formatRating(s.avgRating)}</b> rating rata-rata</span>
  `;
}

function getFilteredData() {
  const query = state.query.trim().toLowerCase();
  const data = getDestinations().filter(item => {
    const text = [
      item.nama_wisata,
      item.kabupaten,
      item.kategori,
      item.kategori_asli,
      item.deskripsi_singkat,
      item.htm_label,
    ].filter(Boolean).join(' ').toLowerCase();

    const matchQuery = !query || text.includes(query);
    const matchCategory = state.category === 'all' || item.kategori === state.category;
    const matchRegency = state.regency === 'all' || item.kabupaten === state.regency;
    return matchQuery && matchCategory && matchRegency;
  });

  return sortData(data);
}

function sortData(data) {
  const cloned = [...data];
  switch (state.sort) {
    case 'name-asc':
      return cloned.sort((a, b) => String(a.nama_wisata).localeCompare(String(b.nama_wisata), 'id'));
    case 'price-asc':
      return cloned.sort((a, b) => Number(a.htm_min ?? 999999999) - Number(b.htm_min ?? 999999999) || String(a.nama_wisata).localeCompare(String(b.nama_wisata), 'id'));
    case 'price-desc':
      return cloned.sort((a, b) => {
        const av = Number.isFinite(Number(a.htm_max)) ? Number(a.htm_max) : Number.NEGATIVE_INFINITY;
        const bv = Number.isFinite(Number(b.htm_max)) ? Number(b.htm_max) : Number.NEGATIVE_INFINITY;
        return bv - av || Number(b.rating || 0) - Number(a.rating || 0);
      });
    case 'rating-asc':
      return cloned.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0) || String(a.nama_wisata).localeCompare(String(b.nama_wisata), 'id'));
    case 'category-asc':
      return cloned.sort((a, b) => String(a.kategori).localeCompare(String(b.kategori), 'id') || String(a.nama_wisata).localeCompare(String(b.nama_wisata), 'id'));
    case 'rating-desc':
    default:
      return cloned.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0) || String(a.nama_wisata).localeCompare(String(b.nama_wisata), 'id'));
  }
}

function renderActiveFilters(filteredTotal) {
  const active = [];
  if (state.query.trim()) active.push(`Cari: ${state.query.trim()}`);
  if (state.category !== 'all') active.push(`Kategori: ${state.category}`);
  if (state.regency !== 'all') active.push(`Kabupaten: ${state.regency}`);
  const target = document.querySelector('#activeFilters');
  target.innerHTML = active.map(item => `<span class="filter-chip-active">${escapeHtml(item)}</span>`).join('');

  const resultTitle = document.querySelector('#resultTitle');
  resultTitle.textContent = active.length ? 'Destinasi sesuai filter' : 'Daftar destinasi';

  const allTotal = getDestinations().length;
  const visible = Math.min(state.visibleCount, filteredTotal);
  document.querySelector('#resultCount').textContent = `Menampilkan ${visible} dari ${filteredTotal} destinasi${filteredTotal !== allTotal ? ` — total data ${allTotal}` : ''}.`;
}

function cardTemplate(dest) {
  const fallback = fallbackImages[dest.kategori] || fallbackImages.Lainnya;
  return `
    <article class="catalog-card">
      <div class="catalog-image" data-detail-id="${escapeHtml(dest.id)}" style="cursor:pointer">
        <img src="${escapeHtml(imageSrc(dest))}" alt="${escapeHtml(dest.nama_wisata)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'" />
        <div class="catalog-badge-row">
          <span class="category-badge">${escapeHtml(dest.kategori || 'Destinasi')}</span>
          <span class="rating-badge"><i data-lucide="star"></i>${formatRating(dest.rating)}</span>
        </div>
      </div>
      <div class="catalog-body">
        <h3 data-detail-id="${escapeHtml(dest.id)}" style="cursor:pointer">${escapeHtml(dest.nama_wisata || 'Destinasi wisata')}</h3>
        <div class="catalog-meta">
          <span><i data-lucide="map-pin"></i>${escapeHtml(dest.kabupaten || 'Yogyakarta')}</span>
          <span><i data-lucide="ticket"></i>${escapeHtml(dest.htm_label || 'HTM belum tersedia')}</span>
        </div>
        <p>${escapeHtml(getDestinationCardDescription(dest))}</p>
        <div class="catalog-actions">
          <a class="card-btn" href="map.html?destinasi=${encodeURIComponent(dest.id || dest.nama_wisata || '')}">Lihat di Peta <i data-lucide="map-pin"></i></a>
          <a class="card-btn" href="${escapeHtml(googleMapsSearchUrl(dest))}" target="_blank" rel="noopener">Rute Lokasi <i data-lucide="navigation"></i></a>
        </div>
      </div>
    </article>
  `;
}

function renderCatalog() {
  const filtered = getFilteredData();
  const visibleData = filtered.slice(0, state.visibleCount);
  const grid = document.querySelector('#destinationList');
  const empty = document.querySelector('#emptyState');
  const loadMoreWrap = document.querySelector('.load-more-wrap');

  grid.innerHTML = visibleData.map(cardTemplate).join('');
  empty.hidden = filtered.length > 0;
  loadMoreWrap.hidden = filtered.length === 0 || state.visibleCount >= filtered.length;

  renderActiveFilters(filtered.length);
  bindDetailButtons();
  lucide.createIcons({ strokeWidth: 2.4 });
}

function bindDetailButtons() {
  document.querySelectorAll('[data-detail-id]').forEach(button => {
    button.addEventListener('click', () => openDetailModal(button.dataset.detailId));
  });
}

function resetFilters() {
  state.query = '';
  state.category = 'all';
  state.regency = 'all';
  state.sort = 'rating-desc';
  state.visibleCount = 12;
  document.querySelector('#searchInput').value = '';
  document.querySelector('#categorySelect').value = 'all';
  document.querySelector('#regencySelect').value = 'all';
  document.querySelector('#sortSelect').value = 'rating-desc';
  renderCatalog();
}

function initFilters() {
  const searchInput = document.querySelector('#searchInput');
  const categorySelect = document.querySelector('#categorySelect');
  const regencySelect = document.querySelector('#regencySelect');
  const sortSelect = document.querySelector('#sortSelect');

  const renderDebounced = debounce(renderCatalog, 200);
  searchInput.addEventListener('input', event => {
    state.query = event.target.value;
    state.visibleCount = 12;
    renderDebounced();
  });
  categorySelect.addEventListener('change', event => {
    state.category = event.target.value;
    state.visibleCount = 12;
    renderCatalog();
  });
  regencySelect.addEventListener('change', event => {
    state.regency = event.target.value;
    state.visibleCount = 12;
    renderCatalog();
  });
  sortSelect.addEventListener('change', event => {
    state.sort = event.target.value;
    state.visibleCount = 12;
    renderCatalog();
  });

  document.querySelector('#resetFilter').addEventListener('click', resetFilters);
  document.querySelector('#emptyReset').addEventListener('click', resetFilters);
  document.querySelector('#loadMore').addEventListener('click', () => {
    state.visibleCount += 12;
    renderCatalog();
  });
}

function openDetailModal(destId) {
  const dest = getDestinations().find(item => item.id === destId);
  const modal = document.querySelector('#detailModal');
  if (!dest || !modal) return;

  const img = document.querySelector('#modalImage');
  img.src = imageSrc(dest);
  img.alt = dest.nama_wisata;
  img.onerror = () => { img.onerror = null; img.src = fallbackImages[dest.kategori] || fallbackImages.Lainnya; };

  document.querySelector('#modalCategory').textContent = dest.kategori || 'Destinasi';
  document.querySelector('#modalRating').textContent = formatRating(dest.rating);
  document.querySelector('#modalTitle').textContent = dest.nama_wisata || 'Destinasi wisata';
  document.querySelector('#modalKabupaten').textContent = dest.kabupaten || 'Yogyakarta';
  document.querySelector('#modalHtm').textContent = dest.htm_label || 'HTM belum tersedia';
  document.querySelector('#modalDescription').textContent = cleanDescriptionText(dest.deskripsi_singkat) || 'Informasi detail destinasi akan ditampilkan di sini.';
  
  const modalRoute = document.querySelector('#modalRoute');
  const modalMap = document.querySelector('#modalMap');
  if (modalRoute) modalRoute.href = googleMapsSearchUrl(dest);
  if (modalMap) modalMap.href = `map.html?destinasi=${encodeURIComponent(dest.id)}`;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  lucide.createIcons({ strokeWidth: 2.4 });
}

function closeDetailModal() {
  const modal = document.querySelector('#detailModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function initModal() {
  document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeDetailModal));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDetailModal();
  });
}

function initNavbar() {
  const toggle = document.querySelector('#navToggle');
  const menu = document.querySelector('#navMenu');
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

function init() {
  populateFilters();
  renderPageSummary();
  initFilters();
  initModal();
  initNavbar();
  renderCatalog();
  lucide.createIcons({ strokeWidth: 2.4 });
}

document.addEventListener('DOMContentLoaded', init);
