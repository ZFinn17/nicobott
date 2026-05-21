// 1. Import library yang udah kita install tadi
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000; // Server kamu bakal jalan di port 5000

// 2. Middleware (Fitur tambahan agar server bisa bekerja dengan baik)
app.use(cors()); // Mencegah eror CORS agar si 'client' (frontend) bisa akses server ini
app.use(express.json()); // Biar server bisa membaca data berformat JSON dari frontend

// 3. Membuat Jalur API (Endpoint)
// Jalur Utama: buat ngetes apakah server udah nyala atau belum
app.get('/', (req, res) => {
    res.send('Mantap! Server Node.js + Express kamu udah berhasil berjalan! 🚀');
});

// Jalur API Data: Ini contoh jalur data yang nanti bisa diambil oleh frontend 'client'
app.get('/api/produk', (req, res) => {
    const dataProduk = [
        { id: 1, nama: "Makaroni Pedas Level 5", harga: 5000 },
        { id: 2, nama: "Ceker Mercon Setan", harga: 10000 },
        { id: 3, nama: "Basreng Daun Jeruk", harga: 7000 }
    ];
    res.json(dataProduk); // Mengirim data ke frontend dalam bentuk JSON
});

// 4. Menjalankan Server
app.listen(PORT, () => {
    console.log(`Server kamu sudah siap! Jalankan di browser: http://localhost:${PORT}`);
});