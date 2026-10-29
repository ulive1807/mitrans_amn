import { beforeEach, describe, expect, it } from "vitest";
import { perLicenseUpperBounds } from "../src/engine/calc";
import { EngineError } from "../src/engine/engine";
import { PLAN } from "../src/engine/plan";
import { at, createWorld } from "./helpers";

let w: ReturnType<typeof createWorld>;

beforeEach(() => {
  w = createWorld();
  w.mitra("A", "MITRANS-002", at("2027-01-01"));
  // Keluarga: ayah, ibu, anak dewasa mendaftar sebagai Mitra (gratis) lewat tautan A, belum membeli.
  for (const id of ["AYAH", "IBU", "ANAK"]) w.mitra(id, "A", at("2027-01-05"), { buy: false });
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

  it("setiap kursi dewasa menjadi Lisensi atas nama sendiri dengan posisi sendiri di bawah Sponsor penjual", () => {
    const sales = w.engine.purchaseFamily({ saleId: "F1", seatIds: ["AYAH", "IBU", "ANAK"], at: at("2027-01-06") });
    expect(sales.map((s) => s.buyerId)).toEqual(["AYAH", "IBU", "ANAK"]);
    expect(sales.reduce((a, s) => a + s.net!, 0)).toBe(PLAN.family.netPrice);
    for (const id of ["AYAH", "IBU", "ANAK"]) {
      const acc = w.engine.accounts.get(id)!;
      expect(acc.nodeId).toBeDefined();
      expect(acc.accessMonths).toBe(12);
    }
  });

  it("bonus penjual per kursi: Sponsor 3 x Rp750.000 dan Fast Start 3 x Rp1.000.000 (Rp5.250.000)", () => {
    w.engine.purchaseFamily({ saleId: "F1", seatIds: ["AYAH", "IBU", "ANAK"], at: at("2027-01-06") });
    const gross = (t: "SPONSOR" | "FAST_START") => w.entries("A", t).reduce((a, e) => a + e.gross, 0);
    expect(gross("SPONSOR")).toBe(2_250_000);
    expect(gross("FAST_START")).toBe(3_000_000);
    expect(w.engine.personalSales("2027-01").get("A")).toBe(3);
  });

  it("ayah tidak menerima bonus dari pembelian keluarganya sendiri", () => {
    w.engine.purchaseFamily({ saleId: "F1", seatIds: ["AYAH", "IBU", "ANAK"], at: at("2027-01-06") });
    w.engine.advance(at("2027-01-08"));
    expect(w.engine.entriesFor("AYAH")).toHaveLength(0);
  });

  it("omzet bersih bulan itu memakai harga Family", () => {
    w.engine.purchaseFamily({ saleId: "F1", seatIds: ["AYAH", "IBU", "ANAK"], at: at("2027-01-06") });
    w.engine.closeThrough("2027-01");
    const r = w.engine.report("2027-01")!;
    expect(r.licenseNet).toBe(PLAN.license.netPrice + PLAN.family.netPrice);
    expect(r.licensesSold).toBe(4);
  });

  it("Atlas Membership baru menjadi syarat bonus mulai bulan ke-13", () => {
    w.engine.purchaseFamily({ saleId: "F1", seatIds: ["AYAH", "IBU", "ANAK"], at: at("2027-01-06") });
    expect(w.engine.subscriptionConditionMet("AYAH", "2027-12")).toBe(true);
    expect(w.engine.subscriptionConditionMet("AYAH", "2028-01")).toBe(false);
    expect(w.engine.subscriptionConditionMet("A", "2027-04")).toBe(false);
  });

  it("menolak lebih dari 3 kursi, kursi ganda, atau Sponsor berbeda", () => {
    w.mitra("LAIN", "MITRANS-002", at("2027-01-05"), { buy: false });
    w.mitra("KE4", "A", at("2027-01-05"), { buy: false });
    const t = at("2027-01-06");
    expect(() => w.engine.purchaseFamily({ saleId: "X1", seatIds: ["AYAH", "IBU", "ANAK", "KE4"], at: t })).toThrow(EngineError);
    expect(() => w.engine.purchaseFamily({ saleId: "X2", seatIds: ["AYAH", "AYAH"], at: t })).toThrow(EngineError);
    expect(() => w.engine.purchaseFamily({ saleId: "X3", seatIds: ["AYAH", "LAIN"], at: t })).toThrow(EngineError);
  });

  it("batas atas biaya bonus per paket Family di bawah 60%", () => {
    // Konservatif: Pendamping dihitung per kursi.
    expect(perLicenseUpperBounds().family * 100).toBeCloseTo(53.12, 1);
    expect(perLicenseUpperBounds().family).toBeLessThan(0.6);
  });
});
