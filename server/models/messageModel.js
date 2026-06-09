// models/messageModel.js
// ─────────────────────────────────────────────
// Query ke tabel: messages
// Use Case: UC-09 Mencatat log pesan
// faq_id NULL  = bot gagal menjawab
// faq_id TIDAK NULL = bot berhasil dengan FAQ tsb
// ─────────────────────────────────────────────

const pool = require('../config/database');

const messageModel = {

  // Simpan pesan user atau bot ke log
  // faqId boleh null (jika pesan user, atau bot gagal menjawab)
  create: async (conversationId, sender, content, faqId = null) => {
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender, content, faq_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, conversation_id, sender, content, faq_id, created_at`,
      [conversationId, sender, content, faqId]
    );
    return result.rows[0];
  },

  // Ambil semua pesan dalam satu sesi
  // Berguna untuk melihat riwayat percakapan
  getByConversationId: async (conversationId) => {
    const result = await pool.query(
      `SELECT id, sender, content, faq_id, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return result.rows;
  },

};

module.exports = messageModel;