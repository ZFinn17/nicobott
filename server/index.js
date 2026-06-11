// index.js
// ─────────────────────────────────────────────
// Entry point NicoBot Backend
// v2 — tambahan keamanan: Helmet + Rate Limiter
// ─────────────────────────────────────────────

require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

// Inisialisasi koneksi database
require('./config/database');

// Import routes
const chatRoutes     = require('./routes/chat');
const feedbackRoutes = require('./routes/feedback');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── [1] HELMET ────────────────────────────────
// Dipasang PERTAMA, sebelum semua middleware lain.
// Mengatur HTTP response headers untuk keamanan dasar.
//
// MENGAPA PERLU KONFIGURASI CSP?
// Helmet default memblokir semua resource eksternal.
// Project ini memuat dari dua CDN:
//   - cdnjs.cloudflare.com   → Font Awesome (ikon chatbot)
//   - fonts.googleapis.com   → Google Fonts (Inter)
//   - fonts.gstatic.com      → File font aktual dari Google
// Tanpa izin ini, ikon dan font akan hilang di browser.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Sumber HTML/script: hanya diri sendiri
        defaultSrc: ["'self'"],

        // Script: hanya dari origin sendiri
        // Jika suatu saat pakai CDN script, tambahkan di sini
        scriptSrc: ["'self'"],

        // Style: izinkan Google Fonts
        styleSrc: [
          "'self'",
          "'unsafe-inline'",             // Vite dev pakai inline style
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com", // Font Awesome CSS
        ],

        // Font: izinkan Google Fonts dan Font Awesome
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],

        // Gambar: diri sendiri + data URI (favicon, dll)
        imgSrc: ["'self'", "data:"],

        // Koneksi fetch/XHR: hanya ke origin sendiri
        // Frontend Vite proxy ke :5000, jadi 'self' sudah cukup
        connectSrc: ["'self'"],

        // Frame: tidak diizinkan sama sekali (tidak butuh iframe)
        frameSrc: ["'none'"],

        // Object: tidak diizinkan (tidak pakai Flash/plugin)
        objectSrc: ["'none'"],
      },
    },

    // Header lain yang diaktifkan Helmet secara otomatis:
    //
    // X-Content-Type-Options: nosniff
    //   → Browser tidak boleh menebak tipe file.
    //     Mencegah MIME-type sniffing attack.
    //
    // X-Frame-Options: SAMEORIGIN
    //   → Halaman tidak bisa di-embed di iframe dari domain lain.
    //     Mencegah clickjacking.
    //
    // X-XSS-Protection: 0
    //   → Menonaktifkan XSS auditor lama yang justru berbahaya
    //     di browser modern. Ini perilaku benar per Helmet v7+.
    //
    // Referrer-Policy: no-referrer
    //   → URL halaman tidak dikirim ke server eksternal saat
    //     browser memuat resource.
    //
    // Strict-Transport-Security (HSTS)
    //   → Memaksa koneksi HTTPS. Aktif otomatis.
    //     Di localhost tidak berpengaruh (hanya HTTPS).
    //
    // Cross-Origin-Opener-Policy: same-origin
    //   → Isolasi konteks browsing. Mencegah side-channel attack.
  })
);

// ── [2] CORS ──────────────────────────────────
// Tetap di posisi semula, setelah Helmet.
app.use(cors());

// ── [3] JSON BODY PARSER ───────────────────────
app.use(express.json());

// ── [4] RATE LIMITER ──────────────────────────
// Dibuat sebagai middleware — siap dipasang per route group.
//
// Aturan:
//   - Maksimal 10 request dalam 1 menit per IP
//   - Hanya berlaku untuk /api/chat dan /api/feedback
//   - Endpoint lain (health check) tidak dibatasi
//
// MENGAPA TIDAK GLOBAL?
// Rate limit global akan membatasi seluruh server termasuk
// aset statis dan health check. Untuk chatbot sekolah,
// cukup lindungi endpoint yang menerima input user.
const chatLimiter = rateLimit({
  windowMs:         60 * 1000,   // 1 menit dalam milidetik
  max:              10,           // maksimal 10 request per windowMs
  standardHeaders:  true,        // kirim header RateLimit-* standar RFC
  legacyHeaders:    false,        // matikan header X-RateLimit-* lama

  // Response saat limit tercapai
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.',
    });
  },
});

// ── [5] ROUTES ────────────────────────────────
// Rate limiter dipasang SEBELUM route handler,
// sebagai argumen kedua app.use().
// Urutan eksekusi per request:
//   chatLimiter → chatRoutes → chatController
app.use('/api/chat',     chatLimiter, chatRoutes);
app.use('/api/feedback', chatLimiter, feedbackRoutes);

// Health check — TIDAK dibatasi rate limit
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'NicoBot Server berjalan 🚀' });
});

// ── [6] START SERVER ───────────────────────────
app.listen(PORT, () => {
  console.log(`NicoBot Server berjalan di http://localhost:${PORT}`);
});