import { beforeEach, describe, expect, it } from "vitest";
import { MitransEngine } from "../src/engine/engine";
import { PLAN } from "../src/engine/plan";
import { reminderFor, remindersDue } from "../src/engine/reminders";
import { syntheticNik } from "../src/engine/simulation";
import { atWib } from "../src/engine/time";

let engine: MitransEngine;
let nik = 1;
const at = (date: string, h = 10) => atWib(date, h);

function mitra(id: string, sponsorId: string, t: number) {
  engine.registerMitra({
    id,
    name: id,
    nik: syntheticNik(nik++),
    sponsorId,
    at: t,
  });
  engine.passQuiz(id);
  engine.purchaseLicense({ saleId: `L-${id}`, buyerId: id, at: t });
}

beforeEach(() => {
  engine = new MitransEngine(atWib("2027-01-01", 0, 1));
  nik = 1;
  mitra("A", "MITRANS-002", at("2027-01-02")); // akses sampai 1 Februari 2027 pukul 10.00
});

describe("Pengingat tagihan Langganan", () => {
  it("jadwal H-7, H-3, H-1, H, dan sehari sesudah berakhir", () => {
    const r = (d: string) => reminderFor(engine, "A", at(d, 8));
    expect(r("2027-01-20")).toBeUndefined();
    expect(r("2027-01-25")).toMatchObject({
      stage: "H-7",
      daysLeft: 7,
      sendToday: true,
      dueDate: "2027-02-01",
    });
    expect(r("2027-01-27")).toMatchObject({
      stage: "H-7",
      daysLeft: 5,
      sendToday: false,
    });
    expect(r("2027-01-29")).toMatchObject({ stage: "H-3", sendToday: true });
    expect(r("2027-01-31")).toMatchObject({ stage: "H-1", sendToday: true });
    expect(r("2027-02-01")).toMatchObject({ stage: "H", sendToday: true });
    expect(r("2027-02-02")).toMatchObject({
      stage: "berakhir",
      sendToday: true,
    });
    expect(r("2027-02-03")).toBeUndefined();
  });

  it("isi pesan jelas, tanpa tekanan, dan menyebut Langganan bersifat pilihan", () => {
    const m = reminderFor(engine, "A", at("2027-01-29", 8))!.message;
    expect(m).toContain("1 Februari 2027");
    expect(m).toContain("Rp399.000");
    expect(m).toContain("bersifat pilihan");
    expect(m).toContain("Bonus Sponsor tetap dibayar");
    expect(m).not.toMatch(/segera|terakhir kali|rugi|kesempatan/i);
  });

  it("setelah Langganan dibayar, pengingat bergeser ke jatuh tempo berikutnya", () => {
    engine.paySubscription({
      saleId: "S1",
      accountId: "A",
      at: at("2027-01-30"),
    });
    expect(reminderFor(engine, "A", at("2027-01-31", 8))).toBeUndefined();
    expect(reminderFor(engine, "A", at("2027-02-24", 8))).toMatchObject({
      stage: "H-7",
      dueDate: "2027-03-03",
    });
  });

  it("Pelanggan juga diingatkan, tanpa catatan bonus", () => {
    engine.registerPelanggan({
      id: "P",
      name: "P",
      nik: syntheticNik(nik++),
      sellerId: "A",
      at: at("2027-01-03"),
    });
    engine.purchaseLicense({
      saleId: "L-P",
      buyerId: "P",
      at: at("2027-01-03"),
    });
    const r = reminderFor(engine, "P", at("2027-01-30", 8))!;
    expect(r.role).toBe("pelanggan");
    expect(r.canPayFromBonus).toBe(false);
    expect(r.message).not.toContain("Bonus");
    expect(
      remindersDue(engine, at("2027-01-30", 8)).map((x) => x.accountId),
    ).toEqual(["A", "P"]);
  });
});

describe("Bayar Langganan dari bonus", () => {
  // Penjualan Jumat 29 Januari setelah 07.00 WIB dibayar pada Jumat 5 Februari: masih belum ditransfer setelah tutup bulan.
  beforeEach(() => {
    for (const id of ["B", "C", "D"]) mitra(id, "A", at("2027-01-29"));
    engine.closeThrough("2027-01");
  });

  it("saldo = bonus berstatus dibayar yang jadwal transfernya belum lewat", () => {
    const feb5 = engine
      .pendingPayouts("A")
      .find((r) => r.date === "2027-02-05")!;
    expect(feb5.gross).toBeGreaterThanOrEqual(3 * PLAN.sponsorBonus);
    expect(engine.bonusBalance("A")).toBe(
      engine.pendingPayouts("A").reduce((a, r) => a + r.net, 0),
    );
  });

  it("memotong transfer Jumat berikutnya, tanpa mengubah bonus bruto", () => {
    const grossBefore = engine
      .entriesFor("A")
      .reduce((a, e) => a + e.amount, 0);
    const balanceBefore = engine.bonusBalance("A");
    const sale = engine.paySubscriptionFromBonus({
      saleId: "S-B1",
      accountId: "A",
      at: at("2027-02-01", 9),
    });
    expect(sale.paidFrom).toBe("bonus");
    expect(engine.accessUntil("A")).toBe(at("2027-03-03"));
    expect(engine.bonusBalance("A")).toBe(
      balanceBefore - PLAN.subscription.price,
    );
    expect(engine.entriesFor("A").reduce((a, e) => a + e.amount, 0)).toBe(
      grossBefore,
    );
    const run = engine.payoutRuns().find((r) => r.date === "2027-02-05")!;
    expect(run.deducted).toBe(PLAN.subscription.price);
    expect(run.transfer).toBe(run.total - PLAN.subscription.price);
  });

  it("ditolak bila saldo tidak cukup; tidak ada penjualan atau potongan yang tercatat", () => {
    expect(engine.bonusBalance("B")).toBeLessThan(PLAN.subscription.price);
    expect(() =>
      engine.paySubscriptionFromBonus({
        saleId: "S-B2",
        accountId: "B",
        at: at("2027-02-01", 9),
      }),
    ).toThrow(/tidak cukup/);
    expect(engine.sales.has("S-B2")).toBe(false);
    expect(engine.payoutDeductions).toHaveLength(0);
  });

  it("pembatalan Langganan membatalkan potongan yang belum ditransfer", () => {
    const before = engine.bonusBalance("A");
    engine.paySubscriptionFromBonus({
      saleId: "S-B3",
      accountId: "A",
      at: at("2027-02-01", 9),
    });
    engine.refundSale("S-B3", at("2027-02-02"));
    expect(engine.bonusBalance("A")).toBe(before);
    expect(engine.accessActiveAt("A", at("2027-02-10"))).toBe(false);
  });

  it("Pelanggan tidak dapat memakai fitur ini", () => {
    engine.registerPelanggan({
      id: "P",
      name: "P",
      nik: syntheticNik(nik++),
      sellerId: "A",
      at: at("2027-02-01"),
    });
    engine.purchaseLicense({
      saleId: "L-P",
      buyerId: "P",
      at: at("2027-02-01"),
    });
    expect(() =>
      engine.paySubscriptionFromBonus({
        saleId: "S-P",
        accountId: "P",
        at: at("2027-02-02"),
      }),
    ).toThrow(/Mitra PLS/);
  });
});
