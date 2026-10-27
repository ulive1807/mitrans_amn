import {
  createContext,
  lazy,
  Suspense,
  useContext,
  type ReactNode,
} from "react";
import type { Role } from "../engine";

/**
 * Autentikasi dua mode:
 * - "clerk": VITE_CLERK_PUBLISHABLE_KEY diisi. Masuk memakai kode OTP (surel atau SMS) lewat Clerk;
 *   peran staf dan tautan Mitra PLS dibaca dari Clerk publicMetadata (hanya bisa diubah dari server).
 * - "demo": kunci belum diisi. Pemilih "masuk sebagai" prototipe tetap dipakai; tidak ada data nyata.
 *
 * Modul Clerk dimuat terpisah (lazy) sehingga mode demo tidak mengunduh pustaka Clerk.
 * Peramban hanya memegang publishable key; secret key tidak pernah ada di kode klien.
 */
export interface AuthState {
  mode: "clerk" | "demo";
  /** Clerk selesai memuat (selalu true pada mode demo). */
  loaded: boolean;
  /** Clerk gagal dimuat (jaringan atau kunci salah). */
  failed: boolean;
  signedIn: boolean;
  userId?: string;
  name?: string;
  contact?: string;
  roles: Role[];
  mitraId?: string;
  /** Masalah pada publicMetadata (peran tidak dikenal, rangkap terlarang). */
  problems: string[];
  signOut: () => Promise<void>;
}

export const PUBLISHABLE_KEY: string | undefined =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  undefined;

const DEMO: AuthState = {
  mode: "demo",
  loaded: true,
  failed: false,
  signedIn: true,
  roles: [],
  problems: [],
  signOut: async () => {},
};

export const AuthCtx = createContext<AuthState>(DEMO);

const ClerkBridge = lazy(() =>
  import("./clerk").then((m) => ({ default: m.ClerkBridge })),
);

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!PUBLISHABLE_KEY)
    return <AuthCtx.Provider value={DEMO}>{children}</AuthCtx.Provider>;
  return (
    <Suspense
      fallback={<div className="page muted">Memuat layanan masuk…</div>}
    >
      <ClerkBridge publishableKey={PUBLISHABLE_KEY}>{children}</ClerkBridge>
    </Suspense>
  );
}

export function useAuthState(): AuthState {
  return useContext(AuthCtx);
}
