# Mitrans-Astra · Mitra PLS (prototipe)

Prototipe web penjualan langsung Mitrans-Astra: halaman depan, pendaftaran Mitra PLS, Kantor Maya, dasbor admin, dan **engine komisi/PV** sesuai Rencana Pemasaran v1.4.

> **Prototipe.** Dokumen sumber masih draf yang menunggu tinjauan konsultan hukum dan verifikasi asosiasi. Semua data di aplikasi sintetis. Belum ada backend, pembayaran, atau data pribadi nyata. Jangan dipakai untuk menghitung komisi sungguhan sebelum tahap produksi pada `docs/ARSITEKTUR_SISTEM.md` selesai.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 54 uji engine
npm run simulate   # skenario Bab 12.3 → docs/HASIL_SIMULASI.md (±1 menit)
npm run build      # typecheck + bundle produksi
```

## Halaman

| Rute | Isi |
|---|---|
| `/` | Halaman depan |
| `/aturan` | Ringkasan aturan (dibangun dari konstanta engine) |
| `/daftar` | Pendaftaran Mitra PLS: penjelasan → data diri → persetujuan → kuis Kode Etik → tautan rujukan |
| `/mitra` | Kantor Maya: ringkasan, jaringan biner, komisi, peringkat, Plan B, rujukan |
| `/admin` | Ikhtisar, tutup bulan & plafon, pembayaran Jumat, Mitra PLS, Pool & Prestasi, kepatuhan, simulasi |

## Dokumen

- `docs/RINGKASAN_ATURAN.md`: aturan dan lokasinya di kode
- `docs/ARSITEKTUR_SISTEM.md`: rancangan sistem, asumsi kerja yang perlu diputuskan, rancangan produksi
- `docs/HASIL_SIMULASI.md`: hasil simulasi engine (bukan proyeksi penjualan)
