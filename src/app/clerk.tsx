import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ClerkFailed,
  ClerkProvider,
  useAuth,
  useClerk,
  useSignIn,
  useUser,
} from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";
import { claimsFromMetadata, normalizeIdentifier } from "../engine";
import { AuthCtx, type AuthState } from "./auth";

/** Dimuat hanya bila VITE_CLERK_PUBLISHABLE_KEY diisi (lihat auth.tsx). */
export function ClerkBridge({
  publishableKey,
  children,
}: {
  publishableKey: string;
  children: ReactNode;
}) {
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/masuk">
      <Bridge>{children}</Bridge>
    </ClerkProvider>
  );
}

function Bridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [failed, setFailed] = useState(false);
  const meta = user?.publicMetadata;
  const claims = useMemo(() => claimsFromMetadata(meta), [meta]);
  const value = useMemo<AuthState>(
    () => ({
      mode: "clerk",
      loaded: isLoaded,
      failed,
      signedIn: !!isSignedIn,
      userId: userId ?? undefined,
      name:
        user?.fullName ||
        user?.primaryEmailAddress?.emailAddress ||
        user?.primaryPhoneNumber?.phoneNumber ||
        undefined,
      contact:
        user?.primaryEmailAddress?.emailAddress ??
        user?.primaryPhoneNumber?.phoneNumber ??
        undefined,
      roles: isSignedIn ? claims.roles : [],
      mitraId: isSignedIn ? claims.mitraId : undefined,
      problems: isSignedIn ? claims.problems : [],
      signOut: () => clerk.signOut(),
      getToken: () => getToken(),
    }),
    [isLoaded, failed, isSignedIn, userId, user, claims, clerk, getToken],
  );
  return (
    <AuthCtx.Provider value={value}>
      {children}
      <ClerkFailed>
        <FailFlag onFail={() => setFailed(true)} />
      </ClerkFailed>
    </AuthCtx.Provider>
  );
}

function FailFlag({ onFail }: { onFail: () => void }) {
  useEffect(onFail, [onFail]);
  return null;
}

const MESSAGES: Record<string, string> = {
  form_identifier_not_found:
    "Surel atau nomor ini belum terdaftar. Akses diberikan oleh Perusahaan; hubungi Layanan Mitra PLS.",
  form_code_incorrect: "Kode salah. Periksa kembali 6 angka yang Anda terima.",
  verification_expired: "Kode sudah kedaluwarsa. Minta kode baru.",
  verification_failed: "Terlalu banyak kode salah. Mulai lagi dari awal.",
  too_many_requests:
    "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.",
  session_exists: "Anda sudah masuk.",
  strategy_for_user_invalid:
    "Metode kode ini belum diaktifkan untuk akun Anda.",
};

function explain(e: unknown): string {
  if (isClerkAPIResponseError(e)) {
    const first = e.errors[0];
    return (
      MESSAGES[first?.code ?? ""] ??
      first?.longMessage ??
      first?.message ??
      "Gagal memproses permintaan."
    );
  }
  return e instanceof Error ? e.message : "Gagal memproses permintaan.";
}

type Step = "identifier" | "code" | "second";
type Strategy = "email_code" | "phone_code" | "totp";
const COOLDOWN = 60;

/** Alur masuk tanpa kata sandi: identitas → kode OTP → (bila diwajibkan) faktor kedua → sesi aktif. */
export function OtpSignIn({ onDone }: { onDone: () => void }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [step, setStep] = useState<Step>("identifier");
  const [raw, setRaw] = useState("");
  const [code, setCode] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("email_code");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!isLoaded) return <p className="muted">Memuat layanan masuk…</p>;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(explain(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (status: string | null, sessionId: string | null) => {
    if (status === "complete" && sessionId) {
      await setActive({ session: sessionId });
      onDone();
      return;
    }
    if (status === "needs_second_factor") {
      const f = signIn.supportedSecondFactors ?? [];
      if (f.some((x) => x.strategy === "totp")) {
        setStrategy("totp");
        setTarget("aplikasi autentikator");
      } else if (f.some((x) => x.strategy === "phone_code")) {
        await signIn.prepareSecondFactor({ strategy: "phone_code" });
        setStrategy("phone_code");
        setTarget(
          f.find((x) => x.strategy === "phone_code")?.safeIdentifier ??
            "nomor terdaftar",
        );
        setWait(COOLDOWN);
      } else {
        throw new Error(
          "Faktor kedua yang diminta belum didukung halaman ini.",
        );
      }
      setCode("");
      setStep("second");
      return;
    }
    throw new Error(
      "Akun memerlukan langkah lain yang belum didukung (mis. kata sandi baru). Hubungi Admin Sistem.",
    );
  };

  const sendFirst = async () => {
    const id = normalizeIdentifier(raw);
    if (!id)
      throw new Error(
        "Masukkan surel atau nomor HP Indonesia (08… atau +62…).",
      );
    const si = await signIn.create({ identifier: id.value });
    const factors = si.supportedFirstFactors ?? [];
    const f = factors.find(
      (x) => x.strategy === (id.kind === "email" ? "email_code" : "phone_code"),
    );
    if (f?.strategy === "email_code") {
      await si.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: f.emailAddressId,
      });
      setStrategy("email_code");
      setTarget(f.safeIdentifier);
    } else if (f?.strategy === "phone_code") {
      await si.prepareFirstFactor({
        strategy: "phone_code",
        phoneNumberId: f.phoneNumberId,
      });
      setStrategy("phone_code");
      setTarget(f.safeIdentifier);
    } else {
      throw new Error(
        id.kind === "email"
          ? "Kode lewat surel belum diaktifkan untuk akun ini."
          : "Kode lewat SMS belum diaktifkan untuk akun ini.",
      );
    }
    setCode("");
    setStep("code");
    setWait(COOLDOWN);
  };

  const submitIdentifier = (e: FormEvent) => {
    e.preventDefault();
    void run(sendFirst);
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!/^\d{6}$/.test(c)) {
      setErr("Kode terdiri dari 6 angka.");
      return;
    }
    void run(async () => {
      if (step === "code") {
        const r = await signIn.attemptFirstFactor({
          strategy: strategy as "email_code" | "phone_code",
          code: c,
        });
        await finish(r.status, r.createdSessionId);
      } else {
        const r = await signIn.attemptSecondFactor({
          strategy: strategy as "totp" | "phone_code",
          code: c,
        });
        await finish(r.status, r.createdSessionId);
      }
    });
  };

  const resend = () =>
    void run(async () => {
      if (step === "second") {
        await signIn.prepareSecondFactor({ strategy: "phone_code" });
        setWait(COOLDOWN);
      } else await sendFirst();
    });

  if (step === "identifier")
    return (
      <form onSubmit={submitIdentifier} noValidate>
        <div className="field">
          <label htmlFor="ident">Surel atau nomor HP</label>
          <input
            id="ident"
            autoComplete="username"
            inputMode="email"
            placeholder="nama@contoh.id atau 0812…"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <div className="hint">
            Kami mengirim kode 6 angka. Tidak ada kata sandi.
          </div>
        </div>
        {err && (
          <div className="callout warn" role="alert" style={{ marginTop: 12 }}>
            {err}
          </div>
        )}
        <button
          className="btn-primary"
          type="submit"
          disabled={busy || !raw.trim()}
          style={{ marginTop: 16 }}
        >
          {busy ? "Mengirim…" : "Kirim kode"}
        </button>
      </form>
    );

  return (
    <form onSubmit={submitCode} noValidate>
      <p style={{ marginBottom: 12 }}>
        {strategy === "totp"
          ? "Masukkan 6 angka dari aplikasi autentikator Anda."
          : `Kode dikirim ke ${target}. Berlaku beberapa menit; jangan berikan kode ini kepada siapa pun, termasuk staf Perusahaan.`}
      </p>
      <div className="field">
        <label htmlFor="otp">
          {step === "second" ? "Kode verifikasi kedua" : "Kode OTP"}
        </label>
        <input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ letterSpacing: "0.4em", fontSize: 20 }}
        />
      </div>
      {err && (
        <div className="callout warn" role="alert" style={{ marginTop: 12 }}>
          {err}
        </div>
      )}
      <div
        style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}
      >
        <button
          className="btn-primary"
          type="submit"
          disabled={busy || code.length !== 6}
        >
          {busy ? "Memeriksa…" : "Masuk"}
        </button>
        {strategy !== "totp" && (
          <button
            className="btn-secondary"
            type="button"
            disabled={busy || wait > 0}
            onClick={resend}
          >
            {wait > 0 ? `Kirim ulang (${wait} dtk)` : "Kirim ulang kode"}
          </button>
        )}
        <button
          className="btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => {
            setStep("identifier");
            setErr("");
          }}
        >
          Ganti surel/nomor
        </button>
      </div>
    </form>
  );
}
