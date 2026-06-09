// models/conversationModel.js
// ─────────────────────────────────────────────
// Query ke tabel: conversations
// Use Case: UC-01 Membuka sesi, UC-07 Mengakhiri sesi,
//           UC-11 Memperbarui status sesi
// ─────────────────────────────────────────────

const pool = require('../config/database');

const conversationModel = {

  // Cari sesi berdasarkan session_id dari browser
  // Dipanggil pertama kali saat pesan masuk
  findBySessionId: async (sessionId) => {
    const result = await pool.query(
      `SELECT id, session_id, started_at, last_active_at, is_escalated
       FROM conversations
       WHERE session_id = $1`,
      [sessionId]
    );
    return result.rows[0] || null;
  },

  // Buat sesi baru
  // Dipanggil saat session_id belum ada di database
  create: async (sessionId) => {
    const result = await pool.query(
      `INSERT INTO conversations (session_id)
       VALUES ($1)
       RETURNING id, session_id, started_at, last_active_at, is_escalated`,
      [sessionId]
    );
    return result.rows[0];
  },

  // Update waktu terakhir aktif
  // Dipanggil setiap kali ada pesan masuk (UC-11)
  updateLastActive: async (conversationId) => {
    await pool.query(
      `UPDATE conversations
       SET last_active_at = NOW()
       WHERE id = $1`,
      [conversationId]
    );
  },

  // Tandai sesi sebagai eskalasi ke WhatsApp
  // Dipanggil saat keyword tidak ditemukan (UC-06)
  markAsEscalated: async (conversationId) => {
    await pool.query(
      `UPDATE conversations
       SET is_escalated = TRUE, last_active_at = NOW()
       WHERE id = $1`,
      [conversationId]
    );
  },

};

module.exports = conversationModel;