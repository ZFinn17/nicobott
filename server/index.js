// =============================================
// NICOBOT - Backend Server SMK ICB Cinta Niaga
// Template-Based Chatbot
// =============================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const userSessions = {};
const NOMOR_ADMIN = '081221049998';

// =============================================
// TEMPLATE JAWABAN
// reply menggunakan HTML langsung — tidak ada markdown
// =============================================
const templates = [

  {
    id: 'salam',
    keywords: ['halo', 'hai', 'hi', 'hello', 'selamat', 'pagi', 'siang', 'sore', 'malam', 'assalamualaikum', 'hei', 'hey', 'hy'],
    reply: `<p>Halo! 👋 Selamat datang di <strong>NicoBot</strong>, asisten resmi SMK ICB Cinta Niaga.</p><p class="mt-2">Ada yang bisa saya bantu? Silakan pilih topik di bawah atau ketik pertanyaanmu langsung ya! 😊</p>`
  },

  {
    id: 'terimakasih',
    keywords: ['terima kasih', 'makasih', 'thanks', 'thank you', 'thx', 'tq', 'tengkyu'],
    reply: `<p>Sama-sama! 😊 Senang bisa membantu. Kalau ada pertanyaan lain seputar SMK ICB Cinta Niaga, jangan ragu untuk bertanya ya!</p>`
  },

  {
    id: 'info_umum',
    keywords: ['info', 'informasi', 'profil', 'tentang', 'kepala sekolah', 'alamat', 'lokasi', 'dimana', 'letak', 'email', 'kontak', 'telepon', 'nomor', 'hubungi', 'whatsapp', 'wa', 'contact'],
    reply: `
      <p class="font-semibold mb-3">Profil SMK ICB Cinta Niaga</p>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Nama</span><span>SMK ICB Cinta Niaga (Insan Cinta Bangsa)</span></div>
        <div class="info-row"><span class="info-label">Kepala Sekolah</span><span>Galih Arifandi, S.Pd.</span></div>
        <div class="info-row"><span class="info-label">Alamat</span><span>Jl. Pahlawan No.19B1, Cihaur Geulis, Kec. Cibeunying Kaler, Kota Bandung 40122</span></div>
        <div class="info-row"><span class="info-label">Telepon / WA</span><span>081221049998</span></div>
        <div class="info-row"><span class="info-label">Email</span><span>smkicbcintaniaga19b@gmail.com</span></div>
      </div>`
  },

  {
    id: 'jam_operasional',
    keywords: ['jam', 'waktu', 'operasional', 'buka', 'tutup', 'masuk', 'pulang', 'jadwal', 'kunjungan', 'tamu'],
    reply: `
      <p class="font-semibold mb-3">Jam Operasional</p>
      <p class="text-xs uppercase tracking-wide opacity-60 mb-1">Jam Sekolah Siswa</p>
      <div class="info-grid mb-3">
        <div class="info-row"><span class="info-label">Senin Selasa</span><span>06.30 14.20 WIB</span></div>
        <div class="info-row"><span class="info-label">Rabu Kamis</span><span>06.30 15.20 WIB</span></div>
        <div class="info-row"><span class="info-label">Jumat</span><span>06.30 11.00 WIB</span></div>
      </div>
      <p class="text-xs uppercase tracking-wide opacity-60 mb-1">Jam Kunjungan Tamu</p>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Senin Kamis</span><span>08.00 15.00 WIB</span></div>
        <div class="info-row"><span class="info-label">Jumat</span><span>08.00 11.00 WIB</span></div>
      </div>`
  },

  {
    id: 'visi_misi',
    keywords: ['visi', 'misi', 'tujuan', 'goal'],
    reply: `
      <p class="font-semibold mb-3">Visi &amp; Misi</p>
      <p class="text-xs uppercase tracking-wide opacity-60 mb-1">Visi</p>
      <p class="mb-3">Menjadi satuan pendidikan vokasi yang mampu membentuk generasi muda yang produktif dan berkarakter, serta berdaya saing global di sektor industri pada tahun 2030.</p>
      <p class="text-xs uppercase tracking-wide opacity-60 mb-2">Misi</p>
      <ol class="misi-list">
        <li>Menghasilkan lulusan yang berkarakter dan berdaya saing global</li>
        <li>Mendorong kreativitas dan kolaborasi dalam pembelajaran bermakna</li>
        <li>Mengembangkan kompetensi siswa melalui pemanfaatan digital (Industri 4.0)</li>
        <li>Memberdayakan siswa agar siap kerja, kuliah, dan berwirausaha</li>
        <li>Menjalin kemitraan dengan ekosistem pendidikan untuk penjaminan mutu</li>
      </ol>`
  },

  {
    id: 'jurusan',
    keywords: ['jurusan', 'program', 'studi', 'kejuruan', 'mplb', 'akuntansi', 'rpl', 'pplg', 'perangkat lunak', 'programmer', 'developer', 'bisnis ritel', 'pemasaran', 'marketing', 'manajemen perkantoran', 'jurusan apa'],
    reply: `
      <p class="font-semibold mb-3">Jurusan yang Tersedia <span class="badge">Maks. 30 siswa/kelas</span></p>
      <div class="jurusan-list">
        <div class="jurusan-item">
          <span class="jurusan-tag">MPLB</span>
          <div>
            <p class="font-medium">Manajemen Perkantoran &amp; Layanan Bisnis</p>
            <p class="text-sm opacity-70">Area kerja luas di berbagai instansi, bisa jadi Event Organizer</p>
          </div>
        </div>
        <div class="jurusan-item">
          <span class="jurusan-tag">AK</span>
          <div>
            <p class="font-medium">Akuntansi dan Keuangan Lembaga</p>
            <p class="text-sm opacity-70">Fokus keuangan, peluang kerja di Bank atau kelola keuangan UMKM</p>
          </div>
        </div>
        <div class="jurusan-item">
          <span class="jurusan-tag">RPL</span>
          <div>
            <p class="font-medium">Pengembangan Perangkat Lunak &amp; GIM</p>
            <p class="text-sm opacity-70">Fokus teknologi &amp; aplikasi, peluang jadi developer / game developer</p>
          </div>
        </div>
        <div class="jurusan-item">
          <span class="jurusan-tag">BR</span>
          <div>
            <p class="font-medium">Bisnis Ritel / Pemasaran</p>
            <p class="text-sm opacity-70">Fokus bisnis digital &amp; marketing online, bisa buka toko sendiri</p>
          </div>
        </div>
      </div>`
  },

  {
    id: 'pendaftaran',
    keywords: ['daftar', 'pendaftaran', 'ppdb', 'cara daftar', 'syarat', 'dokumen', 'registrasi', 'penerimaan', 'gelombang', 'formulir'],
    reply: `
      <p class="font-semibold mb-3">Info Pendaftaran (PPDB)</p>
      <div class="info-row mb-3"><span class="info-label">Jadwal</span><span>Periode utama Mei – Juni (gelombang awal lebih awal)</span></div>
      <p class="text-xs uppercase tracking-wide opacity-60 mb-2">Cara Mendaftar</p>
      <div class="info-grid mb-3">
        <div class="info-row"><span class="info-label">Online</span><span>Link pendaftaran, scan barcode, atau website resmi</span></div>
        <div class="info-row"><span class="info-label">Offline</span><span>Datang langsung ke sekolah, panitia siap membantu</span></div>
      </div>
      <p class="text-xs uppercase tracking-wide opacity-60 mb-2">Dokumen yang Diperlukan</p>
      <ol class="misi-list">
        <li>Fotokopi Ijazah / SKL (2 lembar)</li>
        <li>Fotokopi KTP Orang Tua (2 lembar)</li>
        <li>Fotokopi Kartu Keluarga (1 lembar)</li>
        <li>Surat Keterangan Berkelakuan Baik dari Kepsek SMP asal</li>
        <li>Stofmap Biola warna kuning (2 buah)</li>
        <li>Kaos oblong warna putih</li>
      </ol>`
  },

  {
    id: 'biaya',
    keywords: ['biaya', 'spp', 'uang', 'bayar', 'harga', 'tarif', 'iuran', 'dsp', 'dana sumbangan', 'berapa', 'beasiswa', 'diskon', 'gratis', 'potongan'],
    reply: `
      <p class="font-semibold mb-3">Biaya Sekolah — Kelas 10</p>
      <div class="biaya-table mb-3">
        <div class="biaya-row"><span>SPP per bulan</span><span>Rp 375.000</span></div>
        <div class="biaya-row"><span>Dana Sumbangan (DSP)</span><span>Rp 3.000.000</span></div>
        <div class="biaya-row"><span>Uang Praktik &amp; Ujian / tahun</span><span>Rp 1.550.000</span></div>
        <div class="biaya-row"><span>Biaya Personal Siswa</span><span>Rp 1.200.000</span></div>
        <div class="biaya-row total"><span>Total Awal</span><span>Rp 6.325.000</span></div>
      </div>
      <p class="text-xs opacity-60 mb-3">Biaya personal meliputi: seragam, jas almamater, kartu pelajar, asuransi 3 tahun, kunjungan industri, air minum 1 tahun.</p>
      <p class="text-xs uppercase tracking-wide opacity-60 mb-2">Program Diskon</p>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Diskon 30% DSP</span><span>Daftar 1 Jan – 31 Mar 2026</span></div>
        <div class="info-row"><span class="info-label">Diskon 20% DSP</span><span>Daftar 1 Apr – 30 Jun 2026</span></div>
        <div class="info-row"><span class="info-label">Diskon 30% DSP</span><span>Anak Guru, TNI, atau POLRI</span></div>
        <div class="info-row"><span class="info-label">Diskon 5% tambahan</span><span>Jika biaya dibayar lunas sekaligus</span></div>
        <div class="info-row"><span class="info-label">Gratis SPP 1 bulan</span><span>Jika SPP dibayar penuh 1 tahun</span></div>
      </div>`
  },

  {
    id: 'fasilitas',
    keywords: ['fasilitas', 'sarana', 'prasarana', 'lab', 'laboratorium', 'gor', 'olahraga', 'gedung', 'ruang', 'mart', 'niaga mart', 'seni'],
    reply: `
      <p class="font-semibold mb-3">Fasilitas Sekolah</p>
      <div class="fasilitas-grid">
        <div class="fasilitas-item">Laboratorium Jurusan</div>
        <div class="fasilitas-item">Ruang Seni</div>
        <div class="fasilitas-item">Gedung Olahraga (GOR)</div>
        <div class="fasilitas-item">Niaga Mart</div>
      </div>`
  },

  {
    id: 'ekskul',
    keywords: ['ekskul', 'ekstrakurikuler', 'kegiatan', 'organisasi', 'osis', 'pmr', 'paskibra', 'boxing', 'rohis', 'pramuka', 'basket', 'fotografi', 'angklung', 'english club', 'paduan suara', 'japanese', 'sispala', 'club'],
    reply: `
      <p class="font-semibold mb-3">Ekstrakurikuler</p>
      <div class="ekskul-grid">
        <span class="ekskul-tag">PMR</span>
        <span class="ekskul-tag">Paskibra</span>
        <span class="ekskul-tag">Boxing</span>
        <span class="ekskul-tag">Rohis</span>
        <span class="ekskul-tag">Serinca</span>
        <span class="ekskul-tag">Danger</span>
        <span class="ekskul-tag">Fotografi</span>
        <span class="ekskul-tag">Angklung</span>
        <span class="ekskul-tag">Basket</span>
        <span class="ekskul-tag">Pramuka</span>
        <span class="ekskul-tag">Sispala</span>
        <span class="ekskul-tag">English Club</span>
        <span class="ekskul-tag">Paduan Suara</span>
        <span class="ekskul-tag">Japanese Club</span>
        <span class="ekskul-tag">OSIS</span>
      </div>`
  },

  {
    id: 'pkl',
    keywords: ['pkl', 'magang', 'praktik kerja', 'prakerin', 'industri', 'kerja lapangan', 'tempat magang', 'yogya', 'griya', 'hotel'],
    reply: `
      <p class="font-semibold mb-3">PKL / Magang</p>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Mitra Resmi</span><span>Toserba Yogya / Griya (semua jurusan) dan perhotelan</span></div>
        <div class="info-row"><span class="info-label">Mandiri</span><span>Siswa boleh mencari tempat PKL sendiri</span></div>
      </div>`
  },

  {
    id: 'prestasi',
    keywords: ['prestasi', 'alumni', 'lulusan', 'kerja', 'karir', 'sukses', 'pencapaian', 'nicholas', 'taufiq', 'devops', 'berprestasi'],
    reply: `
      <p class="font-semibold mb-3">Prestasi &amp; Alumni</p>
      <p class="mb-3">Sekolah menjamin lulusannya <strong>siap kerja</strong> — tidak ada siswa yang menganggur setelah lulus. Aktif mengadakan workshop dan persiapan karir. 🎯</p>
      <p class="text-xs uppercase tracking-wide opacity-60 mb-2">Alumni Berprestasi</p>
      <div class="alumni-list">
        <div class="alumni-item">
          <p class="font-medium">Nicholas Alvi Saputra</p>
          <p class="text-sm opacity-70">Alumni RPL 2019 → DevOps Engineer di PT. Swamedia</p>
        </div>
        <div class="alumni-item">
          <p class="font-medium">Dr. Taufiq Hifayat, S.Sos., M.M.</p>
          <p class="text-sm opacity-70">Wakil Ketua 1 Bidang Akademik di STIE Pariwisata Yapari Bandung</p>
        </div>
      </div>`
  },

  {
    id: 'fallback',
    keywords: [],
    reply: `<p>Maaf, saya belum bisa menjawab pertanyaan itu. 🙏</p><p class="mt-2">Silakan pilih topik yang tersedia, atau hubungi admin kami langsung:</p><p class="mt-2"><strong>WhatsApp:</strong> 081221049998<br><strong>Email:</strong> smkicbcintaniaga19b@gmail.com</p>`
  }
];

function matchIntent(message) {
  const lower = message.toLowerCase().trim();
  for (const tmpl of templates) {
    if (tmpl.id === 'fallback') continue;
    for (const kw of tmpl.keywords) {
      if (lower.includes(kw)) return tmpl;
    }
  }
  return templates.find(t => t.id === 'fallback');
}

app.get('/api/quick-replies', (req, res) => {
  res.json([
    { id: 1, label: 'Jurusan yang Tersedia',  message: 'jurusan apa saja' },
    { id: 2, label: 'Info Pendaftaran',        message: 'cara daftar' },
    { id: 3, label: 'Biaya Sekolah',           message: 'biaya sekolah' },
    { id: 4, label: 'Fasilitas & Ekskul',      message: 'fasilitas ekskul' },
    { id: 5, label: 'Jam Operasional',         message: 'jam operasional' },
    { id: 6, label: 'Prestasi & Alumni',       message: 'prestasi alumni' },
    { id: 7, label: 'Lokasi & Kontak',         message: 'alamat kontak' },
    { id: 8, label: 'Visi & Misi',             message: 'visi misi' },
  ]);
});

app.post('/api/chat', (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || message.trim() === '') return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  if (!sessionId) return res.status(400).json({ error: 'Session ID tidak ditemukan' });
  if (!userSessions[sessionId]) userSessions[sessionId] = {};
  const matched = matchIntent(message);
  res.json({ reply: matched.reply, intent: matched.id, timestamp: new Date().toISOString() });
});

app.post('/api/reset-session', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && userSessions[sessionId]) delete userSessions[sessionId];
  res.json({ message: 'Sesi berhasil direset' });
});

app.get('/', (req, res) => res.send('NicoBot Server berjalan! 🚀'));

app.listen(PORT, () => console.log(`NicoBot Server berjalan di http://localhost:${PORT}`));