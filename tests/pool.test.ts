import { beforeEach, describe, expect, it } from "vitest";
import { applyBp } from "../src/engine/calc";
import { PLAN } from "../src/engine/plan";
import { at, createWorld } from "./helpers";

let w: ReturnType<typeof createWorld>;

beforeEach(() => {
  w = createWorld();
  w.mitra("A", "MITRANS-002", at("2027-01-01"));
});

describe("Plafon Plan A 60% dan Pool Aktif sampai 55% (spesifikasi 8 dan 10.1)", () => {
  it("plafon Plan A 60% omzet bersih Lisensi", () => {
    expect(w.engine.options.planACapBp).toBe(6000);
  });

  it("Pool diisi sampai 55% omzet bersih Lisensi bila bonus di bawahnya", () => {
    for (let i = 0; i < 10; i++) w.customer(`P${i}`, "A", at("2027-01-10"));
    w.engine.closeThrough("2027-01");
    const r = w.engine.report("2027-01")!;
    const target = applyBp(r.licenseNet, PLAN.poolTargetBp);
    expect(r.pool.topUp).toBeGreaterThan(0);
    expect(r.planAPaid).toBeLessThanOrEqual(target);
    expect(r.planAPaid).toBeGreaterThan(target - 100);
    expect(r.planAPaid).toBeLessThanOrEqual(r.planACap);
  });

  it("top-up tidak dibawa ke bulan berikutnya bila tidak ada Mitra aktif", () => {
    w.engine.closeThrough("2027-01"); // hanya Lisensi A sendiri: A tidak punya penjualan pribadi
    const r = w.engine.report("2027-01")!;
    expect(r.activeMitra).toBe(0);
    expect(r.pool.topUp).toBeGreaterThan(0);
    expect(r.pool.distributed).toBe(0);
    expect(r.pool.carryNext).toBe(r.pool.total - r.pool.topUp);
  });

  it("bulan tanpa penjualan Lisensi: top-up 0", () => {
    w.engine.closeThrough("2027-02");
    expect(w.engine.report("2027-02")!.pool.topUp).toBe(0);
  });
});
