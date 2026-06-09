// models/faqModel.js
// ─────────────────────────────────────────────
// Query ke tabel: faqs
// Versi 2 — tambahan:
//   1. In-memory cache ringan (TTL 5 menit)
//      Hindari query ke DB di setiap pesan masuk
//   2. Helper getAllKeywords() untuk debug / admin
//   3. Helper invalidateCache() untuk dipanggil
//      setelah admin update FAQ
//
// Digunakan oleh: keywordService (matching)
// Use Case: UC-08 Mencocokkan keyword
// ─────────────────────────────────────────────

'use strict';

const pool = require('../config/database');

// ── Cache ringan ─────────────────────────────────────────────────
// Simpan hasil query getAllActive() selama TTL_MS
// Alasan: keywordService.match() dipanggil setiap pesan masuk,
// tidak perlu hit database setiap kali jika data FAQ jarang berubah
const CACHE_TTL_MS = 5 * 60 * 1000;    // 5 menit

let _cache = {
  data:      null,
  expiresAt: 0,
};

function isCacheValid() {
  return _cache.data !== null && Date.now() < _cache.expiresAt;
}

// ─────────────────────────────────────────────────────────────────

const faqModel = {

  // Ambil semua FAQ yang aktif
  // Dipanggil oleh keywordService di setiap pesan masuk
  // Menggunakan cache 5 menit agar tidak query DB terus-menerus
  getAllActive: async () => {
    if (isCacheValid()) {
      return _cache.data;
    }

    const result = await pool.query(
      `SELECT id, question, answer, keywords, category
       FROM faqs
       WHERE is_active = TRUE
         AND keywords IS NOT NULL
         AND keywords <> ''
       ORDER BY category, id`
    );

    _cache.data      = result.rows;
    _cache.expiresAt = Date.now() + CACHE_TTL_MS;

    return _cache.data;
  },

  // Ambil satu FAQ berdasarkan ID
  // Dipanggil saat menyimpan referensi faq_id ke tabel messages
  getById: async (id) => {
    const result = await pool.query(
      `SELECT id, question, answer, keywords, category
       FROM faqs
       WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    return result.rows[0] || null;
  },

  // Invalidasi cache — panggil setelah update FAQ di database
  // Contoh penggunaan: setelah admin panel update/insert FAQ
  invalidateCache: () => {
    _cache.data      = null;
    _cache.expiresAt = 0;
    console.log('[faqModel] Cache invalidated');
  },

  // Debug helper — tampilkan ringkasan keyword per FAQ
  // Berguna untuk memverifikasi keyword migration berhasil
  // Endpoint: GET /api/debug/faq-keywords (matikan di production)
  getAllKeywords: async () => {
    const result = await pool.query(
      `SELECT
         id,
         LEFT(question, 60)          AS question_preview,
         category,
         is_active,
         ARRAY_LENGTH(
           STRING_TO_ARRAY(keywords, ','), 1
         )                           AS keyword_count,
         LEFT(keywords, 100)         AS keywords_preview
       FROM faqs
       ORDER BY id`
    );
    return result.rows;
  },

};

module.exports = faqModel;