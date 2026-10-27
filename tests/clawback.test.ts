import { beforeEach, describe, expect, it } from "vitest";
import { MitransEngine } from "../src/engine/engine";
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
