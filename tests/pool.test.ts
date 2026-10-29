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

  it("Pool diisi paling tinggi sampai 55% omzet bersih Lisensi (dibatasi per penjualan)", () => {
    for (let i = 0; i < 10; i++) w.customer(`P${i}`, "A", at("2027-01-10"));
    w.engine.closeThrough("2027-01");
    const r = w.engine.report("2027-01")!;
    const target = applyBp(r.licenseNet, PLAN.poolTargetBp);
    expect(r.pool.topUp).toBeGreaterThan(0);
    expect(r.planAPaid).toBeLessThanOrEqual(target);
    expect(r.pool.distributed).toBe(10 * PLAN.poolMaxPerSale);
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

describe("Keputusan Coach 29 Oktober 2026", () => {
  it("Pool Aktif paling banyak Rp500.000 per penjualan; sisa pengisian kembali ke perusahaan", () => {
    for (let i = 0; i < 10; i++) w.customer(`P${i}`, "A", at("2027-01-10"));
    w.engine.closeThrough("2027-01");
    const r = w.engine.report("2027-01")!;
    expect(PLAN.poolMaxPerSale).toBe(500_000);
    expect(r.pool.perSale).toBe(500_000);
    expect(w.entries("A", "POOL_AKTIF")[0].amount).toBe(5_000_000);
    expect(r.planAPaid).toBeLessThan(applyBp(r.licenseNet, PLAN.poolTargetBp));
  });

  it("bonus pada akun struktural tidak dihitung menuju target pengisian Pool", () => {
    // Lisensi A dijual oleh Mitrans 002 (struktural): Bonus Sponsor-nya tidak dibayar dan tidak mengurangi top-up.
    w.engine.closeThrough("2027-01");
    const r = w.engine.report("2027-01")!;
    const sources = r.pool.total - r.pool.topUp;
    expect(r.planAPaid).toBe(0);
    expect(r.pool.topUp).toBe(applyBp(r.licenseNet, PLAN.poolTargetBp) - sources);
  });
});

describe("Keputusan Coach: sisa Pool di atas batas per penjualan kembali ke perusahaan", () => {
  it("sisa tidak dibawa ke bulan berikutnya bila ada Mitra aktif penerima", () => {
    for (let i = 0; i < 10; i++) w.customer(`P${i}`, "A", at("2027-01-10"));
    w.engine.closeThrough("2027-01");
    const r = w.engine.report("2027-01")!;
    expect(r.pool.distributed).toBe(5_000_000);
    expect(r.pool.carryNext).toBe(0);
  });
});
