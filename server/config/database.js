require('../config/database');

// config/database.js
// ─────────────────────────────────────────────
// Koneksi pool ke PostgreSQL
// File ini dipakai oleh semua models untuk
// menjalankan query ke database nicobot
// ─────────────────────────────────────────────

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test koneksi saat server pertama kali dijalankan
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Gagal terhubung ke database:', err.message);
    return;
  }
  release();
  console.log('✅ Terhubung ke database nicobot');
});

module.exports = pool;