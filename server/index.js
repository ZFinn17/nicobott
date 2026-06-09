// index.js
// ─────────────────────────────────────────────
// Entry point NicoBot Backend
// Tugasnya hanya:
//   1. Setup Express
//   2. Daftarkan middleware
//   3. Daftarkan routes
//   4. Jalankan server
// Tidak ada logika bisnis di sini
// ─────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// Inisialisasi koneksi database
require('./config/database');

// Import routes
const chatRoutes     = require('./routes/chat');
const feedbackRoutes = require('./routes/feedback');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────
app.use('/api/chat',     chatRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'NicoBot Server berjalan 🚀' });
});

// ── Start Server ───────────────────────────────
app.listen(PORT, () => {
  console.log(`NicoBot Server berjalan di http://localhost:${PORT}`);
});