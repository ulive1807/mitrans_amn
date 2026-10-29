import { beforeEach, describe, expect, it } from "vitest";
import { PLAN } from "../src/engine/plan";
import { addDays, addWorkdays, payoutFriday } from "../src/engine/time";
import { at, createWorld } from "./helpers";

let w: ReturnType<typeof createWorld>;
const aStart = at("2027-01-01");

beforeEach(() => {
  w = createWorld();
  w.mitra("A", "MITRANS-002", aStart);
});

/** Headline: A menjual 2 per bulan selama 2 bulan, dan keempatnya menjual 1 di bulan ke-2. */
function headline() {
  w.mitra("B", "A", at("2027-01-05"), { leg: "L" });
  w.mitra("C", "A", at("2027-01-06"), { leg: "R" });
  w.mitra("D", "A", at("2027-02-03"), { leg: "L" });
  w.mitra("E", "A", at("2027-02-04"), { leg: "R" });
  w.mitra("B1", "B", at("2027-02-10"));
  w.mitra("C1", "C", at("2027-02-10"));
  w.mitra("D1", "D", at("2027-02-11"));
  w.mitra("E1", "E", at("2027-02-11"));
}

describe("Fast Start (spesifikasi 5.2)", () => {
  it("Rp500.000 untuk Lisensi yang dijual dalam 90 hari pertama", () => {
    w.mitra("B", "A", at("2027-01-10"));
    expect(w.entries("A", "FAST_START").map((e) => e.gross)).toEqual([PLAN.fastStartBonus]);
  });

  it("masih diberikan sesaat sebelum hari ke-90", () => {
    w.mitra("B", "A", addDays(aStart, 90) - 60_000);
    expect(w.entries("A", "FAST_START")).toHaveLength(1);
  });

  it("tidak diberikan tepat pada hari ke-90 atau sesudahnya", () => {
    w.mitra("B", "A", addDays(aStart, 90));
    expect(w.entries("A", "SPONSOR")).toHaveLength(1);
    expect(w.entries("A", "FAST_START")).toHaveLength(0);
  });

  it("Mitra tanpa Lisensi: Bonus Sponsor saja, tanpa Fast Start", () => {
    w.mitra("X", "A", at("2027-01-03"), { buy: false });
    w.customer("P1", "X", at("2027-01-04"));
    expect(w.entries("X", "SPONSOR")).toHaveLength(1);
    expect(w.entries("X", "FAST_START")).toHaveLength(0);
  });

  it("Lisensi kedua pembeli yang sama tidak memberi Fast Start", () => {
    w.mitra("B", "A", at("2027-01-10"));
    w.buyAgain("B", at("2027-01-12"));
    expect(w.entries("A", "SPONSOR")).toHaveLength(2);
    expect(w.entries("A", "FAST_START")).toHaveLength(1);
  });

  it("dibayar Jumat setelah masa pengembalian 7 hari kerja", () => {
    const t = at("2027-01-05");
    w.mitra("B", "A", t);
    w.engine.closeThrough("2027-01");
    const fs = w.entries("A", "FAST_START")[0];
    expect(fs.status).toBe("payable");
    expect(fs.payoutDate).toBe(payoutFriday(addWorkdays(t, PLAN.refundWorkdays)));
    expect(fs.payoutDate).toBe("2027-01-15");
  });
});

describe("Pendamping (spesifikasi 5.2)", () => {
  it("Rp100.000 sekali ketika Mitra binaan menjual Lisensi pertamanya", () => {
    w.mitra("B", "A", at("2027-01-05"));
    w.mitra("C", "B", at("2027-01-07"));
    w.mitra("D", "B", at("2027-01-08"));
    const p = w.entries("A", "PENDAMPING");
    expect(p.map((e) => e.gross)).toEqual([PLAN.pendampingBonus]);
    expect(p[0].saleId).toBe("L-C");
  });
});

describe("Balik Modal (spesifikasi 1 dan 5.2)", () => {
  it("headline: 4 pribadi (kiri dan kanan) + 4 tim dalam 90 hari", () => {
    headline();
    const bm = w.entries("A", "BALIK_MODAL");
    expect(bm.map((e) => e.gross)).toEqual([PLAN.balikModalBonus]);
    expect(w.entries("A", "FAST_START")).toHaveLength(4);
    expect(w.entries("A", "PENDAMPING")).toHaveLength(4);
    expect(w.engine.program90Progress("A")).toMatchObject({
      personal: 4,
      team: 4,
      legs: { L: true, R: true },
      achieved: true,
    });
  });

  it("tidak diberikan dengan 3 penjualan pribadi", () => {
    headline();
    // Bandingkan: dunia kedua tanpa penjualan pribadi ke-4 (E).
    w = createWorld();
    w.mitra("A", "MITRANS-002", aStart);
    w.mitra("B", "A", at("2027-01-05"), { leg: "L" });
    w.mitra("C", "A", at("2027-01-06"), { leg: "R" });
    w.mitra("D", "A", at("2027-02-03"), { leg: "L" });
    w.mitra("B1", "B", at("2027-02-10"));
    w.mitra("B2", "B", at("2027-02-10"));
    w.mitra("C1", "C", at("2027-02-10"));
    w.mitra("D1", "D", at("2027-02-11"));
    expect(w.entries("A", "BALIK_MODAL")).toHaveLength(0);
  });

  it("pembatalan penjualan pemicu menarik Balik Modal dan Fast Start, lalu bisa diperoleh lagi", () => {
    headline();
    const bm = w.entries("A", "BALIK_MODAL")[0];
    expect(bm.saleId).toBe("L-E1");
    w.engine.refundSale("L-E1", at("2027-02-12"));
    expect(bm.status).toBe("clawback");
    expect(w.entries("E", "FAST_START")[0].status).toBe("clawback");
    w.mitra("E2", "E", at("2027-02-13"));
    const again = w.entries("A", "BALIK_MODAL").filter((e) => e.status !== "clawback");
    expect(again).toHaveLength(1);
    expect(again[0].saleId).toBe("L-E2");
  });
});

describe("Syarat aktif dan masa tunggu program 90 hari (spesifikasi 5.3)", () => {
  it("aktif dengan 1 penjualan selama 90 hari, butuh 2 sesudahnya", () => {
    w.mitra("B", "A", at("2027-01-05"));
    w.mitra("C", "A", at("2027-05-05"));
    w.engine.closeThrough("2027-05");
    expect(w.engine.isActive("A", "2027-01")).toBe(true);
    expect(w.engine.isActive("A", "2027-05")).toBe(false);
  });

  it("bonus tim yang ditahan dalam 90 hari belum hangus sampai bulan hari ke-150", () => {
    w.mitra("B", "A", at("2027-01-05"), { leg: "L" });
    w.mitra("C", "A", at("2027-01-05"), { leg: "R" });
    w.mitra("B1", "B", at("2027-02-10"));
    w.mitra("C1", "C", at("2027-02-10"));
    w.engine.closeThrough("2027-02");
    const febPair = w.entries("A", "PASANGAN").find((e) => e.month === "2027-02")!;
    expect(febPair.status).toBe("held");
    expect(febPair.holdUntil).toBe("2027-05");
    w.engine.closeThrough("2027-04");
    expect(febPair.status).toBe("held");
    w.engine.closeThrough("2027-05");
    expect(febPair.status).toBe("forfeited");
  });
});

describe("Perbaikan tinjauan akhir: pembatalan dan jendela 90 hari", () => {
  it("Balik Modal dapat diperoleh lagi bila penjualan pemicu dibatalkan sesudah tutup bulan", () => {
    headline();
    w.engine.closeThrough("2027-02");
    w.engine.refundSale("L-E1", at("2027-03-02"));
    expect(w.engine.program90Progress("A").achieved).toBe(false);
    w.mitra("E2", "E", at("2027-03-03"));
    const fresh = w.entries("A", "BALIK_MODAL").filter((e) => e.saleId === "L-E2");
    expect(fresh).toHaveLength(1);
    expect(w.engine.program90Progress("A").achieved).toBe(true);
  });

  it("pembatalan sebelum Jumat pembayaran membatalkan bonus, bukan membuat entri negatif", () => {
    w.mitra("B", "A", at("2027-01-29"));
    w.engine.closeThrough("2027-01");
    const fs = w.entries("A", "FAST_START")[0];
    expect(fs.payoutDate).toBe("2027-02-12");
    w.engine.refundSale("L-B", at("2027-02-02"));
    expect(fs.status).toBe("clawback");
    expect(fs.amount).toBe(0);
    expect(w.entries("A", "FAST_START").filter((e) => e.amount < 0)).toHaveLength(0);
  });

  it("pembatalan Lisensi tidak mengulang jendela 90 hari", () => {
    w.mitra("B", "A", at("2027-01-02"));
    const end = w.engine.program90End("B")!;
    w.engine.refundSale("L-B", at("2027-03-25"));
    w.buyAgain("B", at("2027-03-26"));
    expect(w.engine.program90End("B")).toBe(end);
    w.mitra("C", "B", at("2027-04-05"));
    expect(w.entries("B", "FAST_START")).toHaveLength(0);
  });

  it("pembatalan penjualan lain yang menurunkan hitungan di bawah syarat menarik Balik Modal", () => {
    headline();
    const bm = w.entries("A", "BALIK_MODAL")[0];
    w.engine.refundSale("L-B1", at("2027-02-12"));
    expect(bm.status).toBe("clawback");
    expect(w.engine.program90Progress("A").achieved).toBe(false);
  });
});
