import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { signTicket, signWebhook, verifyTicket } from "../server/integration";
import { readConfig } from "../server/main";
import type { Authenticator } from "../server/session";
import { MitransEngine } from "../src/engine/engine";
import { syntheticNik } from "../src/engine/simulation";
import { atWib } from "../src/engine/time";

// Rahasia uji, bukan rahasia sungguhan.
const TICKET = "tiket-uji-0123456789-0123456789-abcdef";
const HOOK = "webhook-uji-0123456789-0123456789-abcdef";
const CHECKOUT = "https://www.atlastrade.io/checkout";
const BERKAS = { nama: "ebook.pdf", ukuran: 1_200_000, sha256: "b".repeat(64) };
const XTOKEN = "xendit-uji-0123456789-0123456789-abcdef";
const at = (date: string, h = 10) => atWib(date, h);

// Autentikasi tiruan: "Bearer <userId>|<mitraId>". Verifikasi Clerk sungguhan diuji di server.test.ts.
const authenticate: Authenticator = async (headers) => {
  const m = /^Bearer ([^|\s]+)\|([^|\s]*)(?:\|(\S+))?$/.exec(
    headers.authorization ?? "",
  );
  if (!m) return { ok: false, status: 401, reason: "tanpa-token" };
  const roles = (m[3] ? m[3].split(",") : []) as any;
  return {
    ok: true,
    session: {
      userId: m[1],
      claims: { roles, mitraId: m[2] || undefined, problems: [] },
      roleSource: "token",
    },
  };
};

const activated = (id: string, data: Record<string, unknown>) => ({
  id,
  type: "license.activated",
  data: {
    saleId: "L-X1",
    userId: "user_x",
    name: "Pembeli X",
    paidAt: at("2027-01-05"),
    ...data,
  },
});

let server: Server | undefined;
afterEach(
  () => new Promise<void>((r) => (server ? server.close(() => r()) : r())),
);

async function setup(withIntegration = true) {
  const engine = new MitransEngine(atWib("2027-01-01", 0, 1));
  let n = 1;
  const mitra = (
    id: string,
    sponsorId: string,
    t: number,
    quiz = true,
    license = true,
  ) => {
    engine.registerMitra({
      id,
      name: id,
      nik: syntheticNik(n++),
      sponsorId,
      at: t,
      code: `MTR-${id}`,
    });
    if (quiz) engine.passQuiz(id);
    if (license)
      engine.purchaseLicense({ saleId: `L-${id}`, buyerId: id, at: t });
  };
  mitra("A", "MITRANS-002", at("2027-01-02"));
  mitra("B", "A", at("2027-01-03"), true, false); // terdaftar gratis, belum membeli Lisensi
  mitra("C", "A", at("2027-01-03"), false, false); // belum lulus kuis
  const clock = { now: Date.parse("2026-11-01T03:00:00Z") };
  const app = createApp({
    authenticate,
    engine,
    integration: withIntegration
      ? {
          ticketSecret: TICKET,
          webhookSecret: HOOK,
          checkoutUrl: CHECKOUT,
          clock: () => clock.now,
        }
      : undefined,
    xendit: { callbackToken: XTOKEN },
  });
  server = createServer((req, res) => void app(req, res));
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const get = (path: string, auth?: string) =>
    fetch(base + path, {
      redirect: "manual",
      headers: auth ? { authorization: `Bearer ${auth}` } : {},
    });
  const post = async (
    path: string,
    body: unknown,
    auth?: string,
    extra: Record<string, string> = {},
  ) => {
    const res = await fetch(base + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(auth ? { authorization: `Bearer ${auth}` } : {}),
        ...extra,
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  const hook = async (
    event: unknown,
    opts: { secret?: string; t?: number; tamper?: boolean } = {},
  ) => {
    const body = JSON.stringify(event);
    const sig = signWebhook(
      body,
      opts.secret ?? HOOK,
      opts.t ?? Math.floor(clock.now / 1000),
    );
    const res = await fetch(base + "/api/integrasi/atlastrade", {
      method: "POST",
      headers: { "content-type": "application/json", "x-atlas-signature": sig },
      body: opts.tamper ? body.replace("L-X1", "L-X9") : body,
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  const ticketFor = async (code: string) => {
    const res = await get(`/r/${code}`);
    return new URL(res.headers.get("location")!).searchParams.get("t")!;
  };
  return {
    engine,
    clock,
    get,
    post,
    hook,
    ticketFor,
    nik: () => syntheticNik(n++),
  };
}

describe("Tautan rujukan affiliatemarketing.network/r/KODE", () => {
  it("mengarahkan ke checkout atlastrade.io dengan tiket bertanda tangan tanpa data pribadi", async () => {
    const s = await setup();
    const res = await s.get("/r/MTR-A");
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin + loc.pathname).toBe(CHECKOUT);
    const v = verifyTicket(loc.searchParams.get("t")!, TICKET, s.clock.now);
    expect(v).toMatchObject({ ok: true, ticket: { sponsor: "MTR-A" } });
    if (v.ok)
      expect(Object.keys(v.ticket).sort()).toEqual([
        "exp",
        "iat",
        "nonce",
        "sponsor",
      ]);
  });

  it("tautan tidak aktif: kode tidak dikenal, belum lulus kuis, keanggotaan diputus, atau integrasi belum diatur", async () => {
    const s = await setup();
    expect((await s.get("/r/MTR-ZZ")).status).toBe(404);
    expect((await s.get("/r/MTR-C")).status).toBe(404);
    s.engine.terminateAccount("A", at("2027-01-04"));
    expect((await s.get("/r/MTR-A")).status).toBe(404);
    server!.close();
    const t = await setup(false);
    expect((await t.get("/r/MTR-A")).status).toBe(404);
  });

  it("tiket diubah atau kedaluwarsa ditolak", async () => {
    const s = await setup();
    const t = await s.ticketFor("MTR-A");
    const forged = signTicket(
      { sponsor: "MTR-B", nonce: "x", iat: 0, exp: Infinity },
      "rahasia-lain",
    );
    expect(verifyTicket(forged, TICKET, s.clock.now)).toEqual({
      ok: false,
      reason: "tanda-tangan",
    });
    const [body, sig] = t.split(".");
    const swapped = Buffer.from(
      Buffer.from(body, "base64url").toString().replace("MTR-A", "MTR-B"),
    ).toString("base64url");
    expect(verifyTicket(`${swapped}.${sig}`, TICKET, s.clock.now)).toEqual({
      ok: false,
      reason: "tanda-tangan",
    });
    expect(verifyTicket(t, TICKET, s.clock.now + 73 * 3600_000)).toEqual({
      ok: false,
      reason: "kedaluwarsa",
    });
  });
});

describe("Webhook atlastrade.io", () => {
  it("pembeli baru lewat tiket: akun Pelanggan dibuat dengan sponsor dari tiket, Bonus Sponsor timbul", async () => {
    const s = await setup();
    const r = await s.hook(
      activated("evt_1", { nik: s.nik(), ticket: await s.ticketFor("MTR-A") }),
    );
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      akun: "U-user_x",
      penjualan: "L-X1",
      penjual: "A",
      rujukan: "tiket",
    });
    expect(s.engine.accounts.get("U-user_x")).toMatchObject({
      role: "pelanggan",
      sponsorId: "A",
    });
    expect(
      s.engine
        .entriesFor("A")
        .some((e) => e.type === "SPONSOR" && e.saleId === "L-X1"),
    ).toBe(true);
  });

  it("idempoten: peristiwa yang sama dikirim ulang tidak membuat penjualan atau bonus ganda", async () => {
    const s = await setup();
    const ev = activated("evt_1", {
      nik: s.nik(),
      ticket: await s.ticketFor("MTR-A"),
    });
    const first = await s.hook(ev);
    const again = await s.hook(ev);
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ ...first.body, duplikat: true });
    expect(
      s.engine
        .entriesFor("A")
        .filter((e) => e.type === "SPONSOR" && e.saleId === "L-X1"),
    ).toHaveLength(1);
    // Nomor peristiwa lain dengan saleId yang sama ditolak oleh pemeriksaan penjualan.
    expect((await s.hook({ ...ev, id: "evt_2" })).status).toBe(409);
  });

  it("tanpa tiket atau tiket tidak sah: dicatat sebagai penjualan langsung Perusahaan", async () => {
    const s = await setup();
    const r = await s.hook(activated("evt_1", { nik: s.nik() }));
    expect(r.body).toMatchObject({
      penjual: "MITRANS-001",
      rujukan: "langsung",
    });
    const bad = await s.hook(
      activated("evt_2", {
        saleId: "L-X2",
        userId: "user_y",
        nik: s.nik(),
        ticket: "abc.def",
      }),
    );
    expect(bad.body).toMatchObject({
      penjual: "MITRANS-001",
      rujukan: "langsung",
      tiketDitolak: "tanda-tangan",
    });
    const t = await s.ticketFor("MTR-A");
    s.clock.now += 73 * 3600_000;
    const old = await s.hook(
      activated("evt_3", {
        saleId: "L-X3",
        userId: "user_z",
        nik: s.nik(),
        ticket: t,
      }),
    );
    expect(old.body).toMatchObject({
      rujukan: "langsung",
      tiketDitolak: "kedaluwarsa",
    });
  });

  it("Mitra PLS yang sudah login memakai akunnya sendiri; sponsor terkunci, tiket orang lain diabaikan", async () => {
    const s = await setup();
    expect((await s.get("/api/saya", "user_b|B")).status).toBe(200); // sesi Clerk yang sama menautkan user_b ke B
    const r = await s.hook(
      activated("evt_1", {
        userId: "user_b",
        name: undefined,
        ticket: await s.ticketFor("MTR-A"),
      }),
    );
    expect(r.body).toMatchObject({ akun: "B", penjual: "A", rujukan: "akun" });
    expect(s.engine.accounts.get("B")!.nodeId).toBeDefined();
  });

  it("pembeli baru tanpa nama atau NIK ditolak (422) agar data tidak diisi ulang di MLM", async () => {
    const s = await setup();
    expect((await s.hook(activated("evt_1", {}))).status).toBe(422);
    expect((await s.hook(activated("evt_2", { nik: "123" }))).status).toBe(400);
  });

  it("Langganan dan pengembalian dana dari atlastrade.io", async () => {
    const s = await setup();
    await s.hook(
      activated("evt_1", { nik: s.nik(), ticket: await s.ticketFor("MTR-A") }),
    );
    const sub = await s.hook({
      id: "evt_2",
      type: "subscription.paid",
      data: { saleId: "S-X1", userId: "user_x", paidAt: at("2027-02-03") },
    });
    expect(sub.body).toMatchObject({
      akun: "U-user_x",
      penjualan: "S-X1",
      aksesSampai: at("2027-03-06"),
    });
    expect(
      (
        await s.hook({
          id: "evt_3",
          type: "subscription.paid",
          data: { saleId: "S-Q", userId: "user_tak_dikenal" },
        })
      ).status,
    ).toBe(409);

    const ref = await s.hook({
      id: "evt_4",
      type: "sale.refunded",
      data: { saleId: "L-X1", refundedAt: at("2027-02-04") },
    });
    expect(ref.status).toBe(200);
    expect(ref.body.bonusDitarik).toBeGreaterThan(0);
    expect(s.engine.sales.get("L-X1")!.cancelled).toBe(true);
    expect(
      (
        await s.hook({
          id: "evt_5",
          type: "sale.refunded",
          data: { saleId: "TIDAK-ADA" },
        })
      ).status,
    ).toBe(409);
  });

  it("menolak tanda tangan salah, isi diubah, waktu basi, dan jenis peristiwa tidak dikenal", async () => {
    const s = await setup();
    const ev = activated("evt_1", { nik: s.nik() });
    expect(
      (await s.hook(ev, { secret: "rahasia-lain-0123456789-0123456789" }))
        .status,
    ).toBe(401);
    expect((await s.hook(ev, { tamper: true })).status).toBe(401);
    expect(
      (await s.hook(ev, { t: Math.floor(s.clock.now / 1000) - 301 })).status,
    ).toBe(401);
    expect(
      (await s.hook({ id: "evt_9", type: "user.deleted", data: {} })).status,
    ).toBe(400);
    expect(s.engine.sales.has("L-X1")).toBe(false);
  });
});

describe("Konfigurasi integrasi", () => {
  const base = {
    CLERK_JWT_KEY: "pem",
    CLERK_AUTHORIZED_PARTIES:
      "https://affiliatemarketing.network,https://www.atlastrade.io",
  };
  it("tidak aktif bila tidak diisi; wajib lengkap, panjang, berbeda, dan https di produksi", () => {
    expect(readConfig(base)).toMatchObject({
      errors: [],
      integration: undefined,
    });
    expect(
      readConfig({ ...base, ATLAS_WEBHOOK_SECRET: HOOK }).errors.join(),
    ).toMatch(/sekaligus/);
    expect(
      readConfig({
        ...base,
        RUJUKAN_TICKET_SECRET: "pendek",
        ATLAS_WEBHOOK_SECRET: HOOK,
        ATLAS_CHECKOUT_URL: CHECKOUT,
      }).errors.join(),
    ).toMatch(/32 karakter/);
    expect(
      readConfig({
        ...base,
        RUJUKAN_TICKET_SECRET: HOOK,
        ATLAS_WEBHOOK_SECRET: HOOK,
        ATLAS_CHECKOUT_URL: CHECKOUT,
      }).errors.join(),
    ).toMatch(/berbeda/);
    expect(
      readConfig({
        ...base,
        NODE_ENV: "production",
        RUJUKAN_TICKET_SECRET: TICKET,
        ATLAS_WEBHOOK_SECRET: HOOK,
        ATLAS_CHECKOUT_URL: "http://atlastrade.test/c",
      }).errors.join(),
    ).toMatch(/https/);
    expect(
      readConfig({
        ...base,
        RUJUKAN_TICKET_SECRET: TICKET,
        ATLAS_WEBHOOK_SECRET: HOOK,
        ATLAS_CHECKOUT_URL: CHECKOUT,
      }),
    ).toMatchObject({ errors: [], integration: { checkoutUrl: CHECKOUT } });
  });
});

describe("E-book Mitra PLS: pengajuan, persetujuan, dan Sponsor terkunci dari pembelian e-book", () => {
  const draft = {
    judul: "Mengenal Saham Syariah untuk Keluarga",
    ringkasan: "Panduan dasar membaca laporan keuangan emiten syariah.",
    harga: 49_000,
    judulHalaman: "Belajar saham syariah dari nol",
    isiHalaman: "Isi e-book: istilah dasar, risiko, dan cara belajar bertahap.",
    tawaranWebinar: true,
  };

  async function approvedEbook(s: Awaited<ReturnType<typeof setup>>) {
    const made = await s.post("/api/mitra/ebook", draft, "user_a|A");
    expect(made.status).toBe(200);
    await s.post(`/api/mitra/ebook/${made.body.id}/berkas`, BERKAS, "user_a|A");
    expect(
      (await s.post(`/api/mitra/ebook/${made.body.id}/ajukan`, {}, "user_a|A"))
        .body.status,
    ).toBe("diajukan");
    const ok = await s.post(
      `/api/admin/ebook/${made.body.id}/putuskan`,
      { keputusan: "setujui" },
      "user_k||kepatuhan",
    );
    expect(ok.body).toMatchObject({
      status: "disetujui",
      tautan: `https://affiliatemarketing.network/e/${made.body.slug}`,
    });
    return made.body.slug as string;
  }

  it("hanya peran Kepatuhan yang memutuskan; LP tayang hanya setelah disetujui", async () => {
    const s = await setup();
    const made = await s.post("/api/mitra/ebook", draft, "user_a|A");
    expect((await s.get(`/e/${made.body.slug}`)).status).toBe(404);
    await s.post(`/api/mitra/ebook/${made.body.id}/berkas`, BERKAS, "user_a|A");
    await s.post(`/api/mitra/ebook/${made.body.id}/ajukan`, {}, "user_a|A");
    expect(
      (
        await s.post(
          `/api/admin/ebook/${made.body.id}/putuskan`,
          { keputusan: "setujui" },
          "user_x||keuangan",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await s.post(
          `/api/admin/ebook/${made.body.id}/putuskan`,
          { keputusan: "tolak" },
          "user_k||kepatuhan",
        )
      ).status,
    ).toBe(409); // tanpa alasan
    await s.post(
      `/api/admin/ebook/${made.body.id}/putuskan`,
      { keputusan: "setujui" },
      "user_k||kepatuhan",
    );
    const lp = await s.get(`/e/${made.body.slug}`);
    expect(lp.status).toBe(200);
    expect(await lp.json()).toMatchObject({
      harga: 49_000,
      penjual: "MTR-A",
      tawaranWebinar: true,
    });
  });

  it("harga di luar Rp25.000–Rp150.000 ditolak", async () => {
    const s = await setup();
    expect(
      (
        await s.post(
          "/api/mitra/ebook",
          { ...draft, harga: 20_000 },
          "user_a|A",
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await s.post(
          "/api/mitra/ebook",
          { ...draft, harga: 151_000 },
          "user_a|A",
        )
      ).status,
    ).toBe(409);
  });

  it("pembelian e-book mengunci Sponsor; Lisensi beberapa hari kemudian tanpa tiket tetap jatuh ke pemilik e-book", async () => {
    const s = await setup();
    const slug = await approvedEbook(s);
    const order = await s.post(
      `/api/ebook/${slug}/pesan`,
      {
        nama: "Siti Contoh",
        surel: "siti@contoh.test",
        whatsapp: "081234567890",
        setujuWhatsapp: true,
      },
      "user_cub|",
    );
    expect(order.body).toMatchObject({ harga: 49_000, status: "menunggu" });
    expect(
      (
        await s.post(
          "/api/integrasi/xendit/ebook",
          {
            external_id: order.body.pesanan,
            status: "PAID",
            paid_amount: 49_000,
          },
          undefined,
          { "x-callback-token": "salah" },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await s.post(
          "/api/integrasi/xendit/ebook",
          {
            external_id: order.body.pesanan,
            status: "PAID",
            paid_amount: 1_000,
          },
          undefined,
          { "x-callback-token": XTOKEN },
        )
      ).status,
    ).toBe(409);
    const paid = await s.post(
      "/api/integrasi/xendit/ebook",
      { external_id: order.body.pesanan, status: "PAID", paid_amount: 49_000 },
      undefined,
      { "x-callback-token": XTOKEN },
    );
    expect(paid.body).toMatchObject({
      status: "lunas",
      sponsorTerkunci: "A",
      kunciBaru: true,
    });
    // E-book tidak menimbulkan bonus apa pun.
    expect(
      s.engine.entriesFor("A").some((e) => e.accruedAt >= at("2027-01-04")),
    ).toBe(false);

    s.clock.now += 5 * 24 * 3600_000; // webinar beberapa hari kemudian; tiket 72 jam sudah tidak relevan
    const r = await s.hook(
      activated("evt_1", {
        userId: "user_cub",
        nik: s.nik(),
        paidAt: at("2027-01-08"),
      }),
    );
    expect(r.body).toMatchObject({ penjual: "A", rujukan: "ebook" });
  });

  it("kunci pertama tetap: e-book Mitra PLS lain dan tiket lain tidak mengubah Sponsor", async () => {
    const s = await setup();
    const slug = await approvedEbook(s);
    s.engine.passQuiz("C");
    const other = await s.post(
      "/api/mitra/ebook",
      { ...draft, judul: "E-book milik Mitra C" },
      "user_c|C",
    );
    await s.post(
      `/api/mitra/ebook/${other.body.id}/berkas`,
      BERKAS,
      "user_c|C",
    );
    await s.post(`/api/mitra/ebook/${other.body.id}/ajukan`, {}, "user_c|C");
    await s.post(
      `/api/admin/ebook/${other.body.id}/putuskan`,
      { keputusan: "setujui" },
      "user_k||kepatuhan",
    );
    const buy = async (sl: string) => {
      const o = await s.post(
        `/api/ebook/${sl}/pesan`,
        { nama: "Budi", surel: "budi@contoh.test", whatsapp: "081234567891" },
        "user_cub|",
      );
      return s.post(
        "/api/integrasi/xendit/ebook",
        { external_id: o.body.pesanan, status: "PAID", paid_amount: 49_000 },
        undefined,
        { "x-callback-token": XTOKEN },
      );
    };
    expect((await buy(slug)).body).toMatchObject({
      sponsorTerkunci: "A",
      kunciBaru: true,
    });
    expect((await buy(other.body.slug)).body).toMatchObject({
      sponsorTerkunci: "A",
      kunciBaru: false,
    });
    const r = await s.hook(
      activated("evt_1", {
        userId: "user_cub",
        nik: s.nik(),
        ticket: await s.ticketFor("MTR-C"),
      }),
    );
    expect(r.body).toMatchObject({ penjual: "A", rujukan: "ebook" });
  });
});

describe("Perjalanan pembeli e-book lewat API dan aktivasi afiliasi", () => {
  const draft = { judul: "Mengenal Saham Syariah untuk Keluarga", ringkasan: "Panduan dasar.", harga: 49_000, judulHalaman: "Belajar saham syariah", isiHalaman: "Bertahap dan jujur soal risiko.", tawaranWebinar: true };
  const ANS = { dana_darurat: 1, pengalaman: 0, laporan_keuangan: 1, waktu_belajar: 1, risiko: 2 };

  async function paidOrder(s: Awaited<ReturnType<typeof setup>>, user: string, consent = true) {
    const made = await s.post("/api/mitra/ebook", draft, "user_a|A");
    await s.post(`/api/mitra/ebook/${made.body.id}/berkas`, BERKAS, "user_a|A");
    await s.post(`/api/mitra/ebook/${made.body.id}/ajukan`, {}, "user_a|A");
    await s.post(`/api/admin/ebook/${made.body.id}/putuskan`, { keputusan: "setujui" }, "user_k||kepatuhan");
    const o = await s.post(`/api/ebook/${made.body.slug}/pesan`, { nama: "Siti", surel: "siti@contoh.test", whatsapp: "081234567890", setujuWhatsapp: consent }, `${user}|`);
    await s.post("/api/integrasi/xendit/ebook", { external_id: o.body.pesanan, status: "PAID", paid_amount: 49_000 }, undefined, { "x-callback-token": XTOKEN });
    return o.body.pesanan as string;
  }

  it("e-book tanpa berkas PDF tidak dapat diajukan", async () => {
    const s = await setup();
    const made = await s.post("/api/mitra/ebook", draft, "user_a|A");
    expect((await s.post(`/api/mitra/ebook/${made.body.id}/ajukan`, {}, "user_a|A")).body.galat).toMatch(/Unggah berkas/);
    expect((await s.post(`/api/mitra/ebook/${made.body.id}/berkas`, { ...BERKAS, nama: "ebook.docx" }, "user_a|A")).status).toBe(409);
  });

  it("asesmen membuka unduhan dan pemilihan kelas; hanya pesanan milik sendiri", async () => {
    const s = await setup();
    const id = await paidOrder(s, "user_cub");
    const mine = await s.get("/api/saya/ebook", "user_cub|");
    expect(((await mine.json()) as any[])[0]).toMatchObject({ pesanan: id, tahap: "lunas", bisaUnduh: false });
    expect((await s.get(`/api/saya/ebook/${id}/unduh`, "user_cub|")).status).toBe(403);
    expect((await s.post(`/api/saya/ebook/${id}/asesmen`, { jawaban: ANS }, "user_lain|")).status).toBe(409);
    expect((await s.post(`/api/saya/ebook/${id}/asesmen`, { jawaban: ANS }, "user_cub|")).body).toMatchObject({ tingkatBelajar: "Menengah", bisaUnduh: true });
    expect((await s.get(`/api/saya/ebook/${id}/unduh`, "user_cub|")).status).toBe(200);
    const kelas = (await (await s.get("/api/rt3/kelas", "user_cub|")).json()) as { id: string }[];
    expect(kelas.length).toBeGreaterThan(0);
    const pick = await s.post(`/api/saya/ebook/${id}/kelas`, { kelas: kelas[0].id }, "user_cub|");
    expect(pick.body.kelas).toBe(kelas[0].id);
    const wa = await s.get("/api/admin/whatsapp", "user_cs||layanan_pelanggan");
    const list = (await wa.json()) as { kind: string; to: string }[];
    expect(list.map((m) => m.kind)).toEqual(["pembayaran_lunas", "pengingat_kelas_h1", "pengingat_kelas_1jam"]);
    expect(list[0].to).not.toBe("081234567890");
    expect((await s.get("/api/admin/whatsapp", "user_x||keuangan")).status).toBe(403);
  });

  it("aktivasi afiliasi: Pelanggan pemegang Lisensi dikonversi dalam 60 hari; lewat 60 hari ditolak", async () => {
    const s = await setup();
    await s.hook(activated("evt_1", { nik: s.nik(), ticket: await s.ticketFor("MTR-A") }));
    expect((await s.post("/api/aktivasi-afiliasi", {}, "user_x|")).status).toBe(400);
    const r = await s.post("/api/aktivasi-afiliasi", { setuju: true }, "user_x|");
    expect(r.body).toMatchObject({ status: "dikonversi" });
    expect(s.engine.accounts.get("U-user_x")).toMatchObject({ role: "mitra", sponsorId: "A" });
    expect(s.engine.accounts.get("U-user_x")!.nodeId).toBeDefined();

    const t = await setup();
    await t.hook(activated("evt_1", { nik: t.nik(), ticket: await t.ticketFor("MTR-A") }));
    t.engine.advance(at("2027-03-10"));
    expect((await t.post("/api/aktivasi-afiliasi", { setuju: true }, "user_x|")).body.galat).toMatch(/60 hari/);
  });

  it("pendaftaran Mitra PLS gratis tanpa Lisensi; Sponsor dari e-book yang dibeli", async () => {
    const s = await setup();
    await paidOrder(s, "user_cub", false);
    expect((await s.post("/api/aktivasi-afiliasi", { setuju: true }, "user_cub|")).status).toBe(422);
    const r = await s.post("/api/aktivasi-afiliasi", { setuju: true, nama: "Siti", nik: s.nik() }, "user_cub|");
    expect(r.body).toMatchObject({ status: "terdaftar", sponsor: "A" });
    expect(s.engine.accounts.get("U-user_cub")).toMatchObject({ role: "mitra", sponsorId: "A" });
    expect(s.engine.sales.size).toBe([...s.engine.sales.values()].filter((x) => x.buyerId !== "U-user_cub").length);
  });
});

describe("Kuis, rekening, dan impor laporan Zoom lewat API", () => {
  it("kuis mengaktifkan tautan rujukan hanya bila semua benar", async () => {
    const { QUIZ } = await import("../src/engine/quiz");
    const s = await setup();
    const ok = Object.fromEntries(QUIZ.map((q) => [q.id, q.answer]));
    expect((await s.get("/r/MTR-C")).status).toBe(404);
    const bad = await s.post("/api/mitra/kuis", { jawaban: { ...ok, sinyal: 0 } }, "user_c|C");
    expect(bad.body).toMatchObject({ lulus: false, salah: [{ id: "sinyal" }] });
    expect((await s.post("/api/mitra/kuis", { jawaban: ok }, "user_c|C")).body.lulus).toBe(true);
    expect((await s.get("/r/MTR-C")).status).toBe(302);
  });

  it("rekening atas nama sendiri; nomor tersamar di jawaban", async () => {
    const s = await setup();
    expect((await s.post("/api/mitra/rekening", { bank: "BSI", nomor: "7123456789", pemilik: "Orang Lain" }, "user_a|A")).status).toBe(409);
    expect((await s.post("/api/mitra/rekening", { bank: "BSI", nomor: "7123456789", pemilik: "A" }, "user_a|A")).body).toEqual({ bank: "BSI", nomor: "****6789", pemilik: "A" });
  });

  it("impor CSV Zoom hanya untuk peran kelas.kelola; isi besar diterima sampai 512 KB", async () => {
    const s = await setup();
    const big = "Name,User Email,Duration (Minutes)\n" + Array.from({ length: 1000 }, (_, i) => `P${i},p${i}@contoh.test,45`).join("\n");
    expect(big.length).toBeGreaterThan(8192);
    const sid = "RT3-2027-01-05";
    s.engine.advance(at("2027-01-06"));
    expect((await s.post(`/api/admin/rt3/${sid}/zoom`, { csv: big }, "user_x||keuangan")).status).toBe(403);
    expect((await s.post(`/api/admin/rt3/${sid}/zoom`, { csv: big }, "user_cs||layanan_pelanggan")).body).toEqual({ hadir: 0, kurangDariBatas: 0, diLuarPesanan: 1000 });
  });
});
