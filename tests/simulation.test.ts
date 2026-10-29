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

  it("melaporkan porsi Mitra yang memperoleh Balik Modal", () => {
    expect(head.summary.balikModalShare).toBeGreaterThan(0);
    expect(head.summary.balikModalShare).toBeLessThanOrEqual(1);
  });

  it("batas atas biaya per Lisensi di bawah 60%", () => {
    expect(perLicenseUpperBounds().toMitra).toBeLessThan(0.6);
  });
});
