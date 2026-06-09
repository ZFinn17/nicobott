// models/unresolvedModel.js
// ─────────────────────────────────────────────
// Query ke tabel: unresolved_queries
// Use Case: UC-10 Menyimpan unresolved query
// Hanya dipanggil ketika faq_id = NULL
// ─────────────────────────────────────────────

const pool = require('../config/database');

const unresolvedModel = {

  // Simpan pertanyaan yang tidak terjawab
  // Dipanggil otomatis setelah bot gagal menemukan FAQ
  create: async (conversationId, messageId, content) => {
    const result = await pool.query(
      `INSERT INTO unresolved_queries
         (conversation_id, message_id, content, status)
       VALUES ($1, $2, $3, 'open')
       RETURNING id, conversation_id, message_id, content, status, created_at`,
      [conversationId, messageId, content]
    );
    return result.rows[0];
  },

};

module.exports = unresolvedModel;