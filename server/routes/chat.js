// routes/chat.js
// ─────────────────────────────────────────────
// Mendefinisikan URL endpoint untuk chat
// File ini HANYA menentukan route dan method
// Logika sepenuhnya ada di chatController
// ─────────────────────────────────────────────

const express        = require('express');
const router         = express.Router();
const chatController = require('../controllers/chatController');

// UC-01: Membuka sesi chatbot
router.post('/conversation/start', chatController.startSession);

// UC-02 / UC-03: Mengirim pesan (quick reply atau bebas)
router.post('/message', chatController.sendMessage);

// UC-07: Mengakhiri sesi chatbot
router.post('/conversation/end', chatController.endSession);

// Daftar quick reply
router.get('/quick-replies', chatController.getQuickReplies);

module.exports = router;