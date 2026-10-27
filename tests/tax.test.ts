import { beforeEach, describe, expect, it } from "vitest";
import { MitransEngine } from "../src/engine/engine";
import { PLAN } from "../src/engine/plan";
import { syntheticNik } from "../src/engine/simulation";
import { pasal17, pph21BukanPegawai, withholdBySchedule } from "../src/engine/tax";
import { atWib } from "../src/engine/time";

describe("Tarif Pasal 17 ayat (1) huruf a", () => {
  it("lapisan 5%, 15%, 25%, 30%, 35%", () => {
    expect(pasal17(0)).toBe(0);
    expect(pasal17(60_000_000)).toBe(3_000_000);
    expect(pasal17(250_000_000)).toBe(3_000_000 + 28_500_000);
    expect(pasal17(500_000_000)).toBe(31_500_000 + 62_500_000);
    expect(pasal17(5_000_000_000)).toBe(94_000_000 + 1_350_000_000);
    expect(pasal17(6_000_000_000)).toBe(1_444_000_000 + 350_000_000);
  });
});

describe("PPh 21 bukan pegawai (50% bruto × tarif Pasal 17)", () => {
  it("contoh: komisi Rp25.000.000 → DPP Rp12.500.000 → PPh Rp625.000", () => {
    expect(pph21BukanPegawai(25_000_000)).toBe(625_000);
    expect(pph21BukanPegawai(1_000_000)).toBe(25_000);
  });
  it("lapisan tarif mengikuti bruto bulan berjalan, bukan kumulatif tahunan", () => {
    // Bruto sebelumnya Rp119 juta (DPP Rp59,5 juta); tambahan Rp2 juta melewati batas 5%/15%.
    expect(pph21BukanPegawai(2_000_000, 119_000_000)).toBe(25_000 + 75_000);
    const lines = withholdBySchedule(new Map([["2027-01-29", 119_000_000], ["2027-02-05", 2_000_000], ["2027-01-15", 1_000_000]]));
    // Januari: 1 juta lalu 119 juta (total 120 juta, DPP 60 juta) seluruhnya 5%; Februari mulai lagi dari nol.
    expect(lines.map((l) => [l.date, l.tax])).toEqual([["2027-01-15", 25_000], ["2027-01-29", 2_975_000], ["2027-02-05", 50_000]]);
  });
  it("tanpa NPWP: 20% lebih tinggi (hanya bila akun ditandai)", () => {
    expect(pph21BukanPegawai(1_000_000, 0, true)).toBe(30_000);
  });
});

describe("Saldo setelah PPh dan bayar dari bonus", () => {
  let engine: MitransEngine;
  let nik = 1;
  const at = (date: string, h = 10) => atWib(date, h);
  const mitra = (id: string, sponsorId: string, t: number) => {
    engine.registerMitra({ id, name: id, nik: syntheticNik(nik++), sponsorId, at: t });
    engine.passQuiz(id);
    engine.purchaseLicense({ saleId: `L-${id}`, buyerId: id, at: t });
  };
  beforeEach(() => {
    engine = new MitransEngine(atWib("2027-01-01", 0, 1));
    nik = 1;
    mitra("A", "MITRANS-002", at("2027-01-02"));
    for (const id of ["B", "C", "D"]) mitra(id, "A", at("2027-01-29"));
    engine.closeThrough("2027-01");
  });

  it("saldo bonus = bruto − PPh 21 − potongan, per Jumat", () => {
    const rows = engine.pendingPayouts("A");
    for (const r of rows) expect(r.net).toBe(r.gross - r.tax - r.deducted);
    expect(rows.reduce((a, r) => a + r.tax, 0)).toBeGreaterThan(0);
    expect(engine.bonusBalance("A")).toBe(rows.reduce((a, r) => a + r.net, 0));
    expect(engine.bonusBalance("A")).toBeLessThan(rows.reduce((a, r) => a + r.gross, 0));
  });

  it("potongan Langganan tidak mengubah PPh (dasar pajak tetap bruto)", () => {
    const before = engine.pendingPayouts("A").map((r) => r.tax);
    engine.paySubscriptionFromBonus({ saleId: "S1", accountId: "A", at: at("2027-02-01", 9) });
    const after = engine.pendingPayouts("A");
    expect(after.map((r) => r.tax)).toEqual(before);
    expect(after.reduce((a, r) => a + r.deducted, 0)).toBe(PLAN.subscription.price);
  });

  it("total transfer Jumat = bruto − PPh − potongan", () => {
    engine.paySubscriptionFromBonus({ saleId: "S1", accountId: "A", at: at("2027-02-01", 9) });
    const run = engine.payoutRuns().find((r) => r.date === "2027-02-05")!;
    const mine = engine.pendingPayouts("A").find((r) => r.date === "2027-02-05")!;
    expect(run.tax).toBeGreaterThanOrEqual(mine.tax);
    expect(run.transfer).toBe(run.total - run.tax - run.deducted);
  });
});
