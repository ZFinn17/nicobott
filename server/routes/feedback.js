// routes/feedback.js
// ─────────────────────────────────────────────
// Mendefinisikan URL endpoint untuk feedback
// ─────────────────────────────────────────────

const express             = require('express');
const router              = express.Router();
const feedbackController  = require('../controllers/feedbackController');

// UC-05: Memberikan feedback 👍/👎
router.post('/', feedbackController.submit);

module.exports = router;