import { describe, expect, it } from "vitest";
import {
  allocateEqualWithCap,
  applyBp,
  distributePool,
  pairDay,
  pembinaanRateBp,
  perLicenseUpperBounds,
  ranksForSmallLeg,
  roPairAmount,
} from "../src/engine/calc";
import { PLAN } from "../src/engine/plan";
import { atWib, payoutFriday } from "../src/engine/time";

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

describe("Bonus Pembinaan (Lampiran B.3)", () => {
  it("jumlah Rp1.040.000", () => {
    const pairs = [2_000_000, 1_000_000, 800_000, 500_000, 300_000, 100_000];
    const amounts = pairs.map((p, i) => applyBp(p, pembinaanRateBp(i + 1)));
    expect(amounts).toEqual([
      500_000, 250_000, 200_000, 50_000, 30_000, 10_000,
    ]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(1_040_000);
    expect(pembinaanRateBp(7)).toBe(0);
  });
  it("contoh 10.1: 25% x (1,2 jt + 0,6 jt + 0,3 jt) = Rp525.000", () => {
    expect(
      [1_200_000, 600_000, 300_000].reduce(
        (a, p, i) => a + applyBp(p, pembinaanRateBp(i + 1)),
        0,
      ),
    ).toBe(525_000);
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

describe("Royalti (Bab 10.3)", () => {
  const fund = applyBp(20_000_000_000, 100);
  it("dana tingkat 1 = 1% x Rp20 miliar = Rp200 juta", () =>
    expect(fund).toBe(200_000_000));
  it("5 pemegang -> masing-masing Rp40 juta", () => {
    const r = allocateEqualWithCap(
      [{ amount: fund, holders: ["a", "b", "c", "d", "e"] }],
      PLAN.royaltyPersonalMonthlyCap,
    );
    expect([...r.allocation.values()]).toEqual(Array(5).fill(40_000_000));
    expect(r.leftover).toBe(0);
  });
  it("1 pemegang -> Rp100 juta, sisa Rp100 juta masuk Pool Aktif", () => {
    const r = allocateEqualWithCap(
      [{ amount: fund, holders: ["a"] }],
      PLAN.royaltyPersonalMonthlyCap,
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

describe("Peringkat (Bab 8.2)", () => {
  it("ambang kaki kecil", () => {
    expect(ranksForSmallLeg(4)).toEqual([]);
    expect(ranksForSmallLeg(15)).toEqual(["Bronze", "Silver"]);
    expect(ranksForSmallLeg(1000)).toHaveLength(6);
    expect(PLAN.ranks.reduce((a, r) => a + r.reward, 0)).toBe(49_000_000);
  });
});

describe("Batas atas biaya bonus per Lisensi (Bab 12.2)", () => {
  const b = perLicenseUpperBounds();
  it("Lisensi kepada Mitra PLS baru = 48,95%", () =>
    expect(b.toMitra * 100).toBeCloseTo(48.95, 2));
  it("Lisensi kepada Pelanggan = 38,6%", () =>
    expect(b.toCustomer * 100).toBeCloseTo(38.6, 1));
  it("Lisensi Pelanggan dikonversi = 49,7%", () =>
    expect(b.converted * 100).toBeCloseTo(49.7, 1));
  it("Langganan: dokumen menulis 38%, perhitungan dari nominal Rp70.000 / Rp359.459 = 37,47%", () => {
    // Komisi Langganan 20% dihitung dari PV (Rp350.000), bukan omzet bersih (Rp359.459).
    expect(b.subscription * 100).toBeCloseTo(37.47, 2);
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
