import { beforeEach, describe, expect, it } from "vitest";
import { PLAN } from "../src/engine/plan";
import { BONUS_LABEL } from "../src/engine/types";
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
  it("Rp1.000.000 untuk Lisensi yang dijual dalam 90 hari pertama", () => {
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

describe("Headline tanpa Balik Modal (keputusan Coach 29 Oktober 2026)", () => {
  it("Bonus Balik Modal sudah tidak ada", () => {
    expect(Object.keys(BONUS_LABEL)).not.toContain("BALIK_MODAL");
    expect("balikModalBonus" in PLAN).toBe(false);
  });

  it("headline: Sponsor + Fast Start Rp1.750.000 per Lisensi pribadi; kemajuan 4 pribadi dan 4 tim", () => {
    headline();
    expect(PLAN.fastStartBonus).toBe(1_000_000);
    expect(w.entries("A", "FAST_START").map((e) => e.gross)).toEqual(Array(4).fill(1_000_000));
    expect(w.entries("A", "SPONSOR")).toHaveLength(4);
    expect(w.entries("A", "PENDAMPING")).toHaveLength(4);
    expect(w.engine.program90Progress("A")).toMatchObject({ personal: 4, team: 4 });
  });

  it("pembatalan penjualan menarik Fast Start dan mengurangi kemajuan", () => {
    headline();
    w.engine.refundSale("L-E", at("2027-02-12"));
    expect(w.entries("A", "FAST_START").filter((e) => e.status === "clawback")).toHaveLength(1);
    expect(w.engine.program90Progress("A").personal).toBe(3);
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

});

describe("Akses aplikasi (audit 29 Oktober 2026)", () => {
  it("akses tidak aktif untuk bulan sebelum Lisensi dibeli", () => {
    w.mitra("B", "A", at("2027-03-05"));
    expect(w.engine.accessActive("B", "2027-02")).toBe(false);
    expect(w.engine.accessActive("B", "2027-03")).toBe(true);
    expect(w.engine.accessActive("B", "2027-05")).toBe(true);
    expect(w.engine.accessActive("B", "2027-06")).toBe(false);
  });
});
