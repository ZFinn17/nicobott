// models/feedbackModel.js
// ─────────────────────────────────────────────
// Query ke tabel: feedback
// Use Case: UC-05 Memberikan feedback
// value: 1 = 👍 positif, -1 = 👎 negatif
// ─────────────────────────────────────────────

const pool = require('../config/database');

const feedbackModel = {

  // Simpan penilaian user terhadap jawaban bot
  create: async (messageId, faqId, value) => {
    const result = await pool.query(
      `INSERT INTO feedback (message_id, faq_id, value)
       VALUES ($1, $2, $3)
       RETURNING id, message_id, faq_id, value, created_at`,
      [messageId, faqId, value]
    );
    return result.rows[0];
  },

  // Cek apakah pesan ini sudah pernah diberi feedback
  // Mencegah user klik 👍👎 berkali-kali untuk pesan yang sama
  findByMessageId: async (messageId) => {
    const result = await pool.query(
      `SELECT id FROM feedback
       WHERE message_id = $1`,
      [messageId]
    );
    return result.rows[0] || null;
  },

};

module.exports = feedbackModel;