import { useEffect, useRef, useState } from "react";
import type { Role } from "../engine";
import { useAuthState } from "./auth";

/** Alamat API server; kosong = domain yang sama (/api diteruskan oleh hosting atau proxy Vite saat pengembangan). */
const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
  }
}

/** Panggil API dengan token sesi Clerk di header (bukan cookie), sehingga perubahan data aman dari CSRF. */
export async function api<T>(getToken: () => Promise<string | null>, path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new ApiError(401, "Belum masuk");
  const res = await fetch(API + path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.galat ?? `Galat ${res.status}`, body?.alasan);
  return body as T;
}

export interface ServerSession {
  userId: string;
  roles: Role[];
  mitraId: string | null;
  sumberPeran: "token" | "api" | "none";
  masalah: string[];
}

export type ServerCheck =
  | { state: "demo" }
  | { state: "memeriksa" }
  | { state: "ok"; data: ServerSession; cocok: boolean }
  | { state: "gagal"; pesan: string };

/** Konfirmasi sesi dan peran ke server (mode Clerk). Peran di layar dibandingkan dengan yang dibaca server. */
export function useServerCheck(): ServerCheck {
  const auth = useAuthState();
  const [check, setCheck] = useState<ServerCheck>({ state: "memeriksa" });
  const roleKey = [...auth.roles].sort().join();
  // getToken bisa berganti referensi tiap render; simpan di ref agar efek tidak berulang tanpa henti.
  const getToken = useRef(auth.getToken);
  getToken.current = auth.getToken;
  useEffect(() => {
    if (auth.mode !== "clerk" || !auth.signedIn) return;
    let live = true;
    setCheck({ state: "memeriksa" });
    api<ServerSession>(() => getToken.current(), "/api/saya")
      .then((data) => live && setCheck({ state: "ok", data, cocok: [...data.roles].sort().join() === roleKey && (data.mitraId ?? undefined) === auth.mitraId }))
      .catch((e: unknown) =>
        live && setCheck({ state: "gagal", pesan: e instanceof ApiError ? `${e.message}${e.reason ? ` (${e.reason})` : ""}` : "Server API tidak terjangkau" }),
      );
    return () => {
      live = false;
    };
  }, [auth.mode, auth.signedIn, auth.userId, roleKey, auth.mitraId]);
  return auth.mode === "clerk" ? check : { state: "demo" };
}
