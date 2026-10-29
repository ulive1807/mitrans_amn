import { PLAN, type MonthlyRankName, type RankName } from "./plan";

/**
 * Bonus Pasangan harian (Bab 8.1, Lampiran B.2).
 * Unit masuk hari ini ditambahkan ke saldo, lalu dipasangkan sampai batas harian.
 * Sisa unit tetap tercatat untuk hari berikutnya (tidak hangus).
 */
export function pairDay(
  carryL: number,
  carryR: number,
  inL: number,
  inR: number,
  cap: number = PLAN.pairDailyCap,
): {
  pairs: number;
  carryL: number;
  carryR: number;
  balanceL: number;
  balanceR: number;
} {
  const balanceL = carryL + inL;
  const balanceR = carryR + inR;
  const pairs = Math.min(balanceL, balanceR, cap);
  return {
    pairs,
    carryL: balanceL - pairs,
    carryR: balanceR - pairs,
    balanceL,
    balanceR,
  };
}

/** Persentase Bonus Pembinaan (bp) untuk generasi 1..6. Di luar itu 0. */
export function pembinaanRateBp(generation: number): number {
  return PLAN.pembinaanRatesBp[generation - 1] ?? 0;
}

export function applyBp(amount: number, bp: number): number {
  return Math.round((amount * bp) / 10_000);
}

export function rankReward(rank: RankName): number {
  return PLAN.monthlyRanks.find((r) => r.name === rank)!.reward;
}

/** Pasangan Langganan (Bab 8.5, Lampiran B.4): 3% x PV kaki kecil x Rp100.000, tanpa akumulasi. */
export function roPairAmount(
  leftPvTenths: number,
  rightPvTenths: number,
): number {
  const small = Math.min(leftPvTenths, rightPvTenths);
  // persepuluh PV x (Rp100.000 / 10) x 3%
  return Math.round((small * (PLAN.rupiahPerPv / 10) * PLAN.roPairBp) / 10_000);
}

/**
 * Pembagian rata dana bertingkat dengan batas per orang (Royalti Bab 8.3 dan Royalti RO Bab 8.5).
 * - Setiap dana dibagi rata kepada pemegang tingkatnya.
 * - Batas per orang berlaku gabungan untuk semua tingkat.
 * - Kelebihan di atas batas dibagi kembali kepada pemegang lain yang belum mencapai batas.
 * - Sisa yang tidak dapat dibagikan dikembalikan sebagai `leftover` (Plan A: masuk Pool Aktif).
 */
export function allocateEqualWithCap(
  funds: { amount: number; holders: string[] }[],
  personalCap: number,
): {
  allocation: Map<string, number>;
  leftover: number;
  unassigned: number;
  overCap: number;
} {
  const allocation = new Map<string, number>();
  const remaining = funds.map((f) => f.amount);
  let unassigned = 0;
  funds.forEach((f, i) => {
    if (f.holders.length === 0) {
      unassigned += f.amount;
      remaining[i] = 0;
    }
  });
  const room = (id: string) => personalCap - (allocation.get(id) ?? 0);

  let progress = true;
  while (progress) {
    progress = false;
    funds.forEach((f, i) => {
      if (remaining[i] <= 0) return;
      const eligible = f.holders.filter((h) => room(h) > 0);
      if (eligible.length === 0) return;
      const share = Math.floor(remaining[i] / eligible.length);
      if (share <= 0) return;
      for (const h of eligible) {
        const give = Math.min(share, room(h));
        if (give > 0) {
          allocation.set(h, (allocation.get(h) ?? 0) + give);
          remaining[i] -= give;
          progress = true;
        }
      }
    });
  }
  const overCap = remaining.reduce((a, b) => a + b, 0);
  return { allocation, leftover: overCap + unassigned, unassigned, overCap };
}

/**
 * Pool Aktif (Bab 8.4): dibagi sebanding jumlah penjualan baru pribadi Mitra PLS aktif.
 * Bagian per penjualan dibulatkan ke bawah; sisa pembulatan dibawa ke bulan berikutnya.
 */
export function distributePool(
  pool: number,
  salesByAccount: Map<string, number>,
): {
  perSale: number;
  shares: Map<string, number>;
  distributed: number;
  remainder: number;
} {
  let totalSales = 0;
  for (const n of salesByAccount.values()) totalSales += n;
  const shares = new Map<string, number>();
  if (totalSales === 0 || pool <= 0)
    return { perSale: 0, shares, distributed: 0, remainder: Math.max(pool, 0) };
  const perSale = Math.floor(pool / totalSales);
  let distributed = 0;
  for (const [id, n] of salesByAccount) {
    const amt = perSale * n;
    if (amt > 0) {
      shares.set(id, amt);
      distributed += amt;
    }
  }
  return { perSale, shares, distributed, remainder: pool - distributed };
}

/** Urutan peringkat bulanan (spesifikasi 6): Member = 0, Royal Crown = 11. */
export function rankIndex(rank: MonthlyRankName): number {
  return PLAN.monthlyRanks.findIndex((r) => r.name === rank);
}

export interface RankInput {
  personalTx: number;
  /** Volume bulan ini per kaki dalam paket setara (omzet bersih / harga bersih Lisensi). */
  legPaket: { L: number; R: number };
  directActive: number;
  /** Peringkat tertinggi pemimpin di kaki kiri dan kanan bulan ini. */
  leaderBest: { L: MonthlyRankName; R: MonthlyRankName };
}

/** Peringkat tertinggi yang semua syaratnya terpenuhi bulan ini (spesifikasi 6). */
export function qualifiedRank(input: RankInput): MonthlyRankName {
  let best: MonthlyRankName = "Member";
  for (const r of PLAN.monthlyRanks) {
    const leaderOk =
      r.leaderRank === null ||
      (rankIndex(input.leaderBest.L) >= rankIndex(r.leaderRank) &&
        rankIndex(input.leaderBest.R) >= rankIndex(r.leaderRank));
    if (
      input.personalTx >= r.personalTx &&
      input.legPaket.L >= r.legPaket &&
      input.legPaket.R >= r.legPaket &&
      input.directActive >= r.directActive &&
      leaderOk
    )
      best = r.name;
  }
  return best;
}

/** Pemeliharaan: kedua kaki paling sedikit 70% atau 80% syarat volume peringkat itu. */
export function maintainsRank(
  rank: MonthlyRankName,
  legPaket: { L: number; R: number },
): boolean {
  const r = PLAN.monthlyRanks[rankIndex(rank)];
  const min = (r.legPaket * r.maintainBp) / 10_000;
  return legPaket.L >= min && legPaket.R >= min;
}

/**
 * Pembagian dana menurut bobot dengan batas per orang (dana leadership, spesifikasi 7).
 * Kelebihan di atas batas dibagi ulang kepada penerima lain yang belum mencapai batas.
 */
export function allocateWeightedWithCap(
  fund: number,
  holders: { id: string; weight: number }[],
  personalCap: number,
): { allocation: Map<string, number>; unassigned: number; overCap: number } {
  const allocation = new Map<string, number>();
  const valid = holders.filter((h) => h.weight > 0);
  if (valid.length === 0 || fund <= 0)
    return { allocation, unassigned: Math.max(fund, 0), overCap: 0 };
  let remaining = fund;
  const room = (id: string) => personalCap - (allocation.get(id) ?? 0);
  for (;;) {
    const eligible = valid.filter((h) => room(h.id) > 0);
    const totalWeight = eligible.reduce((a, h) => a + h.weight, 0);
    if (eligible.length === 0 || remaining <= 0) break;
    let given = 0;
    for (const h of eligible) {
      const share = Math.floor((remaining * h.weight) / totalWeight);
      const give = Math.min(share, room(h.id));
      if (give > 0) {
        allocation.set(h.id, (allocation.get(h.id) ?? 0) + give);
        given += give;
      }
    }
    remaining -= given;
    if (given === 0) break;
  }
  return { allocation, unassigned: 0, overCap: remaining };
}

/**
 * Batas atas biaya bonus per Lisensi (spesifikasi 10.2), dihitung ulang dari parameter
 * agar dokumen dan kode tidak diam-diam berbeda.
 */
export function perLicenseUpperBounds() {
  const net = PLAN.license.netPrice;
  const pairsPerLicense = PLAN.maxLevels / 2; // 10 upline, 1 pasangan memakai 2 Lisensi
  const pembinaanMultiplier =
    1 + PLAN.pembinaanRatesBp.reduce((a, b) => a + b, 0) / 10_000; // 1,90
  const fundsShare = (PLAN.rankFundBp + PLAN.leadershipFundBp) / 10_000;
  const team = pairsPerLicense * PLAN.pairBonus * pembinaanMultiplier;
  const balikModalShare = PLAN.balikModalBonus / PLAN.balikModalPersonal;
  const direct = PLAN.sponsorBonus + PLAN.fastStartBonus + balikModalShare;
  const toMitra = (direct + PLAN.pendampingBonus + team) / net + fundsShare;
  const toCustomer = (direct + team + PLAN.berkahBonus) / net + fundsShare;
  const converted = toCustomer;
  const subscription =
    PLAN.subscriptionCommission / PLAN.subscription.netPrice +
    (PLAN.maxLevels / 2) * (PLAN.roPairBp / 10_000) +
    PLAN.roRoyaltyTiers.reduce((a, t) => a + t.shareBp, 0) / 10_000;
  return { toMitra, toCustomer, converted, subscription };
}
