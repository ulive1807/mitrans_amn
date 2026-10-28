import { beforeEach, describe, expect, it } from "vitest";
import {
  EbookStore,
  scanCompliance,
  type EbookInput,
} from "../src/engine/ebook";
import { MitransEngine } from "../src/engine/engine";
import { PLAN } from "../src/engine/plan";
import { syntheticNik } from "../src/engine/simulation";
import { atWib } from "../src/engine/time";

let engine: MitransEngine;
let store: EbookStore;
let n = 1;
const at = (date: string, h = 10) => atWib(date, h);
const input: EbookInput = {
  title: "Membaca Laporan Keuangan Emiten Syariah",
  summary: "Panduan dasar untuk keluarga.",
  price: 49_000,
  lpHeadline: "Belajar membaca laporan keuangan",
  lpBody: "Belajar bertahap; investasi selalu mengandung risiko.",
  webinarOffer: true,
};
function mitra(id: string, sponsorId: string, t: number, quiz = true) {
  engine.registerMitra({
    id,
    name: id,
    nik: syntheticNik(n++),
    sponsorId,
    at: t,
  });
  if (quiz) engine.passQuiz(id);
}

beforeEach(() => {
  engine = new MitransEngine(atWib("2027-01-01", 0, 1));
  n = 1;
  mitra("A", "MITRANS-002", at("2027-01-02"));
  mitra("B", "A", at("2027-01-02"), false);
  store = new EbookStore(engine);
});

describe("Pengajuan dan persetujuan e-book", () => {
  it("alur draf → diajukan → disetujui; mengubah e-book yang tayang mengembalikannya ke draf", () => {
    const e = store.create("A", input, at("2027-01-03"));
    expect(e.status).toBe("draf");
    expect(store.live(e.slug, at("2027-01-03"))).toBeUndefined();
    store.submit(e.id, "A", at("2027-01-03"));
    expect(() => store.update(e.id, "A", input, at("2027-01-03"))).toThrow(
      /sedang diperiksa/,
    );
    store.review(e.id, "u-rina", "setujui", undefined, at("2027-01-04"));
    expect(store.live(e.slug, at("2027-01-04"))?.id).toBe(e.id);
    store.update(e.id, "A", { ...input, price: 59_000 }, at("2027-01-05"));
    expect(e.status).toBe("draf");
    expect(store.live(e.slug, at("2027-01-05"))).toBeUndefined();
  });

  it("revisi dan penolakan wajib beralasan; pembuat tidak memeriksa sendiri; Mitra tanpa kuis tidak dapat mengajukan", () => {
    const e = store.create("A", input, at("2027-01-03"));
    store.submit(e.id, "A", at("2027-01-03"));
    expect(() =>
      store.review(e.id, "u-rina", "revisi", " ", at("2027-01-04")),
    ).toThrow(/alasan/);
    expect(() =>
      store.review(e.id, "A", "setujui", undefined, at("2027-01-04")),
    ).toThrow(/sendiri/);
    store.review(
      e.id,
      "u-rina",
      "revisi",
      "Hapus kalimat 'pasti untung'.",
      at("2027-01-04"),
    );
    expect(e.status).toBe("perlu_revisi");
    expect(e.history.at(-1)).toMatchObject({
      action: "perlu_revisi",
      note: "Hapus kalimat 'pasti untung'.",
    });
    const b = store.create("B", input, at("2027-01-03"));
    expect(() => store.submit(b.id, "B", at("2027-01-03"))).toThrow(/kuis/);
  });

  it("harga Rp25.000–Rp150.000 kelipatan Rp1.000", () => {
    for (const price of [24_000, 151_000, 49_500])
      expect(() =>
        store.create("A", { ...input, price }, at("2027-01-03")),
      ).toThrow(/Harga/);
    expect(
      store.create("A", { ...input, price: 25_000 }, at("2027-01-03")).price,
    ).toBe(25_000);
    expect(
      store.create("A", { ...input, price: 150_000 }, at("2027-01-03")).price,
    ).toBe(150_000);
  });

  it("pemeriksaan otomatis menandai janji untung, imbal hasil, sinyal, dan klaim izin", () => {
    const f = scanCompliance(
      "Pasti untung! Profit 5% per bulan, sinyal beli harian, diawasi OJK.",
    );
    expect(f.map((x) => x.match)).toEqual(
      expect.arrayContaining([
        "Pasti untung",
        "5% per bulan",
        "sinyal beli",
        "diawasi OJK",
      ]),
    );
    expect(scanCompliance(input.lpBody)).toEqual([]);
  });

  it("LP turun bila pemilik dibekukan, diputus, atau e-book ditarik", () => {
    const e = store.create("A", input, at("2027-01-03"));
    store.submit(e.id, "A", at("2027-01-03"));
    store.review(e.id, "u-rina", "setujui", undefined, at("2027-01-03"));
    engine.freezeAccount("A", at("2027-01-10"));
    expect(store.live(e.slug, at("2027-01-05"))).toBeUndefined();
    engine.unfreezeAccount("A");
    expect(store.live(e.slug, at("2027-01-05"))).toBeDefined();
    store.withdraw(e.id, "u-rina", "Pengaduan konsumen", at("2027-01-06"));
    expect(store.live(e.slug, at("2027-01-06"))).toBeUndefined();
  });
});

describe("Pesanan e-book dan kunci Sponsor", () => {
  const buyer = {
    userId: "user_cub",
    name: "Siti",
    email: "siti@contoh.test",
    whatsapp: "0812-3456-7890",
    waConsent: false,
  };
  let slug = "";
  beforeEach(() => {
    const e = store.create("A", input, at("2027-01-03"));
    store.submit(e.id, "A", at("2027-01-03"));
    store.review(e.id, "u-rina", "setujui", undefined, at("2027-01-03"));
    slug = e.slug;
  });

  it("data pembeli divalidasi; WhatsApp tanpa persetujuan tidak dipakai", () => {
    expect(() =>
      store.order(slug, { ...buyer, email: "bukan-surel" }, at("2027-01-04")),
    ).toThrow(/surel/);
    expect(() =>
      store.order(slug, { ...buyer, whatsapp: "12345" }, at("2027-01-04")),
    ).toThrow(/WhatsApp/);
    const o = store.order(slug, buyer, at("2027-01-04"));
    expect(o).toMatchObject({
      whatsapp: "081234567890",
      waConsent: false,
      price: 49_000,
      sellerId: "A",
    });
  });

  it("lunas mengunci Sponsor sekali; pembayaran ulang idempoten; akun yang sudah ada tidak dikunci", () => {
    const o = store.order(slug, buyer, at("2027-01-04"));
    expect(store.markPaid(o.id, 49_000, at("2027-01-04"))).toMatchObject({
      newLock: true,
      lock: { sponsorId: "A" },
    });
    expect(store.markPaid(o.id, 49_000, at("2027-01-04"))).toMatchObject({
      newLock: false,
    });
    const o2 = store.order(
      slug,
      { ...buyer, userId: "user_mitra_lama" },
      at("2027-01-04"),
    );
    expect(
      store.markPaid(o2.id, 49_000, at("2027-01-04"), {
        isExistingAccount: () => true,
      }),
    ).toMatchObject({ newLock: false });
    expect(store.sponsorLocks.has("user_mitra_lama")).toBe(false);
    expect(store.lockedProspects("A").map((l) => l.userId)).toEqual([
      "user_cub",
    ]);
  });
});

describe("Tahap pembayaran bonus di Kantor Maya", () => {
  it("Bonus Sponsor tercatat seketika, dapat ditarik selama masa pembatalan, ditetapkan saat tutup bulan, lalu ditransfer Jumat", () => {
    mitra("C", "A", at("2027-01-05"));
    engine.purchaseLicense({ saleId: "L-A", buyerId: "A", at: at("2027-01-05") });
    engine.purchaseLicense({ saleId: "L-C", buyerId: "C", at: at("2027-01-29") });
    const e = engine.entriesFor("A").find((x) => x.type === "SPONSOR" && x.saleId === "L-C")!;
    expect(engine.entryStage(e)).toEqual({ stage: "tercatat", awaiting: "tutup_bulan", cancellableUntil: "2027-02-12" });
    engine.closeThrough("2027-01");
    const s2 = engine.entryStage(e);
    expect(s2).toMatchObject({ stage: "tercatat", transferDate: e.payoutDate, cancellableUntil: "2027-02-12" });
    engine.advance(at(e.payoutDate!));
    expect(engine.entryStage(e).stage).toBe("ditransfer");
    expect(PLAN.bonusSafetyDays).toBe(14);
  });
});
