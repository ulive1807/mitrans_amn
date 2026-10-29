import { describe, expect, it } from "vitest";
import {
  allocateEqualWithCap,
  allocateWeightedWithCap,
  applyBp,
  distributePool,
  pairDay,
  pembinaanRateBp,
  maintainsRank,
  perLicenseUpperBounds,
  qualifiedRank,
  roPairAmount,
} from "../src/engine/calc";
import { PLAN } from "../src/engine/plan";
import { addWorkdays, atWib, payoutFriday } from "../src/engine/time";

describe("Produk dan PV (Bab 3.1)", () => {
  it("harga = DPP + PPN", () => {
    expect(PLAN.license.netPrice + PLAN.license.vat).toBe(PLAN.license.price);
    expect(PLAN.subscription.netPrice + PLAN.subscription.vat).toBe(
      PLAN.subscription.price,
    );
  });
  it("Komisi Langganan Rp70.000 = 20% x 3,5 PV x Rp100.000", () => {
    expect((PLAN.subscription.pvTenths / 10) * PLAN.rupiahPerPv * 0.2).toBe(
      PLAN.subscriptionCommission,
    );
  });
});

describe("Bonus Pasangan (Lampiran B.2)", () => {
  it("mengikuti tabel hari 1-3 termasuk batas 20 pasangan per hari", () => {
    const d1 = pairDay(0, 0, 3, 1);
    expect(d1).toMatchObject({ pairs: 1, carryL: 2, carryR: 0 });
    expect(d1.pairs * PLAN.pairBonus).toBe(150_000);
    const d2 = pairDay(d1.carryL, d1.carryR, 0, 4);
    expect(d2).toMatchObject({
      balanceL: 2,
      balanceR: 4,
      pairs: 2,
      carryL: 0,
      carryR: 2,
    });
    expect(d2.pairs * PLAN.pairBonus).toBe(300_000);
    const d3 = pairDay(d2.carryL, d2.carryR, 25, 30);
    expect(d3).toMatchObject({
      balanceL: 25,
      balanceR: 32,
      pairs: 20,
      carryL: 5,
      carryR: 12,
    });
    expect(d3.pairs * PLAN.pairBonus).toBe(3_000_000);
  });
  it("contoh 10.1: saldo kiri 2 + 5, kanan 0 + 6 -> 6 pasangan, sisa kiri 1", () => {
    const r = pairDay(2, 0, 5, 6);
    expect(r).toMatchObject({ pairs: 6, carryL: 1, carryR: 0 });
    expect(r.pairs * PLAN.pairBonus).toBe(900_000);
  });
});

describe("Bonus Pembinaan v2.0 (spesifikasi 5.4)", () => {
  it("generasi 1-3 masing-masing 25%, generasi 4-6 masing-masing 5%", () => {
    const pairs = [2_000_000, 1_000_000, 800_000, 500_000, 300_000, 100_000];
    const amounts = pairs.map((p, i) => applyBp(p, pembinaanRateBp(i + 1)));
    expect(amounts).toEqual([
      500_000, 250_000, 200_000, 25_000, 15_000, 5_000,
    ]);
    expect(pembinaanRateBp(7)).toBe(0);
  });
});

describe("Pasangan Langganan (Lampiran B.4 dan 10.1)", () => {
  it("kaki kecil 87,5 PV -> Rp262.500", () => {
    expect(
      roPairAmount(
        40 * PLAN.subscription.pvTenths,
        25 * PLAN.subscription.pvTenths,
      ),
    ).toBe(262_500);
  });
  it("kaki kecil 70 PV -> Rp210.000", () => {
    expect(
      roPairAmount(
        30 * PLAN.subscription.pvTenths,
        20 * PLAN.subscription.pvTenths,
      ),
    ).toBe(210_000);
  });
});

describe("Pembagian rata dengan batas (Royalti RO, contoh Bab 10.3)", () => {
  const fund = applyBp(20_000_000_000, 100);
  it("dana tingkat 1 = 1% x Rp20 miliar = Rp200 juta", () =>
    expect(fund).toBe(200_000_000));
  it("5 pemegang -> masing-masing Rp40 juta", () => {
    const r = allocateEqualWithCap(
      [{ amount: fund, holders: ["a", "b", "c", "d", "e"] }],
      PLAN.roRoyaltyPersonalMonthlyCap,
    );
    expect([...r.allocation.values()]).toEqual(Array(5).fill(40_000_000));
    expect(r.leftover).toBe(0);
  });
  it("1 pemegang -> Rp100 juta, sisa Rp100 juta masuk Pool Aktif", () => {
    const r = allocateEqualWithCap(
      [{ amount: fund, holders: ["a"] }],
      PLAN.roRoyaltyPersonalMonthlyCap,
    );
    expect(r.allocation.get("a")).toBe(100_000_000);
    expect(r.overCap).toBe(100_000_000);
  });
  it("pemegang tingkat 2 juga menerima bagian tingkat 1; kelebihan dibagi ke yang belum mencapai batas", () => {
    const r = allocateEqualWithCap(
      [
        { amount: 300_000_000, holders: ["a", "b", "c"] },
        { amount: 300_000_000, holders: ["a"] },
      ],
      100_000_000,
    );
    // a mencapai batas; kelebihannya dibagi ke b dan c sampai batas mereka.
    expect(r.allocation.get("a")).toBe(100_000_000);
    expect(r.allocation.get("b")).toBe(100_000_000);
    expect(r.allocation.get("c")).toBe(100_000_000);
    expect(r.leftover).toBe(300_000_000);
  });
  it("tanpa pemegang -> seluruh dana tidak memiliki penerima", () => {
    const r = allocateEqualWithCap([{ amount: 5_000, holders: [] }], 100);
    expect(r.unassigned).toBe(5_000);
  });
});

describe("Pool Aktif: batas per penjualan (keputusan Coach 29 Oktober 2026)", () => {
  it("bagian per penjualan paling banyak batas; sisanya tidak dibagikan", () => {
    const r = distributePool(10_000_000, new Map([["a", 2], ["b", 3]]), 500_000);
    expect(r.perSale).toBe(500_000);
    expect(r.distributed).toBe(2_500_000);
    expect(r.remainder).toBe(7_500_000);
  });
});

describe("Pool Aktif (Bab 8.4)", () => {
  it("Rp120 juta / 3.000 penjualan = Rp40.000 per penjualan", () => {
    const sales = new Map<string, number>([
      ["dua", 2],
      ["lima", 5],
      ["lain", 2993],
    ]);
    const r = distributePool(120_000_000, sales);
    expect(r.perSale).toBe(40_000);
    expect(r.shares.get("dua")).toBe(80_000);
    expect(r.shares.get("lima")).toBe(200_000);
    expect(r.remainder).toBe(0);
  });
});

describe("Batas atas biaya bonus per Lisensi v2.0 (spesifikasi 10.2)", () => {
  const b = perLicenseUpperBounds();
  it("Lisensi kepada Mitra PLS baru = 59,82% (Fast Start Rp750.000, dana peringkat 4,5%)", () =>
    expect(b.toMitra * 100).toBeCloseTo(59.82, 1));
  it("Lisensi kepada Pelanggan = 59,08%", () =>
    expect(b.toCustomer * 100).toBeCloseTo(59.08, 1));
  it("parameter keputusan Coach 29 Oktober 2026", () => {
    expect(PLAN.fastStartBonus).toBe(750_000);
    expect(PLAN.rankFundBp).toBe(450);
  });
  it("semua di bawah plafon 60%", () => {
    expect(b.toMitra).toBeLessThan(0.6);
    expect(b.toCustomer).toBeLessThan(0.6);
    expect(b.converted).toBeLessThan(0.6);
  });
  it("Langganan tetap 37,47%", () => {
    expect(b.subscription * 100).toBeCloseTo(37.47, 2);
  });
});

describe("Peringkat bulanan v2.0 (spesifikasi 6)", () => {
  const none = { L: "Member", R: "Member" } as const;
  it("Builder: 1 transaksi pribadi, 2:2 paket, 2 Mitra langsung aktif", () => {
    expect(
      qualifiedRank({ personalTx: 1, legPaket: { L: 2, R: 2 }, directActive: 2, leaderBest: none }),
    ).toBe("Builder");
    expect(
      qualifiedRank({ personalTx: 1, legPaket: { L: 2, R: 1.99 }, directActive: 2, leaderBest: none }),
    ).toBe("Member");
  });
  it("Executive butuh Builder di kaki kiri dan kanan", () => {
    const base = { personalTx: 2, legPaket: { L: 5, R: 5 }, directActive: 3 };
    expect(qualifiedRank({ ...base, leaderBest: { L: "Builder", R: "Member" } })).toBe("Builder");
    expect(qualifiedRank({ ...base, leaderBest: { L: "Builder", R: "Builder" } })).toBe("Executive");
  });
  it("pemeliharaan 70% (Builder) dan 80% (Director) per kaki", () => {
    expect(maintainsRank("Builder", { L: 1.4, R: 1.4 })).toBe(true);
    expect(maintainsRank("Builder", { L: 1.39, R: 5 })).toBe(false);
    expect(maintainsRank("Director", { L: 20, R: 20 })).toBe(true);
    expect(maintainsRank("Director", { L: 19.9, R: 30 })).toBe(false);
  });
  it("total bonus peringkat sampai Royal Crown Rp133.650.000", () => {
    expect(PLAN.monthlyRanks.reduce((a, r) => a + r.reward, 0)).toBe(133_650_000);
    expect(PLAN.monthlyRanks).toHaveLength(12);
  });
});

describe("Dana leadership menurut bobot (spesifikasi 7)", () => {
  const holders = [
    { id: "a", weight: 1 },
    { id: "b", weight: 3 },
  ];
  it("dibagi menurut bobot", () => {
    const r = allocateWeightedWithCap(10_000_000, holders, 100_000_000);
    expect(r.allocation.get("a")).toBe(2_500_000);
    expect(r.allocation.get("b")).toBe(7_500_000);
  });
  it("kelebihan batas dibagi ulang", () => {
    const r = allocateWeightedWithCap(10_000_000, holders, 5_000_000);
    expect(r.allocation.get("a")).toBe(5_000_000);
    expect(r.allocation.get("b")).toBe(5_000_000);
    expect(r.overCap).toBe(0);
  });
  it("semua mencapai batas: sisa menjadi overCap", () => {
    const r = allocateWeightedWithCap(10_000_000, holders, 1_000_000);
    expect(r.overCap).toBe(8_000_000);
  });
  it("tanpa pemegang: seluruh dana unassigned", () => {
    const r = allocateWeightedWithCap(10_000_000, [], 100_000_000);
    expect(r.unassigned).toBe(10_000_000);
  });
});

describe("Hari kerja (masa pengembalian 7 hari kerja)", () => {
  it("Jumat + 7 hari kerja = Selasa minggu kedua", () => {
    expect(addWorkdays(atWib("2027-01-08", 10), 7)).toBe(atWib("2027-01-19", 10));
  });
});

describe("Jadwal Jumat (Bab 11.1)", () => {
  it("batas transaksi Jumat 07.00 WIB", () => {
    expect(payoutFriday(atWib("2027-01-08", 6, 59))).toBe("2027-01-08");
    expect(payoutFriday(atWib("2027-01-08", 7, 0))).toBe("2027-01-08");
    expect(payoutFriday(atWib("2027-01-08", 7, 1))).toBe("2027-01-15");
    expect(payoutFriday(atWib("2027-01-04", 15, 0))).toBe("2027-01-08");
  });
});
