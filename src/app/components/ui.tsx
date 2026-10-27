import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import type { EntryStatus } from "../../engine";

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className={`brandmark${small ? " sm" : ""}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect
          width="64"
          height="64"
          rx="14"
          fill="#103a2f"
          stroke="#d4af6a"
          strokeOpacity="0.5"
        />
        <path
          d="M14 46 L26 20 L32 32 L38 20 L50 46"
          fill="none"
          stroke="#d4af6a"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        Mitrans-Astra
        <small>Literasi Pasar Modal Syariah</small>
      </span>
    </span>
  );
}

export function ProtoRibbon() {
  return (
    <div className="proto-ribbon" role="note">
      Prototipe. Rencana Pemasaran, Kode Etik, dan Syarat dan Ketentuan masih{" "}
      <b>draf</b> yang menunggu tinjauan konsultan hukum dan verifikasi
      asosiasi. Data di dasbor <b>sintetis</b>.{" "}
      <Link to="/aturan">Ringkasan aturan</Link>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <div className="inner">
        <Link to="/">
          <Logo small />
        </Link>
        <nav>
          <NavLink to="/" end>
            Beranda
          </NavLink>
          <NavLink to="/aturan">Aturan</NavLink>
          <NavLink to="/daftar">Daftar Mitra PLS</NavLink>
          <NavLink to="/mitra">Kantor Maya</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </div>
    </header>
  );
}

export function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="kpi">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
  actions,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{title}</h2>
        {hint && <span>{hint}</span>}
        {actions}
      </div>
      {children}
    </section>
  );
}

const STATUS: Record<
  EntryStatus,
  { label: string; cls: string; icon: string }
> = {
  payable: { label: "Dibayar", cls: "b-good", icon: "✓" },
  pending: { label: "Menunggu syarat", cls: "b-info", icon: "…" },
  held: { label: "Ditahan", cls: "b-warn", icon: "⏸" },
  forfeited: { label: "Hangus → Pool", cls: "b-bad", icon: "✕" },
  company: { label: "Struktural", cls: "b-mute", icon: "■" },
  ineligible: { label: "Tidak memenuhi syarat", cls: "b-mute", icon: "–" },
  clawback: { label: "Ditarik", cls: "b-bad", icon: "↩" },
};

export function StatusBadge({ status }: { status: EntryStatus }) {
  const s = STATUS[status];
  return (
    <span className={`badge ${s.cls}`}>
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "good" | "warn" | "bad" | "info" | "mute";
  children: ReactNode;
}) {
  return <span className={`badge b-${tone}`}>{children}</span>;
}
