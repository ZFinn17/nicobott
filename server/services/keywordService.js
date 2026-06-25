// services/keywordService.js — v3.1
// Perbaikan dari v3:
//   1. hasMultiWordMatch threshold turun dari 0.7 ke 0.5 (fix Bug #3 & #4)
//   2. Tambah normalisasi "di mana" → "dimana" (fix bug turunan #2)
//   3. Tokenize: kembalikan filter ke > 2 (fix bug turunan #1 — "spp" lolos kembali)
//      tapi tambah daftar stoptoken eksplisit untuk token 3 char yang generik

'use strict';

const faqModel = require('../models/faqModel');

// Token 3-4 karakter yang tidak bermakna sebagai keyword — dibuang saat tokenize
const STOP_TOKENS = new Set([
  'apa','yang','dan','ini','itu','dari','atau','juga','ada','bisa',
  'mau','kami','kamu','saya','dia','kita','mereka','anda','pak','ibu',
  'mas','kak','bang','nih','deh','dong','sih','lah','ya','kan','yuk',
  'mau','gak','nggak','tidak','bukan','jangan','sudah','belum','akan',
  'smk','icb','how','what','when','where','why','who'
]);

const NORMALIZATIONS = [
  // Variasi ejaan
  [/gimana|gmn|bgmn|bagaimana/g,          'bagaimana'],
  [/\bdi mana\b|dimana|dmn/g,             'dimana'],   // FIX: tambah "di mana"
  [/kpn/g,                                'kapan'],
  [/brp|brap/g,                           'berapa'],
  [/mau|ingin|pengen|pingin/g,            'mau'],
  [/mendaftar|registrasi/g,               'daftar'],
  [/smk icb cinta niaga|smk icb|smk ini/g,'smk'],
  [/biaya|bayar|pembayaran|tarif/g,       'biaya'],
  [/program studi|prodi/g,                'jurusan'],
  [/hubungi|telfon|telpon/g,              'kontak'],
  [/ekskul|ekstra|ekstrakulikuler/g,      'ekstrakurikuler'],
  [/sarana|prasarana/g,                   'fasilitas'],
  // Tanda baca
  [/[!?.,;:()\[\]{}"'`]/g,               ' '],
  // Stopword minimal
  [/\b(dong|deh|sih|ya|lah|nih|kok|kak|bang|pak|bu|mas)\b/g, ' '],
  // Collapse spasi
  [/\s{2,}/g, ' '],
];

function normalize(text) {
  let result = text.toLowerCase().trim();
  for (const [pattern, replacement] of NORMALIZATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

// FIX turunan #1: filter > 2 karakter tapi exclude STOP_TOKENS
function tokenize(text) {
  return [...new Set(
    text.split(/\s+/).filter(t => t.length > 2 && !STOP_TOKENS.has(t))
  )];
}

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
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1]     + 1,
            matrix[i - 1][j]     + 1
          );
    }
  }
  return matrix[b.length][a.length];
}

function isFuzzyMatch(tokenA, tokenB) {
  if (tokenA === tokenB) return true;
  const minLen = Math.min(tokenA.length, tokenB.length);
  if (minLen < 6) return false;
  const maxDist = minLen >= 9 ? 2 : 1;
  return levenshtein(tokenA, tokenB) <= maxDist;
}

function parseKeywords(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
}

function scoreOneFaq(normalizedMsg, msgTokens, faqKeywords) {
  let score = 0;
  let hasMultiWordMatch = false;
  let hasExactMatch     = false;

  for (const keyword of faqKeywords) {
    const kwWords     = keyword.split(' ');
    const kwWordCount = kwWords.length;
    const isMultiWord = kwWordCount > 1;

    // Layer 1: Exact phrase match
    if (normalizedMsg.includes(keyword)) {
      const multiplier = isMultiWord ? 4 : 2;
      score += kwWordCount * multiplier;
      if (isMultiWord) hasMultiWordMatch = true;
      hasExactMatch = true;
      continue;
    }

    // Layer 2: Partial match — hanya keyword multi-kata
    if (isMultiWord) {
      const matchedTokens = kwWords.filter(kt => normalizedMsg.includes(kt));
      const ratio = matchedTokens.length / kwWords.length;
      if (ratio >= 0.5) {
        score += ratio * kwWordCount * 1.5;
        // FIX Bug #3 & #4: turunkan threshold dari 0.7 ke 0.5
        if (ratio >= 0.5) hasMultiWordMatch = true;
      }
    }

    // Layer 3: Fuzzy
    if (isMultiWord || keyword.length >= 8) {
      for (const kwToken of kwWords) {
        if (kwToken.length < 6) continue;
        for (const msgToken of msgTokens) {
          if (isFuzzyMatch(msgToken, kwToken)) {
            score += kwToken.length >= 9 ? 1.5 : 0.8;
            break;
          }
        }
      }
    }
  }

  return { score, hasMultiWordMatch, hasExactMatch };
}

function getThreshold(msgTokenCount) {
  if (msgTokenCount <= 1) return 2;
  if (msgTokenCount <= 3) return 3;
  return 5;
}

const keywordService = {

  match: async (userMessage) => {
    const normalizedMsg = normalize(userMessage);
    const msgTokens     = tokenize(normalizedMsg);

    if (!normalizedMsg) return null;

    const faqs = await faqModel.getAllActive();
    if (!faqs || faqs.length === 0) return null;

    let bestMatch    = null;
    let highestScore = 0;
    let bestHasMulti = false;

    for (const faq of faqs) {
      const keywords = parseKeywords(faq.keywords);
      if (keywords.length === 0) continue;

      const { score, hasMultiWordMatch, hasExactMatch } = scoreOneFaq(
        normalizedMsg, msgTokens, keywords
      );

      if (score <= 0) continue;

      if (msgTokens.length > 1 && !hasExactMatch && !hasMultiWordMatch) {
        continue;
      }

      if (score > highestScore ||
         (score === highestScore && hasMultiWordMatch && !bestHasMulti)) {
        highestScore  = score;
        bestMatch     = faq;
        bestHasMulti  = hasMultiWordMatch;
      }
    }

    const threshold = getThreshold(msgTokens.length);
    if (highestScore < threshold) {
      console.log(
        `[keywordService] No match — msg="${userMessage.slice(0,60)}" ` +
        `score=${highestScore.toFixed(2)} threshold=${threshold}`
      );
      return null;
    }

    return bestMatch;
    console.log('========== DEBUG MATCH ==========');
console.log('INPUT:', userMessage);
console.log('MATCH FAQ:', bestMatch?.id);
console.log('QUESTION:', bestMatch?.question);
console.log('SCORE:', highestScore);
console.log('=================================');
  },

};

module.exports = keywordService;