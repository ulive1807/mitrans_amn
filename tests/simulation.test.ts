import { describe, expect, it } from "vitest";
import {
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
