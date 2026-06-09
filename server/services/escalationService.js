// services/escalationService.js
// ─────────────────────────────────────────────
// Membangun URL WhatsApp untuk eskalasi ke admin
// Use Case: UC-06 Meminta bantuan admin
//
// Ketika bot gagal menjawab:
// 1. Frontend menerima whatsapp_url dari response
// 2. User klik tombol "Hubungi Admin"
// 3. WhatsApp terbuka dengan pesan pre-filled
//    berisi pertanyaan user
// ─────────────────────────────────────────────

require('dotenv').config();

const escalationService = {

  // Buat URL WhatsApp dengan konteks pertanyaan user
  buildWhatsAppUrl: (userMessage) => {
    const nomorAdmin = process.env.NOMOR_ADMIN;

    // Format nomor: hilangkan 0 di depan, tambah 62
    // 081221049998 → 6281221049998
    const formattedNumber = nomorAdmin.startsWith('0')
      ? '62' + nomorAdmin.slice(1)
      : nomorAdmin;

    const text = `Halo Admin SMK ICB Cinta Niaga 👋\n\nSaya ingin bertanya:\n"${userMessage}"\n\nMohon bantuannya, terima kasih!`;

    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${formattedNumber}?text=${encodedText}`;
  },

};

module.exports = escalationService;