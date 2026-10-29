import { beforeEach, describe, expect, it } from "vitest";
import { EngineError } from "../src/engine/engine";
import { ageAt, parseNik } from "../src/engine/nik";
import { PLAN } from "../src/engine/plan";
import { syntheticNik } from "../src/engine/simulation";
import { addDays } from "../src/engine/time";
import { at, createWorld } from "./helpers";

// NIK contoh fiktif: 3171 01 + tanggal lahir + nomor urut.
const NIK_AYAH = "3171011505800001"; // laki-laki, 15-05-1980
const NIK_ISTRI = "3171015508820002"; // perempuan (55 = 15 + 40), 15-08-1982
const NIK_ANAK = "3171010101040003"; // 01-01-2004, berusia 23 tahun pada 2027
const NIK_ANAK_KECIL = "3171010101150004"; // 01-01-2015, di bawah 18 tahun

describe("Pemeriksaan NIK (1 akun = 1 NIK)", () => {
  const today = at("2027-01-10");
  it("menerima NIK sah dan membaca tanggal lahir serta jenis kelamin", () => {
    const info = parseNik(NIK_ISTRI, today);
    expect("error" in info).toBe(false);
    if ("error" in info) return;
    expect(info.female).toBe(true);
    expect(new Date(info.birthDate).toISOString().slice(0, 10)).toBe(
      "1982-08-15",
    );
    expect(ageAt(info.birthDate, today)).toBe(44);
  });
  it.each([
    ["317101150580000", "16 angka"],
    ["31710115058000AB", "16 angka"],
    ["9971011505800001", "provinsi"],
    ["3171013213800001", "Tanggal lahir"],
    ["3171013002800001", "Tanggal lahir"],
    ["3171011505800000", "Nomor urut"],
  ])("menolak NIK tidak sah %s", (nik, msg) => {
    const info = parseNik(nik, today);
    expect("error" in info && info.error).toContain(msg);
  });
  it("NIK yang sama ditolak otomatis, termasuk bila ditulis dengan spasi atau titik", () => {
    const w = createWorld();
    w.engine.registerMitra({
      id: "X",
      name: "X",
      nik: NIK_AYAH,
      sponsorId: "MITRANS-002",
      at: at("2027-01-02"),
    });
    expect(w.engine.nikTaken("3171 0115 0580 0001")).toBe(true);
    expect(() =>
      w.engine.registerMitra({
        id: "Y",
        name: "Y",
        nik: "3171.0115.0580.0001",
        sponsorId: "MITRANS-002",
        at: at("2027-01-02"),
      }),
    ).toThrow(/NIK sudah terdaftar/);
    // Berlaku lintas peran: Pelanggan tidak dapat memakai NIK Mitra PLS.
    w.mitra("A", "MITRANS-002", at("2027-01-02"));
    expect(() =>
      w.engine.registerPelanggan({
        id: "P",
        name: "P",
        nik: NIK_AYAH,
        sellerId: "A",
        at: at("2027-01-03"),
      }),
    ).toThrow(/NIK sudah terdaftar/);
  });
  it("Mitra PLS di bawah 18 tahun menurut NIK ditolak", () => {
    const w = createWorld();
    expect(() =>
      w.engine.registerMitra({
        id: "K",
        name: "K",
        nik: NIK_ANAK_KECIL,
        sponsorId: "MITRANS-002",
        at: at("2027-01-02"),
      }),
    ).toThrow(/18 tahun/);
  });
});

describe("Kursi Lisensi Atlas Family didaftarkan oleh ayah", () => {
  let w: ReturnType<typeof createWorld>;
  const buyAt = at("2027-01-06");
  const members = {
    L: { id: "ANAK", name: "Anak", nik: NIK_ANAK },
    R: { id: "ISTRI", name: "Istri", nik: NIK_ISTRI },
  };
  beforeEach(() => {
    w = createWorld();
    w.mitra("A", "MITRANS-002", at("2027-01-01"));
    w.engine.registerMitra({
      id: "AYAH",
      name: "Ayah",
      nik: NIK_AYAH,
      sponsorId: "A",
      at: at("2027-01-05"),
    });
  });
  const node = (id: string) =>
    w.engine.nodes.get(w.engine.accounts.get(id)!.nodeId!)!;
  const gross = (id: string, type: string) =>
    w.engine
      .entriesFor(id)
      .filter((e) => e.type === type)
      .reduce((a, e) => a + e.gross, 0);

  it("anak langsung di kaki kiri dan istri di kaki kanan ayah, disponsori ayah, menunggu verifikasi", () => {
    w.engine.purchaseFamily({
      saleId: "F1",
      headId: "AYAH",
      members,
      at: buyAt,
    });
    expect(node("AYAH").left).toBe(node("ANAK").id);
    expect(node("AYAH").right).toBe(node("ISTRI").id);
    for (const id of ["ANAK", "ISTRI"]) {
      const acc = w.engine.accounts.get(id)!;
      expect(acc.sponsorId).toBe("AYAH");
      expect(acc.familySeat?.status).toBe("menunggu");
      expect(acc.licenseActivatedAt).toBeUndefined();
    }
    // Sebelum verifikasi: belum ada volume kursi dan bonus kursi untuk penjual.
    expect(node("AYAH").cumLicenses).toEqual({ L: 0, R: 0 });
    expect(gross("A", "SPONSOR")).toBe(PLAN.family.sponsorBonus / 3);
    expect(gross("A", "FAST_START")).toBe(PLAN.fastStartBonus);
    // Penempatan Mitra baru dari ayah tidak dapat merebut posisi keluarga.
    w.engine.passQuiz("AYAH");
    w.mitra("TETANGGA", "AYAH", at("2027-01-07"));
    expect(node("TETANGGA").parentId).not.toBe(node("AYAH").id);
  });

  it("anggota yang belum verifikasi tidak dapat mengaktifkan tautan rujukan", () => {
    w.engine.purchaseFamily({
      saleId: "F1",
      headId: "AYAH",
      members,
      at: buyAt,
    });
    expect(() => w.engine.passQuiz("ISTRI")).toThrow(/verifikasi kursi Family/);
  });

  it("verifikasi oleh anggota sendiri mengaktifkan kursi: volume untuk ayah, Sponsor dan Fast Start untuk penjual", () => {
    w.engine.purchaseFamily({
      saleId: "F1",
      headId: "AYAH",
      members,
      at: buyAt,
    });
    w.engine.verifyFamilyMember("ANAK", at("2027-01-08"));
    w.engine.verifyFamilyMember("ISTRI", at("2027-01-09"));
    expect(w.engine.accounts.get("ISTRI")!.familySeat?.status).toBe("aktif");
    expect(w.engine.accounts.get("ISTRI")!.accessMonths).toBe(12);
    expect(node("AYAH").cumLicenses).toEqual({ L: 1, R: 1 });
    expect(gross("A", "SPONSOR")).toBe(PLAN.family.sponsorBonus);
    expect(gross("A", "FAST_START")).toBe(3 * PLAN.fastStartBonus);
    expect(gross("AYAH", "SPONSOR") + gross("AYAH", "FAST_START")).toBe(0);
    expect(() =>
      w.engine.verifyFamilyMember("ISTRI", at("2027-01-10")),
    ).toThrow(/sudah terverifikasi/);
    w.engine.passQuiz("ISTRI");
  });

  it("Fast Start kursi mengikuti tanggal pembelian paket, walau verifikasi sesudah 90 hari penjual", () => {
    // Penjual B mulai 2027-01-01; paket dibeli hari ke-89, istri verifikasi hari ke-95.
    const w2 = createWorld();
    w2.mitra("B", "MITRANS-002", at("2027-01-01"));
    const t = addDays(at("2027-01-01"), 89);
    w2.engine.registerMitra({
      id: "AY",
      name: "Ay",
      nik: NIK_AYAH,
      sponsorId: "B",
      at: t,
    });
    w2.engine.purchaseFamily({
      saleId: "F9",
      headId: "AY",
      members: { R: members.R },
      at: t,
    });
    w2.engine.verifyFamilyMember("ISTRI", addDays(at("2027-01-01"), 95));
    const fs = w2.engine
      .entriesFor("B")
      .filter((e) => e.type === "FAST_START").length;
    expect(fs).toBe(2);
  });

  it("NIK anggota yang sudah terdaftar, sama dengan ayah, atau dipakai di kedua kursi ditolak tanpa mencatat apa pun", () => {
    const bad = [
      { L: { ...members.L, nik: NIK_AYAH }, R: members.R },
      { L: members.L, R: { ...members.R, nik: NIK_ANAK } },
      { L: { ...members.L, nik: NIK_ANAK_KECIL }, R: members.R },
    ];
    for (const m of bad) {
      expect(() =>
        w.engine.purchaseFamily({
          saleId: "F1",
          headId: "AYAH",
          members: m,
          at: buyAt,
        }),
      ).toThrow(EngineError);
      expect(w.engine.accounts.has("ANAK")).toBe(false);
      expect(w.engine.accounts.has("ISTRI")).toBe(false);
      expect(w.engine.accounts.get("AYAH")!.nodeId).toBeUndefined();
      expect(w.engine.sales.has("F1-1")).toBe(false);
    }
  });

  it(`lewat ${PLAN.family.seatVerifyDays} hari tanpa verifikasi: ditolak, lalu ayah dapat mengganti anggota`, () => {
    w.engine.purchaseFamily({
      saleId: "F1",
      headId: "AYAH",
      members,
      at: buyAt,
    });
    const late = addDays(buyAt, PLAN.family.seatVerifyDays + 1);
    expect(() => w.engine.verifyFamilyMember("ANAK", late)).toThrow(
      /Batas verifikasi/,
    );
    // NIK pengganti yang sudah terdaftar ditolak, dan anggota lama tetap di tempat.
    expect(() =>
      w.engine.replaceFamilyMember({
        accountId: "ANAK",
        member: { id: "ANAK2", name: "Anak 2", nik: NIK_ISTRI },
        at: late,
      }),
    ).toThrow(/NIK sudah terdaftar/);
    expect(w.engine.accounts.has("ANAK")).toBe(true);
    const nik2 = syntheticNik(77);
    w.engine.replaceFamilyMember({
      accountId: "ANAK",
      member: { id: "ANAK2", name: "Anak 2", nik: nik2 },
      at: late,
    });
    expect(w.engine.accounts.has("ANAK")).toBe(false);
    expect(w.engine.nikTaken(NIK_ANAK)).toBe(false);
    expect(node("AYAH").left).toBe(node("ANAK2").id);
    w.engine.verifyFamilyMember("ANAK2", addDays(late, 1));
    expect(node("AYAH").cumLicenses.L).toBe(1);
  });
});
