import { generateKeyPairSync } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signJwt } from "@clerk/backend/jwt";
import { createApp } from "../server/app";
import { readConfig } from "../server/main";
import {
  clerkAuthenticator,
  createAuthenticator,
  extractToken,
} from "../server/session";
import { PLAN, atWib, demoScenario, runScenario, type MitransEngine } from "../src/engine";

// Kunci uji dibuat saat uji berjalan; bukan kunci Clerk sungguhan.
const keys = () => generateKeyPairSync("rsa", { modulusLength: 2048 });
const own = keys();
const other = keys();
const PEM = own.publicKey.export({ type: "spki", format: "pem" }).toString();
const ORIGIN = "https://mitrans.test";

async function token(claims: Record<string, unknown>, priv = own.privateKey) {
  const t = Math.floor(Date.now() / 1000);
  const jwk = priv.export({ format: "jwk" });
  const r: unknown = await signJwt(
    {
      sub: "user_a",
      sid: "sess_1",
      azp: ORIGIN,
      iat: t - 5,
      nbf: t - 5,
      exp: t + 60,
      ...claims,
    },
    jwk,
    { algorithm: "RS256", header: { typ: "JWT", kid: "ins_uji" } },
  );
  // Ekspor publik @clerk/backend/jwt mengembalikan string token langsung (bentuk lama) dan melempar galat bila gagal.
  if (typeof r !== "string") throw new Error("signJwt tidak mengembalikan token");
  return r;
}

let engine: MitransEngine;
let server: Server;
let base = "";
const call = async (
  path: string,
  init: { tok?: string; method?: string; cookie?: string; body?: string } = {},
) => {
  const headers: Record<string, string> = {};
  if (init.tok) headers.authorization = `Bearer ${init.tok}`;
  if (init.cookie) headers.cookie = init.cookie;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(base + path, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
  });
  return {
    status: res.status,
    body: (await res.json().catch(() => null)) as any,
  };
};

beforeAll(async () => {
  engine = runScenario(demoScenario()).engine;
  const authenticate = await clerkAuthenticator({
    jwtKey: PEM,
    authorizedParties: [ORIGIN],
  });
  const app = createApp({ authenticate, engine, corsOrigins: [ORIGIN] });
  server = createServer((req, res) => void app(req, res));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}, 60_000);
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("Verifikasi token sesi Clerk (verifyToken dengan jwtKey)", () => {
  it("kesehatan terbuka, rute lain wajib token", async () => {
    expect((await call("/api/kesehatan")).status).toBe(200);
    expect(await call("/api/saya")).toMatchObject({
      status: 401,
      body: { alasan: "tanpa-token" },
    });
    expect((await call("/api/tidak-ada")).status).toBe(404);
  });

  it("token sah: peran dibaca dari klaim metadata", async () => {
    const r = await call("/api/saya", {
      tok: await token({ metadata: { roles: ["kepatuhan"] } }),
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      userId: "user_a",
      roles: ["kepatuhan"],
      sumberPeran: "token",
    });
    expect(r.body.izin).toContain("audit.lihat");
    expect(
      (
        await call("/api/admin/audit", {
          tok: await token({ metadata: { roles: ["kepatuhan"] } }),
        })
      ).status,
    ).toBe(200);
  });

  it("menolak token kedaluwarsa, asal lain, kunci lain, isi diubah, dan alg none", async () => {
    const t = Math.floor(Date.now() / 1000);
    expect(
      (
        await call("/api/saya", {
          tok: await token({ iat: t - 600, nbf: t - 600, exp: t - 300 }),
        })
      ).body.alasan,
    ).toBe("token-kedaluwarsa");
    expect(
      (
        await call("/api/saya", {
          tok: await token({ azp: "https://situs-lain.test" }),
        })
      ).body.alasan,
    ).toBe("asal-tidak-diizinkan");
    expect(
      (await call("/api/saya", { tok: await token({}, other.privateKey) })).body
        .alasan,
    ).toBe("token-tidak-sah");

    const good = await token({ metadata: { roles: ["layanan_pelanggan"] } });
    const [h, , s] = good.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        sub: "user_a",
        azp: ORIGIN,
        iat: t,
        nbf: t,
        exp: t + 60,
        metadata: { roles: ["keuangan"] },
      }),
    ).toString("base64url");
    expect(
      (await call("/api/saya", { tok: `${h}.${forged}.${s}` })).status,
    ).toBe(401);
    const none = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url");
    expect(
      (await call("/api/saya", { tok: `${none}.${forged}.` })).status,
    ).toBe(401);
    expect((await call("/api/saya", { tok: "bukan-token" })).status).toBe(401);
  });

  it("sesi berstatus pending ditolak", async () => {
    expect(
      (await call("/api/saya", { tok: await token({ sts: "pending" }) })).body
        .alasan,
    ).toBe("sesi-belum-aktif");
  });
});

describe("Izin per peran di server", () => {
  it("peran tanpa izin ditolak dan dicatat", async () => {
    const r = await call("/api/admin/pembayaran", {
      tok: await token({
        sub: "user_cs",
        metadata: { roles: ["layanan_pelanggan"] },
      }),
    });
    expect(r.status).toBe(403);
    const audit = await call("/api/admin/audit", {
      tok: await token({
        sub: "user_aud",
        metadata: { roles: ["admin_sistem"] },
      }),
    });
    expect(
      audit.body.some((a: any) => a.userId === "user_cs" && !a.allowed),
    ).toBe(true);
  });

  it("rangkap peran terlarang = tanpa peran", async () => {
    const tok = await token({
      sub: "user_x",
      metadata: { roles: ["direksi", "pemeriksa_keberatan"] },
    });
    expect((await call("/api/saya", { tok })).body.roles).toEqual([]);
    expect((await call("/api/admin/ikhtisar", { tok })).status).toBe(403);
  });

  it("peran yang dikirim klien diabaikan (hanya dari token)", async () => {
    const res = await fetch(base + "/api/admin/pembayaran?roles=keuangan", {
      headers: {
        authorization: `Bearer ${await token({ sub: "user_y" })}`,
        "x-roles": "keuangan",
      },
    });
    expect(res.status).toBe(403);
  });

  it("cookie hanya untuk membaca; perubahan wajib header (CSRF)", async () => {
    const tok = await token({
      sub: "user_k1",
      metadata: { roles: ["keuangan"] },
    });
    expect(
      (
        await call("/api/admin/pembayaran", {
          cookie: `lain=1; __session=${tok}`,
        })
      ).status,
    ).toBe(200);
    const date = engine.payoutRuns().at(-1)!.date;
    expect(
      await call(`/api/admin/pembayaran/${date}/siapkan`, {
        method: "POST",
        cookie: `__session=${tok}`,
      }),
    ).toMatchObject({
      status: 403,
      body: { alasan: "cookie-untuk-perubahan" },
    });
  });

  it("maker-checker pembayaran: penyiap tidak bisa menyetujui sendiri", async () => {
    const date = engine.payoutRuns().at(-1)!.date;
    const a = await token({
      sub: "user_k1",
      metadata: { roles: ["keuangan"] },
    });
    const b = await token({
      sub: "user_k2",
      metadata: { roles: ["keuangan"] },
    });
    expect(
      (
        await call(`/api/admin/pembayaran/${date}/siapkan`, {
          tok: a,
          method: "POST",
        })
      ).body.status,
    ).toBe("disiapkan");
    expect(
      (
        await call(`/api/admin/pembayaran/${date}/setujui`, {
          tok: a,
          method: "POST",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(`/api/admin/pembayaran/${date}/setujui`, {
          tok: b,
          method: "POST",
        })
      ).body.status,
    ).toBe("disetujui");
    expect(
      (
        await call("/api/admin/pembayaran/2020-01-03/siapkan", {
          tok: a,
          method: "POST",
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call("/api/admin/pembayaran/bukan-tanggal/siapkan", {
          tok: a,
          method: "POST",
        })
      ).status,
    ).toBe(400);
  });
});

describe("Kantor Maya di server", () => {
  it("Mitra PLS hanya melihat akunnya sendiri", async () => {
    const [m1, m2] = [...engine.accounts.values()].filter(
      (a) => a.role === "mitra",
    );
    const tok = await token({ sub: "user_m", metadata: { mitraId: m1.code } });
    const r = await call("/api/mitra/ringkasan", { tok });
    expect(r).toMatchObject({
      status: 200,
      body: { id: m1.id, kode: m1.code },
    });
    expect(
      (await call(`/api/mitra/ringkasan?id=${m2.id}`, { tok })).status,
    ).toBe(403);
    expect(
      (
        await call("/api/mitra/ringkasan", {
          tok: await token({ sub: "user_n", metadata: { roles: ["direksi"] } }),
        })
      ).status,
    ).toBe(403);
  });
});

describe("Sumber peran dan konfigurasi", () => {
  const verify = async (t: string) => ({ sub: t, azp: ORIGIN });
  const h = (t: string) => ({ authorization: `Bearer ${t}` });

  it("tanpa klaim metadata: dibaca dari Backend API dengan cache; gagal = 503; tanpa sumber = tanpa peran", async () => {
    let calls = 0;
    let clock = 0;
    const auth = createAuthenticator({
      verify,
      metadata: async () => (calls++, { roles: ["keuangan"] }),
      cacheMs: 1000,
      clock: () => clock,
    });
    const r = await auth(h("u1"), "GET");
    expect(r.ok && r.session.claims.roles).toEqual(["keuangan"]);
    await auth(h("u1"), "GET");
    expect(calls).toBe(1);
    clock = 2000;
    await auth(h("u1"), "GET");
    expect(calls).toBe(2);

    const down = createAuthenticator({
      verify,
      metadata: async () => Promise.reject(new Error("jaringan")),
    });
    expect(await down(h("u2"), "GET")).toMatchObject({
      ok: false,
      status: 503,
      reason: "peran-tidak-terbaca",
    });

    const bare = await createAuthenticator({ verify })(h("u3"), "GET");
    expect(bare.ok && bare.session).toMatchObject({
      roleSource: "none",
      claims: { roles: [] },
    });
  });

  it("pengambilan token", () => {
    expect(extractToken({ authorization: "Bearer abc" })).toEqual({
      token: "abc",
      via: "header",
    });
    expect(extractToken({ authorization: "Basic abc" })).toBeNull();
    expect(extractToken({ cookie: "a=1; __session=xyz" })).toEqual({
      token: "xyz",
      via: "cookie",
    });
    expect(extractToken({ cookie: "__session_x=1" })).toBeNull();
  });

  it("server menolak konfigurasi tidak aman", () => {
    expect(readConfig({}).errors.length).toBe(2);
    expect(
      readConfig({
        CLERK_JWT_KEY: "pem",
        CLERK_AUTHORIZED_PARTIES: "https://mitrans.id/",
      }).errors[0],
    ).toMatch(/Asal tidak sah/);
    expect(
      readConfig({
        NODE_ENV: "production",
        CLERK_SECRET_KEY: "sk_test_x",
        CLERK_AUTHORIZED_PARTIES: "http://mitrans.id",
      }).errors,
    ).toHaveLength(2);
    expect(
      readConfig({
        CLERK_SECRET_KEY: "pk_test_x",
        CLERK_AUTHORIZED_PARTIES: "https://mitrans.id",
      }).errors[0],
    ).toMatch(/sk_test_/);
    expect(
      readConfig({
        CLERK_JWT_KEY: "pem",
        CLERK_AUTHORIZED_PARTIES: "https://mitrans.id, http://localhost:5173",
      }).errors,
    ).toEqual([]);
  });
});

describe("Langganan dan bayar dari bonus lewat server", () => {
  const DAY = 86_400_000;
  const nowAt = () => atWib(engine.today, 9);
  // Mitra PLS dengan saldo bonus cukup dan belum membayar periode berikutnya di muka.
  const pick = () =>
    [...engine.accounts.values()].find(
      (a) =>
        a.role === "mitra" &&
        a.licenseActivatedAt !== undefined &&
        engine.bonusBalance(a.id) >= PLAN.subscription.price &&
        (engine.accessUntil(a.id) ?? 0) - nowAt() <= 30 * DAY,
    )!;

  it("status Langganan dan saldo bonus hanya untuk akun sendiri", async () => {
    const acc = pick();
    const tok = await token({ sub: "user_lg", metadata: { mitraId: acc.id } });
    const r = await call("/api/mitra/langganan", { tok });
    expect(r.status).toBe(200);
    expect(r.body.saldoBonusBelumDitransfer).toBe(engine.bonusBalance(acc.id));
    expect(r.body.hargaLangganan).toBe(PLAN.subscription.price);
  });

  it("tanpa persetujuan eksplisit ditolak; dengan persetujuan memotong transfer Jumat", async () => {
    const acc = pick();
    const tok = await token({ sub: "user_lg2", metadata: { mitraId: acc.id } });
    const path = "/api/mitra/langganan/bayar-dari-bonus";
    expect((await call(path, { tok, method: "POST" })).status).toBe(400);
    expect((await call(path, { tok, method: "POST", body: '{"setuju": "ya"}' })).status).toBe(400);
    expect((await call(path, { tok, method: "POST", body: "{bukan json" })).status).toBe(400);
    expect((await call(path, { cookie: `__session=${tok}`, method: "POST", body: '{"setuju": true}' })).status).toBe(403);
    const before = engine.bonusBalance(acc.id);
    const r = await call(path, { tok, method: "POST", body: '{"setuju": true}' });
    expect(r.status).toBe(200);
    expect(engine.bonusBalance(acc.id)).toBe(before - PLAN.subscription.price);
    expect(r.body.potongan.reduce((a: number, d: { amount: number }) => a + d.amount, 0)).toBe(PLAN.subscription.price);
    // Periode berikutnya sudah dibayar: pembayaran kedua ditolak dengan alasan yang jelas.
    const again = await call(path, { tok, method: "POST", body: '{"setuju": true}' });
    expect(again.status).toBe(409);
  });

  it("staf tanpa tautan Mitra PLS tidak dapat membayar dari bonus", async () => {
    const tok = await token({ sub: "user_staf", metadata: { roles: ["keuangan"] } });
    expect((await call("/api/mitra/langganan/bayar-dari-bonus", { tok, method: "POST", body: '{"setuju": true}' })).status).toBe(403);
  });
});
