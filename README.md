# Mitrans-Astra · Mitra PLS (prototipe)

Prototipe web penjualan langsung Mitrans-Astra: halaman depan, pendaftaran Mitra PLS, Kantor Maya, dasbor admin, dan **engine komisi/PV** sesuai rancangan kompensasi **v2.0 (draf)** di atas Rencana Pemasaran v1.2: program 90 hari ("Ajak 2 orang per bulan selama 2 bulan, dan bantu mereka melakukan hal yang sama"), 12 peringkat bulanan, dana leadership, plafon 60%.

> **Prototipe.** Dokumen sumber masih draf yang menunggu tinjauan konsultan hukum dan verifikasi asosiasi. Semua data di aplikasi sintetis. Belum ada backend, pembayaran, atau data pribadi nyata. Jangan dipakai untuk menghitung komisi sungguhan sebelum tahap produksi pada `docs/ARSITEKTUR_SISTEM.md` selesai.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # uji engine (vitest)
npm run simulate   # skenario Bab 12.3 + headline v2.0 → docs/HASIL_SIMULASI.md (±1 menit)
npm run audit      # audit keuangan v2.0: 11 skenario pertumbuhan → docs/AUDIT_KOMPENSASI_V2.md (±1 menit)
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

- `docs/superpowers/specs/2026-10-29-rencana-kompensasi-v2-design.md`: spesifikasi kompensasi v2.0 (draf)
- `docs/superpowers/plans/2026-10-29-kompensasi-v2-engine.md`: rencana implementasi engine v2.0
- `docs/RINGKASAN_ATURAN.md`: aturan dan lokasinya di kode
- `docs/ARSITEKTUR_SISTEM.md`: rancangan sistem, asumsi kerja yang perlu diputuskan, rancangan produksi
- `docs/HASIL_SIMULASI.md`: hasil simulasi engine (bukan proyeksi penjualan)
- `docs/AUDIT_KOMPENSASI_V2.md`: audit keuangan perusahaan v2.0 di berbagai skenario pertumbuhan
