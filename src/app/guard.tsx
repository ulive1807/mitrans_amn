import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "./auth";
import { ProtoRibbon, TopBar } from "./components/ui";

/**
 * Pengaman halaman di peramban. Ini hanya untuk pengalaman pengguna:
 * pada produksi, setiap data dan aksi wajib diperiksa lagi di server dengan token sesi Clerk.
 */
export function RequireAccess({ need, children }: { need: "staf" | "mitra"; children: ReactNode }) {
  const auth = useAuthState();
  const loc = useLocation();
  if (auth.mode === "demo") return <>{children}</>;
  if (auth.failed || !auth.loaded)
    return (
      <Shell>
        {auth.failed ? "Layanan masuk tidak dapat dimuat. Muat ulang halaman." : "Memeriksa sesi…"}
      </Shell>
    );
  if (!auth.signedIn) return <Navigate to={`/masuk?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  const ok = need === "staf" ? auth.roles.length > 0 : !!auth.mitraId;
  if (!ok)
    return (
      <Shell>
        <h2>Belum ada akses</h2>
        <p style={{ marginTop: 8 }}>
          {need === "staf"
            ? "Akun Anda belum diberi peran staf."
            : "Akun Anda belum ditautkan ke Mitra PLS."}{" "}
          Akses diberikan oleh Admin Sistem dari server; hubungi Admin Sistem dengan menyebut surel/nomor yang Anda pakai.
        </p>
        {auth.problems.length > 0 && (
          <ul style={{ marginTop: 8 }}>
            {auth.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <p style={{ marginTop: 12 }}>
          <Link to="/masuk">Kembali</Link>
        </p>
      </Shell>
    );
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <ProtoRibbon />
      <TopBar />
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="card" role="status">{children}</div>
      </div>
    </>
  );
}
