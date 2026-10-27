import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CASE_STATUS_LABEL,
  MAX_FREEZE_MONTHS,
  SANCTION_LABEL,
  SEVERE_VIOLATIONS,
  VIOLATIONS,
  tanggal,
  type SanctionCase,
  type SanctionType,
} from "../../engine";
import { LetterView } from "../components/Letter";
import { Badge, Kpi, Panel } from "../components/ui";
import { num } from "../format";
import { useDemo } from "../store";

const DAY = 86_400_000;
const SANCTIONS: SanctionType[] = [
  "teguran",
  "penarikan",
  "pembekuan",
  "pemutusan",
];

export function statusTone(
  c: SanctionCase,
): "good" | "warn" | "bad" | "info" | "mute" {
  if (c.status === "ditutup_tanpa_sanksi") return "good";
  if (c.status === "final")
    return c.applied.includes("pemutusan") ? "bad" : "mute";
  if (c.status === "masa_keberatan" || c.status === "keberatan_diperiksa")
    return "info";
  return "warn";
}

function nextDeadline(c: SanctionCase): string {
  if (c.status === "menunggu_penjelasan")
    return `Penjelasan s.d. ${tanggal(c.explanationDue)}`;
  if (c.status === "menunggu_keputusan" && c.decisionDue)
    return `Keputusan s.d. ${tanggal(c.decisionDue)}`;
  if (c.status === "masa_keberatan")
    return `Keberatan s.d. ${tanggal(c.objectionDue!)}`;
  if (c.status === "keberatan_diperiksa")
    return "Menunggu pejabat pemeriksa keberatan";
  return "–";
}

/** Kasus dan sanksi (Kode Etik Pasal 20–22). */
export function KasusSanksi() {
  const { engine, cases, now, version, bump } = useDemo();
  const [sel, setSel] = useState<string | null>(cases.cases[0]?.id ?? null);
  const [msg, setMsg] = useState("");
  const [showNew, setShowNew] = useState(false);
  const overdue = useMemo(() => cases.overdue(now), [cases, now, version]);
  const list = cases.cases;
  const current = list.find((c) => c.id === sel);
  const run = (fn: () => string | void) => {
    try {
      const r = fn();
      setMsg(r ?? "");
      bump();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal");
    }
  };
  const advance = (days: number) =>
    run(() => {
      const t = now + days * DAY;
      engine.advance(t);
      const done = cases.tick(t);
      return `Waktu demo maju ${days} hari.${done.length ? ` Kasus final: ${done.join(", ")}.` : ""}`;
    });
  const name = (id: string) =>
    `${engine.accounts.get(id)!.name} (${engine.accounts.get(id)!.code})`;

  return (
    <>
      <div className="toolbar">
        <span>
          Tanggal demo: <b>{tanggal(now)}</b>
        </span>
        <button className="btn-secondary" onClick={() => advance(1)}>
          +1 hari
        </button>
        <button className="btn-secondary" onClick={() => advance(7)}>
          +7 hari
        </button>
        <button className="btn-secondary" onClick={() => advance(15)}>
          +15 hari
        </button>
        <button className="btn-primary" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Tutup formulir" : "Buka kasus baru"}
        </button>
      </div>
      <div className="kpis">
        <Kpi
          label="Kasus berjalan"
          value={num(
            list.filter(
              (c) => !["final", "ditutup_tanpa_sanksi"].includes(c.status),
            ).length,
          )}
          sub={`${num(list.length)} kasus seluruhnya`}
        />
        <Kpi
          label="Menunggu penjelasan"
          value={num(
            list.filter((c) => c.status === "menunggu_penjelasan").length,
          )}
          sub="Batas 14 hari (Pasal 21 angka 2)"
        />
        <Kpi
          label="Menunggu keputusan"
          value={num(
            list.filter((c) => c.status === "menunggu_keputusan").length,
          )}
          sub="Batas 14 hari setelah penjelasan"
        />
        <Kpi
          label="Tenggat terlewat"
          value={num(overdue.length)}
          sub={overdue.length ? "Perlu tindakan" : "Tidak ada"}
        />
      </div>
      {overdue.length > 0 && (
        <div className="callout warn" style={{ marginBottom: 12 }}>
          {overdue.map((o, i) => (
            <div key={i}>
              ⚠ {o.caseId}: {o.what}
            </div>
          ))}
        </div>
      )}
      {msg && (
        <div className="callout info" style={{ marginBottom: 12 }}>
          {msg}
        </div>
      )}
      {showNew && (
        <NewCase onDone={(id) => (setSel(id), setShowNew(false))} run={run} />
      )}
      <Panel
        title="Daftar kasus"
        hint="Klik baris untuk melihat surat dan tindakan"
      >
        <div className="table-wrap" style={{ maxHeight: 280 }}>
          <table className="t">
            <thead>
              <tr>
                <th>Kasus</th>
                <th>Mitra PLS</th>
                <th>Dugaan (Pasal 18)</th>
                <th>Status</th>
                <th>Tenggat berikutnya</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSel(c.id)}
                  style={{
                    cursor: "pointer",
                    background: c.id === sel ? "var(--surface-2)" : undefined,
                  }}
                >
                  <td className="num">{c.id}</td>
                  <td>{name(c.accountId)}</td>
                  <td>angka {c.violations.join(", ")}</td>
                  <td>
                    <Badge tone={statusTone(c)}>
                      {CASE_STATUS_LABEL[c.status]}
                    </Badge>
                  </td>
                  <td className="muted">{nextDeadline(c)}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Belum ada kasus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      {current && <CaseDetail key={current.id} c={current} run={run} />}
    </>
  );
}

function NewCase({
  onDone,
  run,
}: {
  onDone: (id: string) => void;
  run: (fn: () => string | void) => void;
}) {
  const { engine, cases, now } = useDemo();
  const mitra = useMemo(
    () =>
      [...engine.accounts.values()]
        .filter((a) => a.role === "mitra" && !a.terminated)
        .slice(0, 300),
    [engine],
  );
  const [accountId, setAccountId] = useState(mitra[0]?.id ?? "");
  const [viol, setViol] = useState<number[]>([]);
  const [allegation, setAllegation] = useState("");
  const [evidence, setEvidence] = useState("");
  return (
    <Panel
      title="Buka kasus baru"
      hint="Menerbitkan Surat Pemberitahuan Dugaan Pelanggaran (Pasal 21 angka 1)"
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="nc-acc">Mitra PLS</label>
          <select
            id="nc-acc"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {mitra.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="nc-ev">Bukti (satu per baris)</label>
          <textarea
            id="nc-ev"
            className="ta"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </div>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="nc-al">Uraian dugaan</label>
        <textarea
          id="nc-al"
          className="ta"
          value={allegation}
          onChange={(e) => setAllegation(e.target.value)}
        />
      </div>
      <fieldset style={{ border: 0, padding: 0, marginTop: 12 }}>
        <legend style={{ fontWeight: 600, fontSize: 13 }}>
          Dugaan pelanggaran Kode Etik Pasal 18
        </legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "2px 16px",
          }}
        >
          {Object.entries(VIOLATIONS).map(([k, v]) => (
            <label
              key={k}
              className="check"
              style={{ padding: "3px 0", fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={viol.includes(Number(k))}
                onChange={(e) =>
                  setViol(
                    e.target.checked
                      ? [...viol, Number(k)]
                      : viol.filter((x) => x !== Number(k)),
                  )
                }
              />
              <span>
                {k}. {v}
                {SEVERE_VIOLATIONS.includes(Number(k)) ? " (berat)" : ""}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        className="btn-primary"
        style={{ marginTop: 12 }}
        onClick={() =>
          run(() => {
            const c = cases.openCase({
              accountId,
              violations: viol,
              allegation: allegation.trim(),
              evidence: evidence
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean),
              actor: "Kepatuhan (demo)",
              at: now,
            });
            onDone(c.id);
            return `Kasus ${c.id} dibuka. Surat ${c.letters[0].number} dikirim ke Kantor Maya dan surel Mitra PLS.`;
          })
        }
      >
        Buka kasus dan kirim pemberitahuan
      </button>
    </Panel>
  );
}

function CaseDetail({
  c,
  run,
}: {
  c: SanctionCase;
  run: (fn: () => string | void) => void;
}) {
  const { engine, cases, now } = useDemo();
  const acc = engine.accounts.get(c.accountId)!;
  const [text, setText] = useState("");
  const [by, setBy] = useState("");
  const [reasons, setReasons] = useState("");
  const [sanctions, setSanctions] = useState<SanctionType[]>([]);
  const [freeze, setFreeze] = useState(1);
  const [outcome, setOutcome] = useState<"ditolak" | "dikabulkan" | "diubah">(
    "ditolak",
  );
  const toggle = (s: SanctionType) =>
    setSanctions(
      sanctions.includes(s)
        ? sanctions.filter((x) => x !== s)
        : [...sanctions, s],
    );
  const sanctionPicker = (
    <div
      style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0" }}
    >
      {SANCTIONS.map((s) => (
        <label key={s} className="check" style={{ padding: 0 }}>
          <input
            type="checkbox"
            checked={sanctions.includes(s)}
            onChange={() => toggle(s)}
          />
          <span>{SANCTION_LABEL[s]}</span>
        </label>
      ))}
      {sanctions.includes("pembekuan") && (
        <select
          value={freeze}
          onChange={(e) => setFreeze(Number(e.target.value))}
          aria-label="Lama pembekuan"
        >
          {Array.from({ length: MAX_FREEZE_MONTHS }, (_, i) => i + 1).map(
            (m) => (
              <option key={m} value={m}>
                {m} bulan
              </option>
            ),
          )}
        </select>
      )}
    </div>
  );
  return (
    <div className="case-grid" style={{ marginTop: 16 }}>
      <div>
        <Panel
          title={`${c.id} · ${acc.name} (${acc.code})`}
          hint={CASE_STATUS_LABEL[c.status]}
        >
          <p style={{ marginTop: 0 }}>
            <Link to={`/mitra?id=${c.accountId}`}>Lihat sebagai Mitra PLS (Kantor Maya) →</Link>
          </p>
          <dl className="kv">
            <dt>Dugaan</dt>
            <dd style={{ textAlign: "left" }}>
              {c.violations
                .map((v) => `Ps. 18 angka ${v}: ${VIOLATIONS[v]}`)
                .join("; ")}
            </dd>
            <dt>Uraian</dt>
            <dd style={{ textAlign: "left" }}>{c.allegation}</dd>
            <dt>Bukti</dt>
            <dd style={{ textAlign: "left" }}>{c.evidence.join("; ")}</dd>
            {c.explanation && (
              <>
                <dt>Penjelasan</dt>
                <dd style={{ textAlign: "left" }}>“{c.explanation.text}”</dd>
              </>
            )}
            {c.objection && (
              <>
                <dt>Keberatan</dt>
                <dd style={{ textAlign: "left" }}>“{c.objection.text}”</dd>
              </>
            )}
            <dt>Sanksi berjalan</dt>
            <dd style={{ textAlign: "left" }}>
              {c.applied.length
                ? c.applied.map((s) => SANCTION_LABEL[s]).join("; ")
                : "–"}
            </dd>
          </dl>
          {c.manualFollowUp.length > 0 && (
            <div className="callout warn" style={{ marginTop: 10 }}>
              {c.manualFollowUp.join(" ")}
            </div>
          )}
        </Panel>
        <Panel title="Tindakan">
          {c.status === "menunggu_penjelasan" && (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                Mitra PLS mengirim penjelasan melalui Kantor Maya. Bila
                penjelasan diterima lewat saluran lain, catat di sini.
              </p>
              <textarea
                className="ta"
                placeholder="Isi penjelasan Mitra PLS"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn-secondary"
                  onClick={() =>
                    run(
                      () => (
                        cases.submitExplanation(c.id, text, now, false),
                        "Penjelasan dicatat."
                      ),
                    )
                  }
                >
                  Catat penjelasan
                </button>
                <button
                  className="btn-secondary"
                  disabled={now <= c.explanationDue}
                  onClick={() =>
                    run(
                      () => (
                        cases.markNoExplanation(c.id, now, "Kepatuhan (demo)"),
                        "Dicatat: tanpa penjelasan sampai batas waktu."
                      ),
                    )
                  }
                >
                  Tandai tanpa penjelasan
                </button>
              </div>
            </>
          )}
          {c.status === "menunggu_keputusan" && (
            <>
              <div className="field">
                <label htmlFor="cd-by">Pejabat pemutus</label>
                <input
                  id="cd-by"
                  value={by}
                  onChange={(e) => setBy(e.target.value)}
                  placeholder="Nama dan jabatan"
                />
              </div>
              {sanctionPicker}
              <textarea
                className="ta"
                placeholder="Alasan tertulis (wajib)"
                value={reasons}
                onChange={(e) => setReasons(e.target.value)}
              />
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn-primary"
                  disabled={sanctions.length === 0}
                  onClick={() =>
                    run(
                      () => (
                        cases.decide(c.id, {
                          by,
                          sanctions,
                          reasons,
                          freezeMonths: freeze,
                          at: now,
                        }),
                        "Keputusan diterbitkan. Masa keberatan 14 hari dimulai."
                      ),
                    )
                  }
                >
                  Putuskan sanksi
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    run(
                      () => (
                        cases.decide(c.id, {
                          by,
                          sanctions: [],
                          reasons,
                          at: now,
                        }),
                        "Kasus ditutup: tidak terbukti. Bonus yang ditunda dibayar."
                      ),
                    )
                  }
                >
                  Tidak terbukti
                </button>
              </div>
            </>
          )}
          {c.status === "masa_keberatan" && (
            <p className="muted">
              Menunggu keberatan Mitra PLS sampai {tanggal(c.objectionDue!)}.
              Setelah itu keputusan menjadi final.
            </p>
          )}
          {c.status === "keberatan_diperiksa" && (
            <>
              <div className="field">
                <label htmlFor="ob-by">
                  Pejabat pemeriksa keberatan (bukan {c.decision!.by})
                </label>
                <input
                  id="ob-by"
                  value={by}
                  onChange={(e) => setBy(e.target.value)}
                  placeholder="Nama dan jabatan"
                />
              </div>
              <div className="seg" style={{ margin: "8px 0" }}>
                {(["ditolak", "dikabulkan", "diubah"] as const).map((o) => (
                  <button
                    key={o}
                    className={outcome === o ? "on" : ""}
                    onClick={() => setOutcome(o)}
                  >
                    Keberatan {o}
                  </button>
                ))}
              </div>
              {outcome === "diubah" && sanctionPicker}
              <textarea
                className="ta"
                placeholder="Alasan tertulis (wajib)"
                value={reasons}
                onChange={(e) => setReasons(e.target.value)}
              />
              <button
                className="btn-primary"
                style={{ marginTop: 8 }}
                onClick={() =>
                  run(
                    () => (
                      cases.decideObjection(c.id, {
                        by,
                        outcome,
                        sanctions,
                        reasons,
                        freezeMonths: freeze,
                        at: now,
                      }),
                      "Keputusan keberatan diterbitkan dan final."
                    ),
                  )
                }
              >
                Putuskan keberatan
              </button>
            </>
          )}
          {(c.status === "final" || c.status === "ditutup_tanpa_sanksi") && (
            <p className="muted">Kasus selesai pada {tanggal(c.finalAt!)}.</p>
          )}
        </Panel>
        <Panel title="Jejak kasus" hint="Tercatat dan tidak dapat diubah">
          <ul className="timeline">
            {c.events.map((ev, i) => (
              <li key={i}>
                <div className="when">
                  {tanggal(ev.at)} · {ev.actor}
                </div>
                <b>{ev.action}</b>
                {ev.note ? <div className="muted">{ev.note}</div> : null}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div>
        <Panel title="Surat" hint={`${c.letters.length} surat`}>
          {[...c.letters].reverse().map((l) => (
            <LetterView key={l.number} letter={l} />
          ))}
        </Panel>
      </div>
    </div>
  );
}
