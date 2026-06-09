// services/testFull.js — FILE SEMENTARA
// Simulasi alur lengkap: pesan masuk → matching → logging
// Hapus setelah verifikasi selesai

const { v4: uuidv4 }      = require('uuid');
const conversationService = require('./conversationService');
const keywordService      = require('./keywordService');
const loggingService      = require('./loggingService');
const escalationService   = require('./escalationService');

async function test() {
  console.log('=== Simulasi Alur Lengkap NicoBot ===\n');

  // 1. Buat sesi baru (UC-01)
  const sessionId = uuidv4();
  console.log(`1. Session ID baru: ${sessionId}`);
  const { conversation, isNew } = await conversationService.getOrCreate(sessionId);
  console.log(`   ✅ Sesi ${isNew ? 'BARU dibuat' : 'sudah ada'} — conversation_id: ${conversation.id}\n`);

  // 2. Simulasi pesan yang BERHASIL dijawab
  const pesanBerhasil = 'cara daftar ke sekolah';
  console.log(`2. Pesan masuk: "${pesanBerhasil}"`);

  const userMsg = await loggingService.logUserMessage(conversation.id, pesanBerhasil);
  console.log(`   ✅ Pesan user dicatat — message_id: ${userMsg.id}`);

  const faq = await keywordService.match(pesanBerhasil);
  console.log(`   ✅ FAQ ditemukan: "${faq.question}"`);

  const botMsg = await loggingService.logBotMessage(conversation.id, faq.answer, faq.id);
  console.log(`   ✅ Jawaban bot dicatat — message_id: ${botMsg.id}, faq_id: ${botMsg.faq_id}\n`);

  await conversationService.updateActivity(conversation.id);
  console.log(`   ✅ Status sesi diperbarui (UC-11)\n`);

  // 3. Simulasi pesan yang GAGAL dijawab
  const pesanGagal = 'pertanyaan yang tidak ada jawabannya xyz';
  console.log(`3. Pesan masuk: "${pesanGagal}"`);

  const userMsg2 = await loggingService.logUserMessage(conversation.id, pesanGagal);
  console.log(`   ✅ Pesan user dicatat — message_id: ${userMsg2.id}`);

  const faq2 = await keywordService.match(pesanGagal);
  console.log(`   ℹ️  FAQ tidak ditemukan: ${faq2}`);

  const fallbackText = 'Maaf, saya belum bisa menjawab pertanyaan itu. Silakan hubungi admin kami.';
  const botMsg2 = await loggingService.logBotMessage(conversation.id, fallbackText, null);
  console.log(`   ✅ Jawaban fallback dicatat — faq_id: ${botMsg2.faq_id}`);

  const unresolved = await loggingService.logUnresolved(conversation.id, userMsg2.id, pesanGagal);
  console.log(`   ✅ Unresolved query dicatat — id: ${unresolved.id}, status: ${unresolved.status}`);

  await conversationService.markEscalated(conversation.id);
  console.log(`   ✅ Sesi ditandai eskalasi (UC-06)`);

  const waUrl = escalationService.buildWhatsAppUrl(pesanGagal);
  console.log(`   ✅ WhatsApp URL: ${waUrl}\n`);

  console.log('=== Semua service berjalan dengan benar ===');
  process.exit(0);
}

test().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});