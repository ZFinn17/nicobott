// =============================================
// NicoBot Client — chatbot.js (v3 — UI/UX upgrade)
//
// Changelog dari v2:
//  1. formatBotReply() — smart formatter dengan
//     deteksi konteks: jurusan, biaya, fasilitas,
//     kontak, lokasi, jadwal, ekskul, alumni
//  2. Timestamp per bubble (HH:MM)
//  3. Unresolved state — bubble khusus + tombol WA
//  4. Feedback row dipindah ke CSS class (bukan inline style)
//  5. char counter di input
//  6. send button animasi saat loading
//  7. Scroll-to-bottom hanya jika user sudah di bawah
//  8. Welcome message responsif
//  9. Quick replies label lebih deskriptif dengan icon
// =============================================

'use strict';

const API_BASE = '/api';

// ─── Helpers ─────────────────────────────────────────────────────────
function getSessionId() {
  let sid = localStorage.getItem('nicobot_session');
  if (!sid) {
    sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('nicobot_session', sid);
  }
  return sid;
}

function nowHHMM() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Scroll ke bawah hanya jika user sudah dekat bawah (threshold 80px)
// Mencegah "lompat" saat user sedang scroll ke atas membaca pesan lama
function smartScroll(el) {
  const threshold = 80;
  const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  if (isNearBottom) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }
}

function forceScroll(el) {
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
}

const state = { sessionId: getSessionId(), isLoading: false };

// ─── Welcome message ─────────────────────────────────────────────────
function buildWelcomeHTML() {
  return `
    <div class="nicobot-welcome-card">
      <div class="nicobot-welcome-badge">
        <i class="fa-solid fa-school"></i>
        SMK ICB Cinta Niaga
      </div>
      <div class="nicobot-welcome-title">Halo! Saya NicoBot 👋</div>
      <p class="nicobot-welcome-desc">
        Asisten virtual resmi SMK ICB Cinta Niaga. Saya siap membantu menjawab pertanyaan seputar:
      </p>
      <div class="nicobot-welcome-topics">
        <span class="nicobot-welcome-topic"><i class="fa-solid fa-file-pen"></i>PPDB &amp; Pendaftaran</span>
        <span class="nicobot-welcome-topic"><i class="fa-solid fa-layer-group"></i>Jurusan &amp; Program</span>
        <span class="nicobot-welcome-topic"><i class="fa-solid fa-coins"></i>Biaya &amp; Beasiswa</span>
        <span class="nicobot-welcome-topic"><i class="fa-solid fa-school"></i>Fasilitas Sekolah</span>
        <span class="nicobot-welcome-topic"><i class="fa-solid fa-location-dot"></i>Lokasi &amp; Kontak</span>
      </div>
      <p class="nicobot-welcome-hint">
        Pilih topik di bawah atau ketik pertanyaan Anda. 😊
      </p>
    </div>
  `;
}

// ─── Smart formatter ─────────────────────────────────────────────────
// Deteksi konteks jawaban dan render komponen yang sesuai.
// Urutan deteksi penting — lebih spesifik di atas.

function formatBotReply(raw) {
  if (!raw || !raw.trim()) return '<p>Maaf, tidak ada jawaban.</p>';

  // Jika server sudah kirim HTML (rich reply) — langsung pakai
  if (/<[a-z][\s\S]*>/i.test(raw)) return autoLink(raw);

  // ── Deteksi konteks berdasarkan isi teks ────────────────────────
  const lower = raw.toLowerCase();

  // Jurusan — ada kata "rpl", "akl", "otkp", "pemasaran" + ada struktur list
  if (
    (lower.includes('rpl') || lower.includes('akl') || lower.includes('otkp') || lower.includes('pemasaran')) &&
    (lower.includes('keahlian') || lower.includes('jurusan') || raw.includes('\n'))
  ) {
    return renderJurusanCard(raw);
  }

  // Biaya — ada angka rupiah atau kata spp/biaya/bayar + angka
  if (/rp\.?\s*[\d.,]+|idr\s*[\d.,]+|\d+\.000/i.test(raw) && /biaya|spp|bayar|uang|iuran/i.test(lower)) {
    return renderBiayaCard(raw);
  }

  // Fasilitas — banyak item berbullet tentang tempat/ruang
  if (/fasilitas|laboratorium|perpustakaan|lapangan|kantin/i.test(lower) && raw.includes('\n')) {
    return renderFasilitasCard(raw);
  }

  // Kontak — ada telepon / email / wa / instagram
  if (/telepon|whatsapp|\+62|wa\.me|instagram|email|@/i.test(lower)) {
    return renderKontakCard(raw);
  }

  // Lokasi — ada alamat / jalan / bandung / maps
  if (/jl\.|jalan|bandung|lokasi|alamat|maps|google/i.test(lower)) {
    return renderLokasiCard(raw);
  }

  // Jadwal / jam — ada pola waktu HH.00 atau hari
  if (/\d{2}\.\d{2}|senin|selasa|rabu|kamis|jumat|sabtu|jam|pukul/i.test(lower)) {
    return renderJadwalCard(raw);
  }

  // Ekskul — daftar kegiatan
  if (/ekskul|ekstrakurikuler|osis|pramuka|pmr|futsal|basket/i.test(lower) && raw.includes('\n')) {
    return renderEkskulCard(raw);
  }

  // Fallback — plain text dengan formatting dasar
  return renderPlainText(raw);
}

// ── Renderer: Jurusan ───────────────────────────────────────────────
function renderJurusanCard(raw) {
  const JURUSAN = [
    { kode: 'RPL',      nama: 'Rekayasa Perangkat Lunak',   icon: 'fa-code',            desc: 'Pemrograman, web & mobile development' },
    { kode: 'AKL',      nama: 'Akuntansi & Keuangan',       icon: 'fa-calculator',      desc: 'Pembukuan, laporan keuangan, perpajakan' },
    { kode: 'Pemasaran',nama: 'Pemasaran',                  icon: 'fa-bullhorn',        desc: 'Marketing, digital commerce, bisnis' },
    { kode: 'OTKP',     nama: 'Otomatisasi & Tata Kelola',  icon: 'fa-briefcase',       desc: 'Administrasi perkantoran modern' },
  ];

  const cards = JURUSAN.map(j => `
    <div class="nico-jurusan-item">
      <div class="nico-jurusan-icon"><i class="fa-solid ${j.icon}"></i></div>
      <div class="nico-jurusan-body">
        <div class="nico-jurusan-kode">${j.kode}</div>
        <div class="nico-jurusan-nama">${j.nama}</div>
        <div class="nico-jurusan-desc">${j.desc}</div>
      </div>
    </div>
  `).join('');

  // Ambil teks pembuka sebelum list jurusan (jika ada)
  const intro = raw.split('\n')[0].trim();

  return `
    <p class="nico-section-intro">${intro}</p>
    <div class="nico-jurusan-grid">${cards}</div>
    <p class="nico-section-note">💡 Ketik nama jurusan untuk info lebih detail.</p>
  `;
}

// ── Renderer: Biaya ─────────────────────────────────────────────────
function renderBiayaCard(raw) {
  // Ekstrak baris-baris yang mengandung nominal
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const intro = lines[0];
  const items = lines.slice(1);

  const rows = items.map(line => {
    // Coba parse "Label : Rp X" atau "Label Rp X"
    const match = line.match(/^(.+?)\s*[:\-–]\s*(Rp\.?\s*[\d.,]+.*|[\d.,]+.*)$/i);
    if (match) {
      return `
        <div class="nico-biaya-row">
          <span class="nico-biaya-label">${match[1].replace(/^[•\-\d.]\s*/, '').trim()}</span>
          <span class="nico-biaya-amount">${match[2].trim()}</span>
        </div>`;
    }
    if (line) return `<div class="nico-biaya-note">${line.replace(/^[•\-]\s*/, '')}</div>`;
    return '';
  }).join('');

  return `
    <p class="nico-section-intro">${intro}</p>
    <div class="nico-biaya-card">${rows || '<div class="nico-biaya-note">'+items.join('<br>')+'</div>'}</div>
    <div class="nico-info-note"><i class="fa-solid fa-circle-info"></i> Hubungi sekolah untuk info beasiswa.</div>
  `;
}

// ── Renderer: Fasilitas ─────────────────────────────────────────────
function renderFasilitasCard(raw) {
  const ICONS = {
    'komputer': 'fa-computer', 'lab': 'fa-flask', 'perpustakaan': 'fa-book',
    'lapangan': 'fa-futbol', 'kantin': 'fa-utensils', 'mushola': 'fa-mosque',
    'masjid': 'fa-mosque', 'wifi': 'fa-wifi', 'aula': 'fa-building',
    'osis': 'fa-users', 'ruang': 'fa-door-open', 'toilet': 'fa-restroom',
  };

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const intro = lines[0];
  const items = lines.slice(1).filter(l => /^[•\-\*]|^\w/.test(l));

  const cards = items.map(item => {
    const clean = item.replace(/^[•\-\*]\s*/, '').trim();
    const iconKey = Object.keys(ICONS).find(k => clean.toLowerCase().includes(k));
    const icon = ICONS[iconKey] || 'fa-circle-check';
    return `
      <div class="nico-fasilitas-item">
        <i class="fa-solid ${icon}"></i>
        <span>${clean}</span>
      </div>`;
  }).join('');

  return `
    <p class="nico-section-intro">${intro}</p>
    <div class="nico-fasilitas-grid">${cards}</div>
  `;
}

// ── Renderer: Kontak ────────────────────────────────────────────────
function renderKontakCard(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  const rows = lines.map(line => {
    if (/telepon|telp|phone|\(\d/i.test(line)) {
      const num = line.replace(/^.*?:\s*/, '').trim();
      return `<div class="nico-kontak-row"><i class="fa-solid fa-phone"></i><span>${num}</span></div>`;
    }
    if (/whatsapp|wa\b/i.test(line)) {
      const num = line.replace(/^.*?:\s*/, '').replace(/\D/g, '');
      return `<div class="nico-kontak-row"><i class="fa-brands fa-whatsapp"></i>
        <a href="https://wa.me/62${num.replace(/^0/, '')}" target="_blank" rel="noopener" class="nico-wa-inline">
          ${line.replace(/^.*?:\s*/, '').trim()}
        </a></div>`;
    }
    if (/email|@/i.test(line)) {
      const email = line.match(/[\w._%+\-]+@[\w.\-]+\.[a-z]{2,}/i)?.[0] || '';
      return `<div class="nico-kontak-row"><i class="fa-solid fa-envelope"></i>
        <a href="mailto:${email}" class="nico-link">${email}</a></div>`;
    }
    if (/instagram|ig\b/i.test(line)) {
      const handle = line.replace(/^.*?:\s*/, '').trim();
      return `<div class="nico-kontak-row"><i class="fa-brands fa-instagram"></i><span>${handle}</span></div>`;
    }
    if (/website|www\.|http/i.test(line)) {
      const url = line.replace(/^.*?:\s*/, '').trim();
      return `<div class="nico-kontak-row"><i class="fa-solid fa-globe"></i>
        <a href="${url.startsWith('http') ? url : 'https://'+url}" target="_blank" rel="noopener" class="nico-link">${url}</a></div>`;
    }
    if (line) return `<div class="nico-kontak-row nico-kontak-note"><i class="fa-solid fa-circle-info"></i><span>${line}</span></div>`;
    return '';
  }).join('');

  return `<div class="nico-kontak-card">${rows}</div>`;
}

// ── Renderer: Lokasi ────────────────────────────────────────────────
function renderLokasiCard(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const alamat = lines.find(l => /jl\.|jalan|\d+/i.test(l)) || lines[1] || '';
  const extra = lines.filter(l => l !== lines[0] && l !== alamat);

  const mapsQuery = encodeURIComponent('SMK ICB Cinta Niaga Bandung');

  return `
    <p class="nico-section-intro">${lines[0]}</p>
    <div class="nico-lokasi-card">
      <div class="nico-lokasi-pin">
        <i class="fa-solid fa-location-dot"></i>
        <div>
          <div class="nico-lokasi-nama">SMK ICB Cinta Niaga</div>
          <div class="nico-lokasi-alamat">${alamat}</div>
        </div>
      </div>
      ${extra.map(l => `<div class="nico-lokasi-info">${l}</div>`).join('')}
      <a href="https://maps.google.com/?q=${mapsQuery}" target="_blank" rel="noopener" class="nico-maps-btn">
        <i class="fa-solid fa-map"></i> Buka Google Maps
      </a>
    </div>
  `;
}

// ── Renderer: Jadwal ────────────────────────────────────────────────
function renderJadwalCard(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const intro = lines[0];
  const items = lines.slice(1);

  const rows = items.map(line => {
    if (!line) return '';
    const isSection = /^[A-Z🕐]/.test(line) && !line.includes(':') && !line.includes('–');
    if (isSection) return `<div class="nico-jadwal-section">${line}</div>`;
    const match = line.match(/^[•\-\*]?\s*(.+?)\s*[:\-–]\s*(.+)$/);
    if (match) {
      return `
        <div class="nico-jadwal-row">
          <span class="nico-jadwal-day">${match[1].replace(/^[•\-]\s*/, '').trim()}</span>
          <span class="nico-jadwal-time">${match[2].trim()}</span>
        </div>`;
    }
    return `<div class="nico-jadwal-note">${line.replace(/^[•\-]\s*/, '')}</div>`;
  }).join('');

  return `
    <p class="nico-section-intro">${intro}</p>
    <div class="nico-jadwal-card">${rows}</div>
  `;
}

// ── Renderer: Ekskul ────────────────────────────────────────────────
function renderEkskulCard(raw) {
  const CATEGORY_ICONS = {
    'Olahraga': 'fa-futbol', 'Seni': 'fa-music', 'Akademik': 'fa-book',
    'Organisasi': 'fa-users', 'Teknologi': 'fa-laptop-code',
  };

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const intro = lines[0];

  let currentSection = '';
  const sections = {};

  lines.slice(1).forEach(line => {
    const isHeader = /^[🏆🎨📚💻]|^[A-Z][a-z]+ ?[&:]/u.test(line) && !line.startsWith('•') && !line.startsWith('-');
    if (isHeader) {
      currentSection = line.replace(/[🏆🎨📚💻:]/gu, '').trim();
      sections[currentSection] = [];
    } else if (line && currentSection) {
      const item = line.replace(/^[•\-\*,]\s*/, '').trim();
      if (item) sections[currentSection].push(item);
    } else if (line && !currentSection) {
      if (!sections['Kegiatan']) sections['Kegiatan'] = [];
      sections['Kegiatan'].push(line.replace(/^[•\-\*]\s*/, '').trim());
    }
  });

  const sectionsHtml = Object.entries(sections).map(([cat, items]) => {
    const icon = CATEGORY_ICONS[cat] || 'fa-star';
    const tags = items.map(i => `<span class="nico-ekskul-tag">${i}</span>`).join('');
    return `
      <div class="nico-ekskul-section">
        <div class="nico-ekskul-cat"><i class="fa-solid ${icon}"></i>${cat}</div>
        <div class="nico-ekskul-tags">${tags}</div>
      </div>`;
  }).join('');

  return `
    <p class="nico-section-intro">${intro}</p>
    <div class="nico-ekskul-card">${sectionsHtml}</div>
  `;
}

// ── Renderer: Plain text (fallback) ────────────────────────────────
function renderPlainText(raw) {
  let html = raw;

  // Numbered list
  html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, match => {
    const items = match.trim().split('\n')
      .map(l => `<li>${l.replace(/^\d+\.\s/, '').trim()}</li>`).join('');
    return `<ul class="nico-list numbered">${items}</ul>`;
  });

  // Bullet list
  html = html.replace(/((?:^[•\-\*]\s.+\n?)+)/gm, match => {
    const items = match.trim().split('\n')
      .map(l => `<li>${l.replace(/^[•\-\*]\s/, '').trim()}</li>`).join('');
    return `<ul class="nico-list bullet">${items}</ul>`;
  });

  // Paragraf
  html = html.split(/\n{2,}/).map(block => {
    block = block.trim();
    if (!block) return '';
    if (/^<[uod]/.test(block)) return block;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return autoLink(html);
}

// ── autoLink ────────────────────────────────────────────────────────
function autoLink(html) {
  html = html.replace(
    /https:\/\/wa\.me\/(\S+)/g,
    '<a href="https://wa.me/$1" class="nico-wa-inline" target="_blank" rel="noopener">' +
    '<i class="fa-brands fa-whatsapp"></i> Chat WhatsApp</a>'
  );
  html = html.replace(
    /(?<![="'])https?:\/\/((?!wa\.me)[^\s<>"']+)/g,
    '<a href="https://$1" class="nico-link" target="_blank" rel="noopener">$1</a>'
  );
  html = html.replace(
    /(?<![="'])\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g,
    '<a href="mailto:$1" class="nico-link">$1</a>'
  );
  return html;
}

// ─── Unresolved bubble ───────────────────────────────────────────────
function buildUnresolvedHTML(whatsappUrl) {
  return `
    <div class="nico-unresolved">
      <div class="nico-unresolved-header">
        <i class="fa-solid fa-circle-question"></i>
        <span>Maaf, saya belum punya jawaban untuk itu.</span>
      </div>
      <p class="nico-unresolved-sub">
        Pertanyaan Anda sudah saya catat. Admin kami siap membantu lebih lanjut.
      </p>
      <a href="${whatsappUrl || 'https://wa.me/6281221049998'}" target="_blank" rel="noopener" class="nico-wa-btn">
        <i class="fa-brands fa-whatsapp"></i>
        Hubungi Admin via WhatsApp
      </a>
    </div>
  `;
}

// ─── Feedback row ────────────────────────────────────────────────────
let feedbackCounter = 0;

// createFeedbackRow — menerima messageId dan faqId
// Keduanya dikirim ke /api/feedback sesuai validasi feedbackController.
// faqId diambil dari data.faq_id yang dikembalikan server di sendMessage.
function createFeedbackRow(messageId, faqId) {
  const id = `fb-${++feedbackCounter}`;
  const div = document.createElement('div');
  div.className = 'nico-feedback-row';
  div.innerHTML = `
    <span class="nico-feedback-label" id="${id}-label">Apakah ini membantu?</span>
    <button class="nico-fb-btn nico-fb-like"    data-val="like"    title="Ya, membantu"     aria-label="Jawaban membantu">👍</button>
    <button class="nico-fb-btn nico-fb-dislike" data-val="dislike" title="Belum membantu"   aria-label="Jawaban belum membantu">👎</button>
  `;

  div.querySelectorAll('.nico-fb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (div.dataset.voted) return;
      div.dataset.voted = '1';

      div.querySelectorAll('.nico-fb-btn').forEach(b => b.classList.add('nico-fb-dim'));
      btn.classList.remove('nico-fb-dim');
      btn.classList.add(btn.dataset.val === 'like' ? 'nico-fb-active-like' : 'nico-fb-active-dislike');

      const label = div.querySelector(`#${id}-label`);
      label.textContent = btn.dataset.val === 'like' ? 'Terima kasih! 😊' : 'Kami catat, terima kasih.';

      fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.sessionId,
          message_id: messageId,
          faq_id:     faqId,      // wajib — divalidasi feedbackController
          value:      btn.dataset.val
        })
      }).catch(() => {});
    });
  });

  return div;
}

// ─── Bubble builders ─────────────────────────────────────────────────
function createTimestamp() {
  const el = document.createElement('span');
  el.className = 'nico-timestamp';
  el.textContent = nowHHMM();
  return el;
}

function createBotBubble(htmlContent, isTyping = false, messageId = null, faqId = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nico-msg-row nico-msg-bot message-enter';

  const avatar = document.createElement('div');
  avatar.className = 'nico-avatar';
  avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';
  avatar.setAttribute('aria-hidden', 'true');

  const col = document.createElement('div');
  col.className = 'nico-msg-col';

  const bubble = document.createElement('div');
  bubble.className = 'nicobot-bubble-bot';

  if (isTyping) {
    wrapper.id = 'nicobot-typing';
    bubble.innerHTML = `<span class="nicobot-typing-dots"><span></span><span></span><span></span></span>`;
    col.appendChild(bubble);
  } else {
    bubble.innerHTML = htmlContent;
    col.appendChild(bubble);

    const meta = document.createElement('div');
    meta.className = 'nico-msg-meta';
    meta.appendChild(createTimestamp());

    if (messageId !== 'welcome') {
      meta.appendChild(createFeedbackRow(messageId || 'msg-' + Date.now(), faqId));
    }
    col.appendChild(meta);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(col);
  return wrapper;
}

function createUserBubble(text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nico-msg-row nico-msg-user message-enter';

  const col = document.createElement('div');
  col.className = 'nico-msg-col';

  const bubble = document.createElement('div');
  bubble.className = 'nicobot-bubble-user';
  bubble.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'nico-msg-meta nico-msg-meta-user';
  meta.appendChild(createTimestamp());

  col.appendChild(bubble);
  col.appendChild(meta);
  wrapper.appendChild(col);
  return wrapper;
}

function createErrorBubble(isNetworkError = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nico-msg-row nico-msg-bot message-enter';

  const avatar = document.createElement('div');
  avatar.className = 'nico-avatar';
  avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';

  const errorDiv = document.createElement('div');
  errorDiv.className = isNetworkError ? 'nico-error-bubble nico-error-network' : 'nico-error-bubble nico-error-server';

  if (isNetworkError) {
    errorDiv.innerHTML = `
      <div class="nico-error-header"><i class="fa-solid fa-plug-circle-xmark"></i> Tidak dapat terhubung</div>
      <p>Pastikan server NicoBot sudah berjalan.</p>
      <button class="nico-retry-btn" onclick="window.nicoRetry && window.nicoRetry(this)">
        <i class="fa-solid fa-rotate-right"></i> Coba lagi
      </button>`;
  } else {
    errorDiv.innerHTML = `
      <div class="nico-error-header"><i class="fa-solid fa-circle-exclamation"></i> Terjadi kesalahan</div>
      <p>Silakan coba pertanyaan lain.</p>`;
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(errorDiv);
  return wrapper;
}

// ─── Quick replies ───────────────────────────────────────────────────
// Icon per topik quick reply (index sesuai urutan dari server)
const QR_ICONS = [
  'fa-layer-group', 'fa-file-pen', 'fa-coins', 'fa-school',
  'fa-clock', 'fa-trophy', 'fa-location-dot', 'fa-bullseye'
];

async function loadQuickReplies(container) {
  try {
    const res = await fetch(`${API_BASE}/chat/quick-replies`);
    const json = await res.json();
    const replies = json.data || json || [];
    container.innerHTML = '';
    replies.forEach((r, i) => {
      const btn = document.createElement('button');
      btn.className = 'nicobot-quick-btn';
      btn.setAttribute('aria-label', r.label);
      btn.innerHTML = `<i class="fa-solid ${QR_ICONS[i] || 'fa-circle-info'}"></i>${r.label}`;
      btn.addEventListener('click', () => {
        container.style.display = 'none';
        sendMessage(r.value || r.message || r.label);
      });
      container.appendChild(btn);
    });
  } catch {
    container.innerHTML = '<p class="nico-qr-error">Gagal memuat pilihan topik.</p>';
  }
}

// ─── Send message ────────────────────────────────────────────────────
let lastMessage = '';

async function sendMessage(text) {
  if (state.isLoading || !text.trim()) return;
  lastMessage = text.trim();

  const messagesEl = document.getElementById('nicobot-messages');
  const inputEl    = document.getElementById('nicobot-input');
  const sendBtn    = document.getElementById('nicobot-send');
  const quickEl    = document.getElementById('nicobot-quick-replies');
  const charEl     = document.getElementById('nicobot-charcount');

  messagesEl.appendChild(createUserBubble(text));
  if (inputEl) { inputEl.value = ''; if (charEl) charEl.textContent = '0/200'; }
  if (quickEl) quickEl.style.display = 'none';
  forceScroll(messagesEl);

  state.isLoading = true;
  if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.add('nico-send-loading'); }
  messagesEl.appendChild(createBotBubble('', true));
  forceScroll(messagesEl);

  await new Promise(r => setTimeout(r, 500));

  try {
    const res = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: state.sessionId }),
    });

    const data = await res.json();
    document.getElementById('nicobot-typing')?.remove();

    if (!res.ok) {
      messagesEl.appendChild(createErrorBubble(false));
    } else if (data.resolved === false) {
      // Unresolved — tidak ada faq_id karena tidak ada FAQ yang cocok
      const msgId = data.message_id || null;
      const unresolvedBubble = createBotBubble(
        buildUnresolvedHTML(data.whatsapp_url),
        false,
        msgId,
        null    // faqId = null untuk unresolved
      );
      messagesEl.appendChild(unresolvedBubble);
      if (quickEl) { quickEl.style.display = 'flex'; loadQuickReplies(quickEl); }
    } else {
      // FAQ ditemukan — ambil faq_id dari response server
      const formatted = formatBotReply(data.answer || data.reply || '');
      const msgId  = data.message_id || data.messageId || null;
      const faqId  = data.faq_id     || null;   // dari chatController.sendMessage
      messagesEl.appendChild(createBotBubble(formatted, false, msgId, faqId));
    }
  } catch {
    document.getElementById('nicobot-typing')?.remove();
    messagesEl.appendChild(createErrorBubble(true));
  } finally {
    state.isLoading = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.classList.remove('nico-send-loading'); }
    smartScroll(messagesEl);
  }
}

window.nicoRetry = function(btn) {
  btn.closest('.nico-msg-row')?.remove();
  sendMessage(lastMessage);
};

// ─── Reset session ───────────────────────────────────────────────────
async function resetSession() {
  try {
    await fetch(`${API_BASE}/chat/conversation/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: state.sessionId }),
    });
  } catch {}

  localStorage.removeItem('nicobot_session');
  state.sessionId = getSessionId();
  state.isLoading = false;

  const messagesEl = document.getElementById('nicobot-messages');
  const inputEl    = document.getElementById('nicobot-input');
  const sendBtn    = document.getElementById('nicobot-send');
  const quickEl    = document.getElementById('nicobot-quick-replies');
  const charEl     = document.getElementById('nicobot-charcount');

  if (messagesEl) {
    messagesEl.innerHTML = '';
    messagesEl.appendChild(createBotBubble(buildWelcomeHTML(), false, 'welcome'));
  }
  if (inputEl)  { inputEl.disabled = false; inputEl.value = ''; }
  if (sendBtn)  sendBtn.disabled = false;
  if (quickEl)  { quickEl.style.display = 'flex'; loadQuickReplies(quickEl); }
  if (charEl)   charEl.textContent = '0/200';
}

// ─── Init ────────────────────────────────────────────────────────────
export function initChatbot() {
  const messagesEl = document.getElementById('nicobot-messages');
  const inputEl    = document.getElementById('nicobot-input');
  const sendBtn    = document.getElementById('nicobot-send');
  const resetBtn   = document.getElementById('nicobot-reset');
  const quickEl    = document.getElementById('nicobot-quick-replies');
  const charEl     = document.getElementById('nicobot-charcount');

  if (!messagesEl) { console.warn('NicoBot: #nicobot-messages tidak ditemukan.'); return; }

  messagesEl.appendChild(createBotBubble(buildWelcomeHTML(), false, 'welcome'));
  if (quickEl) loadQuickReplies(quickEl);

  // Char counter
  inputEl?.addEventListener('input', () => {
    const len = inputEl.value.length;
    if (charEl) {
      charEl.textContent = `${len}/200`;
      charEl.classList.toggle('nico-charcount-warn', len > 160);
    }
    if (len > 200) inputEl.value = inputEl.value.slice(0, 200);
  });

  sendBtn?.addEventListener('click', () => sendMessage(inputEl?.value.trim() ?? ''));
  inputEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value.trim()); }
  });
  resetBtn?.addEventListener('click', resetSession);
}