/**
 * Parameter Rencana Pemasaran Mitrans-Astra v1.4 (27 Oktober 2026).
 * Setiap angka di sini dirujuk ke bab dokumen sumbernya. Ubah angka hanya
 * bila dokumen resmi berubah, lalu jalankan ulang `npm test` dan `npm run simulate`.
 *
 * Satuan:
 * - uang dalam Rupiah bulat (integer);
 * - PV disimpan dalam persepuluh (1 PV = 10) agar 3,5 PV tidak menjadi bilangan pecahan;
 * - persentase disimpan dalam basis poin (1% = 100 bp).
 */
export const PLAN = {
  version: "1.4",

  // Bab 3.1 Produk dan harga
  license: {
    price: 7_500_000,
    netPrice: 6_756_757, // dasar pengenaan pajak (omzet bersih)
    vat: 743_243,
    pvTenths: 675, // 67,5 PV
    /** Lisensi tanpa batas waktu (lifetime): tidak perlu dibeli ulang. Keputusan Coach 27 Oktober 2026 (v1.3: akses 3 bulan). */
    lifetime: true,
    /** Akses yang sudah termasuk harga Lisensi: bulan kalender pembelian/aktivasi saja (bulan ke-1). */
    accessMonths: 1,
  },
  /** Langganan (RO) bulanan, mulai bulan kalender berikutnya setelah aktivasi Lisensi. */
  subscription: {
    price: 399_000,
    netPrice: 359_459,
    vat: 39_541,
    pvTenths: 35, // 3,5 PV
  },
  rupiahPerPv: 100_000, // 1 PV setara Rp100.000

  // Bab 4 dan 12.2: volume jaringan hanya sampai 10 level
  maxLevels: 10,

  // Bab 8.1 Plan A
  sponsorBonus: 750_000,
  berkahBonus: 50_000,
  berkahMaturityDays: 30,
  berkahConfirmDeadlineDays: 60, // lewat ini tanpa konfirmasi -> Pool Aktif (8.4 butir 5)
  levelBonus: 750_000,
  levelBonusLifetimeCap: 7_500_000,
  pairBonus: 150_000,
  pairDailyCap: 20,
  /** Persentase Bonus Pembinaan per generasi sponsor (bp). Generasi 1..6. */
  pembinaanRatesBp: [2500, 2500, 2500, 1000, 1000, 1000],

  // Bab 8.2 Peringkat
  ranks: [
    { name: "Bronze", smallLeg: 5, reward: 500_000 },
    { name: "Silver", smallLeg: 15, reward: 1_000_000 },
    { name: "Gold", smallLeg: 50, reward: 2_500_000 },
    { name: "Platinum", smallLeg: 150, reward: 5_000_000 },
    { name: "Diamond", smallLeg: 500, reward: 10_000_000 },
    { name: "Emerald", smallLeg: 1000, reward: 30_000_000 },
  ],
  rankFundBp: 200, // 2% omzet bersih Lisensi bulan itu
  rankClaimMaxWaitMonths: 6, // lewat ini dilunasi dana cadangan Perusahaan

  // Bab 8.3 Royalti Plan A
  royaltyTiers: [
    { tier: 1, smallLeg: 400, shareBp: 100 },
    { tier: 2, smallLeg: 1000, shareBp: 100 },
  ],
  royaltyPersonalMonthlyCap: 100_000_000,

  // Bab 8.5 Plan B
  subscriptionCommission: 70_000, // 20% x 3,5 PV x Rp100.000
  roPairBp: 300, // 3% x PV kaki kecil x Rp100.000
  roRoyaltyTiers: [
    { tier: 1, smallLeg: 100, shareBp: 150 },
    { tier: 2, smallLeg: 400, shareBp: 150 },
  ],
  roRoyaltyPersonalMonthlyCap: 100_000_000,

  // Bab 8.6 Batas gabungan per identitas (NIK)
  identityMonthlyCap: 1_000_000_000,

  // Bab 9
  activeMinPersonalSales: 1, // Keputusan Coach 27 Oktober 2026 (dokumen v1.2: 2)
  holdMonths: 2,
  subscriptionRequiredFromMonth: 2, // bulan ke-2 (bulan berikutnya) sejak aktivasi Lisensi; v1.3: bulan ke-4

  // Bab 5.5 Konversi Lisensi Pelanggan
  conversionWindowDays: 60,

  // Bab 12.1 Plafon
  planACapBp: 5000, // 50% omzet bersih Lisensi
  planBCapBp: 4000, // 40% omzet bersih Langganan

  // Keputusan A10 (27 Oktober 2026): bonus tim dibayar mingguan dengan cadangan ditahan sampai tutup bulan
  teamWeeklyAdvanceBp: 8000, // 80% dibayar Jumat, 20% ditahan sampai faktor plafon diketahui

  // Bab 12.2 butir 4
  serviceFundPerLicense: 426_000,
} as const;

export type RankName = (typeof PLAN.ranks)[number]["name"];

/** Opsi yang TIDAK ditetapkan dokumen dan dipilih sebagai asumsi kerja. Lihat docs/ARSITEKTUR_SISTEM.md bagian Asumsi. */
export interface EngineOptions {
  /**
   * Penempatan posisi baru di jaringan biner (dokumen tidak mengatur).
   * 'weaker-leg': masuk kaki Sponsor yang jumlah Lisensinya lebih sedikit, di ujung terluar kaki itu.
   */
  placement: "weaker-leg" | "left-first";
  /**
   * Plan B mensyaratkan "Langganan sendiri aktif". Bila false, akses bulan aktivasi Lisensi (bulan ke-1) juga dianggap aktif.
   */
  planBRequiresPaidSubscription: boolean;
  /**
   * Plafon Plan A memakai nilai dokumen (50%). Catatan hukum butir 1 menyarankan 40% bila Permendag 70/2019 Pasal 17 berlaku.
   */
  planACapBp: number;
  planBCapBp: number;
  /** Jumlah penjualan baru pribadi per bulan untuk status aktif (Bab 9.1). Dokumen: 2. */
  activeMinPersonalSales: number;
}

export const DEFAULT_OPTIONS: EngineOptions = {
  placement: "weaker-leg",
  planBRequiresPaidSubscription: false,
  planACapBp: PLAN.planACapBp,
  planBCapBp: PLAN.planBCapBp,
  activeMinPersonalSales: PLAN.activeMinPersonalSales,
};
