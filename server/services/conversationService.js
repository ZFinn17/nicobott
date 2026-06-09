// services/conversationService.js
// ─────────────────────────────────────────────
// Mengelola sesi percakapan pengunjung
// Use Case:
//   UC-01 Membuka sesi chatbot
//   UC-07 Mengakhiri sesi
//   UC-11 Memperbarui status sesi
//
// Alur sesi:
//   Browser kirim session_id
//   → Cari di database
//   → Kalau belum ada → buat baru
//   → Kalau sudah ada → pakai yang lama
// ─────────────────────────────────────────────

const conversationModel = require('../models/conversationModel');

const conversationService = {

  // Dipanggil saat POST /api/conversation/start
  // Mengembalikan conversation yang sudah ada atau baru dibuat
  getOrCreate: async (sessionId) => {

    // Cari sesi yang sudah ada
    const existing = await conversationModel.findBySessionId(sessionId);

    if (existing) {
      // Sesi sudah ada — pengunjung reload halaman atau kembali lagi
      return { conversation: existing, isNew: false };
    }

    // Sesi belum ada — pengunjung baru pertama kali
    const created = await conversationModel.create(sessionId);
    return { conversation: created, isNew: true };
  },

  // Dipanggil setiap kali ada pesan masuk (UC-11)
  // Memastikan last_active_at selalu up to date
  updateActivity: async (conversationId) => {
    await conversationModel.updateLastActive(conversationId);
  },

  // Dipanggil saat bot gagal menjawab dan redirect ke WhatsApp
  // UC-06: Meminta bantuan admin
  markEscalated: async (conversationId) => {
    await conversationModel.markAsEscalated(conversationId);
  },

};

module.exports = conversationService;