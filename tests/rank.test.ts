import { beforeEach, describe, expect, it } from "vitest";
import { PLAN } from "../src/engine/plan";
import { at, createWorld } from "./helpers";

let w: ReturnType<typeof createWorld>;
let cust = 0;
const sellCustomers = (sellerId: string, n: number, date: string) => {
  for (let i = 0; i < n; i++) w.customer(`P${++cust}`, sellerId, at(date));
};

beforeEach(() => {
  w = createWorld();
  cust = 0;
  w.mitra("A", "MITRANS-002", at("2027-01-01"));
});

/** A: Builder di Januari (B kiri, C kanan, masing-masing menjual 2 Pelanggan). */
function builderJanuary() {
  w.mitra("B", "A", at("2027-01-05"), { leg: "L" });
  w.mitra("C", "A", at("2027-01-05"), { leg: "R" });
  sellCustomers("B", 2, "2027-01-10");
  sellCustomers("C", 2, "2027-01-10");
}
/** Bulan pemeliharaan: A menjual 1, B dan C masing-masing `perLeg` Pelanggan. */
function maintain(month: string, perLeg = 2) {
  sellCustomers("A", 1, `${month}-03`);
  sellCustomers("B", perLeg, `${month}-10`);
  sellCustomers("C", perLeg, `${month}-10`);
}

describe("Peringkat bulanan (spesifikasi 6)", () => {
  it("Builder dicapai Januari, bonus dibayar setelah 3 bulan terverifikasi", () => {
    builderJanuary();
    w.engine.closeThrough("2027-01");
    expect(w.engine.paidAsRank("A", "2027-01")).toBe("Builder");
    maintain("2027-02");
    w.engine.closeThrough("2027-02");
    expect(w.entries("A", "PRESTASI")).toHaveLength(0);
    maintain("2027-03");
    w.engine.closeThrough("2027-03");
    const p = w.entries("A", "PRESTASI");
    expect(p.map((e) => e.amount)).toEqual([150_000]);
    expect(p[0].status).toBe("payable");
  });

  it("verifikasi putus bila pemeliharaan gagal (kaki < 70%)", () => {
    builderJanuary();
    maintain("2027-02", 1); // 1 paket per kaki < 1,4
    maintain("2027-03");
    w.engine.closeThrough("2027-03");
    expect(w.entries("A", "PRESTASI")).toHaveLength(0);
    expect(w.engine.accounts.get("A")!.rankVerify).toMatchObject({ rank: "Builder", since: "2027-03", months: 1 });
  });

  it("pemimpin dihitung per kaki: Builder hanya di kaki kiri tidak memberi Executive", () => {
    w.mitra("B", "A", at("2027-01-05"), { leg: "L" });
    w.mitra("C", "A", at("2027-01-05"), { leg: "R" });
    w.mitra("D", "A", at("2027-01-05"));
    w.mitra("B1", "B", at("2027-01-06"), { leg: "L" });
    w.mitra("B2", "B", at("2027-01-06"), { leg: "R" });
    sellCustomers("B1", 2, "2027-01-10");
    sellCustomers("B2", 2, "2027-01-10");
    sellCustomers("C", 5, "2027-01-10");
    sellCustomers("D", 1, "2027-01-10");
    w.engine.closeThrough("2027-01");
    expect(w.engine.paidAsRank("B", "2027-01")).toBe("Builder");
    const input = w.engine.rankInputs("A", "2027-01");
    expect(input.leaderBest).toEqual({ L: "Builder", R: "Member" });
    expect(input.legPaket.L).toBeGreaterThanOrEqual(5);
    expect(input.legPaket.R).toBeGreaterThanOrEqual(5);
    expect(w.engine.paidAsRank("A", "2027-01")).toBe("Builder");
  });

  it("peringkat yang dilompati ikut dicapai sekali (Executive langsung -> Builder + Executive)", () => {
    w.mitra("B", "A", at("2027-01-05"), { leg: "L" });
    w.mitra("C", "A", at("2027-01-05"), { leg: "R" });
    w.mitra("D", "A", at("2027-01-05"));
    for (const id of ["B", "C"]) {
      w.mitra(`${id}1`, id, at("2027-01-06"), { leg: "L" });
      w.mitra(`${id}2`, id, at("2027-01-06"), { leg: "R" });
    }
    for (const id of ["B1", "B2", "C1", "C2"]) sellCustomers(id, 2, "2027-01-10");
    sellCustomers("D", 1, "2027-01-10");
    w.engine.closeThrough("2027-01");
    expect(w.engine.paidAsRank("A", "2027-01")).toBe("Executive");
    for (const m of ["2027-02", "2027-03"]) {
      sellCustomers("A", 1, `${m}-03`);
      for (const id of ["B1", "B2", "C1", "C2"]) sellCustomers(id, 2, `${m}-10`);
    }
    w.engine.closeThrough("2027-03");
    const p = w.entries("A", "PRESTASI");
    expect(p.map((e) => e.note).sort()).toEqual(["Builder", "Executive"]);
    expect(p.reduce((a, e) => a + e.amount, 0)).toBe(450_000);
  });

  it("Langganan ikut dihitung dalam volume kaki", () => {
    w.mitra("B", "A", at("2027-01-05"), { leg: "L" });
    sellCustomers("B", 1, "2027-01-10");
    w.engine.paySubscription({ saleId: "S-P1", accountId: "P1", forMonth: "2027-04", at: at("2027-01-20") });
    expect(w.engine.rankInputs("A", "2027-01").legPaket.L).toBeCloseTo(
      2 + PLAN.subscription.netPrice / PLAN.license.netPrice,
      6,
    );
  });

  it("volume bulanan di-reset setiap tutup bulan", () => {
    builderJanuary();
    w.engine.closeThrough("2027-01");
    const node = w.engine.nodes.get(w.engine.accounts.get("A")!.nodeId!)!;
    expect(node.monthNet).toEqual({ L: 0, R: 0 });
    expect(w.engine.rankInputs("A", "2027-01").legPaket.L).toBe(3);
  });
});

describe("Dana leadership 5% (spesifikasi 7)", () => {
  /** Bangun Mitra `id` yang memenuhi peringkat ke-k (0 = Member) pada tanggal yang sama. */
  function grow(id: string, sponsor: string, leg: "L" | "R" | undefined, k: number, date: string) {
    w.mitra(id, sponsor, at(date), { leg });
    if (k === 0) {
      sellCustomers(id, 1, date);
      return;
    }
    const r = PLAN.monthlyRanks[k];
    grow(`${id}L`, id, "L", k - 1, date);
    grow(`${id}R`, id, "R", k - 1, date);
    for (let j = 0; j < r.directActive - 2; j++) grow(`${id}X${j}`, id, undefined, 0, date);
    for (const side of ["L", "R"] as const) {
      const child = `${id}${side}`;
      while (w.engine.rankInputs(id, date.slice(0, 7)).legPaket[side] < r.legPaket)
        sellCustomers(child, 1, date);
    }
  }

  it("Director aktif menerima dana leadership bulan itu", () => {
    grow("D", "A", "L", 4, "2027-01-10");
    w.engine.closeThrough("2027-01");
    expect(w.engine.paidAsRank("D", "2027-01")).toBe("Director");
    const r = w.engine.report("2027-01")!;
    expect(r.leadershipFund).toBe(Math.round((r.licenseNet * PLAN.leadershipFundBp) / 10_000));
    const lead = w.entries("D", "LEADERSHIP");
    expect(lead.map((e) => e.amount)).toEqual([r.leadershipFund]);
    expect(r.pool.leadershipUnassigned).toBe(0);
  });

  it("tanpa pemegang peringkat berbobot, seluruh dana masuk Pool", () => {
    builderJanuary();
    w.engine.closeThrough("2027-01");
    const r = w.engine.report("2027-01")!;
    expect(r.leadershipFund).toBeGreaterThan(0);
    expect(r.pool.leadershipUnassigned).toBe(r.leadershipFund);
  });

  it("bulan tanpa Lisensi: dana leadership 0", () => {
    w.engine.closeThrough("2027-02");
    expect(w.engine.report("2027-02")!.leadershipFund).toBe(0);
  });
});
