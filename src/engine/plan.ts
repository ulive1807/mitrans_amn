/**
 * Parameter Rencana Pemasaran Mitrans-Astra v2.0 (draf, 29 Oktober 2026), dibangun dari v1.2.
 * Rujukan "spesifikasi" = docs/superpowers/specs/2026-10-29-rencana-kompensasi-v2-design.md.
 * Setiap angka di sini dirujuk ke bab dokumen sumbernya. Ubah angka hanya
 * bila dokumen resmi berubah, lalu jalankan ulang `npm test` dan `npm run simulate`.
 *
 * Satuan:
 * - uang dalam Rupiah bulat (integer);
 * - PV disimpan dalam persepuluh (1 PV = 10) agar 3,5 PV tidak menjadi bilangan pecahan;
 * - persentase disimpan dalam basis poin (1% = 100 bp).
 */
export const PLAN = {
  version: "2.0-draf",

  // Bab 3.1 Produk dan harga
  license: {
    price: 7_500_000,
    netPrice: 6_756_757, // dasar pengenaan pajak (omzet bersih)
    vat: 743_243,
    pvTenths: 675, // 67,5 PV
    accessMonths: 3,
  },
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
  pairBonus: 150_000,
  pairDailyCap: 20,
  /** Persentase Bonus Pembinaan per generasi sponsor (bp). Generasi 1..6. */
  pembinaanRatesBp: [2500, 2500, 2500, 500, 500, 500], // spesifikasi 5.4

  // Bab 8.2 Peringkat
  ranks: [
    { name: "Bronze", smallLeg: 5, reward: 500_000 },
    { name: "Silver", smallLeg: 15, reward: 1_000_000 },
    { name: "Gold", smallLeg: 50, reward: 2_500_000 },
    { name: "Platinum", smallLeg: 150, reward: 5_000_000 },
    { name: "Diamond", smallLeg: 500, reward: 10_000_000 },
    { name: "Emerald", smallLeg: 1000, reward: 30_000_000 },
  ],
  rankFundBp: 700, // spesifikasi 6: 7% omzet bersih Lisensi bulan itu
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
  activeMinPersonalSales: 2,
  holdMonths: 2,
  subscriptionRequiredFromMonth: 4, // bulan ke-4 sejak aktivasi Lisensi

  // Bab 5.5 Konversi Lisensi Pelanggan
  conversionWindowDays: 60,

  // Bab 12.1 Plafon
  planACapBp: 6000, // spesifikasi 10.1: 60% omzet bersih Lisensi (PP 29/2021 Pasal 49)
  poolTargetBp: 5500, // spesifikasi 8: Pool Aktif mengisi sampai 55%
  planBCapBp: 4000, // 40% omzet bersih Langganan

  // Bab 12.2 butir 4
  serviceFundPerLicense: 426_000,

  // Spesifikasi 5.2–5.3: program 90 hari
  fastStartBonus: 500_000,
  pendampingBonus: 100_000,
  balikModalBonus: 1_500_000,
  balikModalPersonal: 4,
  balikModalTeam: 4,
  program90Days: 90,
  program90HoldUntilDay: 150,
  activeMinPersonalSales90: 1,
  refundWorkdays: 7,

  // Spesifikasi 6: 12 peringkat bulanan (Excel master rank)
  monthlyRanks: [
    { name: "Member", personalTx: 0, legPaket: 0, directActive: 0, leaderRank: null, maintainBp: 0, reward: 0, leadershipWeight: 0 },
    { name: "Builder", personalTx: 1, legPaket: 2, directActive: 2, leaderRank: null, maintainBp: 7000, reward: 150_000, leadershipWeight: 0 },
    { name: "Executive", personalTx: 2, legPaket: 5, directActive: 3, leaderRank: "Builder", maintainBp: 7000, reward: 300_000, leadershipWeight: 0 },
    { name: "Manager", personalTx: 3, legPaket: 12, directActive: 4, leaderRank: "Executive", maintainBp: 7000, reward: 600_000, leadershipWeight: 0 },
    { name: "Director", personalTx: 4, legPaket: 25, directActive: 5, leaderRank: "Manager", maintainBp: 8000, reward: 1_200_000, leadershipWeight: 1 },
    { name: "Senior Director", personalTx: 5, legPaket: 50, directActive: 6, leaderRank: "Director", maintainBp: 8000, reward: 2_400_000, leadershipWeight: 2 },
    { name: "Emerald", personalTx: 6, legPaket: 100, directActive: 7, leaderRank: "Senior Director", maintainBp: 8000, reward: 4_000_000, leadershipWeight: 3 },
    { name: "Diamond", personalTx: 8, legPaket: 200, directActive: 8, leaderRank: "Emerald", maintainBp: 8000, reward: 7_500_000, leadershipWeight: 4 },
    { name: "Double Diamond", personalTx: 10, legPaket: 400, directActive: 9, leaderRank: "Diamond", maintainBp: 8000, reward: 12_500_000, leadershipWeight: 5 },
    { name: "Crown Diamond", personalTx: 12, legPaket: 750, directActive: 10, leaderRank: "Double Diamond", maintainBp: 8000, reward: 20_000_000, leadershipWeight: 6 },
    { name: "Ambassador", personalTx: 15, legPaket: 1500, directActive: 12, leaderRank: "Crown Diamond", maintainBp: 8000, reward: 35_000_000, leadershipWeight: 7 },
    { name: "Royal Crown", personalTx: 20, legPaket: 3000, directActive: 15, leaderRank: "Ambassador", maintainBp: 8000, reward: 50_000_000, leadershipWeight: 8 },
  ],
  rankVerifyMonths: 3,

  // Spesifikasi 7: dana leadership
  leadershipFundBp: 500,
  leadershipPersonalMonthlyCap: 100_000_000,
} as const;

export type RankName = (typeof PLAN.ranks)[number]["name"];
export type MonthlyRankName = (typeof PLAN.monthlyRanks)[number]["name"];

/** Opsi yang TIDAK ditetapkan dokumen dan dipilih sebagai asumsi kerja. Lihat docs/ARSITEKTUR_SISTEM.md bagian Asumsi. */
export interface EngineOptions {
  /**
   * Penempatan posisi baru di jaringan biner (dokumen tidak mengatur).
   * 'weaker-leg': masuk kaki Sponsor yang jumlah Lisensinya lebih sedikit, di ujung terluar kaki itu.
   */
  placement: "weaker-leg" | "left-first";
  /**
   * Plan B mensyaratkan "Langganan sendiri aktif". Bila false, masa akses 3 bulan Lisensi juga dianggap aktif.
   */
  planBRequiresPaidSubscription: boolean;
  /**
   * Plafon Plan A v2.0: 60% (PP 29/2021 Pasal 49). Permendag 70/2019 masih 40%; lihat risiko R1 spesifikasi.
   */
  planACapBp: number;
  planBCapBp: number;
}

export const DEFAULT_OPTIONS: EngineOptions = {
  placement: "weaker-leg",
  planBRequiresPaidSubscription: false,
  planACapBp: PLAN.planACapBp,
  planBCapBp: PLAN.planBCapBp,
};
