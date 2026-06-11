// controllers/feedbackController.js
// ─────────────────────────────────────────────
// Menangani penilaian 👍/👎 dari pengunjung
// Use Case: UC-05 Memberikan feedback
// ─────────────────────────────────────────────

const feedbackModel = require("../models/feedbackModel");

const feedbackController = {
  // POST /api/feedback
  // UC-05: Simpan penilaian user terhadap jawaban bot
  submit: async (req, res) => {
    try {
      const { message_id, faq_id, value } = req.body;

      // Validasi keberadaan field
      if (!message_id || !faq_id || value === undefined || value === null) {
        return res.status(400).json({
          success: false,
          message: "message_id, faq_id, dan value wajib diisi",
        });
      }

      // Konversi value: frontend kirim 'like'/'dislike', DB simpan 1/-1
      const VALUE_MAP = { like: 1, dislike: -1 };
      const numericValue =
        typeof value === "string" ? VALUE_MAP[value.toLowerCase()] : value;

      if (numericValue !== 1 && numericValue !== -1) {
        return res.status(400).json({
          success: false,
          message: "value harus 'like', 'dislike', 1, atau -1",
        });
      }

      // Cek apakah pesan ini sudah pernah diberi feedback
      const existing = await feedbackModel.findByMessageId(message_id);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Feedback untuk pesan ini sudah pernah diberikan",
        });
      }

      // Simpan feedback
      const feedback = await feedbackModel.create(
        message_id,
        faq_id,
        numericValue,
      );

      return res.status(200).json({
        success: true,
        message: "Feedback berhasil disimpan",
        data: {
          id: feedback.id,
          message_id: feedback.message_id,
          faq_id: feedback.faq_id,
          value: feedback.value,
        },
      });
    } catch (err) {
      console.error("[submitFeedback] Error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat menyimpan feedback",
      });
    }
  },
};

module.exports = feedbackController;
