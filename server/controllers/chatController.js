// controllers/chatController.js
// ─────────────────────────────────────────────
// Mengkoordinasikan semua service untuk alur chat
// Use Case yang ditangani:
//   UC-01 Membuka sesi chatbot
//   UC-02 Memilih quick reply
//   UC-03 Mengirim pesan bebas
//   UC-04 Menerima jawaban chatbot
//   UC-06 Meminta bantuan admin
//   UC-07 Mengakhiri sesi
//   UC-08 Mencocokkan keyword
//   UC-09 Mencatat log pesan
//   UC-10 Menyimpan unresolved query
//   UC-11 Memperbarui status sesi
// ─────────────────────────────────────────────

const { v4: uuidv4 }      = require('uuid');
const conversationService = require('../services/conversationService');
const keywordService      = require('../services/keywordService');
const loggingService      = require('../services/loggingService');
const escalationService   = require('../services/escalationService');

const FALLBACK_MESSAGE = 'Maaf, saya belum bisa menjawab pertanyaan itu. 🙏 Silakan hubungi admin kami langsung ya!';

const chatController = {

  // POST /api/conversation/start
  // UC-01: Membuka sesi chatbot
  startSession: async (req, res) => {
    try {
      const { session_id } = req.body;

      if (!session_id || session_id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'session_id tidak boleh kosong'
        });
      }

      const { conversation, isNew } = await conversationService.getOrCreate(session_id);

      return res.status(200).json({
        success: true,
        conversation_id: conversation.id,
        session_id: conversation.session_id,
        is_new: isNew
      });

    } catch (err) {
      console.error('[startSession] Error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat memulai sesi'
      });
    }
  },

  // POST /api/chat/message
  // UC-02/03: Kirim pesan → matching → logging → response
  sendMessage: async (req, res) => {
    try {
      const { session_id, message } = req.body;

      // Validasi input
      if (!session_id || session_id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'session_id tidak boleh kosong'
        });
      }
      if (!message || message.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Pesan tidak boleh kosong'
        });
      }

      // Pastikan sesi ada di database (UC-01)
      const { conversation } = await conversationService.getOrCreate(session_id);

      // Catat pesan user ke database (UC-09)
      const userMessage = await loggingService.logUserMessage(
        conversation.id,
        message.trim()
      );

      // Jalankan keyword matching (UC-08)
      const faq = await keywordService.match(message.trim());

      let responsePayload;

      if (faq) {
        // ── FAQ DITEMUKAN ──────────────────────────
        // Catat jawaban bot dengan faq_id (UC-09)
        const botMessage = await loggingService.logBotMessage(
          conversation.id,
          faq.answer,
          faq.id
        );

        responsePayload = {
          success:      true,
          resolved:     true,
          answer:       faq.answer,
          faq_id:       faq.id,
          category:     faq.category,
          message_id:   botMessage.id,
          whatsapp_url: null
        };

      } else {
        // ── FAQ TIDAK DITEMUKAN ────────────────────
        // Catat jawaban fallback tanpa faq_id (UC-09)
        const botMessage = await loggingService.logBotMessage(
          conversation.id,
          FALLBACK_MESSAGE,
          null
        );

        // Catat ke unresolved_queries (UC-10)
        await loggingService.logUnresolved(
          conversation.id,
          userMessage.id,
          message.trim()
        );

        // Tandai sesi sebagai eskalasi (UC-06)
        await conversationService.markEscalated(conversation.id);

        // Bangun WhatsApp URL
        const whatsappUrl = escalationService.buildWhatsAppUrl(message.trim());

        responsePayload = {
          success:      true,
          resolved:     false,
          answer:       FALLBACK_MESSAGE,
          faq_id:       null,
          category:     null,
          message_id:   botMessage.id,
          whatsapp_url: whatsappUrl
        };
      }

      // Update waktu aktif sesi (UC-11)
      await conversationService.updateActivity(conversation.id);

      return res.status(200).json(responsePayload);

    } catch (err) {
      console.error('[sendMessage] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat memproses pesan'
      });
    }
  },

  // POST /api/conversation/end
  // UC-07: Mengakhiri sesi chatbot
  endSession: async (req, res) => {
    try {
      const { session_id } = req.body;

      if (!session_id || session_id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'session_id tidak boleh kosong'
        });
      }

      await conversationService.updateActivity(session_id);

      return res.status(200).json({
        success: true,
        message: 'Sesi berhasil diakhiri'
      });

    } catch (err) {
      console.error('[endSession] Error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengakhiri sesi'
      });
    }
  },

  // GET /api/quick-replies
  // Mengembalikan daftar tombol quick reply
  getQuickReplies: (req, res) => {
    const quickReplies = [
      { id: 1, label: 'Jurusan yang Tersedia',  value: 'jurusan apa saja' },
      { id: 2, label: 'Info Pendaftaran',        value: 'cara daftar' },
      { id: 3, label: 'Biaya Sekolah',           value: 'biaya sekolah' },
      { id: 4, label: 'Fasilitas Sekolah',       value: 'fasilitas sekolah' },
      { id: 5, label: 'Jam Operasional',         value: 'jam operasional' },
      { id: 6, label: 'Prestasi dan Alumni',     value: 'prestasi alumni' },
      { id: 7, label: 'Lokasi dan Kontak',       value: 'alamat kontak' },
      { id: 8, label: 'Visi dan Misi',           value: 'visi misi' },
    ];

    return res.status(200).json({
      success: true,
      data: quickReplies
    });
  },

};

module.exports = chatController;