import { beforeEach, describe, expect, it } from "vitest";
import { EbookStore } from "../src/engine/ebook";
import { MitransEngine } from "../src/engine/engine";
import {
  Funnel,
  levelOf,
  sessionFor,
  upcomingSessions,
} from "../src/engine/funnel";
import { syntheticNik } from "../src/engine/simulation";
import { atWib } from "../src/engine/time";

let engine: MitransEngine;
let store: EbookStore;
let funnel: Funnel;
let slug = "";
const at = (date: string, h = 10, m = 0) => atWib(date, h, m);
const ANS = {
  dana_darurat: 1,
  pengalaman: 0,
  laporan_keuangan: 1,
  waktu_belajar: 1,
  risiko: 2,
};

beforeEach(() => {
  engine = new MitransEngine(atWib("2027-01-01", 0, 1));
  engine.registerMitra({
    id: "A",
    name: "A",
    nik: syntheticNik(1),
    sponsorId: "MITRANS-002",
    at: at("2027-01-02"),
  });
  engine.passQuiz("A");
  store = new EbookStore(engine);
  funnel = new Funnel(store, { capacity: 2 });
  const e = store.create(
    "A",
    {
      title: "Mengenal Saham Syariah",
      summary: "Dasar.",
      price: 49_000,
      lpHeadline: "Belajar",
      lpBody: "Bertahap.",
      webinarOffer: true,
    },
    at("2027-01-02"),
  );
  store.attachFile(
    e.id,
    "A",
    { name: "ebook.pdf", size: 1000, sha256: "c".repeat(64) },
    at("2027-01-02"),
  );
  store.submit(e.id, "A", at("2027-01-02"));
  store.review(e.id, "u-rina", "setujui", undefined, at("2027-01-02"));
  slug = e.slug;
});

function buy(userId: string, consent: boolean, paidAt = at("2027-01-04")) {
  const o = store.order(
    slug,
    {
      userId,
      name: userId,
      email: `${userId}@contoh.test`,
      whatsapp: "081234567890",
      waConsent: consent,
    },
    paidAt,
  );
  store.markPaid(o.id, 49_000, paidAt);
  funnel.onPaid(o.id, paidAt);
  return o.id;
}

describe("Jadwal kelas RT3", () => {
  it("hanya Selasa, Rabu, dan Kamis pukul 19.00 WIB; ditutup 60 menit sebelum mulai", () => {
    expect(sessionFor("2027-01-05")).toMatchObject({
      id: "RT3-2027-01-05",
      dayLabel: "Selasa",
      startsAt: at("2027-01-05", 19),
    });
    expect(sessionFor("2027-01-08")).toBeUndefined(); // Jumat
    expect(
      upcomingSessions(at("2027-01-05", 17, 59), 3).map((s) => s.id),
    ).toEqual(["RT3-2027-01-05", "RT3-2027-01-06", "RT3-2027-01-07"]);
    expect(upcomingSessions(at("2027-01-05", 18), 3).map((s) => s.id)).toEqual([
      "RT3-2027-01-06",
      "RT3-2027-01-07",
    ]);
  });
});

describe("Perjalanan pembeli e-book", () => {
  it("lunas → asesmen → unduh → pilih kelas → hadir", () => {
    const id = buy("u1", true);
    expect(funnel.stage(id)).toBe("lunas");
    expect(funnel.canDownload(id, "u1")).toEqual({
      ok: false,
      reason: "Isi asesmen terlebih dahulu",
    });
    expect(() =>
      funnel.chooseClass(id, "u1", "RT3-2027-01-05", at("2027-01-04")),
    ).toThrow(/asesmen/);
    expect(() =>
      funnel.submitAssessment(
        id,
        "u1",
        { ...ANS, risiko: 9 },
        at("2027-01-04"),
      ),
    ).toThrow(/Jawab/);
    expect(funnel.submitAssessment(id, "u1", ANS, at("2027-01-04")).level).toBe(
      "menengah",
    );
    expect(funnel.canDownload(id, "u1").ok).toBe(true);
    expect(funnel.canDownload(id, "orang_lain").ok).toBe(false);
    funnel.chooseClass(id, "u1", "RT3-2027-01-05", at("2027-01-04"));
    expect(funnel.stage(id)).toBe("kelas_dipilih");
    expect(() =>
      funnel.markAttendance("RT3-2027-01-05", [id], at("2027-01-05", 12)),
    ).toThrow(/setelah kelas dimulai/);
    expect(
      funnel.markAttendance("RT3-2027-01-05", [id], at("2027-01-05", 21)),
    ).toBe(1);
    expect(funnel.stage(id)).toBe("hadir");
  });

  it("tingkat belajar dari jawaban, bukan profil risiko", () => {
    expect(
      levelOf({
        dana_darurat: 0,
        pengalaman: 0,
        laporan_keuangan: 0,
        waktu_belajar: 1,
        risiko: 0,
      }),
    ).toBe("dasar");
    expect(
      levelOf({
        dana_darurat: 2,
        pengalaman: 2,
        laporan_keuangan: 2,
        waktu_belajar: 2,
        risiko: 2,
      }),
    ).toBe("lanjut");
  });

  it("kapasitas kelas dan penutupan pemilihan", () => {
    const ids = ["u1", "u2", "u3"].map((u) => {
      const id = buy(u, false);
      funnel.submitAssessment(id, u, ANS, at("2027-01-04"));
      return id;
    });
    funnel.chooseClass(ids[0], "u1", "RT3-2027-01-05", at("2027-01-04"));
    funnel.chooseClass(ids[1], "u2", "RT3-2027-01-05", at("2027-01-04"));
    expect(() =>
      funnel.chooseClass(ids[2], "u3", "RT3-2027-01-05", at("2027-01-04")),
    ).toThrow(/penuh/);
    expect(() =>
      funnel.chooseClass(
        ids[2],
        "u3",
        "RT3-2027-01-05",
        at("2027-01-05", 18, 30),
      ),
    ).toThrow(/ditutup/);
    expect(() =>
      funnel.chooseClass(ids[2], "u3", "RT3-2027-01-08", at("2027-01-04")),
    ).toThrow(/tidak dikenal/);
  });
});

describe("Pengingat WhatsApp", () => {
  it("tanpa persetujuan tidak ada pesan sama sekali", () => {
    const id = buy("u1", false);
    funnel.submitAssessment(id, "u1", ANS, at("2027-01-04"));
    funnel.chooseClass(id, "u1", "RT3-2027-01-06", at("2027-01-04"));
    expect(funnel.wa.messages).toHaveLength(0);
  });

  it("pesan lunas sekali; pengingat H-1 pukul 19.00 dan 1 jam sebelum kelas; mengganti kelas membatalkan pengingat lama", () => {
    const id = buy("u1", true);
    funnel.onPaid(id, at("2027-01-04")); // kabar lunas terkirim dua kali
    expect(
      funnel.wa.messages.filter((m) => m.kind === "pembayaran_lunas"),
    ).toHaveLength(1);
    expect(funnel.wa.messages[0].body).toMatch(/BERHENTI/);
    expect(funnel.wa.messages[0].body).not.toMatch(
      /segera|terakhir|pasti untung/i,
    );
    funnel.submitAssessment(id, "u1", ANS, at("2027-01-04"));
    funnel.chooseClass(id, "u1", "RT3-2027-01-06", at("2027-01-04"));
    funnel.chooseClass(id, "u1", "RT3-2027-01-07", at("2027-01-04", 11));
    const live = funnel.wa.messages.filter(
      (m) => m.status === "antre" && m.kind !== "pembayaran_lunas",
    );
    expect(live.map((m) => m.sendAt)).toEqual([
      at("2027-01-06", 19),
      at("2027-01-07", 18),
    ]);
    expect(
      funnel.wa.messages.filter((m) => m.status === "dibatalkan"),
    ).toHaveLength(2);
  });

  it("jam tenang 21.00–07.00 WIB: pesan digeser ke 07.00", () => {
    const id = buy("u1", true, at("2027-01-04", 22, 15));
    expect(funnel.wa.messages.find((m) => m.orderId === id)!.sendAt).toBe(
      at("2027-01-05", 7),
    );
  });

  it("balasan BERHENTI membatalkan pesan yang belum terkirim dan menghentikan pesan berikutnya", () => {
    const id = buy("u1", true);
    funnel.submitAssessment(id, "u1", ANS, at("2027-01-04"));
    funnel.chooseClass(id, "u1", "RT3-2027-01-06", at("2027-01-04"));
    expect(funnel.wa.inbound("u1", "halo")).toBe(false);
    expect(funnel.wa.inbound("u1", " berhenti ")).toBe(true);
    expect(funnel.wa.messages.every((m) => m.status === "dibatalkan")).toBe(
      true,
    );
    funnel.chooseClass(id, "u1", "RT3-2027-01-07", at("2027-01-04", 12));
    expect(funnel.wa.messages.filter((m) => m.status === "antre")).toHaveLength(
      0,
    );
  });
});

describe("Kehadiran otomatis dari laporan Zoom", () => {
  const CSV = [
    "Meeting ID,Topic,Start Time",
    "123 456 789,Webinar RT3,01/05/2027 07:00:00 PM",
    "",
    'Name (Original Name),User Email,Join Time,Leave Time,Duration (Minutes),Guest',
    'Peserta Satu,U1@contoh.test,01/05/2027 07:00:00 PM,01/05/2027 07:20:00 PM,20,Yes',
    'Peserta Satu,u1@contoh.test,01/05/2027 07:25:00 PM,01/05/2027 08:00:00 PM,35,Yes',
    '"Dua, Peserta",u2@contoh.test,01/05/2027 07:00:00 PM,01/05/2027 07:10:00 PM,10,Yes',
    'Tamu,tamu@contoh.test,01/05/2027 07:00:00 PM,01/05/2027 08:00:00 PM,60,Yes',
    'Tanpa Surel,,01/05/2027 07:00:00 PM,01/05/2027 08:00:00 PM,60,Yes',
  ].join("\n");

  it("membaca CSV Zoom: baris judul dicari otomatis, tanda kutip, baris tanpa surel diabaikan", async () => {
    const { parseZoomParticipants } = await import("../src/engine/funnel");
    expect(parseZoomParticipants(CSV)).toEqual([
      { email: "u1@contoh.test", minutes: 20 },
      { email: "u1@contoh.test", minutes: 35 },
      { email: "u2@contoh.test", minutes: 10 },
      { email: "tamu@contoh.test", minutes: 60 },
    ]);
    expect(() => parseZoomParticipants("a,b\n1,2")).toThrow(/tidak ditemukan/);
  });

  it("durasi dijumlahkan; hadir bila >= 30 menit; peserta di luar pesanan dilaporkan", async () => {
    const { parseZoomParticipants } = await import("../src/engine/funnel");
    const ids = ["u1", "u2"].map((u) => {
      const id = buy(u, false);
      funnel.submitAssessment(id, u, ANS, at("2027-01-04"));
      funnel.chooseClass(id, u, "RT3-2027-01-05", at("2027-01-04"));
      return id;
    });
    expect(() => funnel.importZoomAttendance("RT3-2027-01-05", [], at("2027-01-05", 12))).toThrow(/setelah kelas dimulai/);
    const r = funnel.importZoomAttendance("RT3-2027-01-05", parseZoomParticipants(CSV), at("2027-01-05", 21));
    expect(r).toEqual({ hadir: [ids[0]], kurang: [{ orderId: ids[1], minutes: 10 }], tidakTerdaftar: ["tamu@contoh.test"] });
    expect(funnel.stage(ids[0])).toBe("hadir");
    expect(funnel.stage(ids[1])).toBe("kelas_dipilih");
  });
});
