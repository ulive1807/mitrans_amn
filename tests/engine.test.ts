import { beforeEach, describe, expect, it } from "vitest";
import { EngineError, MitransEngine } from "../src/engine/engine";
import { PLAN } from "../src/engine/plan";
import { addDays, atWib } from "../src/engine/time";
import { syntheticNik } from "../src/engine/simulation";
import { BONUS_LABEL, type BonusType } from "../src/engine/types";

let engine: MitransEngine;
let nik = 1;
let saleNo = 1;

function mitra(
  id: string,
  sponsorId: string,
  at: number,
  opts: { quiz?: boolean; buy?: boolean; leg?: "L" | "R" } = {},
) {
  engine.registerMitra({
    id,
    name: id,
    nik: syntheticNik(nik++),
    sponsorId,
    at,
  });
  if (opts.quiz ?? true) engine.passQuiz(id);
  if (opts.buy ?? true)
    engine.purchaseLicense({
      saleId: `L-${id}`,
      buyerId: id,
      at,
      legPreference: opts.leg,
    });
}

function customer(id: string, sellerId: string, at: number) {
  engine.registerPelanggan({
    id,
    name: id,
    nik: syntheticNik(nik++),
    sellerId,
    at,
  });
  const saleId = `L-${id}`;
  engine.purchaseLicense({ saleId, buyerId: id, at });
  return saleId;
}

function entries(accountId: string, type: BonusType) {
  return engine.entriesFor(accountId).filter((e) => e.type === type);
}

const jan = (d: number, h = 10) =>
  atWib(`2027-01-${String(d).padStart(2, "0")}`, h);
const at = (date: string, h = 10) => atWib(date, h);

beforeEach(() => {
  engine = new MitransEngine(atWib("2027-01-01", 0, 1));
  nik = 1;
  saleNo = 1;
  void saleNo;
  mitra("A", "MITRANS-002", jan(2));
});

describe("Pendaftaran (Bab 5)", () => {
  it("gratis: pendaftaran saja tidak menimbulkan transaksi atau bonus", () => {
    const before = engine.ledger.length;
    mitra("X", "A", jan(3), { buy: false });
    expect(engine.ledger.length).toBe(before);
    expect(engine.accounts.get("X")!.nodeId).toBeUndefined();
  });
  it("satu NIK satu akun", () => {
    engine.registerMitra({
      id: "X",
      name: "X",
      nik: "3171000000009999",
      sponsorId: "A",
      at: jan(3),
    });
    expect(() =>
      engine.registerMitra({
        id: "Y",
        name: "Y",
        nik: "3171000000009999",
        sponsorId: "A",
        at: jan(3),
      }),
    ).toThrow(EngineError);
  });
  it("tautan rujukan belum aktif sebelum lulus kuis Kode Etik", () => {
    mitra("B", "A", jan(3), { quiz: false });
    engine.registerPelanggan({
      id: "P",
      name: "P",
      nik: syntheticNik(900),
      sellerId: "B",
      at: jan(4),
    });
    expect(() =>
      engine.purchaseLicense({ saleId: "X1", buyerId: "P", at: jan(4) }),
    ).toThrow(/kuis/);
  });
  it("posisi jaringan diberikan saat Lisensi pertama diaktifkan", () => {
    mitra("B", "A", jan(3), { buy: false });
    expect(engine.accounts.get("B")!.nodeId).toBeUndefined();
    engine.purchaseLicense({ saleId: "LB", buyerId: "B", at: jan(5) });
    expect(engine.accounts.get("B")!.nodeId).toBeDefined();
  });
});

describe("Akun struktural (Bab 2)", () => {
  it("bonus yang jatuh pada Mitrans 001-003 tidak dibayarkan", () => {
    const s = entries("MITRANS-002", "SPONSOR");
    expect(s).toHaveLength(1);
    expect(s[0].status).toBe("company");
  });
});

describe("Plan A: Sponsor dan Pasangan (Bab 8.1)", () => {
  beforeEach(() => {
    mitra("B", "A", jan(5), { leg: "L" });
    mitra("C", "A", jan(5), { leg: "R" });
  });

  it("Bonus Sponsor Rp750.000 per Lisensi yang dijual langsung", () => {
    expect(entries("A", "SPONSOR").map((e) => e.gross)).toEqual([
      750_000, 750_000,
    ]);
  });

  it("v2.0: tidak ada Bonus Level", () => {
    mitra("D", "B", jan(6), { leg: "L" });
    mitra("E", "C", jan(6), { leg: "R" });
    expect(Object.keys(BONUS_LABEL)).not.toContain("LEVEL");
    expect(engine.ledger.every((e) => e.type in BONUS_LABEL)).toBe(true);
  });

  it("Bonus Pasangan dihitung pada akhir hari, dan dibayar setelah tutup bulan bila aktif", () => {
    engine.advance(jan(6));
    const p = entries("A", "PASANGAN");
    expect(p).toHaveLength(1);
    expect(p[0].gross).toBe(150_000);
    engine.closeThrough("2027-01");
    expect(engine.isActive("A", "2027-01")).toBe(true);
    expect(p[0].status).toBe("payable");
    expect(p[0].amount).toBe(150_000);
    // Pembinaan atas pasangan A jatuh ke Sponsor-nya (struktural) -> tidak dibayarkan.
    expect(entries("MITRANS-002", "PEMBINAAN")[0].status).toBe("company");
  });

  it("Bonus Pembinaan generasi 1 = 25% dari Bonus Pasangan Mitra PLS yang disponsori", () => {
    mitra("D", "B", jan(7), { leg: "L" });
    mitra("E", "B", jan(7), { leg: "R" });
    engine.advance(jan(8));
    const pairB = entries("B", "PASANGAN").reduce((a, e) => a + e.gross, 0);
    expect(pairB).toBe(150_000);
    const pemb = entries("A", "PEMBINAAN").filter((e) => e.ref === 1);
    expect(pemb.reduce((a, e) => a + e.gross, 0)).toBe(37_500);
  });

  it("volume hanya dihitung sampai 10 level", () => {
    // Rantai 11 Mitra PLS di kaki kiri A.
    let sponsor = "B";
    for (let i = 0; i < 11; i++) {
      const id = `K${i}`;
      mitra(id, sponsor, jan(10), { leg: "L" });
      sponsor = id;
    }
    const nodeA = engine.nodes.get(engine.accounts.get("A")!.nodeId!)!;
    // B (level 1) + K0..K8 (level 2..10) = 10 Lisensi; K9 dan K10 di luar 10 level.
    expect(nodeA.cumLicenses.L).toBe(10);
  });
});

describe("Sisa unit pasangan dipakai hari berikutnya (Lampiran B.2)", () => {
  it("25 kiri dan 30 kanan dalam satu hari: 20 pasangan hari itu, 5 pasangan esok hari tanpa unit baru", () => {
    mitra("B", "A", jan(5), { leg: "L" });
    mitra("C", "A", jan(5), { leg: "R" });
    for (let i = 0; i < 24; i++) customer(`BL${i}`, "B", jan(5));
    for (let i = 0; i < 29; i++) customer(`CR${i}`, "C", jan(5));
    engine.advance(jan(8));
    const pairs = entries("A", "PASANGAN").map((e) => e.ref);
    expect(pairs).toEqual([20, 5]);
    const node = engine.nodes.get(engine.accounts.get("A")!.nodeId!)!;
    expect(node.carry).toEqual({ L: 0, R: 5 });
  });
});

describe("Status aktif dan masa tunggu 2 bulan (Bab 9.1 dan 9.3), sesudah program 90 hari", () => {
  // A aktivasi 2 Januari; jendela 90 hari berakhir 2 April. Skenario memakai Mei–Agustus agar ambang aktif 2.
  beforeEach(() => {
    // Mulai bulan ke-4 (April) bonus mensyaratkan Langganan aktif (Bab 9.2): A membayar April–Agustus.
    for (const m of ["04", "05", "06", "07", "08"])
      engine.paySubscription({ saleId: `S-A-${m}`, accountId: "A", forMonth: `2027-${m}`, at: at("2027-04-01") });
    mitra("B", "A", at("2027-05-05"), { leg: "L" }); // Mei: hanya 1 penjualan -> tidak aktif
    mitra("C", "A", at("2027-06-05"), { leg: "R" }); // Juni: pasangan terbentuk, 1 penjualan -> tidak aktif
  });

  it("bonus tim ditahan saat tidak aktif lalu dibayar bila aktif dalam 2 bulan berikutnya", () => {
    engine.closeThrough("2027-06");
    const pair = entries("A", "PASANGAN")[0];
    expect(pair.status).toBe("held");
    expect(pair.holdUntil).toBe("2027-08");
    customer("P1", "A", at("2027-07-03"));
    customer("P2", "A", at("2027-07-04"));
    engine.closeThrough("2027-07");
    expect(engine.isActive("A", "2027-07")).toBe(true);
    expect(pair.status).toBe("payable");
    expect(pair.settledMonth).toBe("2027-07");
  });

  it("bonus hangus pada akhir bulan ke-2 dan masuk Pool Aktif", () => {
    engine.closeThrough("2027-08");
    const pair = entries("A", "PASANGAN")[0];
    expect(pair.status).toBe("forfeited");
    const aug = engine.report("2027-08")!;
    expect(aug.pool.forfeitedTeam).toBe(PLAN.pairBonus);
  });

  it("pembelian untuk diri sendiri tidak dihitung", () => {
    expect(engine.personalSales("2027-05").get("A")).toBe(1);
    expect(() =>
      engine.purchaseLicense({
        saleId: "self",
        buyerId: "A",
        at: at("2027-06-10"),
      }),
    ).not.toThrow();
    // Lisensi kedua A dibeli lewat Sponsor-nya (struktural) dan tidak dihitung sebagai penjualan A.
    expect(engine.personalSales("2027-06").get("A")).toBe(1);
  });
});

describe("Bonus Layanan Berkah (Bab 8.1 dan 9.2)", () => {
  it("cair setelah konfirmasi pendampingan dan lewat 30 hari", () => {
    const s1 = customer("P1", "A", jan(10));
    customer("P2", "A", jan(11));
    engine.confirmOrientation(s1, jan(14));
    engine.closeThrough("2027-01");
    const b1 = engine
      .entriesFor("A")
      .find((e) => e.type === "BERKAH" && e.saleId === s1)!;
    expect(b1.status).toBe("pending"); // belum 30 hari
    engine.closeThrough("2027-02");
    expect(b1.status).toBe("payable");
    expect(b1.payoutDate).toBe("2027-02-12"); // Jumat setelah 9 Feb (30 hari)
  });
  it("tanpa konfirmasi dalam 60 hari masuk Pool Aktif", () => {
    customer("P1", "A", jan(10));
    engine.closeThrough("2027-03");
    const b = entries("A", "BERKAH")[0];
    expect(b.status).toBe("forfeited");
    expect(engine.report("2027-03")!.pool.berkahUnconfirmed).toBe(
      PLAN.berkahBonus,
    );
  });
});

describe("Konversi Lisensi Pelanggan (Bab 5.5)", () => {
  it("tanpa Bonus Sponsor kedua dan tanpa volume ganda di upline", () => {
    const nodeA = () => engine.nodes.get(engine.accounts.get("A")!.nodeId!)!;
    const node002 = () =>
      engine.nodes.get(engine.accounts.get("MITRANS-002")!.nodeId!)!;
    const saleId = customer("P", "A", jan(5));
    expect(node002().cumLicenses.L).toBe(2); // Lisensi A + Lisensi Pelanggan (di posisi A)
    expect(nodeA().cumLicenses.L + nodeA().cumLicenses.R).toBe(0);
    engine.convertCustomer({ customerId: "P", at: jan(20) });
    expect(engine.accounts.get("P")!.role).toBe("mitra");
    expect(
      engine
        .entriesFor("A")
        .filter((e) => e.type === "SPONSOR" && e.saleId === saleId),
    ).toHaveLength(1);
    expect(node002().cumLicenses.L).toBe(2); // tidak dihitung lagi
    expect(nodeA().cumLicenses.L + nodeA().cumLicenses.R).toBe(1); // mulai dihitung di kaki Sponsor
    expect(
      engine
        .entriesFor("A")
        .some((e) => e.type === "BERKAH" && e.saleId === saleId),
    ).toBe(true);
    expect(engine.personalSales("2027-01").get("A")).toBe(1); // tetap satu penjualan pada bulan pembelian
  });
  it("lewat 60 hari tidak dapat dikonversi", () => {
    customer("P", "A", jan(5));
    expect(() =>
      engine.convertCustomer({ customerId: "P", at: addDays(jan(5), 61) }),
    ).toThrow(/60 hari/);
  });
});

describe("Syarat Langganan bulan ke-4 (Bab 9.2)", () => {
  it("pemegang Lisensi Januari wajib Langganan aktif mulai April", () => {
    expect(engine.licenseMonthNumber("A", "2027-04")).toBe(4);
    expect(engine.subscriptionConditionMet("A", "2027-03")).toBe(true);
    expect(engine.subscriptionConditionMet("A", "2027-04")).toBe(false);
    engine.paySubscription({
      saleId: "S-A-04",
      accountId: "A",
      forMonth: "2027-04",
      at: at("2027-04-01"),
    });
    expect(engine.subscriptionConditionMet("A", "2027-04")).toBe(true);
  });
  it("Bonus Sponsor bulan ke-4 tanpa Langganan ditahan (asumsi kerja)", () => {
    customer("P1", "A", at("2027-04-05"));
    engine.closeThrough("2027-04");
    const e = entries("A", "SPONSOR")[0];
    expect(e.status).toBe("held");
    expect(engine.report("2027-04")!.heldNoSubscription).toBe(
      PLAN.sponsorBonus,
    );
  });
});

describe("Plan B (Bab 8.5 dan 9.2)", () => {
  beforeEach(() => {
    customer("P1", "A", jan(10));
    customer("P2", "A", jan(11)); // A aktif Januari -> pernah aktif
    for (const m of ["2027-04"]) {
      engine.paySubscription({
        saleId: `S-A-${m}`,
        accountId: "A",
        forMonth: m,
        at: at(`${m}-01`),
      });
      engine.paySubscription({
        saleId: `S-P1-${m}`,
        accountId: "P1",
        forMonth: m,
        at: at(`${m}-02`),
      });
    }
  });
  it("Komisi Langganan Rp70.000 bila ada kegiatan pembinaan terkonfirmasi", () => {
    engine.confirmCoaching("A", "2027-04");
    engine.closeThrough("2027-04");
    const k = entries("A", "KOMISI_LANGGANAN");
    expect(k).toHaveLength(1);
    expect(k[0]).toMatchObject({ status: "payable", amount: 70_000 });
  });
  it("tanpa kegiatan pembinaan Plan B tidak dibayarkan", () => {
    engine.closeThrough("2027-04");
    expect(entries("A", "KOMISI_LANGGANAN")[0].status).toBe("ineligible");
  });
  it("Langganan berbayar pertama Pelanggan dihitung sebagai penjualan baru pribadi", () => {
    expect(engine.personalSales("2027-04").get("A")).toBe(1);
  });
});

describe("Pembatalan (Bab 13 butir 10)", () => {
  it("komisi atas pembelian yang dibatalkan ditarik dan tidak dihitung untuk status aktif", () => {
    const s = customer("P1", "A", jan(10));
    customer("P2", "A", jan(11));
    engine.refundSale(s, jan(12));
    const sp = engine
      .entriesFor("A")
      .find((e) => e.type === "SPONSOR" && e.saleId === s)!;
    expect(sp.status).toBe("clawback");
    expect(engine.personalSales("2027-01").get("A")).toBe(1);
    engine.closeThrough("2027-01");
    expect(engine.report("2027-01")!.licensesSold).toBe(2); // Lisensi A dan P2
  });
  it("penarikan setelah dibayar membuat entri negatif", () => {
    const s = customer("P1", "A", jan(10));
    engine.closeThrough("2027-01");
    const r = engine.refundSale(s, at("2027-02-02"));
    // v2.0: penjualan dalam 90 hari pertama A juga memberi Fast Start, yang ikut ditarik.
    expect(r.clawedBack).toBe(PLAN.sponsorBonus + PLAN.fastStartBonus);
    expect(
      engine
        .entriesFor("A")
        .some(
          (e) => e.status === "clawback" && e.amount === -PLAN.sponsorBonus,
        ),
    ).toBe(true);
  });
});

describe("Waktu", () => {
  it("menolak peristiwa mundur", () => {
    engine.advance(jan(20));
    expect(() => customer("P", "A", jan(10))).toThrow(/mundur/);
  });
});
