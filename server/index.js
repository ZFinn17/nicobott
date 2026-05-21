// =============================================
// NICOBOT - Backend Server SMK ICB Cinta Niaga
// =============================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Inisialisasi Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// =============================================
// PENYIMPANAN SESI USER (sementara di memory)
// Key: sessionId, Value: jumlah pertanyaan
// =============================================
const userSessions = {};
const BATAS_PERTANYAAN = 10;
const NOMOR_ADMIN = '081221049998'; // Nomor WA admin sekolah

// =============================================
// DATA SEKOLAH - Konteks untuk Chatbot
// =============================================
const dataSekolah = `
INFORMASI RESMI SMK ICB CINTA NIAGA (INSAN CINTA BANGSA)

=== INFO UMUM ===
- Nama Sekolah: SMK ICB Cinta Niaga (Insan Cinta Bangsa)
- Kepala Sekolah: Galih Arifandi, S.Pd.
- Alamat: Jl. Pahlawan No.19B1, Cihaur Geulis, Kec. Cibeunying Kaler, Kota Bandung, Jawa Barat 40122
- Telepon/WhatsApp: 081221049998
- Email: smkicbcintaniaga19b@gmail.com

=== JAM OPERASIONAL ===
Siswa:
- Senin - Selasa: 06.30 - 14.20 WIB
- Rabu - Kamis: 06.30 - 15.20 WIB
- Jumat: 06.30 - 11.00 WIB

Tamu/Kunjungan:
- Senin - Kamis: 08.00 - 15.00 WIB
- Jumat: 08.00 - 11.00 WIB

=== VISI & MISI ===
Visi: Menjadi satuan pendidikan vokasi yang mampu membentuk generasi muda yang produktif, dan berkarakter (cageur, bageur, bener, pinter, singer), serta berdaya saing global di sektor industri pada tahun 2030.

Misi:
1. Menghasilkan lulusan yang berkarakter dan berdaya saing global
2. Mendorong kreativitas dan kolaborasi dalam pembelajaran yang bermakna
3. Mengembangkan kompetensi siswa melalui pemanfaatan digital untuk revolusi Industri 4.0
4. Memberdayakan karakter siswa agar siap bekerja, melanjutkan pendidikan, dan berwirausaha
5. Menjalin kemitraan dengan seluruh ekosistem pendidikan untuk penjaminan mutu berkualitas

=== JURUSAN ===
Kapasitas: Maksimal 30 siswa per kelas (berlaku semua jurusan)

1. Manajemen Perkantoran & Layanan Bisnis (MPLB)
   - Area kerja luas di berbagai instansi
   - Bisa bekerja sebagai Event Organizer

2. Akuntansi dan Keuangan Lembaga (AK)
   - Fokus pada keuangan
   - Peluang kerja di Bank atau mengelola keuangan UMKM

3. Pengembangan Perangkat Lunak & GIM (PPLG/RPL)
   - Fokus pada teknologi dan pembuatan aplikasi
   - Peluang kerja sebagai developer, programmer, game developer

4. Bisnis Ritel / Pemasaran (BR)
   - Fokus pada bisnis digital dan pemasaran online
   - Peluang membuka toko sendiri atau terjun ke dunia marketing

=== PENDAFTARAN / PPDB ===
Jadwal: Periode utama Mei - Juni, pendaftaran gelombang awal sudah dibuka sebelumnya

Cara Mendaftar:
- Online: Melalui link pendaftaran, scan barcode, atau website resmi sekolah
- Offline: Datang langsung ke sekolah, akan diarahkan panitia

Syarat Dokumen:
1. Fotokopi Ijazah / Surat Keterangan Lulus (2 Lembar)
2. Fotokopi KTP Orang Tua (2 Lembar)
3. Fotokopi Kartu Keluarga (1 Lembar)
4. Surat Keterangan Berkelakuan Baik dari Kepala Sekolah SMP asal
5. Stofmap Biola warna kuning (2 Buah)
6. Kaos oblong warna putih

Rincian Biaya (Kelas 10):
- SPP per bulan: Rp 375.000
- Dana Sumbangan Sekolah (DSP): Rp 3.000.000
- Uang Praktik & Ujian (per tahun): Rp 1.550.000
- Biaya Personal Siswa: Rp 1.200.000
  (termasuk seragam olahraga, jurusan, batik, jas almamater, kartu pelajar, asuransi 3 tahun, kunjungan industri, air minum 1 tahun)
- TOTAL BIAYA AWAL: Rp 6.325.000 (sebelum diskon)

Program Beasiswa / Diskon:
- Diskon DSP 30%: Pendaftaran 1 Januari - 31 Maret 2026
- Diskon DSP 20%: Pendaftaran 1 April - 30 Juni 2026
- Diskon DSP 30%: Khusus anak Guru, TNI, atau POLRI
- Diskon Tambahan 5%: Jika seluruh biaya dibayar lunas
- Gratis SPP 1 Bulan: Jika SPP dibayar penuh 1 tahun sekaligus

=== FASILITAS ===
- Laboratorium untuk setiap jurusan
- Ruang Seni
- Gedung Olahraga (GOR)
- Niaga Mart

=== EKSTRAKURIKULER ===
PMR, Paskibra, Boxing, Rohis, Serinca, Danger, Fotografi, Angklung, Basket, Pramuka, Sispala, English Club, Paduan Suara (Padus), Japanese Club, dan OSIS

=== MAGANG / PKL ===
- Jaringan PKL: Toserba Yogya/Griya (semua jurusan) dan perhotelan
- Siswa juga diperbolehkan mencari tempat PKL sendiri secara mandiri

=== PRESTASI & ALUMNI ===
- Sekolah menjamin lulusannya siap kerja (tidak ada siswa yang menganggur setelah lulus)
- Sangat aktif mengadakan berbagai acara dan workshop persiapan karir

Alumni Berprestasi:
- Nicholas Alvi Saputra: Alumni RPL angkatan 2019, berkarir sebagai DevOps Engineer di PT. Swamedia
- Dr. Taufiq Hifayat, S.Sos., M.M.: Wakil Ketua 1 Bidang Akademik dan Kemahasiswaan di STIE Pariwisata Yapari Bandung
`;

// =============================================
// SYSTEM PROMPT - Kepribadian & Aturan Chatbot
// =============================================
const systemPrompt = `
Kamu adalah NicoBot, asisten chatbot resmi SMK ICB Cinta Niaga yang ramah, sopan, dan informatif.
Tugasmu HANYA menjawab pertanyaan seputar SMK ICB Cinta Niaga.

Berikut adalah data resmi sekolah yang boleh kamu gunakan untuk menjawab:
${dataSekolah}

ATURAN PENTING yang wajib kamu ikuti:
1. Jawab HANYA pertanyaan yang berkaitan dengan SMK ICB Cinta Niaga
2. Jika ditanya di luar topik sekolah (misal: resep masakan, pelajaran umum, politik, hiburan, dll), tolak dengan sopan dan arahkan balik ke topik sekolah
3. Jika pertanyaan terlalu kompleks atau sensitif, sarankan user untuk menghubungi admin langsung
4. Gunakan bahasa Indonesia yang sopan, ramah, dan mudah dipahami
5. JANGAN mengarang atau membuat informasi yang tidak ada di data sekolah di atas
6. Jawaban harus singkat, padat, dan jelas
7. Boleh menggunakan emoji secukupnya agar terasa ramah
8. Jika user mengucapkan salam, balas dengan ramah dan tanyakan apa yang bisa dibantu
`;

// =============================================
// ENDPOINT: Quick Replies (Tombol Pilihan)
// =============================================
app.get('/api/quick-replies', (req, res) => {
    const quickReplies = [
        { id: 1, label: '📚 Jurusan yang Tersedia' },
        { id: 2, label: '📝 Info Pendaftaran' },
        { id: 3, label: '💰 Biaya Sekolah' },
        { id: 4, label: '🎓 Fasilitas & Ekskul' },
        { id: 5, label: '⏰ Jam Operasional' },
        { id: 6, label: '🏆 Prestasi & Alumni' },
        { id: 7, label: '📍 Lokasi Sekolah' },
        { id: 8, label: '📞 Kontak Sekolah' },
    ];
    res.json(quickReplies);
});

// =============================================
// ENDPOINT: Chat dengan Gemini AI
// =============================================
app.post('/api/chat', async (req, res) => {
    const { message, history, sessionId } = req.body;

    // Validasi input
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
    }

    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID tidak ditemukan' });
    }

    // Cek & update jumlah pertanyaan user
    if (!userSessions[sessionId]) {
        userSessions[sessionId] = 0;
    }

    // Kalau sudah mencapai batas, tolak dan arahkan ke admin
    if (userSessions[sessionId] >= BATAS_PERTANYAAN) {
        return res.json({
            reply: `Maaf, kamu sudah mencapai batas maksimal ${BATAS_PERTANYAAN} pertanyaan untuk sesi ini. 😊\n\nUntuk pertanyaan lebih lanjut, silakan hubungi admin kami langsung melalui WhatsApp ya!`,
            limitReached: true,
            adminContact: NOMOR_ADMIN,
            timestamp: new Date().toISOString()
        });
    }

    // Tambah hitungan pertanyaan
    userSessions[sessionId]++;
    const sisaPertanyaan = BATAS_PERTANYAAN - userSessions[sessionId];

    try {
        // Bangun riwayat percakapan
        const chatHistory = (history || []).map(item => ({
            role: item.role,
            parts: [{ text: item.text }]
        }));

        // Mulai sesi chat dengan Gemini
        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: systemPrompt }]
                },
                {
                    role: 'model',
                    parts: [{ text: 'Siap! Saya NicoBot, asisten resmi SMK ICB Cinta Niaga. Saya siap membantu menjawab pertanyaan seputar sekolah kami. 😊' }]
                },
                ...chatHistory
            ]
        });

        // Kirim pesan user ke Gemini
        const result = await chat.sendMessage(message);
        let botReply = result.response.text();

        // Kalau sisa pertanyaan tinggal 3 atau kurang, kasih peringatan
        if (sisaPertanyaan <= 3 && sisaPertanyaan > 0) {
            botReply += `\n\n⚠️ *Sisa pertanyaan kamu: ${sisaPertanyaan} lagi.*`;
        }

        res.json({
            reply: botReply,
            sisaPertanyaan: sisaPertanyaan,
            limitReached: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error saat menghubungi Gemini:', error.message);
        // Kalau error, jangan hitung sebagai pertanyaan
        userSessions[sessionId]--;
        res.status(500).json({
            error: 'Maaf, terjadi kesalahan pada server. Silakan coba lagi atau hubungi admin.',
            adminContact: NOMOR_ADMIN
        });
    }
});

// =============================================
// ENDPOINT: Reset Sesi (opsional)
// =============================================
app.post('/api/reset-session', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && userSessions[sessionId]) {
        delete userSessions[sessionId];
    }
    res.json({ message: 'Sesi berhasil direset' });
});

// =============================================
// ENDPOINT: Test Server
// =============================================
app.get('/', (req, res) => {
    res.send('NicoBot Server sudah berjalan! 🚀');
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`NicoBot Server berjalan di http://localhost:${PORT}`);
});
v