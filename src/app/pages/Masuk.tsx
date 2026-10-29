import { lazy, Suspense } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ROLE_LABEL, safeNext } from "../../engine";
import { useAuthState } from "../auth";
import { ProtoRibbon, TopBar } from "../components/ui";

const OtpSignIn = lazy(() => import("../clerk").then((m) => ({ default: m.OtpSignIn })));


export function Masuk() {
  const auth = useAuthState();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const navigate = useNavigate();

  return (
    <>
      <ProtoRibbon />
      <TopBar />
      <div className="page" style={{ maxWidth: 520 }}>
        <div className="page-head">
          <h1>Masuk</h1>
          <p className="muted">Kantor Maya Mitra PLS dan dasbor Admin memakai kode OTP, tanpa kata sandi.</p>
        </div>
        <div className="card">
          {auth.mode === "demo" ? (
            <>
              <h2>Mode demo aktif</h2>
              <p style={{ marginTop: 8 }}>
                Masuk OTP memakai Clerk dan aktif setelah <code>VITE_CLERK_PUBLISHABLE_KEY</code> diisi pada pengaturan
                lingkungan (hosting atau berkas <code>.env.local</code>). Sampai saat itu, prototipe memakai pemilih
                “masuk sebagai” dengan data sintetis.
              </p>
              <p style={{ marginTop: 12 }}>
                <Link to={next === "/" ? "/admin" : next}>Lanjut ke prototipe →</Link>
              </p>
            </>
          ) : auth.failed ? (
            <div className="callout warn" role="alert">
              Layanan masuk tidak dapat dimuat. Periksa koneksi internet, lalu muat ulang halaman. Bila berulang, kunci
              Clerk mungkin salah; hubungi Admin Sistem.
            </div>
          ) : !auth.loaded ? (
            <p className="muted">Memuat layanan masuk…</p>
          ) : auth.signedIn ? (
            params.get("next") ? (
              <Navigate to={next} replace />
            ) : (
              <>
                <h2>Anda sudah masuk</h2>
                <p style={{ marginTop: 8 }}>
                  {auth.name} · {auth.roles.map((r) => ROLE_LABEL[r]).join(", ") || (auth.mitraId ? "Mitra PLS" : "belum ada akses")}
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                  {auth.roles.length > 0 && <Link className="btn-primary" to="/admin">Buka Admin</Link>}
                  {auth.mitraId && <Link className="btn-primary" to="/mitra">Buka Kantor Maya</Link>}
                  <button className="btn-secondary" onClick={() => void auth.signOut()}>Keluar</button>
                </div>
              </>
            )
          ) : (
            <Suspense fallback={<p className="muted">Memuat layanan masuk…</p>}>
              <OtpSignIn onDone={() => navigate(next, { replace: true })} />
            </Suspense>
          )}
        </div>
        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          Perusahaan tidak pernah meminta kode OTP Anda melalui telepon, WhatsApp, atau pesan lain.
        </p>
      </div>
    </>
  );
}
