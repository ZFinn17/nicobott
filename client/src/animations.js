// =============================================
// SMK ICB Cinta Niaga — animations.js
// Micro-interaction & scroll animation, vanilla JS only.
// Tidak ada dependency eksternal — hanya IntersectionObserver API.
//
// Cara pakai (cukup 1 baris di setiap HTML, sebelum </body>):
//   <script type="module" src="./src/animations.js"></script>
//
// Fitur yang ditangani:
//   1. Staggered page load (hero) — dijalankan otomatis saat DOM ready
//   2. Scroll reveal (semua elemen dengan attribute [data-reveal])
//   3. Counter animation (elemen dengan attribute [data-counter])
//   4. Navbar underline hover — ditangani murni CSS, JS tidak perlu sentuh ini
//   5. CTA idle pulse — tombol dengan attribute [data-pulse]
// =============================================

'use strict';

// ─────────────────────────────────────────────────────────────────
// 1. STAGGERED PAGE LOAD (hero)
// ─────────────────────────────────────────────────────────────────
// Elemen dengan [data-stagger] akan muncul berurutan saat halaman load.
// Urutan ditentukan oleh atribut data-stagger="1", "2", "3", dst.
// Delay antar elemen: 120ms, durasi tiap elemen mengikuti CSS (500ms).
function runStaggerOnLoad() {
  const items = document.querySelectorAll('[data-stagger]');
  if (items.length === 0) return;

  // Urutkan berdasarkan nilai data-stagger (1, 2, 3, ...)
  const sorted = Array.from(items).sort((a, b) => {
    return Number(a.dataset.stagger) - Number(b.dataset.stagger);
  });

  sorted.forEach((el, index) => {
    // Base delay 200ms (sesuai instruksi: 200ms-700ms range)
    // tiap step menambah 120ms agar terasa berurutan tapi tidak lambat
    const delay = 200 + index * 120;
    setTimeout(() => {
      el.classList.add('stagger-in');
    }, delay);
  });
}

// ─────────────────────────────────────────────────────────────────
// 2. SCROLL REVEAL
// ─────────────────────────────────────────────────────────────────
// Elemen dengan [data-reveal] akan fade-in + translate-y saat masuk viewport.
// Animasi hanya dimainkan SEKALI — observer di-disconnect setelah trigger.
function initScrollReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (items.length === 0) return;

  // threshold 0.15 - elemen dianggap "masuk viewport" saat 15% terlihat
  // rootMargin negatif di bawah agar trigger sedikit lebih awal dari batas bawah
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Delay opsional per elemen via [data-reveal-delay="100"] (ms)
        const delay = Number(entry.target.dataset.revealDelay || 0);
        setTimeout(() => {
          entry.target.classList.add('reveal-in');
        }, delay);
        obs.unobserve(entry.target); // animasi hanya sekali
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px',
  });

  items.forEach((el) => observer.observe(el));
}

// ─────────────────────────────────────────────────────────────────
// 3. COUNTER ANIMATION
// ─────────────────────────────────────────────────────────────────
// Elemen dengan [data-counter="488"] akan menghitung naik dari 0 ke 488
// saat masuk viewport. Mendukung suffix seperti "+" via [data-counter-suffix="+"].
// Durasi animasi: 1200ms, menggunakan easing ease-out agar terasa natural.
function initCounters() {
  const items = document.querySelectorAll('[data-counter]');
  if (items.length === 0) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        obs.unobserve(entry.target); // animasi hanya sekali
      }
    });
  }, {
    threshold: 0.4,
  });

  items.forEach((el) => observer.observe(el));
}

function animateCounter(el) {
  const target   = parseInt(el.dataset.counter, 10) || 0;
  const suffix   = el.dataset.counterSuffix || '';
  const duration = 1200; // ms - cukup cepat tapi tetap terasa "menghitung"
  const startTime = performance.now();

  function tick(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic - mulai cepat, melambat di akhir (terasa natural)
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);

    el.textContent = current + suffix;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = target + suffix; // pastikan angka akhir tepat
    }
  }

  requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────────────────────────
// 4. CTA IDLE PULSE
// ─────────────────────────────────────────────────────────────────
// Tombol dengan [data-pulse] akan mendapat animasi pulse ringan
// setelah halaman idle (tidak ada interaksi user) selama N detik.
// Pulse berhenti otomatis setelah beberapa siklus - TIDAK looping selamanya,
// sesuai instruksi "jangan mengganggu, jangan terus menerus".
function initIdlePulse() {
  const items = document.querySelectorAll('[data-pulse]');
  if (items.length === 0) return;

  const IDLE_DELAY_MS   = 4000;  // tunggu 4 detik tanpa interaksi
  const PULSE_DURATION  = 2400;  // pulse aktif selama 2.4 detik lalu berhenti

  let idleTimer = null;

  function triggerPulse() {
    items.forEach((el) => {
      el.classList.add('cta-pulse');
      // Hentikan pulse otomatis setelah durasi tertentu - tidak looping selamanya
      setTimeout(() => el.classList.remove('cta-pulse'), PULSE_DURATION);
    });
  }

  function resetIdleTimer() {
    items.forEach((el) => el.classList.remove('cta-pulse'));
    clearTimeout(idleTimer);
    idleTimer = setTimeout(triggerPulse, IDLE_DELAY_MS);
  }

  // Interaksi yang mereset idle timer
  ['mousemove', 'scroll', 'keydown', 'touchstart', 'click'].forEach((evt) => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  resetIdleTimer(); // mulai hitung idle sejak halaman dimuat
}

// ─────────────────────────────────────────────────────────────────
// INIT - jalankan semua saat DOM siap
// ─────────────────────────────────────────────────────────────────
function init() {
  runStaggerOnLoad();
  initScrollReveal();
  initCounters();
  initIdlePulse();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}