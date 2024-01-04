const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database('impordb.db');

// Middleware untuk parsing body JSON
app.use(express.json());

async function getUraianBarang(kodeBarang) {
  try {
    const response = await axios.get(`https://insw-dev.ilcs.co.id/my/n/barang?hs_code=${kodeBarang}`);
    return response.data.uraian_barang || 'Uraian tidak ditemukan';
  } catch (error) {
    console.error('Gagal mengambil uraian barang:', error.message);
    return 'Uraian tidak ditemukan';
  }
}

async function getTarifBiayaImpor(kodeBarang) {
  try {
    const response = await axios.get(`https://insw-dev.ilcs.co.id/my/n/tarif?hs_code=${kodeBarang}`);
    return response.data.bm || 0;
  } catch (error) {
    console.error('Gagal mengambil tarif biaya impor:', error.message);
    return 0;
  }
}

function simpanDataSimulasi(dataSimulasi) {
  const stmt = db.prepare(`
    INSERT INTO simulasi (
      id_simulasi, kode_barang, uraian_barang, bm, nilai_komoditas, nilai_bm, waktu_insert
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  stmt.run(
    dataSimulasi.id_simulasi,
    dataSimulasi.kode_barang,
    dataSimulasi.uraian_barang,
    dataSimulasi.bm,
    dataSimulasi.nilai_komoditas,
    dataSimulasi.nilai_bm
  );

  stmt.finalize();
}

app.post('/simulasi', async (req, res) => {
  const { kode_barang, nilai_komoditas } = req.body;

  if (!kode_barang || isNaN(nilai_komoditas)) {
    return res.status(400).json({ error: 'Kode barang dan nilai komoditas harus disertakan dengan benar.' });
  }

  try {
    const uraian_barang = await getUraianBarang(kode_barang);
    const bm = await getTarifBiayaImpor(kode_barang);
    const nilai_bm = (nilai_komoditas * bm) / 100;

    const dataSimulasi = {
      id_simulasi: uuidv4(),
      kode_barang,
      uraian_barang,
      bm,
      nilai_komoditas,
      nilai_bm,
    };

    simpanDataSimulasi(dataSimulasi);

    console.log('Data Simulasi berhasil disimpan:');
    console.log(dataSimulasi);

    res.json(dataSimulasi);
  } catch (error) {
    console.error('Gagal melakukan simulasi:', error.message);
    res.status(500).json({ error: 'Gagal melakukan simulasi' });
  }
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

//close aplikasi
process.on('SIGINT', () => {
  console.log('Menutup aplikasi...');
  db.close();
  process.exit();
});
