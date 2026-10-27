/**
 * API server prototipe. Setiap rute di bawah /api (kecuali /api/kesehatan) memerlukan sesi Clerk yang sah,
 * lalu memeriksa izin dengan ROLE_PERMISSIONS yang sama dengan antarmuka. Data masih sintetis (demoScenario).
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  AccessControl,
  AccessError,
  EngineError,
  PLAN,
  PayoutApprovals,
  reminderFor,
  maskNik,
  atWib,
  demoScenario,
  runScenario,
  type MitransEngine,
  type Permission,
} from "../src/engine";
import type { Authenticator, Session } from "./session";

export interface AppOptions {
  authenticate: Authenticator;
  /** Asal yang boleh memanggil API lintas domain (biasanya sama dengan authorizedParties). */
  corsOrigins?: string[];
  engine?: MitransEngine;
}

type Handler = (ctx: Ctx) => unknown;
interface Ctx {
  session: Session;
  params: Record<string, string>;
  query: URLSearchParams;
  /** Isi JSON permintaan POST (paling besar 8 KB). */
  body: unknown;
}
interface Route {
  method: "GET" | "POST";
  pattern: RegExp;
  keys: string[];
  /** Izin yang wajib; "mitra" berarti sesi harus tertaut ke Mitra PLS. */
  need: Permission | "mitra" | "sesi";
  action: string;
  run: Handler;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function route(
  method: Route["method"],
  path: string,
  need: Route["need"],
  action: string,
  run: Handler,
): Route {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" +
      path.replace(/:([a-z]+)/g, (_, k: string) => {
        keys.push(k);
        return "([^/]+)";
      }) +
      "$",
  );
  return { method, pattern, keys, need, action, run };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function createApp(opts: AppOptions) {
  const engine = opts.engine ?? runScenario(demoScenario()).engine;
  const access = new AccessControl();
  const payouts = new PayoutApprovals(access);
  const now = () => atWib(engine.today, 9);
  const lastMonth = () => engine.reports[engine.reports.length - 1]?.month;

  let bonusPayments = 0;
  const ownMitra = (session: Session) => {
    const acc = findMitra(session.claims.mitraId!);
    if (!acc) throw new HttpError(404, "Akun Mitra PLS yang ditautkan tidak ditemukan");
    return acc;
  };
  const findMitra = (key: string) => {
    const acc =
      engine.accounts.get(key) ??
      [...engine.accounts.values()].find((a) => a.code === key);
    return acc && acc.role === "mitra" ? acc : undefined;
  };

  const runFor = (date: string) => {
    if (!DATE.test(date)) throw new HttpError(400, "Tanggal tidak sah");
    const r = engine.payoutRuns().find((x) => x.date === date);
    if (!r)
      throw new HttpError(404, "Tidak ada berkas transfer pada tanggal itu");
    return r;
  };

  const routes: Route[] = [
    route("GET", "/api/saya", "sesi", "Periksa sesi", ({ session }) => ({
      userId: session.userId,
      roles: session.claims.roles,
      mitraId: session.claims.mitraId ?? null,
      izin: [...access.permissions(session.userId)],
      sumberPeran: session.roleSource,
      masalah: session.claims.problems,
    })),
    route(
      "GET",
      "/api/admin/ikhtisar",
      "ikhtisar.lihat",
      "Lihat ikhtisar",
      () => {
        const r = engine.reports[engine.reports.length - 1];
        return {
          bulan: r.month,
          mitraAktif: r.activeMitra,
          totalMitra: r.totalMitra,
          lisensiTerjual: r.licensesSold,
          planAPersen: r.planAPct,
          planBPersen: r.planBPct,
          planAPlafonTerpicu: r.planACapTriggered,
        };
      },
    ),
    route(
      "GET",
      "/api/admin/pembayaran",
      "pembayaran.lihat",
      "Lihat pembayaran Jumat",
      () =>
        engine
          .payoutRuns()
          .slice(-8)
          .map((r) => {
            const b = payouts.get(r.date, r.transfer, r.count);
            return {
              tanggal: r.date,
              bonus: r.total,
              potongan: r.deducted,
              transfer: r.transfer,
              entri: r.count,
              status: b.status,
              disiapkanOleh: b.preparedBy ?? null,
              disetujuiOleh: b.approvedBy ?? null,
            };
          }),
    ),
    // Nilai berkas dihitung server dari ledger; klien tidak mengirim angka.
    route(
      "POST",
      "/api/admin/pembayaran/:date/siapkan",
      "pembayaran.siapkan",
      "Siapkan berkas transfer",
      ({ session, params }) => {
        const r = runFor(params.date);
        const b = payouts.prepare(
          r.date,
          r.transfer,
          r.count,
          session.userId,
          now(),
        );
        return { tanggal: b.date, status: b.status };
      },
    ),
    route(
      "POST",
      "/api/admin/pembayaran/:date/setujui",
      "pembayaran.setujui",
      "Setujui berkas transfer",
      ({ session, params }) => {
        runFor(params.date);
        const b = payouts.approve(params.date, session.userId, now());
        return { tanggal: b.date, status: b.status };
      },
    ),
    route("GET", "/api/admin/audit", "audit.lihat", "Lihat log audit", () =>
      access.audit.slice(-200).reverse(),
    ),
    route(
      "GET",
      "/api/mitra/ringkasan",
      "mitra",
      "Lihat Kantor Maya",
      ({ session, query }) => {
        const acc = findMitra(session.claims.mitraId!);
        if (!acc)
          throw new HttpError(
            404,
            "Akun Mitra PLS yang ditautkan tidak ditemukan",
          );
        const asked = query.get("id");
        if (asked && asked !== acc.id && asked !== acc.code) {
          access.audit.push({
            at: now(),
            userId: session.userId,
            userName: session.userId,
            action: "Lihat Kantor Maya akun lain",
            allowed: false,
            detail: asked,
          });
          throw new HttpError(
            403,
            "Mitra PLS hanya dapat melihat akunnya sendiri",
          );
        }
        let diterima = 0;
        for (const e of engine.entriesFor(acc.id))
          if (e.status === "payable" || e.status === "clawback")
            diterima += e.amount;
        const m = lastMonth();
        const ranks = acc.ranksAchieved;
        return {
          id: acc.id,
          kode: acc.code,
          nama: acc.name,
          peringkat: ranks?.length ? ranks[ranks.length - 1].rank : null,
          aktifBulanTerakhir: m ? engine.isActive(acc.id, m) : false,
          totalDiterima: diterima,
        };
      },
    ),
    // Rincian PPh 21 dan penarikan bonus milik sendiri; masa dari query (YYYY-MM).
    route("GET", "/api/mitra/pajak", "mitra", "Lihat pajak dan penarikan", ({ session, query }) => {
      const acc = ownMitra(session);
      const masa = query.get("masa");
      if (masa !== null && !/^\d{4}-\d{2}$/.test(masa)) throw new HttpError(400, "Masa pajak harus YYYY-MM");
      const b = masa ? engine.buktiPotong(acc.id, masa) : undefined;
      return {
        buktiPotong: b ? { ...b, nik: maskNik(b.nik) } : null,
        penarikan: engine.clawbackStatus(acc.id).map((c) => ({
          tanggal: c.entry.accruedAt,
          jenis: c.entry.type,
          nominal: c.amount,
          dipotong: c.offsets,
          sisa: c.outstanding,
        })),
        piutangPenarikan: engine.clawbackOutstanding(acc.id),
      };
    }),
    // Rekap PPh 21 satu masa untuk Keuangan; NIK tersamar.
    route("GET", "/api/admin/pph/:masa", "pembayaran.lihat", "Lihat rekap PPh 21", ({ params }) => {
      if (!/^\d{4}-\d{2}$/.test(params.masa)) throw new HttpError(400, "Masa pajak harus YYYY-MM");
      const list = engine.buktiPotongMasa(params.masa).map((b) => ({ ...b, nik: maskNik(b.nik) }));
      return {
        masa: params.masa,
        penerima: list.length,
        pph21: list.reduce((a, b) => a + b.tax, 0),
        brutoKenaPajak: list.reduce((a, b) => a + b.taxable, 0),
        rincian: list,
      };
    }),
    route("GET", "/api/mitra/langganan", "mitra", "Lihat Langganan", ({ session }) => {
      const acc = ownMitra(session);
      const until = engine.accessUntil(acc.id);
      const r = reminderFor(engine, acc.id, now());
      return {
        aksesSampai: until ?? null,
        hargaLangganan: PLAN.subscription.price,
        saldoBonusBelumDitransfer: engine.bonusBalance(acc.id),
        jadwalTransfer: engine.pendingPayouts(acc.id),
        pengingat: r ? { tahap: r.stage, jatuhTempo: r.dueDate, pesan: r.message } : null,
      };
    }),
    // Bayar Langganan dari bonus: akun selalu dari sesi, bukan dari permintaan; wajib persetujuan eksplisit.
    route("POST", "/api/mitra/langganan/bayar-dari-bonus", "mitra", "Bayar Langganan dari bonus", ({ session, body }) => {
      const acc = ownMitra(session);
      if (!body || typeof body !== "object" || (body as { setuju?: unknown }).setuju !== true)
        throw new HttpError(400, "Persetujuan potong bonus diperlukan: kirim {\"setuju\": true}");
      try {
        const sale = engine.paySubscriptionFromBonus({ saleId: `SB-${acc.id}-${++bonusPayments}`, accountId: acc.id, at: now() });
        access.record(session.userId, "Bayar Langganan dari bonus", now(), `${acc.id}: ${sale.id}`);
        return { penjualan: sale.id, aksesSampai: sale.periodEnd, potongan: engine.payoutDeductions.filter((d) => d.saleId === sale.id) };
      } catch (err) {
        if (err instanceof EngineError) throw new HttpError(409, err.message);
        throw err;
      }
    }),
  ];

  const send = (
    req: IncomingMessage,
    res: ServerResponse,
    status: number,
    body: unknown,
  ) => {
    const origin = req.headers.origin;
    if (origin && opts.corsOrigins?.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };

  return async function handle(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = (req.method ?? "GET").toUpperCase();
    try {
      if (method === "OPTIONS") {
        const origin = req.headers.origin;
        if (origin && opts.corsOrigins?.includes(origin)) {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
            "Access-Control-Max-Age": "600",
            Vary: "Origin",
          });
        } else res.writeHead(403);
        res.end();
        return;
      }
      if (url.pathname === "/api/kesehatan")
        return send(req, res, 200, { ok: true });

      const candidates = routes.filter((r) => r.pattern.test(url.pathname));
      if (!candidates.length)
        return send(req, res, 404, { galat: "Tidak ditemukan" });
      const r = candidates.find((x) => x.method === method);
      if (!r) return send(req, res, 405, { galat: "Metode tidak diizinkan" });

      const auth = await opts.authenticate(req.headers, method);
      if (!auth.ok)
        return send(req, res, auth.status, {
          galat: "Sesi tidak sah",
          alasan: auth.reason,
        });
      const { session } = auth;

      // Cerminkan pengguna Clerk ke AccessControl dengan peran dari server (bukan dari klien).
      const prev = access.users.get(session.userId);
      if (!prev || prev.roles.join() !== session.claims.roles.join())
        access.addUser({
          id: session.userId,
          name: prev?.name ?? session.userId,
          title: "Akun Clerk",
          roles: [...session.claims.roles],
          active: true,
        });

      const m = r.pattern.exec(url.pathname)!;
      const params = Object.fromEntries(
        r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]),
      );
      if (r.need === "mitra") {
        if (!session.claims.mitraId) {
          access.audit.push({
            at: now(),
            userId: session.userId,
            userName: session.userId,
            action: r.action,
            allowed: false,
            detail: "tidak tertaut ke Mitra PLS",
          });
          return send(req, res, 403, {
            galat: "Akun belum ditautkan ke Mitra PLS",
          });
        }
      } else if (r.need !== "sesi")
        access.require(session.userId, r.need, r.action, now(), url.pathname);

      return send(
        req,
        res,
        200,
        await r.run({ session, params, query: url.searchParams, body: method === "POST" ? await readJson(req) : undefined }),
      );
    } catch (err) {
      if (err instanceof HttpError)
        return send(req, res, err.status, { galat: err.message });
      if (err instanceof AccessError)
        return send(req, res, 403, { galat: err.message });
      console.error("Galat server", err instanceof Error ? err.message : err);
      return send(req, res, 500, { galat: "Galat server" });
    }
  };
}

/** Membaca isi JSON permintaan, paling besar 8 KB. Isi kosong dibaca sebagai undefined. */
async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 8192) throw new HttpError(413, "Isi permintaan terlalu besar");
    chunks.push(c as Buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Isi permintaan bukan JSON yang sah");
  }
}
