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
const at = (date: string, h = 10) => atWib(date, h);

// Autentikasi tiruan: "Bearer <userId>|<mitraId>". Verifikasi Clerk sungguhan diuji di server.test.ts.
const authenticate: Authenticator = async (headers) => {
  const m = /^Bearer (\S+?)\|(\S*)$/.exec(headers.authorization ?? "");
  if (!m) return { ok: false, status: 401, reason: "tanpa-token" };
  return {
    ok: true,
    session: {
      userId: m[1],
      claims: { roles: [], mitraId: m[2] || undefined, problems: [] },
      roleSource: "token",
    },
  };
};

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
  });
  server = createServer((req, res) => void app(req, res));
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const get = (path: string, auth?: string) =>
    fetch(base + path, {
      redirect: "manual",
      headers: auth ? { authorization: `Bearer ${auth}` } : {},
    });
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
  return { engine, clock, get, hook, ticketFor, nik: () => syntheticNik(n++) };
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
