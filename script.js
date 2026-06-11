'use strict';

const categoryMeta = {
  Pantai: { icon: 'waves', color: 'var(--teal)', description: 'Pesona pasir & pemandangan laut' },
  Bukit: { icon: 'mountain', color: 'var(--gold)', description: 'Panorama indah & spot terbaik' },
  Goa: { icon: 'landmark', color: 'var(--purple)', description: 'Keajaiban dalam petualangan alam' },
  'Air Terjun': { icon: 'droplets', color: 'var(--blue)', description: 'Kesegaran alami yang menenangkan' },
  Hutan: { icon: 'trees', color: 'var(--leaf)', description: 'Keindahan & ketenangan alam' },
  Lainnya: { icon: 'compass', color: 'var(--orange)', description: 'Wisata budaya & destinasi lainnya' },
};

const fallbackImages = {
  Pantai: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82',
  Bukit: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=82',
  Goa: 'https://images.unsplash.com/photo-1512036666432-2181c1f26420?auto=format&fit=crop&w=900&q=82',
  'Air Terjun': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=82',
  Hutan: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=82',
  Lainnya: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82',
};

function getDestinations() {
  return Array.isArray(window.destinations) ? window.destinations : (typeof destinations !== 'undefined' ? destinations : []);
}

function formatRating(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(1).replace('.', ',');
}

function escapeHtml(text = '') {
  return String(text).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function summarizeData(data) {
  const categories = [...new Set(data.map(d => d.kategori).filter(Boolean))];
  const kabupaten = [...new Set(data.map(d => d.kabupaten).filter(Boolean))];
  const ratings = data.map(d => Number(d.rating)).filter(n => !Number.isNaN(n));
  const avgRating = ratings.reduce((a,b) => a + b, 0) / ratings.length;
  return {
    total: data.length,
    categories: categories.length,
    kabupaten: kabupaten.length,
    avgRating: avgRating || 0,
  };
}

function renderStats() {
  const data = getDestinations();
  const s = summarizeData(data);
  const stats = [
    { icon: 'map-pin', value: s.total, label: 'Destinasi Wisata' },
    { icon: 'layout-grid', value: s.categories, label: 'Kategori' },
    { icon: 'map', value: s.kabupaten, label: 'Kabupaten' },
    { icon: 'star', value: Number(s.avgRating || 0).toFixed(1).replace('.', ','), label: 'Rata-rata Rating' },
  ];
  document.querySelector('#statsCard').innerHTML = stats.map(item => `
    <article class="stat-item">
      <div class="stat-icon"><i data-lucide="${item.icon}"></i></div>
      <div><strong>${item.value}</strong><span>${item.label}</span></div>
    </article>
  `).join('');
}

function renderCategories() {
  const data = getDestinations();
  const order = ['Pantai', 'Bukit', 'Goa', 'Air Terjun', 'Hutan', 'Lainnya'];
  const counts = data.reduce((acc, item) => {
    acc[item.kategori] = (acc[item.kategori] || 0) + 1;
    return acc;
  }, {});
  document.querySelector('#categoryGrid').innerHTML = order.map(cat => {
    const meta = categoryMeta[cat];
    return `
      <article class="category-card reveal">
        <div class="category-icon" style="background:${meta.color}"><i data-lucide="${meta.icon}"></i></div>
        <h3>${cat}</h3>
        <p>${meta.description}</p>
        <small>${counts[cat] || 0}+ Destinasi</small>
      </article>
    `;
  }).join('');
}

function getTopDestinations(data) {
  const curatedIds = [
    'pantai-jungwok',
    'sungai-mudal',
    'bukit-paralayang-watugupit'
  ];

  const curatedList = [];
  curatedIds.forEach(id => {
    const item = data.find(d => d.id === id);
    if (item) curatedList.push(item);
  });

  if (curatedList.length === 3) return curatedList;

  // Fallback to broad list in case of ID mismatch
  return data
    .filter(d => curatedIds.includes(d.id))
    .concat(data.filter(d => !curatedIds.includes(d.id)))
    .slice(0, 3);
}

function imageSrc(dest) {
  return dest.image || fallbackImages[dest.kategori] || fallbackImages.Lainnya;
}

function onImgError(img, kategori) {
  const fallback = fallbackImages[kategori] || fallbackImages.Lainnya;
  if (img.src !== fallback) img.src = fallback;
}

function googleMapsSearchUrl(dest) {
  if (dest.google_maps_url) return dest.google_maps_url;
  const query = [dest.nama_wisata, dest.kabupaten, 'Yogyakarta'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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
  document.querySelector('#modalDescription').textContent = dest.deskripsi_singkat || 'Informasi detail destinasi akan ditampilkan di sini.';
  document.querySelector('#modalRoute').href = googleMapsSearchUrl(dest);
  document.querySelector('#modalMap').href = `map.html?destinasi=${encodeURIComponent(dest.id)}`;

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

function renderTopDestinations() {
  const top = getTopDestinations(getDestinations());
  document.querySelector('#topDestinationGrid').innerHTML = top.map((dest) => `
    <article class="destination-card reveal">
      <div class="destination-image">
        <img src="${escapeHtml(imageSrc(dest))}" alt="${escapeHtml(dest.nama_wisata)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImages[dest.kategori] || fallbackImages.Lainnya}'" />
      </div>
      <div class="destination-body">
        <h3>${escapeHtml(dest.nama_wisata)}</h3>
        <div class="destination-meta">
          <span><i data-lucide="map-pin"></i> ${escapeHtml(dest.kabupaten)}</span>
          <span class="rating"><i data-lucide="star"></i> ${formatRating(dest.rating)}</span>
        </div>
        <p>${escapeHtml(dest.deskripsi_singkat || 'Destinasi wisata Yogyakarta yang menarik untuk dikunjungi.')}</p>
        <div class="destination-tags">
          <span>${escapeHtml(dest.kategori)}</span>
          <span>${escapeHtml(dest.htm_label || 'HTM belum tersedia')}</span>
        </div>
        <div class="destination-actions">
          <button class="card-btn" type="button" data-detail-id="${escapeHtml(dest.id)}">Lihat Detail <i data-lucide="arrow-right"></i></button>
          <a class="card-btn" href="${escapeHtml(googleMapsSearchUrl(dest))}" target="_blank" rel="noopener">Rute Lokasi <i data-lucide="navigation"></i></a>
        </div>
      </div>
    </article>
  `).join('');
  document.querySelectorAll('[data-detail-id]').forEach(button => {
    button.addEventListener('click', () => openDetailModal(button.dataset.detailId));
  });
}

function initNavbar() {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('#navToggle');
  const menu = document.querySelector('#navMenu');
  const logo = header ? header.querySelector('.brand-logo') : null;
  const isDestinationPage = document.body.classList.contains('destination-page');
  const updateHeader = () => {
    const isScrolled = window.scrollY > 10;
    if (header) header.classList.toggle('scrolled', isScrolled);
    if (logo) {
      if (isDestinationPage) {
        logo.src = 'LOGO_HEADER.png';
      } else {
        logo.src = isScrolled ? 'LOGO_HEADER.png' : 'LOGO_HEADER_LIGHT.png';
      }
    }
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }
}

function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function init() {
  renderStats();
  renderCategories();
  renderTopDestinations();
  lucide.createIcons({ strokeWidth: 2.4 });
  initModal();
  initNavbar();
  initReveal();
}

document.addEventListener('DOMContentLoaded', init);
