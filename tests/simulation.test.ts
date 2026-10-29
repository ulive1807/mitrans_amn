import { describe, expect, it } from "vitest";
import { perLicenseUpperBounds } from "../src/engine/calc";
import {
  runHeadlineScenario,
  runIdealScenario,
  runScenario,
  standardScenarios,
} from "../src/engine/simulation";

describe("Simulasi: plafon tidak pernah dilampaui (Bab 12.1)", () => {
  const ideal = runIdealScenario(8);
  const organic = runScenario({ ...standardScenarios(0.15)[0], months: 18 });

  for (const [name, res] of [
    ["ideal-8", ideal],
    ["organik-18", organic],
  ] as const) {
    it(`${name}: Plan A <= plafon dan Plan B <= plafon setiap bulan`, () => {
      for (const r of res.reports) {
        const reserve = r.rankPaidFromReserve;
        expect(r.planAPaid - reserve).toBeLessThanOrEqual(r.planACap);
        expect(r.planBPaid).toBeLessThanOrEqual(r.planBCap);
      }
    });
    it(`${name}: tidak ada pembayaran kepada akun struktural`, () => {
      const paid = res.engine.ledger.filter(
        (e) => e.accountId.startsWith("MITRANS") && e.status === "payable",
      );
      expect(paid).toHaveLength(0);
    });
    it(`${name}: total per identitas per bulan <= Rp1 miliar`, () => {
      const totals = new Map<string, number>();
      for (const e of res.engine.ledger) {
        if (e.status !== "payable") continue;
        const k = `${e.nik}|${e.settledMonth}`;
        totals.set(k, (totals.get(k) ?? 0) + e.amount);
      }
      for (const v of totals.values())
        expect(v).toBeLessThanOrEqual(1_000_000_000);
    });
  }

  it("ideal-8: jaringan biner sempurna 255 Mitra PLS", () => {
    expect(ideal.summary.mitraCount).toBe(255);
    expect(ideal.summary.licenses).toBe(255);
  });

  it("simulasi deterministik untuk seed yang sama", () => {
    const again = runScenario({ ...standardScenarios(0.15)[0], months: 18 });
    expect(again.summary.planAPaid).toBe(organic.summary.planAPaid);
    expect(again.summary.licenses).toBe(organic.summary.licenses);
  });
});

describe("Skenario headline (spesifikasi 1 dan 11)", () => {
  const head = runHeadlineScenario({ growthMonths: 5, months: 8, mode: "terus" });

  it("Mitra pertama menerima >= Rp7.500.000 dari bonus yang timbul dalam 90 hari pertamanya", () => {
    const m1 = head.engine.accounts.get("M1")!;
    const end = head.engine.program90End("M1")!;
    const total = head.engine.ledger
      .filter((e) => e.accountId === "M1" && e.status === "payable" && e.accruedAt < end)
      .reduce((a, e) => a + e.amount, 0);
    expect(m1.licenseActivatedAt).toBeDefined();
    expect(total).toBeGreaterThanOrEqual(7_500_000);
  });

  it("plafon Plan A tidak pernah dilampaui", () => {
    for (const r of head.reports)
      expect(r.planAPaid - r.rankPaidFromReserve).toBeLessThanOrEqual(r.planACap);
  });

  it("melaporkan porsi Mitra yang memperoleh >= Rp7.500.000 dalam 90 hari pertama", () => {
    expect(head.summary.share90Above7_5).toBeGreaterThan(0);
    expect(head.summary.share90Above7_5).toBeLessThanOrEqual(1);
  });

  it("batas atas biaya per Lisensi di bawah 60%", () => {
    expect(perLicenseUpperBounds().toMitra).toBeLessThan(0.6);
  });
});

describe("Headline resmi: 2 per bulan selama 2 bulan, lalu bina (keputusan Coach 29 Oktober 2026)", () => {
  const h = runHeadlineScenario({ growthMonths: 7, months: 7, mode: "duaBulan" });
  it("Mitra pertama >= Rp7.500.000 dari 90 hari pertama tanpa bergantung pada Pool Aktif", () => {
    const end = h.engine.program90End("M1")!;
    const noPool = h.engine.ledger
      .filter((e) => e.accountId === "M1" && e.status === "payable" && e.accruedAt < end && e.type !== "POOL_AKTIF")
      .reduce((a, e) => a + e.amount, 0);
    expect(noPool).toBe(7_875_000);
  });
  it("semua Mitra yang menyelesaikan 90 hari menerima >= Rp7.500.000", () => {
    expect(h.summary.share90Above7_5).toBe(1);
  });
});

describe("Simulasi organik dengan paket Family (audit 29 Oktober 2026)", () => {
  const res = runScenario({ ...standardScenarios(0.15)[0], months: 18, familyShare: 0.3 });
  it("sebagian penjualan Mitra baru berupa Family 3 kursi", () => {
    const fam = [...res.engine.sales.values()].filter((s) => s.product === "family");
    expect(fam.length).toBeGreaterThan(0);
    expect(fam.length % 3).toBe(0);
  });
  it("pemegang Family baru membayar Membership mulai bulan ke-13", () => {
    const early = [...res.engine.sales.values()].filter((s) => {
      if (s.kind !== "subscription") return false;
      const acc = res.engine.accounts.get(s.buyerId)!;
      return acc.accessMonths === 12 && res.engine.licenseMonthNumber(acc.id, s.forMonth!)! <= 12;
    });
    expect(early).toHaveLength(0);
  });
  it("plafon Plan A dan Plan B tetap terjaga", () => {
    for (const r of res.reports) {
      expect(r.planAPaid - r.rankPaidFromReserve).toBeLessThanOrEqual(r.planACap);
      expect(r.planBPaid).toBeLessThanOrEqual(r.planBCap);
    }
  });
});
