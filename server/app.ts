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
  EbookStore,
  Funnel,
  FUNNEL_LABEL,
  LEVEL_LABEL,
  upcomingSessions,
  maskNik as maskId,
  EBOOK_STATUS_LABEL,
  reminderFor,
  maskNik,
  atWib,
  demoScenario,
  runScenario,
  type MitransEngine,
  type Permission,
} from "../src/engine";
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Authenticator, Session } from "./session";
import {
  TICKET_TTL_MS,
  parseEvent,
  signTicket,
  verifyTicket,
  verifyWebhook,
  type AtlasEvent,
} from "./integration";

export interface AppOptions {
  authenticate: Authenticator;
  /** Asal yang boleh memanggil API lintas domain (biasanya sama dengan authorizedParties). */
  corsOrigins?: string[];
  engine?: MitransEngine;
  /** Integrasi dengan atlastrade.io. Tanpa ini, /r/:kode dan webhook tidak aktif. */
  integration?: {
    /** Rahasia tiket rujukan (dibagi dengan atlastrade.io untuk memeriksa tiket di checkout). */
    ticketSecret: string;
    /** Rahasia tanda tangan webhook dari atlastrade.io. */
    webhookSecret: string;
    /** Alamat checkout Lisensi, mis. https://www.atlastrade.io/checkout */
    checkoutUrl: string;
    /** Jam dinding (milidetik) untuk masa berlaku tiket dan tanda tangan; bawaan Date.now. */
    clock?: () => number;
  };
  /** E-book Mitra PLS (Agent Marketing). Bawaan: penyimpanan baru di memori. */
  ebooks?: EbookStore;
  /** Asesmen, kelas RT3, dan antrean WhatsApp pembeli e-book. */
  funnel?: Funnel;
  /** Kabar pembayaran e-book dari Xendit. Tanpa ini, rute kabar Xendit tidak aktif. */
  xendit?: { callbackToken: string };
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
  // ID pengguna Clerk → akun engine. Satu instance Clerk dipakai bersama atlastrade.io, jadi ID-nya sama.
  const accountByUser = new Map<string, string>();
  // Peristiwa webhook yang sudah diproses: nomor peristiwa → hasil (idempoten).
  const processed = new Map<string, unknown>();
  const integ = opts.integration;
  const ebooks = opts.ebooks ?? new EbookStore(engine);
  const funnel = opts.funnel ?? new Funnel(ebooks);
  const clock = integ?.clock ?? Date.now;
  const canSell = (acc: { role: string; quizPassed: boolean; terminated?: boolean; frozenUntil?: number }) =>
    acc.role === "mitra" && acc.quizPassed && !acc.terminated && !(acc.frozenUntil !== undefined && acc.frozenUntil > now());
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

  /** Tautan rujukan affiliatemarketing.network/r/KODE → checkout atlastrade.io dengan tiket bertanda tangan. */
  const referral = (code: string): { status: number; location?: string; body?: unknown } => {
    const acc = findMitra(code);
    if (!integ || !acc || !canSell(acc)) return { status: 404, body: { galat: "Tautan rujukan tidak aktif" } };
    const iat = clock();
    const ticket = signTicket({ sponsor: acc.code, nonce: randomUUID(), iat, exp: iat + TICKET_TTL_MS }, integ.ticketSecret);
    const url = new URL(integ.checkoutUrl);
    url.searchParams.set("t", ticket);
    return { status: 302, location: url.toString() };
  };

  const audit = (action: string, detail: string, allowed = true) =>
    access.audit.push({ at: now(), userId: "atlastrade.io", userName: "atlastrade.io", action, allowed, detail });

  /** Memproses satu peristiwa atlastrade.io. Galat engine dilempar sebagai 409 dan tidak dicatat sebagai sudah diproses. */
  const applyEvent = (ev: AtlasEvent) => {
    switch (ev.type) {
      case "license.activated": {
        const d = ev.data;
        const at = d.paidAt ?? now();
        let accId = accountByUser.get(d.userId);
        let rujukan: "akun" | "ebook" | "tiket" | "langsung" = "akun";
        let alasanTiket: string | undefined;
        if (!accId) {
          if (!d.name || !d.nik) throw new HttpError(422, "Pembeli baru: name dan nik wajib dikirim dari checkout");
          // Sponsor dikunci saat akun pertama dibuat. Tanpa tiket sah, penjualan dicatat sebagai penjualan langsung Perusahaan.
          let seller = "MITRANS-001";
          rujukan = "langsung";
          // Urutan: Sponsor yang terkunci dari pembelian e-book, lalu tiket rujukan, lalu penjualan langsung Perusahaan.
          const lock = ebooks.sponsorLocks.get(d.userId);
          const locked = lock ? findMitra(lock.sponsorId) : undefined;
          if (lock) {
            if (locked && canSell(locked)) {
              seller = locked.id;
              rujukan = "ebook";
            } else alasanTiket = "sponsor-ebook-tidak-aktif";
          } else if (d.ticket) {
            const t = verifyTicket(d.ticket, integ!.ticketSecret, clock());
            const sponsor = t.ok ? findMitra(t.ticket.sponsor) : undefined;
            if (!t.ok) alasanTiket = t.reason;
            else if (!sponsor || !canSell(sponsor)) alasanTiket = "sponsor-tidak-aktif";
            else {
              seller = sponsor.id;
              rujukan = "tiket";
            }
          }
          if (engine.sales.has(d.saleId)) throw new HttpError(409, `Penjualan ${d.saleId} sudah ada`);
          accId = engine.registerPelanggan({ id: `U-${d.userId}`, name: d.name, nik: d.nik, sellerId: seller, at }).id;
          accountByUser.set(d.userId, accId);
        }
        const sale = engine.purchaseLicense({ saleId: d.saleId, buyerId: accId, at });
        return { akun: accId, penjualan: sale.id, penjual: sale.sellerId, rujukan, ...(alasanTiket ? { tiketDitolak: alasanTiket } : {}) };
      }
      case "subscription.paid": {
        const accId = accountByUser.get(ev.data.userId);
        if (!accId) throw new HttpError(409, "Pengguna belum dikenal di sistem Mitra PLS");
        if (engine.sales.has(ev.data.saleId)) throw new HttpError(409, `Penjualan ${ev.data.saleId} sudah ada`);
        const sale = engine.paySubscription({ saleId: ev.data.saleId, accountId: accId, at: ev.data.paidAt ?? now() });
        return { akun: accId, penjualan: sale.id, aksesSampai: sale.periodEnd };
      }
      case "sale.refunded": {
        if (!engine.sales.has(ev.data.saleId)) throw new HttpError(409, `Penjualan ${ev.data.saleId} tidak dikenal`);
        const r = engine.refundSale(ev.data.saleId, ev.data.refundedAt ?? now());
        return { penjualan: ev.data.saleId, bonusDitarik: r.clawedBack, perluTinjauan: r.needsReview };
      }
    }
  };

  const webhook = async (req: IncomingMessage) => {
    if (!integ) throw new HttpError(404, "Tidak ditemukan");
    const raw = await readBody(req);
    const sig = req.headers["x-atlas-signature"];
    const check = verifyWebhook(raw, typeof sig === "string" ? sig : undefined, integ.webhookSecret, Math.floor(clock() / 1000));
    if (!check.ok) {
      audit("Webhook atlastrade.io ditolak", check.reason, false);
      throw new HttpError(401, "Tanda tangan webhook tidak sah");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Isi permintaan bukan JSON yang sah");
    }
    const ev = parseEvent(parsed);
    if (typeof ev === "string") throw new HttpError(400, ev);
    if (processed.has(ev.id)) return { ...(processed.get(ev.id) as object), duplikat: true };
    try {
      const result = { peristiwa: ev.id, jenis: ev.type, ...applyEvent(ev) };
      processed.set(ev.id, result);
      audit(`Webhook ${ev.type}`, `${ev.id}: ${JSON.stringify(result)}`);
      return result;
    } catch (err) {
      if (err instanceof EngineError) throw new HttpError(409, err.message);
      throw err;
    }
  };

  /** Kabar Xendit untuk pesanan e-book. Diverifikasi dengan token callback (header x-callback-token). */
  const xenditEbook = async (req: IncomingMessage) => {
    if (!opts.xendit) throw new HttpError(404, "Tidak ditemukan");
    const tok = req.headers["x-callback-token"];
    const a = Buffer.from(typeof tok === "string" ? tok : "");
    const b = Buffer.from(opts.xendit.callbackToken);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      audit("Kabar Xendit ditolak", "token callback salah", false);
      throw new HttpError(401, "Token callback tidak sah");
    }
    const body = (await readJson(req)) as { external_id?: unknown; status?: unknown; paid_amount?: unknown } | undefined;
    if (!body || typeof body.external_id !== "string") throw new HttpError(400, "external_id wajib");
    if (body.status !== "PAID" && body.status !== "SETTLED") return { pesanan: body.external_id, diabaikan: true, status: body.status };
    if (typeof body.paid_amount !== "number") throw new HttpError(400, "paid_amount wajib");
    try {
      const r = ebooks.markPaid(body.external_id, body.paid_amount, now(), { isExistingAccount: (u) => accountByUser.has(u) });
      if (r.newLock) audit("Sponsor dikunci dari pembelian e-book", `${r.order.userId} → ${r.lock!.sponsorId} (${r.order.id})`);
      funnel.onPaid(r.order.id, now());
      return { pesanan: r.order.id, status: r.order.status, sponsorTerkunci: r.lock?.sponsorId ?? null, kunciBaru: r.newLock };
    } catch (err) {
      if (err instanceof EngineError) throw new HttpError(409, err.message);
      throw err;
    }
  };

  const ebookInput = (body: unknown) => {
    const b = (body ?? {}) as Record<string, unknown>;
    return {
      title: String(b.judul ?? ""),
      summary: String(b.ringkasan ?? ""),
      price: typeof b.harga === "number" ? b.harga : NaN,
      lpHeadline: String(b.judulHalaman ?? ""),
      lpBody: String(b.isiHalaman ?? ""),
      webinarOffer: b.tawaranWebinar === true,
    };
  };
  const ebookView = (e: ReturnType<EbookStore["forMitra"]>[number]) => ({
    id: e.id,
    slug: e.slug,
    judul: e.title,
    harga: e.price,
    status: e.status,
    statusLabel: EBOOK_STATUS_LABEL[e.status],
    versi: e.version,
    tanda: e.flags,
    riwayat: e.history,
    tautan: e.status === "disetujui" ? `https://affiliatemarketing.network/e/${e.slug}` : null,
    berkas: e.file ? { nama: e.file.name, ukuran: e.file.size } : null,
  });
  const guardEngine = <T,>(fn: () => T): T => {
    try {
      return fn();
    } catch (err) {
      if (err instanceof EngineError) throw new HttpError(409, err.message);
      throw err;
    }
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
          dihapusPada: c.writeOffDate,
          sudahDihapus: c.writtenOff,
        })),
        piutangPenarikan: engine.clawbackOutstanding(acc.id),
      };
    }),
    // Pembayaran hak lain Mitra PLS: piutang penarikan dipotong lebih dulu, sisanya dibayarkan. Nilai dihitung server.
    route("POST", "/api/admin/hak-lain", "pembayaran.siapkan", "Catat pembayaran hak lain", ({ session, body }) => {
      const b = (body ?? {}) as { mitraId?: unknown; jenis?: unknown; nominal?: unknown };
      const jenis = b.jenis;
      if (typeof b.mitraId !== "string" || !findMitra(b.mitraId)) throw new HttpError(400, "mitraId tidak dikenal");
      if (jenis !== "pembelian_kembali" && jenis !== "pengembalian_dana" && jenis !== "lainnya") throw new HttpError(400, "jenis hak tidak sah");
      if (typeof b.nominal !== "number") throw new HttpError(400, "nominal harus angka");
      const acc = findMitra(b.mitraId)!;
      try {
        const r = engine.recordOtherEntitlement({ id: `HAK-${engine.otherEntitlements.length + 1}`, accountId: acc.id, kind: jenis, amount: b.nominal, at: now() });
        access.record(session.userId, "Pembayaran hak lain dicatat", now(), `${acc.id}: ${b.nominal} (piutang ${r.offset}, dibayar ${r.paid})`);
        return { menutupPiutang: r.offset, dibayarkan: r.paid };
      } catch (err) {
        if (err instanceof EngineError) throw new HttpError(409, err.message);
        throw err;
      }
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
        // Saldo aman = belum ditransfer − bonus dalam masa pembatalan − piutang penarikan − kekurangan transfer.
        rincianSaldo: engine.bonusBalanceDetail(acc.id),
        bisaBayarDariBonus: engine.bonusBalance(acc.id) >= PLAN.subscription.price,
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
    // Agent Marketing: e-book milik Mitra PLS. Akun selalu dari sesi.
    route("GET", "/api/mitra/ebook", "mitra", "Lihat e-book sendiri", ({ session }) => {
      const acc = ownMitra(session);
      return {
        ebook: ebooks.forMitra(acc.id).map(ebookView),
        calonPengguna: ebooks.lockedProspects(acc.id).length,
      };
    }),
    route("POST", "/api/mitra/ebook", "mitra", "Buat e-book", ({ session, body }) => {
      const acc = ownMitra(session);
      return ebookView(guardEngine(() => ebooks.create(acc.id, ebookInput(body), now())));
    }),
    route("POST", "/api/mitra/ebook/:id", "mitra", "Ubah e-book", ({ session, params, body }) => {
      const acc = ownMitra(session);
      return ebookView(guardEngine(() => ebooks.update(params.id, acc.id, ebookInput(body), now())));
    }),
    route("POST", "/api/mitra/ebook/:id/ajukan", "mitra", "Ajukan e-book", ({ session, params }) => {
      const acc = ownMitra(session);
      return ebookView(guardEngine(() => ebooks.submit(params.id, acc.id, now())));
    }),
    route("GET", "/api/admin/ebook", "konten.tinjau", "Lihat antrean e-book", () =>
      ebooks.queue().map((e) => ({ ...ebookView(e), mitra: e.mitraId, ringkasan: e.summary, judulHalaman: e.lpHeadline, isiHalaman: e.lpBody })),
    ),
    route("POST", "/api/admin/ebook/:id/putuskan", "konten.tinjau", "Putuskan e-book", ({ session, params, body }) => {
      const b = (body ?? {}) as { keputusan?: unknown; catatan?: unknown };
      if (b.keputusan !== "setujui" && b.keputusan !== "revisi" && b.keputusan !== "tolak" && b.keputusan !== "tarik")
        throw new HttpError(400, "keputusan harus setujui, revisi, tolak, atau tarik");
      const note = typeof b.catatan === "string" ? b.catatan : undefined;
      const e = guardEngine(() =>
        b.keputusan === "tarik"
          ? ebooks.withdraw(params.id, session.userId, note ?? "", now())
          : ebooks.review(params.id, session.userId, b.keputusan as "setujui" | "revisi" | "tolak", note, now()),
      );
      access.record(session.userId, `E-book ${b.keputusan}`, now(), `${e.id} (${e.mitraId})${note ? `: ${note}` : ""}`);
      return ebookView(e);
    }),
    // CUB memesan e-book dari LP setelah masuk dengan OTP; akun pembeli selalu dari sesi.
    route("POST", "/api/ebook/:slug/pesan", "sesi", "Pesan e-book", ({ session, params, body }) => {
      const b = (body ?? {}) as Record<string, unknown>;
      const o = guardEngine(() =>
        ebooks.order(params.slug, { userId: session.userId, name: String(b.nama ?? ""), email: String(b.surel ?? ""), whatsapp: String(b.whatsapp ?? ""), waConsent: b.setujuWhatsapp === true }, now()),
      );
      // Prototipe: invoice Xendit belum dibuat; di produksi external_id invoice = nomor pesanan ini.
      return { pesanan: o.id, harga: o.price, status: o.status };
    }),
    route("POST", "/api/mitra/ebook/:id/berkas", "mitra", "Unggah berkas e-book", ({ session, params, body }) => {
      const acc = ownMitra(session);
      const b = (body ?? {}) as Record<string, unknown>;
      // Prototipe: hanya data berkas; berkasnya sendiri diunggah ke penyimpanan objek (belum disambungkan).
      return ebookView(guardEngine(() => ebooks.attachFile(params.id, acc.id, { name: String(b.nama ?? ""), size: Number(b.ukuran), sha256: String(b.sha256 ?? "") }, now())));
    }),
    // Pembeli e-book: hanya pesanan miliknya sendiri (akun dari sesi).
    route("GET", "/api/saya/ebook", "sesi", "Lihat e-book yang dibeli", ({ session }) =>
      [...ebooks.orders.values()]
        .filter((o) => o.userId === session.userId)
        .map((o) => {
          const a = funnel.assessments.get(o.id);
          const b = funnel.bookings.get(o.id);
          return {
            pesanan: o.id,
            judul: ebooks.ebooks.get(o.ebookId)?.title,
            tahap: funnel.stage(o.id),
            tahapLabel: FUNNEL_LABEL[funnel.stage(o.id)],
            tingkatBelajar: a ? LEVEL_LABEL[a.level] : null,
            kelas: b?.sessionId ?? null,
            bisaUnduh: funnel.canDownload(o.id, session.userId).ok,
          };
        }),
    ),
    route("GET", "/api/rt3/kelas", "sesi", "Lihat jadwal kelas RT3", () =>
      upcomingSessions(now()).map((s) => ({ ...s, terisi: funnel.seatsTaken(s.id) })),
    ),
    route("POST", "/api/saya/ebook/:order/asesmen", "sesi", "Isi asesmen", ({ session, params, body }) => {
      const r = guardEngine(() => funnel.submitAssessment(params.order, session.userId, ((body ?? {}) as { jawaban?: Record<string, number> }).jawaban ?? {}, now()));
      return { tingkatBelajar: LEVEL_LABEL[r.level], bisaUnduh: funnel.canDownload(params.order, session.userId).ok };
    }),
    route("POST", "/api/saya/ebook/:order/kelas", "sesi", "Pilih kelas RT3", ({ session, params, body }) => {
      const r = guardEngine(() => funnel.chooseClass(params.order, session.userId, String(((body ?? {}) as { kelas?: unknown }).kelas ?? ""), now()));
      return { kelas: r.session.id, hari: r.session.dayLabel, tanggal: r.session.date, mulai: r.session.startsAt };
    }),
    route("GET", "/api/saya/ebook/:order/unduh", "sesi", "Unduh e-book", ({ session, params }) => {
      const c = funnel.canDownload(params.order, session.userId);
      if (!c.ok) throw new HttpError(403, c.reason!);
      const eb = ebooks.ebooks.get(ebooks.orders.get(params.order)!.ebookId)!;
      // Prototipe: produksi mengembalikan tautan unduh bertanda tangan yang berlaku singkat.
      return { berkas: eb.file!.name, ukuran: eb.file!.size, sha256: eb.file!.sha256 };
    }),
    route("POST", "/api/admin/rt3/:sesi/hadir", "kelas.kelola", "Catat kehadiran RT3", ({ session, params, body }) => {
      const ids = ((body ?? {}) as { pesanan?: unknown }).pesanan;
      if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) throw new HttpError(400, "pesanan harus daftar nomor pesanan");
      const n = guardEngine(() => funnel.markAttendance(params.sesi, ids as string[], now()));
      access.record(session.userId, "Kehadiran RT3 dicatat", now(), `${params.sesi}: ${n} peserta`);
      return { hadir: n };
    }),
    route("GET", "/api/admin/whatsapp", "kelas.kelola", "Lihat antrean WhatsApp", () =>
      funnel.wa.messages.slice(-200).map((m) => ({ ...m, to: maskId(m.to) })),
    ),
    // Aktivasi afiliasi (tombol di atlastrade.io membuka halaman ini dengan sesi Clerk yang sama).
    route("POST", "/api/aktivasi-afiliasi", "sesi", "Aktivasi afiliasi", ({ session, body }) => {
      const b = (body ?? {}) as { setuju?: unknown; nama?: unknown; nik?: unknown };
      if (b.setuju !== true) throw new HttpError(400, "Setujui Kode Etik dan Syarat dan Ketentuan Kemitraan: kirim {\"setuju\": true}");
      const accId = accountByUser.get(session.userId);
      const existing = accId ? engine.accounts.get(accId) : undefined;
      if (existing?.role === "mitra") return { akun: existing.id, kode: existing.code, status: "sudah Mitra PLS" };
      if (existing?.role === "pelanggan") {
        // Pemegang Lisensi: konversi dalam 60 hari, posisi di bawah Sponsor yang sama, Bonus Sponsor tidak dibayar lagi.
        const acc = guardEngine(() => engine.convertCustomer({ customerId: existing.id, at: now() }));
        access.record(session.userId, "Aktivasi afiliasi (konversi)", now(), acc.id);
        return { akun: acc.id, kode: acc.code, status: "dikonversi", langkahBerikutnya: ["Lulus kuis Kode Etik untuk mengaktifkan tautan", "Ikuti workshop 2 hari (tanpa biaya)", "Lengkapi data rekening di Kantor Maya"] };
      }
      // Belum punya akun: pendaftaran gratis tanpa membeli Lisensi. Sponsor dari pembelian e-book bila ada.
      if (typeof b.nama !== "string" || !b.nama.trim() || typeof b.nik !== "string") throw new HttpError(422, "Pendaftaran baru: nama dan NIK wajib");
      const lock = ebooks.sponsorLocks.get(session.userId);
      const sponsor = lock && findMitra(lock.sponsorId) && canSell(findMitra(lock.sponsorId)!) ? lock.sponsorId : "MITRANS-001";
      const acc = guardEngine(() => engine.registerMitra({ id: `U-${session.userId}`, name: b.nama as string, nik: b.nik as string, sponsorId: sponsor, at: now() }));
      accountByUser.set(session.userId, acc.id);
      access.record(session.userId, "Pendaftaran Mitra PLS gratis", now(), `${acc.id} (Sponsor ${sponsor})`);
      return { akun: acc.id, kode: acc.code, status: "terdaftar", sponsor, langkahBerikutnya: ["Lulus kuis Kode Etik untuk mengaktifkan tautan", "Masa pertimbangan 10 hari kerja", "Ikuti workshop 2 hari (tanpa biaya)"] };
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
      // Rute publik integrasi: tidak memakai sesi Clerk.
      const ref = /^\/r\/([A-Za-z0-9-]{1,32})$/.exec(url.pathname);
      if (ref && method === "GET") {
        const r = referral(ref[1]);
        if (r.location) {
          res.writeHead(302, { Location: r.location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
          res.end();
          return;
        }
        return send(req, res, r.status, r.body);
      }
      const lp = /^\/e\/([a-z0-9-]{1,64})$/.exec(url.pathname);
      if (lp && method === "GET") {
        const e = ebooks.live(lp[1], now());
        if (!e) return send(req, res, 404, { galat: "Halaman penawaran tidak tersedia" });
        return send(req, res, 200, { slug: e.slug, judul: e.title, ringkasan: e.summary, harga: e.price, judulHalaman: e.lpHeadline, isiHalaman: e.lpBody, tawaranWebinar: e.webinarOffer, penjual: findMitra(e.mitraId)?.code });
      }
      if (url.pathname === "/api/integrasi/xendit/ebook") {
        if (method !== "POST") return send(req, res, 405, { galat: "Metode tidak diizinkan" });
        return send(req, res, 200, await xenditEbook(req));
      }
      if (url.pathname === "/api/integrasi/atlastrade") {
        if (method !== "POST") return send(req, res, 405, { galat: "Metode tidak diizinkan" });
        return send(req, res, 200, await webhook(req));
      }

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
      if (session.claims.mitraId) {
        const acc = findMitra(session.claims.mitraId);
        if (acc) accountByUser.set(session.userId, acc.id);
      }

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

/** Membaca isi permintaan apa adanya, paling besar 8 KB. */
async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 8192) throw new HttpError(413, "Isi permintaan terlalu besar");
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Membaca isi JSON permintaan, paling besar 8 KB. Isi kosong dibaca sebagai undefined. */
async function readJson(req: IncomingMessage): Promise<unknown> {
  const text = (await readBody(req)).trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Isi permintaan bukan JSON yang sah");
  }
}
