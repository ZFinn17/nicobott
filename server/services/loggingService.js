// services/loggingService.js
// ─────────────────────────────────────────────
// Mencatat seluruh aktivitas percakapan ke database
// Use Case:
//   UC-09 Mencatat log pesan
//   UC-10 Menyimpan unresolved query
//
// Dipanggil setelah keywordService.match() selesai:
//   → Selalu catat pesan user
//   → Selalu catat jawaban bot
//   → Jika faqId null → catat juga ke unresolved_queries
// ─────────────────────────────────────────────

const messageModel    = require('../models/messageModel');
const unresolvedModel = require('../models/unresolvedModel');

const loggingService = {

  // Catat pesan masuk dari user
  // Dipanggil SEBELUM keyword matching
  // faqId selalu null untuk pesan user
  logUserMessage: async (conversationId, content) => {
    const message = await messageModel.create(
      conversationId,
      'user',
      content,
      null
    );
    return message;
  },

  // Catat jawaban bot
  // faqId diisi jika bot berhasil menjawab
  // faqId null jika bot gagal menjawab
  logBotMessage: async (conversationId, content, faqId = null) => {
    const message = await messageModel.create(
      conversationId,
      'bot',
      content,
      faqId
    );
    return message;
  },

  // Catat pertanyaan yang tidak terjawab ke unresolved_queries
  // Dipanggil HANYA ketika faqId = null (UC-10)
  logUnresolved: async (conversationId, messageId, content) => {
    const unresolved = await unresolvedModel.create(
      conversationId,
      messageId,
      content
    );
    return unresolved;
  },

};

module.exports = loggingService;