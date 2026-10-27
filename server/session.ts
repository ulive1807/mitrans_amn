/**
 * Pemeriksaan sesi Clerk di server.
 *
 * Setiap permintaan API membawa token sesi Clerk (header `Authorization: Bearer …`, atau cookie `__session`
 * untuk permintaan baca dari domain yang sama). Token diverifikasi tanda tangannya, masa berlakunya, dan
 * asal (`azp`) dengan @clerk/backend. Peran TIDAK pernah diambil dari permintaan klien; peran dibaca dari
 * klaim `metadata` di token (bila token Clerk dikustomisasi) atau dari Clerk Backend API, lalu disaring
 * fail-closed oleh `claimsFromMetadata`.
 */
import type { IncomingHttpHeaders } from "node:http";
import { claimsFromMetadata, type Claims } from "../src/engine/claims";

export interface SessionPayload {
  sub: string;
  sid?: string;
  azp?: string;
  /** Status sesi pada token versi 2 Clerk ("active" atau "pending"). */
  sts?: string;
  /** Klaim kustom opsional: isi `{{user.public_metadata}}` dari pengaturan token sesi Clerk. */
  metadata?: unknown;
  [k: string]: unknown;
}

/** Memverifikasi token dan mengembalikan isinya; melempar galat bila tidak sah. */
export type VerifyFn = (token: string) => Promise<SessionPayload>;
/** Membaca publicMetadata pengguna dari Clerk Backend API. */
export type MetadataFn = (userId: string) => Promise<unknown>;

export type AuthFailure =
  | "tanpa-token"
  | "token-tidak-sah"
  | "token-kedaluwarsa"
  | "asal-tidak-diizinkan"
  | "sesi-belum-aktif"
  | "cookie-untuk-perubahan"
  | "peran-tidak-terbaca";

export interface Session {
  userId: string;
  sessionId?: string;
  claims: Claims;
  /** Dari mana peran dibaca. "none" berarti tidak ada sumber peran sehingga semua peran ditolak. */
  roleSource: "token" | "api" | "none";
}

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; status: 401 | 403 | 503; reason: AuthFailure };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function extractToken(
  headers: IncomingHttpHeaders,
): { token: string; via: "header" | "cookie" } | null {
  const auth = headers.authorization;
  if (typeof auth === "string") {
    const m = /^Bearer\s+(\S+)$/i.exec(auth.trim());
    return m ? { token: m[1], via: "header" } : null;
  }
  const cookie = headers.cookie;
  if (typeof cookie === "string") {
    for (const part of cookie.split(";")) {
      const i = part.indexOf("=");
      if (i > 0 && part.slice(0, i).trim() === "__session") {
        const v = part.slice(i + 1).trim();
        if (v) return { token: v, via: "cookie" };
      }
    }
  }
  return null;
}

function failureOf(err: unknown): AuthFailure {
  const reason = (err as { reason?: unknown } | null)?.reason;
  if (reason === "token-expired" || reason === "session-token-expired")
    return "token-kedaluwarsa";
  if (reason === "token-invalid-authorized-parties")
    return "asal-tidak-diizinkan";
  return "token-tidak-sah";
}

export interface AuthenticatorOptions {
  verify: VerifyFn;
  /** Dipakai bila token tidak membawa klaim `metadata`. Tanpa ini, pengguna tanpa klaim tidak punya peran. */
  metadata?: MetadataFn;
  /** Lama cache metadata per pengguna (milidetik). Pencabutan peran berlaku paling lambat setelah ini. */
  cacheMs?: number;
  clock?: () => number;
}

export type Authenticator = (
  headers: IncomingHttpHeaders,
  method: string,
) => Promise<AuthResult>;

export function createAuthenticator(opts: AuthenticatorOptions): Authenticator {
  const cacheMs = opts.cacheMs ?? 60_000;
  const clock = opts.clock ?? Date.now;
  const cache = new Map<string, { at: number; meta: unknown }>();

  return async (headers, method) => {
    const found = extractToken(headers);
    if (!found) return { ok: false, status: 401, reason: "tanpa-token" };
    // Cookie terkirim otomatis oleh peramban; perubahan data wajib memakai header agar tidak bisa dipicu dari situs lain (CSRF).
    if (found.via === "cookie" && !SAFE_METHODS.has(method.toUpperCase()))
      return { ok: false, status: 403, reason: "cookie-untuk-perubahan" };

    let payload: SessionPayload;
    try {
      payload = await opts.verify(found.token);
    } catch (err) {
      return { ok: false, status: 401, reason: failureOf(err) };
    }
    if (!payload || typeof payload.sub !== "string" || !payload.sub)
      return { ok: false, status: 401, reason: "token-tidak-sah" };
    if (payload.sts !== undefined && payload.sts !== "active")
      return { ok: false, status: 401, reason: "sesi-belum-aktif" };

    let meta: unknown;
    let roleSource: Session["roleSource"] = "none";
    if (payload.metadata !== undefined) {
      meta = payload.metadata;
      roleSource = "token";
    } else if (opts.metadata) {
      const hit = cache.get(payload.sub);
      if (hit && clock() - hit.at < cacheMs) meta = hit.meta;
      else {
        try {
          meta = await opts.metadata(payload.sub);
        } catch {
          // Gagal membaca peran: tolak, jangan menebak.
          return { ok: false, status: 503, reason: "peran-tidak-terbaca" };
        }
        cache.set(payload.sub, { at: clock(), meta });
      }
      roleSource = "api";
    }
    const claims =
      roleSource === "none"
        ? {
            roles: [],
            problems: [
              "Tidak ada sumber peran (klaim metadata atau CLERK_SECRET_KEY)",
            ],
          }
        : claimsFromMetadata(meta);
    return {
      ok: true,
      session: {
        userId: payload.sub,
        sessionId: payload.sid,
        claims,
        roleSource,
      },
    };
  };
}

export interface ClerkServerConfig {
  /** Kunci publik PEM dari dasbor Clerk: verifikasi tanpa jaringan. */
  jwtKey?: string;
  /** Secret key Clerk: hanya di server. Dipakai untuk JWKS (bila jwtKey kosong) dan membaca metadata. */
  secretKey?: string;
  /** Asal situs yang boleh memakai token, mis. https://mitrans.id. Wajib di produksi. */
  authorizedParties: string[];
}

/** Penghubung ke @clerk/backend. Dimuat dinamis agar uji dan mode tanpa Clerk tidak memerlukannya. */
export async function clerkAuthenticator(
  cfg: ClerkServerConfig,
): Promise<Authenticator> {
  const { verifyToken, createClerkClient } = await import("@clerk/backend");
  const verify: VerifyFn = async (token) =>
    (await verifyToken(token, {
      jwtKey: cfg.jwtKey,
      secretKey: cfg.jwtKey ? undefined : cfg.secretKey,
      authorizedParties: cfg.authorizedParties.length
        ? cfg.authorizedParties
        : undefined,
      clockSkewInMs: 5_000,
    })) as unknown as SessionPayload;
  const client = cfg.secretKey
    ? createClerkClient({ secretKey: cfg.secretKey })
    : undefined;
  const metadata: MetadataFn | undefined = client
    ? async (id) => (await client.users.getUser(id)).publicMetadata
    : undefined;
  return createAuthenticator({ verify, metadata });
}
