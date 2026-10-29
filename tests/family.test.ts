import { beforeEach, describe, expect, it } from "vitest";
import { perLicenseUpperBounds } from "../src/engine/calc";
import { EngineError } from "../src/engine/engine";
import { PLAN } from "../src/engine/plan";
import { at, createWorld } from "./helpers";

let w: ReturnType<typeof createWorld>;
const FAM = { saleId: "F1", headId: "AYAH", leftId: "ANAK", rightId: "IBU", at: at("2027-01-06") };

beforeEach(() => {
  w = createWorld();
  w.mitra("A", "MITRANS-002", at("2027-01-01"));
  // Keluarga: ayah mendaftar lewat tautan A; ibu dan anak dewasa disponsori langsung oleh ayah. Belum membeli.
  w.mitra("AYAH", "A", at("2027-01-05"), { buy: false });
  for (const id of ["IBU", "ANAK"]) w.mitra(id, "AYAH", at("2027-01-05"), { buy: false });
});

describe("Paket Family Rp25 jt, 12 bulan, 3 kursi (keputusan Coach 29 Oktober 2026)", () => {
  it("parameter produk", () => {
    expect(PLAN.family).toMatchObject({
      name: "Lisensi Atlas Family",
      price: 25_000_000,
      netPrice: 22_522_523,
      vat: 2_477_477,
      pvTenths: 2250,
      seats: 3,
      accessMonths: 12,
    });
  });

  it("ayah posisi utama di bawah penjual; anak di kaki kiri ayah, ibu di kaki kanan ayah", () => {
    const sales = w.engine.purchaseFamily(FAM);
    expect(sales.map((s) => s.buyerId)).toEqual(["AYAH", "ANAK", "IBU"]);
    expect(sales.map((s) => s.sellerId)).toEqual(["A", "AYAH", "AYAH"]);
    expect(sales.reduce((a, s) => a + s.net!, 0)).toBe(PLAN.family.netPrice);
    const node = (id: string) => w.engine.nodes.get(w.engine.accounts.get(id)!.nodeId!)!;
    expect(node("AYAH").left).toBe(node("ANAK").id);
    expect(node("AYAH").right).toBe(node("IBU").id);
    expect(w.engine.accounts.get("IBU")!.sponsorId).toBe("AYAH");
    for (const id of ["AYAH", "IBU", "ANAK"]) expect(w.engine.accounts.get(id)!.accessMonths).toBe(12);
  });

  it("Hybrid: penjual mendapat bonus kursi ayah; ayah mendapat bonus kursi ibu dan anak", () => {
    w.engine.purchaseFamily(FAM);
    const gross = (id: string, t: "SPONSOR" | "FAST_START" | "PENDAMPING") =>
      w.entries(id, t).reduce((a, e) => a + e.gross, 0);
    expect(gross("A", "SPONSOR")).toBe(750_000);
    expect(gross("A", "FAST_START")).toBe(1_000_000);
    expect(gross("A", "PENDAMPING")).toBe(100_000);
    expect(gross("AYAH", "SPONSOR")).toBe(1_500_000);
    expect(gross("AYAH", "FAST_START")).toBe(2_000_000);
    expect(w.engine.personalSales("2027-01").get("A")).toBe(1);
    expect(w.engine.personalSales("2027-01").get("AYAH")).toBe(2);
  });

  it("volume ibu dan anak dihitung untuk ayah", () => {
    w.engine.purchaseFamily(FAM);
    w.engine.advance(at("2027-01-08"));
    const node = w.engine.nodes.get(w.engine.accounts.get("AYAH")!.nodeId!)!;
    expect(node.cumLicenses).toEqual({ L: 1, R: 1 });
    expect(w.entries("AYAH", "PASANGAN").map((e) => e.gross)).toEqual([PLAN.pairBonus]);
  });

  it("omzet bersih bulan itu memakai harga Family", () => {
    w.engine.purchaseFamily(FAM);
    w.engine.closeThrough("2027-01");
    const r = w.engine.report("2027-01")!;
    expect(r.licenseNet).toBe(PLAN.license.netPrice + PLAN.family.netPrice);
    expect(r.licensesSold).toBe(4);
  });

  it("Atlas Membership baru menjadi syarat bonus mulai bulan ke-13", () => {
    w.engine.purchaseFamily(FAM);
    expect(w.engine.subscriptionConditionMet("AYAH", "2027-12")).toBe(true);
    expect(w.engine.subscriptionConditionMet("AYAH", "2028-01")).toBe(false);
    expect(w.engine.subscriptionConditionMet("A", "2027-04")).toBe(false);
  });

  it("menolak kursi yang tidak disponsori langsung oleh ayah atau kursi ganda", () => {
    w.mitra("LAIN", "A", at("2027-01-05"), { buy: false });
    const t = at("2027-01-06");
    expect(() => w.engine.purchaseFamily({ saleId: "X1", headId: "AYAH", leftId: "LAIN", at: t })).toThrow(EngineError);
    expect(() => w.engine.purchaseFamily({ saleId: "X2", headId: "AYAH", leftId: "IBU", rightId: "IBU", at: t })).toThrow(EngineError);
  });

  it("batas atas biaya bonus per paket Family di bawah 60%", () => {
    // Konservatif: Pendamping dihitung per kursi.
    expect(perLicenseUpperBounds().family * 100).toBeCloseTo(53.12, 1);
    expect(perLicenseUpperBounds().family).toBeLessThan(0.6);
  });
});

describe("Setiap kursi Family adalah hak usaha tersendiri", () => {
  beforeEach(() => {
    w.engine.purchaseFamily(FAM);
  });

  it("setiap kursi punya program 90 hari sendiri: IBU menjual dalam 90 hari -> Sponsor + Fast Start untuk IBU", () => {
    w.mitra("X", "IBU", at("2027-02-10"));
    expect(w.entries("IBU", "SPONSOR").map((e) => e.gross)).toEqual([750_000]);
    expect(w.entries("IBU", "FAST_START").map((e) => e.gross)).toEqual([1_000_000]);
    expect(w.engine.program90End("IBU")).toBe(w.engine.program90End("AYAH"));
  });

  it("bulan ke-4 sampai ke-12 tetap menerima bonus tanpa membayar Atlas Membership", () => {
    w.mitra("Y", "ANAK", at("2027-06-10"));
    w.mitra("Z", "ANAK", at("2027-06-11"));
    w.engine.closeThrough("2027-06");
    expect(w.entries("ANAK", "SPONSOR").every((e) => e.status === "payable")).toBe(true);
  });

  it("pembatasan per identitas dan status aktif dihitung per orang", () => {
    w.mitra("X", "IBU", at("2027-02-10"));
    w.engine.closeThrough("2027-02");
    expect(w.engine.isActive("IBU", "2027-02")).toBe(true);
    expect(w.engine.isActive("AYAH", "2027-02")).toBe(false);
  });
});
