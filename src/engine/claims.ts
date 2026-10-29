/**
 * Membaca peran dari Clerk `publicMetadata` secara fail-closed.
 *
 * `publicMetadata` hanya dapat diubah dari server (Clerk Backend API / dasbor Clerk), tidak dari peramban,
 * sehingga aman dipakai sebagai sumber peran. Bentuk yang diharapkan:
 *   { "roles": ["kepatuhan"], "mitraId": "M123" }
 * Aturan:
 * - Data yang bukan objek, peran yang tidak dikenal, atau mitraId yang tidak sah diabaikan dan dilaporkan.
 * - Bila peran yang diminta melanggar pemisahan tugas, SEMUA peran staf ditolak (bukan dipilih salah satu).
 */
import { CONFLICTING_ROLES, ROLE_LABEL, type Role } from './access';

export interface Claims {
  roles: Role[];
  mitraId?: string;
  problems: string[];
}

const KNOWN = new Set(Object.keys(ROLE_LABEL));

export function claimsFromMetadata(meta: unknown): Claims {
  const problems: string[] = [];
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return { roles: [], problems: meta == null ? [] : ['publicMetadata bukan objek'] };
  const m = meta as Record<string, unknown>;
  let roles: Role[] = [];
  if (m.roles !== undefined) {
    if (!Array.isArray(m.roles)) problems.push('roles harus berupa daftar');
    else {
      for (const r of m.roles) {
        if (typeof r === 'string' && KNOWN.has(r)) {
          if (!roles.includes(r as Role)) roles.push(r as Role);
        } else problems.push(`Peran tidak dikenal diabaikan: ${String(r)}`);
      }
    }
  }
  for (const [a, b] of CONFLICTING_ROLES) {
    if (roles.includes(a) && roles.includes(b)) {
      problems.push(`${ROLE_LABEL[a]} dan ${ROLE_LABEL[b]} tidak boleh dirangkap; semua peran staf ditolak sampai diperbaiki`);
      roles = [];
      break;
    }
  }
  let mitraId: string | undefined;
  if (m.mitraId !== undefined) {
    if (typeof m.mitraId === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(m.mitraId)) mitraId = m.mitraId;
    else problems.push('mitraId tidak sah diabaikan');
  }
  return { roles, mitraId, problems };
}

/** Normalisasi identitas masuk: surel apa adanya (huruf kecil), nomor Indonesia 08… menjadi +628…. */
export function normalizeIdentifier(raw: string): { kind: 'email' | 'phone'; value: string } | null {
  const v = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { kind: 'email', value: v.toLowerCase() };
  const d = v.replace(/[\s-]/g, '');
  if (/^(\+62|62|0)8\d{7,12}$/.test(d)) return { kind: 'phone', value: `+62${d.replace(/^(\+62|62|0)/, '')}` };
  return null;
}

/** Tujuan setelah masuk: hanya jalur di situs ini (mencegah open redirect seperti //situs-lain atau /\situs-lain). */
export function safeNext(raw: string | null | undefined): string {
  return raw && /^\/(?![\/\\])/.test(raw) && !/[\u0000-\u001f]/.test(raw) ? raw : '/';
}
