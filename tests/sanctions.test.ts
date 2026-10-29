import { beforeEach, describe, expect, it } from "vitest";
import { EngineError, MitransEngine } from "../src/engine/engine";
import { CaseManager } from "../src/engine/sanctions";
import { addDays, atWib } from "../src/engine/time";
import { syntheticNik } from "../src/engine/simulation";

let e: MitransEngine;
let cm: CaseManager;
const jan = (d: number) => atWib(`2027-01-${String(d).padStart(2, "0")}`, 10);
const open12 = () =>
  cm.openCase({
    accountId: "A",
    violations: [12],
    allegation:
      "Lisensi Pelanggan P dibayar dari rekening atas nama A untuk memenuhi status aktif.",
    evidence: ["Sumber pembayaran sama dengan rekening penerima bonus A"],
    saleIds: ["LP"],
    actor: "Kepatuhan: Rina",
    at: jan(6),
  });

beforeEach(() => {
  e = new MitransEngine(atWib("2027-01-01", 0, 1));
  cm = new CaseManager(e);
  e.registerMitra({
    id: "A",
    name: "Ahmad",
    nik: syntheticNik(1),
    sponsorId: "MITRANS-002",
    at: jan(2),
  });
  e.passQuiz("A");
  e.purchaseLicense({ saleId: "LA", buyerId: "A", at: jan(2) });
  e.registerPelanggan({
    id: "P",
    name: "P",
    nik: syntheticNik(2),
    sellerId: "A",
    at: jan(5),
  });
  e.purchaseLicense({ saleId: "LP", buyerId: "P", at: jan(5) });
});

describe("Langkah 1: pemberitahuan tertulis (Pasal 21 angka 1; Pasal 9 angka 2)", () => {
  it("menerbitkan surat pemberitahuan bernomor dan surat penundaan, serta membuka pemeriksaan", () => {
    const c = open12();
    expect(c.letters.map((l) => l.kind)).toEqual([
      "pemberitahuan",
      "penundaan",
    ]);
    expect(c.letters[0].number).toBe("001/PDP-PLS/I/2027");
    expect(c.letters[0].body.join(" ")).toMatch(/Pasal 18 angka 12/);
    expect(c.letters[0].body.join(" ")).toMatch(/20 Januari 2027/); // batas penjelasan 14 hari
    expect(c.letters[1].body.join(" ")).toMatch(/paling lama 30 hari/);
    expect(e.sales.get("LP")!.review).toBeDefined();
  });
  it("wajib disertai bukti", () => {
    expect(() =>
      cm.openCase({
        accountId: "A",
        violations: [12],
        allegation: "x",
        evidence: [],
        actor: "R",
        at: jan(6),
      }),
    ).toThrow(/bukti/);
  });
});

describe("Langkah 2–3: penjelasan dan keputusan", () => {
  it("penjelasan setelah 14 hari ditolak", () => {
    const c = open12();
    expect(() =>
      cm.submitExplanation(
        c.id,
        "Itu rekening istri saya, bukan rekening saya.",
        addDays(jan(6), 15),
      ),
    ).toThrow(/sudah lewat/);
  });
  it("tidak dapat diputus sebelum ada penjelasan atau batas waktunya lewat", () => {
    const c = open12();
    expect(() =>
      cm.decide(c.id, {
        by: "Direksi: Budi",
        sanctions: ["teguran"],
        reasons: "Bukti pembayaran dari rekening penjual cukup jelas.",
        at: jan(8),
      }),
    ).toThrow(EngineError);
    expect(() => cm.markNoExplanation(c.id, jan(10), "R")).toThrow(
      /masih dapat/,
    );
  });
  it("tidak terbukti: pemeriksaan ditutup dan bonus yang ditunda dibayar", () => {
    const c = open12();
    cm.submitExplanation(
      c.id,
      "Pelanggan meminjam rekening saya karena kartunya hilang; ada bukti transfer balik.",
      jan(9),
    );
    cm.decide(c.id, {
      by: "Direksi: Budi",
      sanctions: [],
      reasons: "Bukti transfer balik meyakinkan; tidak ada pelanggaran.",
      at: jan(12),
    });
    expect(c.status).toBe("ditutup_tanpa_sanksi");
    expect(e.sales.get("LP")!.review!.dismissedAt).toBeDefined();
    expect(c.letters.at(-1)!.title).toMatch(/Tidak Terbukti/);
  });
  it("penarikan menjalankan konfirmasi akun terkendali di engine", () => {
    const c = open12();
    cm.submitExplanation(
      c.id,
      "Saya tidak tahu aturan itu, mohon pertimbangan.",
      jan(9),
    );
    cm.decide(c.id, {
      by: "Direksi: Budi",
      sanctions: ["teguran", "penarikan"],
      reasons:
        "Pembelian dibayar dari rekening penjual untuk memenuhi status aktif.",
      at: jan(12),
    });
    expect(e.sales.get("LP")!.controlled).toBe(true);
    expect(c.status).toBe("masa_keberatan");
    expect(c.letters.at(-1)!.body.join(" ")).toMatch(/keberatan satu kali/);
  });
  it("pembekuan paling lama 3 bulan dan memblokir penjualan", () => {
    const c = open12();
    cm.submitExplanation(
      c.id,
      "Penjelasan saya ada di lampiran percakapan.",
      jan(9),
    );
    expect(() =>
      cm.decide(c.id, {
        by: "Direksi: Budi",
        sanctions: ["pembekuan"],
        freezeMonths: 4,
        reasons: "Pelanggaran berulang dalam satu bulan terakhir.",
        at: jan(12),
      }),
    ).toThrow(/3 bulan/);
    cm.decide(c.id, {
      by: "Direksi: Budi",
      sanctions: ["pembekuan"],
      freezeMonths: 1,
      reasons: "Pelanggaran berulang dalam satu bulan terakhir.",
      at: jan(12),
    });
    e.registerPelanggan({
      id: "Q",
      name: "Q",
      nik: syntheticNik(3),
      sellerId: "A",
      at: jan(13),
    });
    expect(() =>
      e.purchaseLicense({ saleId: "LQ", buyerId: "Q", at: jan(13) }),
    ).toThrow(/dibekukan/);
  });
});

describe("Pemutusan dan keberatan (Pasal 20 dan 21 angka 4)", () => {
  it("pemutusan langsung tidak boleh untuk pelanggaran ringan pertama", () => {
    const c = cm.openCase({
      accountId: "A",
      violations: [19],
      allegation: "Pesan massal tanpa persetujuan.",
      evidence: ["Tangkapan layar grup"],
      actor: "R",
      at: jan(6),
    });
    cm.markNoExplanation(c.id, addDays(jan(6), 15), "R");
    expect(() =>
      cm.decide(c.id, {
        by: "Direksi: Budi",
        sanctions: ["pemutusan"],
        reasons: "Mengirim pesan massal tanpa persetujuan penerima.",
        at: addDays(jan(6), 16),
      }),
    ).toThrow(/pelanggaran berat/);
  });
  it("pemutusan baru berlaku setelah masa keberatan lewat", () => {
    const c = open12();
    cm.markNoExplanation(c.id, addDays(jan(6), 15), "R");
    const dAt = addDays(jan(6), 16);
    cm.decide(c.id, {
      by: "Direksi: Budi",
      sanctions: ["penarikan", "pemutusan"],
      reasons: "Pelanggaran berat Pasal 18 angka 12 terbukti tanpa sanggahan.",
      at: dAt,
    });
    expect(e.accounts.get("A")!.terminated).toBeFalsy();
    expect(cm.tick(addDays(dAt, 10))).toEqual([]);
    expect(cm.tick(addDays(dAt, 15))).toEqual([c.id]);
    expect(e.accounts.get("A")!.terminated).toBe(true);
    expect(c.status).toBe("final");
  });
  it("keberatan sekali, oleh pejabat lain, dan dapat mencabut sanksi", () => {
    const c = open12();
    cm.submitExplanation(
      c.id,
      "Saya keberatan, itu bukan rekening saya.",
      jan(9),
    );
    cm.decide(c.id, {
      by: "Direksi: Budi",
      sanctions: ["pembekuan"],
      freezeMonths: 2,
      reasons: "Pembayaran dari rekening penjual untuk memenuhi status aktif.",
      at: jan(12),
    });
    expect(e.accounts.get("A")!.frozenUntil).toBeDefined();
    cm.fileObjection(
      c.id,
      "Rekening itu milik pelanggan yang namanya mirip; terlampir buku tabungan.",
      jan(14),
    );
    expect(() =>
      cm.fileObjection(c.id, "Keberatan kedua saya mohon diterima.", jan(15)),
    ).toThrow(/sekali/);
    expect(() =>
      cm.decideObjection(c.id, {
        by: "direksi: budi",
        outcome: "dikabulkan",
        reasons: "Bukti buku tabungan menunjukkan pemilik berbeda.",
        at: jan(20),
      }),
    ).toThrow(/tidak terlibat/);
    cm.decideObjection(c.id, {
      by: "Komisaris: Sari",
      outcome: "dikabulkan",
      reasons: "Bukti buku tabungan menunjukkan pemilik rekening berbeda.",
      at: jan(20),
    });
    expect(e.accounts.get("A")!.frozenUntil).toBeUndefined();
    expect(c.status).toBe("ditutup_tanpa_sanksi");
    expect(c.letters.at(-1)!.title).toMatch(/Keberatan/);
  });
  it("keberatan setelah 14 hari ditolak", () => {
    const c = open12();
    cm.submitExplanation(
      c.id,
      "Penjelasan singkat namun cukup panjang.",
      jan(9),
    );
    cm.decide(c.id, {
      by: "Direksi: Budi",
      sanctions: ["teguran"],
      reasons: "Teguran atas kelalaian memeriksa sumber dana pembeli.",
      at: jan(12),
    });
    expect(() =>
      cm.fileObjection(
        c.id,
        "Saya baru membaca suratnya hari ini.",
        addDays(jan(12), 15),
      ),
    ).toThrow(/sudah lewat/);
  });
});
