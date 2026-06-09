// =============================================
// NicoBot Client — chatbot.js (Redesign v2)
// Perubahan utama:
//  1. Welcome message baru (card informatif)
//  2. formatBotReply() — auto list, highlight, link detection
//  3. Feedback 👍👎 per bubble bot
//  4. Error & unresolved state yang konsisten
//  5. Session pakai localStorage (tidak hilang saat refresh)
// =============================================

const API_BASE = '/api';

// ─── Session ────────────────────────────────────────────────────────
function getSessionId() {
  let sid = localStorage.getItem('nicobot_session');
  if (!sid) {
    sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('nicobot_session', sid);
  }
  return sid;
}

const state = { sessionId: getSessionId(), isLoading: false };

// ─── Welcome message ────────────────────────────────────────────────
function buildWelcomeHTML() {
  return `
    <div class="nicobot-welcome-card">
      <div class="nicobot-welcome-badge">
        <i class="fa-solid fa-school" style="font-size:0.65rem"></i>
        SMK ICB Cinta Niaga
      </div>
      <div class="nicobot-welcome-title">Halo! Saya NicoBot 👋</div>
      <p style="font-size:0.85rem;color:#475569;line-height:1.6;margin-top:0.15rem">
        Saya dapat membantu menjawab pertanyaan seputar:
      </p>
      <div class="nicobot-welcome-topics">
        <span class="nicobot-welcome-topic">PPDB &amp; Pendaftaran</span>
        <span class="nicobot-welcome-topic">Jurusan &amp; Program Keahlian</span>
        <span class="nicobot-welcome-topic">Biaya &amp; Beasiswa</span>
        <span class="nicobot-welcome-topic">Fasilitas Sekolah</span>
        <span class="nicobot-welcome-topic">Lokasi &amp; Kontak</span>
      </div>
      <p style="font-size:0.82rem;color:#64748b;margin-top:0.5rem">
        Silakan pilih topik di bawah atau ketik pertanyaan Anda. 😊
      </p>
    </div>
  `;
}

// ─── formatBotReply ─────────────────────────────────────────────────
// Jika server sudah mengembalikan HTML rich (class nicobot-*),
// langsung pakai. Jika plain text, terapkan auto-formatting.
function formatBotReply(raw) {
  // Jika sudah HTML dari server (ada tag HTML), langsung pakai
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return autoLink(raw);
  }

  // Plain text — terapkan formatting
  let html = raw;

  // 1. Deteksi numbered list: baris yang dimulai dengan "1.", "2.", dst
  html = html.replace(
    /((?:^\d+\.\s.+\n?)+)/gm,
    (match) => {
      const items = match.trim().split('\n').map(line =>
        `<li>${line.replace(/^\d+\.\s/, '').trim()}</li>`
      ).join('');
      return `<ul class="nico-list numbered">${items}</ul>`;
    }
  );

  // 2. Deteksi bullet list: baris yang dimulai dengan "- " atau "• "
  html = html.replace(
    /((?:^[-•]\s.+\n?)+)/gm,
    (match) => {
      const items = match.trim().split('\n').map(line =>
        `<li>${line.replace(/^[-•]\s/, '').trim()}</li>`
      ).join('');
      return `<ul class="nico-list bullet">${items}</ul>`;
    }
  );

  // 3. Deteksi label highlight:
  //    "Jam Operasional:", "Biaya:", "Lokasi:", "Kontak:", "Alamat:"
  const HIGHLIGHT_LABELS = [
    'Jam Operasional', 'Biaya', 'Lokasi', 'Kontak', 'Alamat',
    'Jurusan', 'Syarat', 'Dokumen', 'Jadwal', 'Info', 'Catatan',
    'Pendaftaran', 'Akreditasi', 'Telepon', 'Email', 'Website'
  ];
  const labelPattern = new RegExp(
    `(${HIGHLIGHT_LABELS.join('|')})[:\\s]*([^\\n]+)`,
    'gi'
  );
  html = html.replace(labelPattern, (_, label, value) => `
    <div class="info-highlight">
      <span class="hl-label">${label}</span>
      <span class="hl-value">${value.trim()}</span>
    </div>
  `);

  // 4. Bungkus sisa teks dalam paragraf, pisah per baris kosong
  html = html
    .split(/\n{2,}/)
    .map(block => {
      block = block.trim();
      if (!block) return '';
      // Jangan bungkus jika sudah jadi tag
      if (/^<[uo]l|^<div/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return autoLink(html);
}

// ─── autoLink ───────────────────────────────────────────────────────
function autoLink(html) {
  // WhatsApp link
  html = html.replace(
    /https:\/\/wa\.me\/(\S+)/g,
    '<a href="https://wa.me/$1" class="nico-link wa-link" target="_blank" rel="noopener">' +
    '<i class="fa-brands fa-whatsapp"></i> Chat WhatsApp</a>'
  );
  // URL umum (bukan yang sudah jadi href)
  html = html.replace(
    /(?<![="'])https?:\/\/((?!wa\.me)[^\s<>"']+)/g,
    '<a href="https://$1" class="nico-link" target="_blank" rel="noopener">$1</a>'
  );
  // Email
  html = html.replace(
    /(?<![="'])\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g,
    '<a href="mailto:$1" class="nico-link">$1</a>'
  );
  return html;
}

// ─── Feedback button ────────────────────────────────────────────────
let feedbackCounter = 0;

function createFeedbackRow(messageId) {
  const id = `fb-${++feedbackCounter}`;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-top:0.4rem;padding-left:0.1rem';
  div.innerHTML = `
    <span style="font-size:0.72rem;color:#94a3b8;font-family:Inter,sans-serif" id="${id}-label">
      Apakah ini membantu?
    </span>
    <button class="nico-fb-btn" id="${id}-like"  data-val="like"    title="Ya, membantu">👍</button>
    <button class="nico-fb-btn" id="${id}-dislike" data-val="dislike" title="Belum membantu">👎</button>
  `;

  // Style inline (agar tidak perlu tambah class di CSS global)
  div.querySelectorAll('.nico-fb-btn').forEach(btn => {
    btn.style.cssText = `
      background:transparent;border:1px solid #e2e8f0;border-radius:9999px;
      padding:0.15rem 0.4rem;font-size:0.8rem;cursor:pointer;
      transition:all 0.15s;line-height:1;
    `;
    btn.addEventListener('mouseenter', () => {
      if (!btn.dataset.voted) btn.style.borderColor = '#172554';
    });
    btn.addEventListener('mouseleave', () => {
      if (!btn.dataset.voted) btn.style.borderColor = '#e2e8f0';
    });
    btn.addEventListener('click', () => {
      if (div.dataset.voted) return;
      div.dataset.voted = '1';

      // Visual feedback
      div.querySelectorAll('.nico-fb-btn').forEach(b => {
        b.style.opacity = '0.35';
        b.style.pointerEvents = 'none';
      });
      btn.style.opacity = '1';
      btn.style.background = btn.dataset.val === 'like' ? '#f0fdf4' : '#fef2f2';
      btn.style.borderColor = btn.dataset.val === 'like' ? '#86efac' : '#fca5a5';

      const label = div.querySelector(`#${id}-label`);
      label.textContent = btn.dataset.val === 'like' ? 'Terima kasih! 😊' : 'Kami catat, terima kasih.';

      // Kirim ke server (fire & forget)
      fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.sessionId,
          message_id: messageId,
          value: btn.dataset.val
        })
      }).catch(() => {});
    });
  });

  return div;
}

// ─── createBotBubble ────────────────────────────────────────────────
function createBotBubble(htmlContent, isTyping = false, messageId = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-start gap-2 message-enter';

  // Avatar — konsisten dengan bento kartu di profile.html
  const avatar = document.createElement('div');
  avatar.className = 'flex-shrink-0 mt-1';
  avatar.style.cssText = `
    width:32px;height:32px;border-radius:50%;
    background:#172554;border:2px solid #FBBF24;
    display:flex;align-items:center;justify-content:center;
  `;
  avatar.innerHTML = '<i class="fa-solid fa-robot" style="font-size:0.75rem;color:#FBBF24"></i>';

  const rightCol = document.createElement('div');
  rightCol.style.cssText = 'display:flex;flex-direction:column;gap:0;max-width:88%';

  const bubble = document.createElement('div');
  bubble.className = 'nicobot-bubble-bot';

  if (isTyping) {
    wrapper.id = 'nicobot-typing';
    bubble.innerHTML = `<span class="nicobot-typing-dots"><span></span><span></span><span></span></span>`;
    rightCol.appendChild(bubble);
  } else {
    bubble.innerHTML = htmlContent;
    rightCol.appendChild(bubble);
    // Feedback row hanya untuk pesan yang bukan welcome
    if (messageId !== 'welcome') {
      rightCol.appendChild(createFeedbackRow(messageId || 'msg-' + Date.now()));
    }
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(rightCol);
  return wrapper;
}

// ─── createUserBubble ───────────────────────────────────────────────
function createUserBubble(text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex justify-end message-enter';
  const bubble = document.createElement('div');
  bubble.className = 'nicobot-bubble-user';
  bubble.textContent = text;
  wrapper.appendChild(bubble);
  return wrapper;
}

// ─── createErrorBubble ──────────────────────────────────────────────
function createErrorBubble(isNetworkError = false) {
  const html = isNetworkError
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.35rem">
         <i class="fa-solid fa-plug-circle-xmark" style="color:#dc2626;font-size:0.9rem"></i>
         <strong style="color:#172554">Tidak dapat terhubung</strong>
       </div>
       <p style="color:#475569;font-size:0.82rem">Pastikan server NicoBot sudah berjalan.</p>
       <button onclick="window.nicoRetry && window.nicoRetry(this)"
         style="margin-top:0.5rem;display:inline-flex;align-items:center;gap:0.35rem;
                background:#f8fafc;border:1px solid #e2e8f0;border-radius:9999px;
                padding:0.3rem 0.7rem;font-size:0.78rem;font-weight:500;color:#172554;
                cursor:pointer;font-family:Inter,sans-serif">
         <i class="fa-solid fa-rotate-right" style="font-size:0.75rem"></i> Coba lagi
       </button>`
    : `<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.25rem">
         <i class="fa-solid fa-circle-exclamation" style="color:#d97706;font-size:0.9rem"></i>
         <strong style="color:#172554">Terjadi kesalahan</strong>
       </div>
       <p style="color:#475569;font-size:0.82rem">Silakan coba pertanyaan lain.</p>`;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'background:#fff7ed;border:1px solid #fed7aa;border-radius:0.75rem;padding:0.75rem 1rem;font-family:Inter,sans-serif';
  wrapper.innerHTML = html;

  const outer = document.createElement('div');
  outer.className = 'flex items-start gap-2 message-enter';
  outer.appendChild(wrapper);
  return outer;
}

function scrollToBottom(el) {
  el.scrollTop = el.scrollHeight;
}

// ─── loadQuickReplies ───────────────────────────────────────────────
async function loadQuickReplies(container) {
  try {
    const res = await fetch(`${API_BASE}/chat/quick-replies`);
    const json = await res.json();
    const replies = (json.data || json || []);
    container.innerHTML = '';
    replies.forEach((r) => {
      const btn = document.createElement('button');
      btn.className = 'nicobot-quick-btn';
      btn.innerHTML = `<i class="fa-solid fa-chevron-right" style="font-size:0.65rem;opacity:0.6"></i>${r.label}`;
      btn.addEventListener('click', () => {
        container.style.display = 'none';
        sendMessage(r.message || r.label);
      });
      container.appendChild(btn);
    });
  } catch {
    container.innerHTML = '<p style="font-size:0.75rem;color:#94a3b8;padding:0 4px">Gagal memuat pilihan.</p>';
  }
}

// ─── sendMessage ────────────────────────────────────────────────────
let lastMessage = '';

async function sendMessage(text) {
  if (state.isLoading || !text.trim()) return;
  lastMessage = text.trim();

  const messagesEl = document.getElementById('nicobot-messages');
  const inputEl    = document.getElementById('nicobot-input');
  const sendBtn    = document.getElementById('nicobot-send');
  const quickEl    = document.getElementById('nicobot-quick-replies');

  messagesEl.appendChild(createUserBubble(text));
  if (inputEl) inputEl.value = '';
  if (quickEl) quickEl.style.display = 'none';
  scrollToBottom(messagesEl);

  state.isLoading = true;
  if (sendBtn) sendBtn.disabled = true;
  messagesEl.appendChild(createBotBubble('', true));
  scrollToBottom(messagesEl);

  // Delay natural 500ms
  await new Promise(r => setTimeout(r, 500));

  try {
    const res = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: state.sessionId }),
    });

    const data = await res.json();
    document.getElementById('nicobot-typing')?.remove();

    if (!res.ok || data.error) {
      messagesEl.appendChild(createErrorBubble(false));
    } else {
      const formattedReply = formatBotReply(data.answer || data.reply || '');
      const msgId = data.message_id || data.messageId || null;
      messagesEl.appendChild(createBotBubble(formattedReply, false, msgId));

      // Tampilkan quick reply kembali jika fallback
      if ((data.intent === 'fallback' || data.resolved === false) && quickEl) {
        quickEl.style.display = 'flex';
        loadQuickReplies(quickEl);
      }
    }
  } catch {
    document.getElementById('nicobot-typing')?.remove();
    messagesEl.appendChild(createErrorBubble(true));
  } finally {
    state.isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    scrollToBottom(messagesEl);
  }
}

// Expose retry untuk tombol error
window.nicoRetry = function(btn) {
  btn.closest('.flex')?.remove();
  sendMessage(lastMessage);
};

// ─── resetSession ───────────────────────────────────────────────────
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

  if (messagesEl) {
    messagesEl.innerHTML = '';
    messagesEl.appendChild(createBotBubble(buildWelcomeHTML(), false, 'welcome'));
  }
  if (inputEl)  { inputEl.disabled = false; inputEl.value = ''; }
  if (sendBtn)  sendBtn.disabled = false;
  if (quickEl)  { quickEl.style.display = 'flex'; loadQuickReplies(quickEl); }
}

// ─── initChatbot ────────────────────────────────────────────────────
export function initChatbot() {
  const messagesEl = document.getElementById('nicobot-messages');
  const inputEl    = document.getElementById('nicobot-input');
  const sendBtn    = document.getElementById('nicobot-send');
  const resetBtn   = document.getElementById('nicobot-reset');
  const quickEl    = document.getElementById('nicobot-quick-replies');

  if (!messagesEl) {
    console.warn('NicoBot: #nicobot-messages tidak ditemukan.');
    return;
  }

  // Welcome message
  messagesEl.appendChild(createBotBubble(buildWelcomeHTML(), false, 'welcome'));

  if (quickEl) loadQuickReplies(quickEl);

  sendBtn?.addEventListener('click', () => sendMessage(inputEl?.value.trim() ?? ''));
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value.trim());
    }
  });
  resetBtn?.addEventListener('click', resetSession);
}