/**
 * Integrasi affiliatemarketing.network (MLM) dengan atlastrade.io (Lisensi). Keduanya milik
 * PT Mitra Transformasi Inteligensi dan memakai satu instance Clerk (domain satelit), jadi
 * pengguna cukup mendaftar dan memasukkan OTP sekali.
 *
 * 1. Tiket rujukan: tautan affiliatemarketing.network/r/KODE mengarahkan ke checkout atlastrade.io
 *    dengan tiket bertanda tangan HMAC berisi kode sponsor, nomor unik, dan masa berlaku. Tiket
 *    tidak membawa data pribadi dan tidak dapat diubah tanpa ketahuan.
 * 2. Webhook: atlastrade.io mengirim peristiwa pembayaran dan pengembalian dana ke server MLM,
 *    ditandatangani HMAC atas `${t}.${isi}` (header X-Atlas-Signature: t=<detik>,v1=<hex>).
 *    Peristiwa dengan nomor yang sama hanya diproses sekali (idempoten).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface ReferralTicket {
  /** Kode Mitra PLS pemilik tautan. */
  sponsor: string;
  /** Nomor unik tiket. */
  nonce: string;
  /** Diterbitkan (milidetik). */
  iat: number;
  /** Berakhir (milidetik). */
  exp: number;
}

/** Masa berlaku tiket: cukup untuk pembayaran lewat virtual account yang tidak langsung lunas. */
export const TICKET_TTL_MS = 72 * 3600_000;
/** Selisih waktu paling besar antara tanda tangan webhook dan jam server. */
export const WEBHOOK_TOLERANCE_S = 300;

const hmac = (secret: string, data: string) =>
  createHmac("sha256", secret).update(data).digest();

function sameBytes(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signTicket(t: ReferralTicket, secret: string): string {
  const body = Buffer.from(JSON.stringify(t)).toString("base64url");
  return `${body}.${hmac(secret, body).toString("base64url")}`;
}

export type TicketCheck =
  | { ok: true; ticket: ReferralTicket }
  | { ok: false; reason: "format" | "tanda-tangan" | "kedaluwarsa" };

export function verifyTicket(
  raw: string,
  secret: string,
  now: number,
): TicketCheck {
  const m = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(raw);
  if (!m) return { ok: false, reason: "format" };
  if (!sameBytes(Buffer.from(m[2], "base64url"), hmac(secret, m[1])))
    return { ok: false, reason: "tanda-tangan" };
  let t: ReferralTicket;
  try {
    t = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "format" };
  }
  if (
    typeof t?.sponsor !== "string" ||
    typeof t.nonce !== "string" ||
    typeof t.iat !== "number" ||
    typeof t.exp !== "number"
  )
    return { ok: false, reason: "format" };
  if (now > t.exp) return { ok: false, reason: "kedaluwarsa" };
  return { ok: true, ticket: t };
}

/** Header tanda tangan untuk isi `body` pada detik `t` (dipakai atlastrade.io dan oleh uji). */
export function signWebhook(body: string, secret: string, t: number): string {
  return `t=${t},v1=${hmac(secret, `${t}.${body}`).toString("hex")}`;
}

export type WebhookCheck =
  | { ok: true }
  | {
      ok: false;
      reason: "tanpa-tanda-tangan" | "tanda-tangan" | "kedaluwarsa";
    };

export function verifyWebhook(
  body: string,
  header: string | undefined,
  secret: string,
  nowS: number,
): WebhookCheck {
  if (!header) return { ok: false, reason: "tanpa-tanda-tangan" };
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !/^[0-9a-f]{64}$/.test(parts.v1 ?? ""))
    return { ok: false, reason: "tanda-tangan" };
  if (!sameBytes(Buffer.from(parts.v1, "hex"), hmac(secret, `${t}.${body}`)))
    return { ok: false, reason: "tanda-tangan" };
  if (Math.abs(nowS - t) > WEBHOOK_TOLERANCE_S)
    return { ok: false, reason: "kedaluwarsa" };
  return { ok: true };
}

/** Peristiwa dari atlastrade.io. Angka waktu dalam milidetik. */
export type AtlasEvent =
  | {
      id: string;
      type: "license.activated";
      data: {
        saleId: string;
        /** ID pengguna Clerk (sama di kedua domain). */
        userId: string;
        /** Diisi sekali di checkout; dipakai bila pembeli belum punya akun di MLM. */
        name?: string;
        nik?: string;
        /** Tiket rujukan yang dibawa dari affiliatemarketing.network, bila ada. */
        ticket?: string;
        paidAt?: number;
      };
    }
  | {
      id: string;
      type: "subscription.paid";
      data: { saleId: string; userId: string; paidAt?: number };
    }
  | {
      id: string;
      type: "sale.refunded";
      data: { saleId: string; refundedAt?: number };
    };

const str = (v: unknown, max = 128) =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const optNum = (v: unknown) =>
  v === undefined || (typeof v === "number" && Number.isFinite(v));

/** Memeriksa bentuk peristiwa; mengembalikan pesan galat bila tidak sah. */
export function parseEvent(v: unknown): AtlasEvent | string {
  const e = v as {
    id?: unknown;
    type?: unknown;
    data?: Record<string, unknown>;
  };
  if (
    !e ||
    typeof e !== "object" ||
    !str(e.id) ||
    !e.data ||
    typeof e.data !== "object"
  )
    return "Peristiwa harus berisi id dan data";
  const d = e.data;
  switch (e.type) {
    case "license.activated":
      if (!str(d.saleId) || !str(d.userId)) return "saleId dan userId wajib";
      if (d.name !== undefined && !str(d.name, 200)) return "name tidak sah";
      if (
        d.nik !== undefined &&
        !(typeof d.nik === "string" && /^\d{16}$/.test(d.nik))
      )
        return "NIK harus 16 digit";
      if (d.ticket !== undefined && !str(d.ticket, 1024))
        return "ticket tidak sah";
      if (!optNum(d.paidAt)) return "paidAt harus angka";
      break;
    case "subscription.paid":
      if (!str(d.saleId) || !str(d.userId)) return "saleId dan userId wajib";
      if (!optNum(d.paidAt)) return "paidAt harus angka";
      break;
    case "sale.refunded":
      if (!str(d.saleId)) return "saleId wajib";
      if (!optNum(d.refundedAt)) return "refundedAt harus angka";
      break;
    default:
      return "Jenis peristiwa tidak dikenal";
  }
  return e as AtlasEvent;
}
