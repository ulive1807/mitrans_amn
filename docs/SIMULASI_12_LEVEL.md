# Simulasi Jaringan Biner 12 Level: Lisensi Atlas dan Lisensi Atlas Family

Dibuat oleh `npx tsx scripts/simulasi-12-level.ts` · parameter v2.0-draf · 16 bulan sejak 2027-01

> Data sintetis untuk menguji aturan bonus pada keadaan **terbaik bagi Mitra** (duplikasi sempurna, tanpa pembatalan, semua berlangganan Atlas Membership). Bukan proyeksi penjualan atau janji penghasilan.

Skenario:
- **A**: Mitra teratas (M1) membeli Lisensi Atlas; setiap orang menjual 2 Lisensi (kiri dan kanan) pada bulan berikutnya sampai 12 level di bawah M1 penuh (8.191 orang).
- **B**: semua posisi 12 level berisi kursi Family. Kaki ayah diisi anak dan istri; setiap anak dan istri menjual 2 paket Family.
- **C**: pola Family yang disetujui: setiap ayah menjual 2 paket per bulan selama 2 bulan pertamanya; anak dan istri belum menjual. Jaringan tumbuh 7 bulan; karena paket ke-2 dan seterusnya ditempatkan di ujung kaki, kedalamannya melewati 12 level (bonus tetap hanya dihitung 10 level).
- Di semua skenario, **M1 tetap aktif**: setelah bulan pertamanya M1 menjual 2 Lisensi Atlas kepada Pelanggan setiap bulan (syarat aktif). Mitra lain hanya menjual sesuai pola lalu berhenti, sehingga bonus tim mereka ditahan lalu hangus ke Pool Aktif. Baris pembanding menunjukkan M1 bila ia juga berhenti menjual.
- B: generasi paket ke-6 menempatkan ayah di level 12; anak dan istrinya berada di level 13.

## 1. Omzet perusahaan, bonus Mitra, dan laba

| Pos | A | B | C |
|---|---:|---:|---:|
| Mitra PLS (kursi) | 8.191 | 16.383 | 4.239 |
| Kedalaman jaringan di bawah M1 | 12 level | 13 level | 27 level |
| Omzet kotor (termasuk PPN) | Rp68,19 M | Rp136,88 M | Rp35,60 M |
| Omzet bersih Lisensi | Rp55,55 M | Rp123,20 M | Rp32,03 M |
| Omzet bersih Atlas Membership | Rp5,88 M | Rp120,8 jt | Rp41,0 jt |
| **Omzet bersih total** | **Rp61,43 M** | **Rp123,32 M** | **Rp32,07 M** |
| Bonus Plan A dibayar | Rp19,65 M (35,4%) | Rp42,65 M (34,6%) | Rp11,68 M (36,5%) |
| Bonus Plan B dibayar | Rp2,65 M (45,0%) | Rp21,7 jt (18,0%) | Rp10,2 jt (24,8%) |
| **Rasio Mitra** (bonus ÷ omzet bersih) | **36,3%** | **34,6%** | **36,5%** |
| Bulan Plan A tertinggi | 36,2% | 35,7% | 37,0% |
| Biaya layanan platform | Rp5,83 M | Rp27,98 M | Rp7,25 M |
| Biaya workshop | Rp6,93 M | Rp13,84 M | Rp3,60 M |
| Laba sebelum biaya kantor dan pajak | Rp26,37 M | Rp38,83 M | Rp9,52 M |
| **Rasio perusahaan** (laba ÷ omzet bersih) | **42,9%** | **31,5%** | **29,7%** |
| Bonus masih ditahan di akhir | Rp0,0 jt | Rp0,0 jt | Rp0,0 jt |
| Plafon 60% / 50% terjaga | ✓ Ya | ✓ Ya | ✓ Ya |

## 2. Penghasilan Mitra PLS posisi teratas (M1)

| | A | B | C |
|---|---:|---:|---:|
| 90 hari pertama | Rp18.025.000 | Rp18.775.000 | Rp45.475.000 |
| Bulan tertinggi | Rp68.512.472 | Rp65.600.000 | Rp40.355.000 |
| Total 16 bulan | Rp286.609.526 | Rp204.216.825 | Rp173.232.500 |
| – Bonus Sponsor | Rp24.000.000 | Rp22.500.000 | Rp34.500.000 |
| – Bonus Layanan Berkah | Rp1.400.000 | Rp1.400.000 | Rp1.400.000 |
| – Bonus Fast Start | Rp8.000.000 | Rp6.000.000 | Rp18.000.000 |
| – Bonus Pasangan | Rp153.450.000 | Rp153.450.000 | Rp9.300.000 |
| – Pool Aktif | Rp16.000.000 | Rp15.000.000 | Rp21.000.000 |
| – Bonus Pendamping | Rp200.000 | Rp200.000 | Rp400.000 |
| – Bonus Pembinaan | Rp1.365.000 | Rp1.845.000 | Rp85.995.000 |
| – Bonus Prestasi Peringkat | Rp150.000 | Rp150.000 | Rp450.000 |
| – Komisi Langganan | Rp1.680.000 | Rp560.000 | Rp1.260.000 |
| – Pasangan Langganan (RO) | Rp71.435.000 | Rp2.905.000 | Rp927.500 |
| – Royalti Langganan (RO) | Rp8.929.526 | Rp206.825 | Rp0 |
| **Pembanding: total 16 bulan bila M1 berhenti menjual** | **Rp86.894.526** | **Rp200.000** | **Rp34.837.500** |
| Median seluruh Mitra PLS | Rp0 | Rp0 | Rp0 |
| Mitra PLS tanpa komisi/bonus | 50,0% | 75,0% | 87,8% |

## 3. Kesimpulan otomatis

- ✓ **A. Lisensi Atlas Rp7,5 jt: pohon penuh 12 level**: rasio Mitra 36,3%, rasio perusahaan 42,9%, M1 Rp286.609.526 selama 16 bulan.
- ✓ **B. Lisensi Atlas Family Rp25 jt: pohon penuh 12 level**: rasio Mitra 34,6%, rasio perusahaan 31,5%, M1 Rp204.216.825 selama 16 bulan.
- ✓ **C. Pola Family resmi: ayah menjual 2 paket/bulan selama 2 bulan**: rasio Mitra 36,5%, rasio perusahaan 29,7%, M1 Rp173.232.500 selama 16 bulan.

Model biaya sama dengan `docs/AUDIT_KOMPENSASI_V2.md`: layanan platform Rp142.000 per akun per bulan (dicadangkan untuk seluruh masa akses saat penjualan), workshop Rp800.000 per kursi + Rp1.300.000 per event 30 peserta. Belum termasuk biaya kantor, gaji, pemasaran perusahaan, dan PPh badan.
