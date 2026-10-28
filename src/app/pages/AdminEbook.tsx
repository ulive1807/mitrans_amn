import { useMemo, useState } from "react";
import {
  EBOOK_STATUS_LABEL,
  EngineError,
  type EbookStatus,
} from "../../engine";
import { Badge, Panel } from "../components/ui";
import { dateLabel, rp } from "../format";
import { useDemo } from "../store";
import { Highlight, LpPreview, STATUS_TONE } from "./MitraAgent";

const FILTERS: { id: EbookStatus | "semua"; label: string }[] = [
  { id: "diajukan", label: "Menunggu pemeriksaan" },
  { id: "disetujui", label: "Tayang" },
  { id: "perlu_revisi", label: "Perlu revisi" },
  { id: "ditolak", label: "Ditolak" },
  { id: "ditarik", label: "Ditarik" },
  { id: "semua", label: "Semua" },
];

/** Pemeriksaan e-book dan halaman penawaran Mitra PLS oleh Kepatuhan (izin konten.tinjau). */
export function TinjauEbook() {
  const { engine, ebooks, access, staffId, now, version, bump } = useDemo();
  const [filter, setFilter] = useState<EbookStatus | "semua">("diajukan");
  const list = useMemo(
    () =>
      [...ebooks.ebooks.values()].filter(
        (e) => filter === "semua" || e.status === filter,
      ),
    [ebooks, filter, version],
  );
  const [selId, setSelId] = useState<string | undefined>(undefined);
  const sel = (selId && ebooks.ebooks.get(selId)) || list[0];
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const canReview = access.can(staffId, "konten.tinjau");

  const decide = (d: "setujui" | "revisi" | "tolak" | "tarik") => {
    if (!sel) return;
    try {
      if (d === "tarik") ebooks.withdraw(sel.id, staffId, note, now);
      else ebooks.review(sel.id, staffId, d, note, now);
      access.record(
        staffId,
        `E-book ${d}`,
        now,
        `${sel.id} (${sel.mitraId})${note.trim() ? `: ${note.trim()}` : ""}`,
      );
      setMsg({
        ok: true,
        text: `${sel.title}: ${EBOOK_STATUS_LABEL[sel.status]}.`,
      });
      setNote("");
    } catch (err) {
      setMsg({
        ok: false,
        text:
          err instanceof EngineError
            ? err.message
            : "Gagal menyimpan keputusan.",
      });
    }
    bump();
  };

  return (
    <>
      <div className="toolbar">
        <select
          aria-label="Status e-book"
          value={filter}
          onChange={(e) => setFilter(e.target.value as EbookStatus | "semua")}
        >
          {FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label} (
              {f.id === "semua"
                ? ebooks.ebooks.size
                : [...ebooks.ebooks.values()].filter((e) => e.status === f.id)
                    .length}
              )
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 13 }}>
          Periksa klaim penghasilan, janji untung, sinyal beli/jual, dan klaim
          izin lembaga (Kode Etik Pasal 12 dan 18).
        </span>
      </div>
      <div className="row2">
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          {msg && (
            <div
              className={`callout ${msg.ok ? "info" : "warn"}`}
              role="status"
            >
              {msg.text}
            </div>
          )}
          {sel ? (
            <Panel
              title={sel.title}
              hint={`${sel.id} · versi ${sel.version} · ${rp(sel.price)}`}
            >
              <p style={{ marginBottom: 10 }}>
                Mitra PLS: <b>{engine.accounts.get(sel.mitraId)?.name}</b> (
                {engine.accounts.get(sel.mitraId)?.code}) ·{" "}
                <Badge tone={STATUS_TONE[sel.status]}>
                  {EBOOK_STATUS_LABEL[sel.status]}
                </Badge>
              </p>
              <p className="muted" style={{ marginBottom: 10 }}>
                <Highlight text={sel.summary} />
              </p>
              <LpPreview e={sel} />
              {sel.flags.length > 0 ? (
                <div className="callout warn" style={{ marginTop: 12 }}>
                  <b>Tanda otomatis ({sel.flags.length}):</b>
                  <ul style={{ margin: "6px 0 0 18px" }}>
                    {sel.flags.map((f) => (
                      <li key={f.match}>
                        “{f.match}”: {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                  Tidak ada tanda otomatis. Tetap baca seluruh isi; pemeriksaan
                  otomatis hanya membantu.
                </p>
              )}
              {canReview &&
                (sel.status === "diajukan" || sel.status === "disetujui") && (
                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <div className="field">
                      <label htmlFor="eb-note">Catatan untuk Mitra PLS</label>
                      <textarea
                        id="eb-note"
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Wajib untuk revisi, penolakan, dan penarikan"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {sel.status === "diajukan" ? (
                        <>
                          <button
                            className="btn-primary"
                            onClick={() => decide("setujui")}
                          >
                            Setujui dan tayangkan
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => decide("revisi")}
                          >
                            Minta revisi
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => decide("tolak")}
                          >
                            Tolak
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-secondary"
                          onClick={() => decide("tarik")}
                        >
                          Tarik dari tayangan
                        </button>
                      )}
                    </div>
                  </div>
                )}
              <div style={{ marginTop: 14 }}>
                <b style={{ fontSize: 13 }}>Riwayat</b>
                <ul style={{ margin: "6px 0 0 18px", fontSize: 13 }}>
                  {sel.history.map((h, i) => (
                    <li key={i}>
                      {dateLabel(h.at)} · {h.action} oleh{" "}
                      {access.users.get(h.by)?.name ??
                        engine.accounts.get(h.by)?.name ??
                        h.by}
                      {h.note ? `: ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          ) : (
            <Panel title="Tidak ada e-book">
              <p className="muted">Tidak ada e-book dengan status ini.</p>
            </Panel>
          )}
        </div>
        <Panel title="Daftar e-book" hint={`${list.length} e-book`}>
          <div className="eb-list">
            {list.map((e) => (
              <button
                key={e.id}
                className={`eb-item ${sel?.id === e.id ? "on" : ""}`}
                onClick={() => {
                  setSelId(e.id);
                  setMsg(null);
                }}
              >
                <b>{e.title}</b>
                <span className="meta">
                  <Badge tone={STATUS_TONE[e.status]}>
                    {EBOOK_STATUS_LABEL[e.status]}
                  </Badge>
                  {engine.accounts.get(e.mitraId)?.code} · {rp(e.price)}
                  {e.flags.length > 0 && (
                    <Badge tone="warn">{e.flags.length} tanda</Badge>
                  )}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
