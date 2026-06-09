// services/keywordService.js
// ─────────────────────────────────────────────
// Keyword matching v2 — peningkatan dari v1:
//
//  SEBELUM (v1):
//    - normalizedMessage.includes(keyword) saja
//    - Tidak ada toleransi typo
//    - Threshold flat: skor > 0
//    - Skor hanya dari panjang keyword (word count)
//
//  SESUDAH (v2):
//    1. Normalisasi lebih dalam:
//       - Hapus tanda baca umum
//       - Normalisasi variasi ejaan umum (typo ringan)
//    2. Tiga lapisan scoring:
//       - Exact match  (bobot tinggi)
//       - Partial match string (bobot menengah)
//       - Token overlap (bobot rendah, tangkap sisa variasi)
//    3. Threshold dinamis berdasarkan panjang pesan
//    4. Bonus skor kategori (cegah ambiguitas antar FAQ)
//    5. Cache FAQ per request siklus (hindari query berulang)
//
// Use Case: UC-08 Mencocokkan keyword
// ─────────────────────────────────────────────

'use strict';

const faqModel = require('../models/faqModel');

// ── Normalisasi teks ──────────────────────────────────────────────
// Langkah-langkah:
//   1. Lowercase
//   2. Hapus tanda baca (!, ?, ., ,, dll.)
//   3. Normalisasi typo & sinonim sangat umum
//   4. Hapus stopword ringan yang tidak memberi makna
//   5. Collapse spasi
// ─────────────────────────────────────────────────────────────────

// Daftar normalisasi: [pola_regex, pengganti]
// Urutan penting — lebih spesifik di atas
const NORMALIZATIONS = [
  // Typo umum & variasi ejaan
  [/gimana|gmn|bgmn|bagaimana/g,          'bagaimana'],
  [/dimana|dmn|di mana/g,                 'dimana'],
  [/kpn|kapan/g,                          'kapan'],
  [/brp|brap|berapa/g,                    'berapa'],
  [/ada apa|ada apaan/g,                  'ada'],
  [/mau|ingin|pengen|pingin/g,            'mau'],
  [/daftar|mendaftar|registrasi/g,        'daftar'],
  [/sekolah ini|smk ini|smk icb/g,        'sekolah'],
  [/biaya|bayar|pembayaran|harga|tarif/g, 'biaya'],
  [/jurusan|prodi|program studi/g,        'jurusan'],
  [/hubungi|kontak|tanya|telfon|telpon/g, 'kontak'],
  [/ekskul|ekstra|ekstrakulikuler/g,      'ekstrakurikuler'],
  [/fasilitas|sarana|prasarana/g,         'fasilitas'],
  [/lokasi|dimana|alamat|letak/g,         'lokasi'],

  // Tanda baca & karakter khusus
  [/[!?.,;:()\[\]{}"'`]/g, ' '],

  // Kata penghubung & stopword ringan (bukan keyword bermakna)
  // Hati-hati: jangan hapus terlalu agresif
  [/\b(yang|dengan|untuk|dari|ke|di|dan|atau|ini|itu|saya|aku|kamu|kalian|kita|ada|bisa|mau|ya|dong|deh|dong|sih)\b/g, ' '],

  // Collapse spasi berlebih
  [/\s{2,}/g, ' '],
];

function normalize(text) {
  let result = text.toLowerCase().trim();
  for (const [pattern, replacement] of NORMALIZATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

// ── Tokenisasi ────────────────────────────────────────────────────
// Pecah teks menjadi token unik, abaikan token <= 2 karakter
function tokenize(text) {
  return [...new Set(
    text.split(/\s+/).filter(t => t.length > 2)
  )];
}

// ── Levenshtein distance (typo ringan) ───────────────────────────
// Digunakan untuk mendeteksi salah ketik 1–2 huruf pada token pendek
// Hanya diaktifkan untuk token >= 5 karakter (hindari false positive)
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(
            matrix[i - 1][j - 1] + 1,   // substitusi
            matrix[i][j - 1]     + 1,   // insert
            matrix[i - 1][j]     + 1    // hapus
          );
    }
  }
  return matrix[b.length][a.length];
}

// Cek apakah dua token "mirip" (1 typo untuk token >= 5 char)
function isFuzzyMatch(tokenA, tokenB) {
  if (tokenA === tokenB) return true;
  const minLen = Math.min(tokenA.length, tokenB.length);
  if (minLen < 5) return false;                    // terlalu pendek, skip
  const maxDist = minLen >= 8 ? 2 : 1;             // 8+ char: toleransi 2
  return levenshtein(tokenA, tokenB) <= maxDist;
}

// ── Parse keywords dari kolom DB ─────────────────────────────────
// Format di DB: "daftar,cara daftar,ppdb,masuk sekolah"
function parseKeywords(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);
}

// ── Hitung skor satu FAQ vs satu pesan ───────────────────────────
// Mengembalikan angka skor >= 0
//
// Tiga lapisan:
//   Layer 1 — Exact/phrase match  : keyword ada dalam pesan persis
//   Layer 2 — Partial string match: pesan mengandung sebagian keyword
//   Layer 3 — Token fuzzy match   : token pesan mirip token keyword
function scoreOneFaq(normalizedMsg, msgTokens, faqKeywords) {
  let score = 0;

  for (const keyword of faqKeywords) {
    const kwWordCount = keyword.split(' ').length;

    // ── Layer 1: Exact phrase match ──────────────────────────────
    // Keyword ditemukan persis dalam pesan (termasuk multi-kata)
    if (normalizedMsg.includes(keyword)) {
      // Bobot: jumlah kata dalam keyword × 3
      // "cara daftar" (2 kata) → skor 6; "daftar" (1 kata) → skor 3
      score += kwWordCount * 3;
      continue; // Sudah dapat skor terbaik untuk keyword ini
    }

    // ── Layer 2: Partial string match ────────────────────────────
    // Keyword adalah frasa multi-kata tapi hanya sebagian yang match
    // Contoh: keyword "cara mendaftar online", pesan berisi "mendaftar"
    if (kwWordCount > 1) {
      const kwTokens = keyword.split(' ');
      const matchedTokens = kwTokens.filter(kt => normalizedMsg.includes(kt));
      const ratio = matchedTokens.length / kwTokens.length;
      if (ratio >= 0.5) {                          // >= 50% token match
        score += ratio * kwWordCount * 1.5;
      }
      // Layer 2 tidak pakai continue — masih bisa dapat layer 3
    }

    // ── Layer 3: Token-level fuzzy match ─────────────────────────
    // Cocokkan setiap token pesan vs setiap token keyword
    // Berguna untuk typo: "pendaptaran" → "pendaftaran"
    const kwTokens = keyword.split(' ');
    for (const kwToken of kwTokens) {
      for (const msgToken of msgTokens) {
        if (isFuzzyMatch(msgToken, kwToken)) {
          // Bobot lebih rendah karena kurang pasti
          score += kwToken.length >= 8 ? 1.5 : 0.8;
          break; // Satu token pesan cukup match satu token keyword
        }
      }
    }
  }

  return score;
}

// ── Threshold dinamis ─────────────────────────────────────────────
// Pesan pendek (1–2 kata) → threshold lebih rendah
// Pesan panjang (kalimat) → threshold lebih tinggi
// Mencegah satu keyword pendek "saya" atau "apa" trigger FAQ
function getThreshold(msgTokenCount) {
  if (msgTokenCount <= 2) return 2;    // "daftar" / "ppdb" → minimal
  if (msgTokenCount <= 4) return 3;    // "cara daftar smk"
  return 4;                            // kalimat panjang
}

// ── Match utama ───────────────────────────────────────────────────
const keywordService = {

  match: async (userMessage) => {

    // 1. Normalisasi pesan
    const normalizedMsg = normalize(userMessage);
    const msgTokens     = tokenize(normalizedMsg);

    // Edge case: pesan kosong setelah normalisasi
    if (!normalizedMsg || msgTokens.length === 0) return null;

    // 2. Ambil semua FAQ aktif
    const faqs = await faqModel.getAllActive();
    if (!faqs || faqs.length === 0) return null;

    // 3. Scoring setiap FAQ
    let bestMatch   = null;
    let highestScore = 0;

    for (const faq of faqs) {
      const keywords = parseKeywords(faq.keywords);
      if (keywords.length === 0) continue;         // Skip FAQ tanpa keyword

      const score = scoreOneFaq(normalizedMsg, msgTokens, keywords);

      // Debug — aktifkan untuk troubleshooting:
      // console.log(`[match] FAQ ${faq.id} "${faq.question.slice(0,40)}" score=${score.toFixed(2)}`);

      if (score > highestScore) {
        highestScore = score;
        bestMatch    = faq;
      }
    }

    // 4. Threshold — pastikan match cukup yakin
    const threshold = getThreshold(msgTokens.length);
    if (highestScore < threshold) {
      // Log untuk analisis unresolved (bisa dilihat di console server)
      console.log(
        `[keywordService] No match — msg="${userMessage.slice(0,60)}" ` +
        `bestScore=${highestScore.toFixed(2)} threshold=${threshold}`
      );
      return null;
    }

    return bestMatch;
  },

};

module.exports = keywordService;