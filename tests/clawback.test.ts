import { beforeEach, describe, expect, it } from "vitest";
import { MitransEngine } from "../src/engine/engine";
import { PLAN } from "../src/engine/plan";
import { syntheticNik } from "../src/engine/simulation";
import { PPH21, dppOf, pph21BukanPegawai } from "../src/engine/tax";
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

// A menjual 3 Lisensi pada Jumat 29 Januari setelah 07.00: bonusnya dijadwalkan pada Jumat 5 Februari.
beforeEach(() => {
  engine = new MitransEngine(atWib("2027-01-01", 0, 1));
  nik = 1;
  mitra("A", "MITRANS-002", at("2027-01-02"));
  for (const id of ["B", "C", "D"]) mitra(id, "A", at("2027-01-29"));
  engine.closeThrough("2027-01");
});

describe("Penarikan bonus (clawback) dipotong dari transfer berikutnya", () => {
  it("dipotong pada Jumat sesudah penarikan; PPh dihitung dari bruto setelah penarikan", () => {
    const before = engine
      .payoutSchedule("A")
      .find((l) => l.date === "2027-02-05")!;
    engine.refundSale("L-B", at("2027-02-02"));
    const claws = engine.clawbackStatus("A");
    const total = claws.reduce((a, c) => a + c.amount, 0);
    expect(total).toBeGreaterThanOrEqual(750_000); // sekurang-kurangnya Bonus Sponsor atas B
    expect(claws.every((c) => c.outstanding === 0)).toBe(true);
    expect(
      claws.flatMap((c) => c.offsets).every((o) => o.date === "2027-02-05"),
    ).toBe(true);
    const l = engine.payoutSchedule("A").find((x) => x.date === "2027-02-05")!;
    expect(l.gross).toBe(before.gross);
    expect(l.clawback).toBe(total);
    expect(l.taxable).toBe(l.gross - total);
    expect(l.tax).toBe(pph21BukanPegawai(l.taxable));
    expect(l.tax).toBeLessThan(before.tax);
    expect(l.net).toBe(l.gross - l.clawback - l.tax - l.deducted);
  });

  it("penarikan yang belum dapat dipotong menjadi piutang, lalu dipotong dari bonus berikutnya", () => {
    engine.refundSale("L-B", at("2027-02-10")); // sesudah transfer 5 Februari
    const out = engine.clawbackOutstanding("A");
    expect(out).toBeGreaterThanOrEqual(750_000);
    expect(engine.bonusBalance("A")).toBe(0);
    mitra("E", "A", at("2027-02-12")); // Bonus Sponsor baru, dibayar 19 Februari
    engine.closeThrough("2027-02");
    const feb19 = engine
      .payoutSchedule("A")
      .find((x) => x.date === "2027-02-19")!;
    expect(feb19.clawback).toBe(Math.min(out, feb19.gross));
    expect(engine.clawbackOutstanding("A")).toBe(out - feb19.clawback);
  });

  it("daftar transfer Jumat: ditransfer = bruto − penarikan − PPh − potongan", () => {
    engine.refundSale("L-B", at("2027-02-02"));
    const run = engine.payoutRuns().find((r) => r.date === "2027-02-05")!;
    expect(run.clawback).toBeGreaterThan(0);
    expect(run.transfer).toBe(
      run.total - run.clawback - run.tax - run.deducted,
    );
  });
});

describe("Bukti potong PPh 21 per masa pajak", () => {
  it("merangkum transfer pada masa itu dengan DPP 50% dan kode objek", () => {
    engine.refundSale("L-B", at("2027-02-02"));
    const b = engine.buktiPotong("A", "2027-02")!;
    expect(b.number).toMatch(/^BP21\/202702\//);
    expect(b.objectCode).toBe(PPH21.objectCode);
    expect(b.nik).toBe(engine.accounts.get("A")!.nik);
    const sched = engine
      .payoutSchedule("A")
      .filter((l) => l.date.startsWith("2027-02"));
    expect(b.lines.map((l) => l.date)).toEqual(sched.map((l) => l.date));
    expect(b.tax).toBe(sched.reduce((a, l) => a + l.tax, 0));
    expect(b.taxable).toBe(b.gross - b.clawback);
    for (const l of b.lines) expect(l.dpp).toBe(dppOf(l.taxable));
    expect(b.final).toBe(false); // masa Februari masih berjalan
    engine.closeThrough("2027-02");
    expect(engine.buktiPotong("A", "2027-02")!.final).toBe(true);
  });

  it("tidak ada bukti potong untuk masa tanpa transfer; rekap masa memuat penerima", () => {
    expect(engine.buktiPotong("B", "2027-02")).toBeUndefined();
    expect(engine.buktiPotongMasa("2027-02").map((x) => x.accountId)).toContain(
      "A",
    );
  });
});

describe("Piutang penarikan: dipotong dari hak lain, lalu dihapus setelah 12 bulan", () => {
  it("hak lain (pembelian kembali) menutup piutang lebih dulu; sisanya dibayarkan", () => {
    engine.refundSale("L-B", at("2027-02-10"));
    const out = engine.clawbackOutstanding("A");
    const r = engine.recordOtherEntitlement({ id: "H1", accountId: "A", kind: "pembelian_kembali", amount: out + 500_000, at: at("2027-02-15") });
    expect(r).toEqual({ offset: out, paid: 500_000 });
    expect(engine.clawbackOutstanding("A")).toBe(0);
    const offs = engine.clawbackStatus("A").flatMap((c) => c.offsets);
    expect(offs.every((o) => o.source === "hak_lain" && o.entitlementId === "H1")).toBe(true);
  });

  it("hak yang lebih kecil dari piutang dipakai seluruhnya; sisa piutang tetap tercatat", () => {
    engine.refundSale("L-B", at("2027-02-10"));
    const out = engine.clawbackOutstanding("A");
    expect(engine.recordOtherEntitlement({ id: "H2", accountId: "A", kind: "pengembalian_dana", amount: 300_000, at: at("2027-02-15") })).toEqual({ offset: 300_000, paid: 0 });
    expect(engine.clawbackOutstanding("A")).toBe(out - 300_000);
  });

  it("hak yang dibayar sebelum penarikan tidak dipakai untuk penarikan itu", () => {
    engine.recordOtherEntitlement({ id: "H3", accountId: "A", kind: "lainnya", amount: 5_000_000, at: at("2027-02-03") });
    engine.refundSale("L-B", at("2027-02-10"));
    expect(engine.otherEntitlementStatus("H3")).toEqual({ offset: 0, paid: 5_000_000 });
    expect(engine.clawbackOutstanding("A")).toBeGreaterThan(0);
  });

  it("sisa piutang dihapus 12 bulan sejak penarikan dan tidak lagi mengurangi saldo atau bonus baru", () => {
    engine.refundSale("L-B", at("2027-02-10"));
    const out = engine.clawbackOutstanding("A");
    const st = engine.clawbackStatus("A");
    expect(st.every((c) => c.writeOffDate === "2028-02-10")).toBe(true);
    engine.advance(at("2028-02-09"));
    expect(engine.clawbackOutstanding("A")).toBe(out); // belum lewat
    engine.advance(at("2028-02-10"));
    expect(engine.clawbackOutstanding("A")).toBe(0);
    expect(engine.clawbackStatus("A").reduce((a, c) => a + c.writtenOff, 0)).toBe(out);
    // Bonus sesudah tanggal penghapusan tidak dipotong lagi.
    mitra("F", "A", at("2028-02-11"));
    engine.closeThrough("2028-02");
    expect(engine.payoutSchedule("A").filter((l) => l.date > "2028-02-10").every((l) => l.clawback === 0)).toBe(true);
  });

  it("validasi: nominal positif, nomor unik, hanya Mitra PLS", () => {
    expect(() => engine.recordOtherEntitlement({ id: "X", accountId: "A", kind: "lainnya", amount: 0, at: at("2027-02-15") })).toThrow(/positif/);
    engine.recordOtherEntitlement({ id: "X", accountId: "A", kind: "lainnya", amount: 1, at: at("2027-02-15") });
    expect(() => engine.recordOtherEntitlement({ id: "X", accountId: "A", kind: "lainnya", amount: 1, at: at("2027-02-15") })).toThrow(/sudah dipakai/);
  });
});

describe("Pencegahan transfer minus", () => {
  // Skenario sendiri: A menjual B pada 5 Januari (bonus lama) dan C pada 29 Januari (masih masa pembatalan).
  beforeEach(() => {
    engine = new MitransEngine(atWib("2027-01-01", 0, 1));
    nik = 1;
    mitra("A", "MITRANS-002", at("2027-01-02"));
    mitra("B", "A", at("2027-01-05"));
    mitra("C", "A", at("2027-01-29"));
    engine.closeThrough("2027-01");
  });

  it("bonus dari penjualan yang masih dapat dibatalkan tidak dihitung sebagai saldo aman", () => {
    const d = engine.bonusBalanceDetail("A");
    expect(d.atRisk).toBeGreaterThan(0);
    expect(d.available).toBe(d.pending - d.atRisk - d.outstanding - d.shortfall);
  });

  it("tombol bayar ditolak bila saldo aman kurang, walaupun total bonus belum ditransfer masih cukup", () => {
    engine.paySubscriptionFromBonus({ saleId: "S1", accountId: "A", at: at("2027-02-01", 9) });
    const d = engine.bonusBalanceDetail("A");
    expect(d.pending).toBeGreaterThanOrEqual(PLAN.subscription.price);
    expect(d.available).toBeLessThan(PLAN.subscription.price);
    expect(() => engine.paySubscriptionFromBonus({ saleId: "S2", accountId: "A", at: at("2027-02-02", 9) })).toThrow(/tidak cukup/);
  });

  it("potongan Langganan tidak pernah membuat transfer minus akibat pembatalan penjualan baru", () => {
    engine.paySubscriptionFromBonus({ saleId: "S1", accountId: "A", at: at("2027-02-01", 9) });
    engine.refundSale("L-C", at("2027-02-02")); // penjualan dalam masa pembatalan
    for (const l of engine.payoutSchedule("A")) expect(l.net).toBeGreaterThanOrEqual(0);
    expect(engine.bonusBalanceDetail("A").shortfall).toBe(0);
  });

  it("bila tetap minus (mis. penarikan atas penjualan lama), kekurangan dipindah ke Jumat berikutnya", () => {
    engine.paySubscriptionFromBonus({ saleId: "S1", accountId: "A", at: at("2027-02-01", 9) });
    engine.refundSale("L-B", at("2027-02-02"));
    engine.refundSale("L-C", at("2027-02-02"));
    const feb5 = engine.payoutSchedule("A").find((l) => l.date === "2027-02-05")!;
    expect(feb5.net).toBe(0);
    const short = engine.bonusBalanceDetail("A").shortfall;
    expect(short).toBe(-(feb5.gross - feb5.clawback - feb5.tax - feb5.deducted));
    expect(engine.bonusBalance("A")).toBe(0);
    expect(engine.payoutRuns().find((r) => r.date === "2027-02-05")!.transfer).toBeGreaterThanOrEqual(0);
    mitra("E", "A", at("2027-02-12"));
    engine.closeThrough("2027-02");
    const next = engine.payoutSchedule("A").find((l) => l.date > "2027-02-05" && l.gross > 0)!;
    expect(next.carriedIn).toBe(short);
  });
});
