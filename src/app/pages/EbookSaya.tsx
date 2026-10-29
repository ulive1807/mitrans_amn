import { useMemo, useState } from "react";
import {
  ASSESSMENT,
  EngineError,
  FUNNEL_LABEL,
  LEVEL_LABEL,
  RT3,
  upcomingSessions,
  type FunnelStage,
} from "../../engine";
import { Badge, Panel, ProtoRibbon, TopBar } from "../components/ui";
import { dateLabel, rp } from "../format";
import { useDemo } from "../store";

const STEPS: FunnelStage[] = ["lunas", "asesmen", "kelas_dipilih", "hadir"];
const STEP_LABEL: Record<string, string> = {
  lunas: "Bayar",
  asesmen: "Asesmen",
  kelas_dipilih: "Pilih kelas",
  hadir: "Hadir",
};

/** Halaman pembeli e-book (CUB): asesmen, unduh e-book, pilih kelas webinar RT3, dan pengaturan WhatsApp. */
export function EbookSaya() {
  const { ebooks, funnel, now, version, bump } = useDemo();
  // Prototipe: pilih pembeli contoh. Di produksi, pembeli = pengguna Clerk yang masuk.
  const buyers = useMemo(
    () => [...new Set([...ebooks.orders.values()].map((o) => o.userId))],
    [ebooks, version],
  );
  const [userId, setUserId] = useState(buyers[0] ?? "");
  const orders = [...ebooks.orders.values()].filter((o) => o.userId === userId);
  const [ans, setAns] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sessions = upcomingSessions(now);
  const stopped = funnel.wa.optedOut.has(userId);

  const act = (fn: () => string) => {
    try {
      setMsg({ ok: true, text: fn() });
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof EngineError ? e.message : "Gagal menyimpan.",
      });
    }
    bump();
  };

  return (
    <>
      <ProtoRibbon />
      <TopBar />
      <div
        className="page"
        style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 16 }}
      >
        <div>
          <h1 style={{ marginBottom: 4 }}>E-book saya</h1>
          <p className="muted">
            Isi asesmen, unduh e-book, lalu pilih kelas webinar RT3 (Selasa,
            Rabu, atau Kamis pukul 19.00 WIB).
          </p>
        </div>
        <div className="toolbar">
          <label htmlFor="cub" className="muted" style={{ fontSize: 13 }}>
            Demo, masuk sebagai:
          </label>
          <select
            id="cub"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setMsg(null);
              setAns({});
            }}
          >
            {buyers.map((u) => (
              <option key={u} value={u}>
                {[...ebooks.orders.values()].find((o) => o.userId === u)?.name}
              </option>
            ))}
          </select>
        </div>
        {msg && (
          <div className={`callout ${msg.ok ? "info" : "warn"}`} role="status">
            {msg.text}
          </div>
        )}
        {orders.map((o) => {
          const eb = ebooks.ebooks.get(o.ebookId)!;
          const stage = funnel.stage(o.id);
          const a = funnel.assessments.get(o.id);
          const b = funnel.bookings.get(o.id);
          const dl = funnel.canDownload(o.id, userId);
          return (
            <Panel
              key={o.id}
              title={eb.title}
              hint={`${rp(o.price)} · ${FUNNEL_LABEL[stage]}`}
            >
              <div className="stepper">
                {STEPS.map((s, i) => {
                  const idx = STEPS.indexOf(stage as FunnelStage);
                  return (
                    <span
                      key={s}
                      className={idx === i ? "on" : idx > i ? "done" : ""}
                    >
                      {i + 1}. {STEP_LABEL[s]}
                    </span>
                  );
                })}
              </div>
              {stage === "menunggu_bayar" && (
                <p className="muted">
                  Menunggu pembayaran lewat Xendit. Langkah berikutnya terbuka
                  setelah pembayaran diterima.
                </p>
              )}

              {o.status === "lunas" && !a && (
                <div style={{ display: "grid", gap: 12 }}>
                  <b>Asesmen singkat ({ASSESSMENT.length} pertanyaan)</b>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Untuk menyesuaikan materi belajar Anda. Ini bukan tes
                    lulus/gagal dan bukan penilaian profil risiko investasi.
                  </p>
                  {ASSESSMENT.map((q) => (
                    <fieldset
                      key={q.id}
                      style={{ border: 0, padding: 0, margin: 0 }}
                    >
                      <legend style={{ fontWeight: 600, marginBottom: 4 }}>
                        {q.text}
                      </legend>
                      {q.options.map((op) => (
                        <label
                          key={op.value}
                          className="check"
                          style={{ padding: "3px 0" }}
                        >
                          <input
                            type="radio"
                            name={`as-${o.id}-${q.id}`}
                            id={`as-${o.id}-${q.id}-${op.value}`}
                            checked={ans[q.id] === op.value}
                            onChange={() =>
                              setAns({ ...ans, [q.id]: op.value })
                            }
                          />
                          <span>{op.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <button
                    className="btn-primary"
                    disabled={Object.keys(ans).length < ASSESSMENT.length}
                    onClick={() =>
                      act(
                        () =>
                          `Asesmen tersimpan. Tingkat belajar: ${LEVEL_LABEL[funnel.submitAssessment(o.id, userId, ans, now).level]}. E-book sudah dapat diunduh.`,
                      )
                    }
                  >
                    Kirim asesmen
                  </button>
                </div>
              )}

              {a && (
                <div style={{ display: "grid", gap: 14 }}>
                  <p>
                    Tingkat belajar:{" "}
                    <Badge tone="info">{LEVEL_LABEL[a.level]}</Badge>
                  </p>
                  <div>
                    <button
                      className="btn-secondary"
                      disabled={!dl.ok}
                      onClick={() =>
                        act(
                          () =>
                            `Prototipe: tautan unduh ${eb.file!.name} dibuat oleh server dan berlaku singkat.`,
                        )
                      }
                    >
                      Unduh e-book (PDF)
                    </button>
                    {!dl.ok && (
                      <span
                        className="muted"
                        style={{ marginLeft: 8, fontSize: 13 }}
                      >
                        {dl.reason}
                      </span>
                    )}
                  </div>
                  {eb.webinarOffer && (
                    <div className="field">
                      <label htmlFor={`kelas-${o.id}`}>Kelas webinar RT3</label>
                      {b && (
                        <div className="hint" style={{ marginBottom: 6 }}>
                          Terdaftar:{" "}
                          {dateLabel(b.sessionId.replace("RT3-", ""))} pukul
                          19.00 WIB{b.attended ? " · hadir" : ""}. Anda dapat
                          mengganti kelas sampai {RT3.closeMinutes} menit
                          sebelum mulai.
                        </div>
                      )}
                      {!b?.attended && (
                        <select
                          id={`kelas-${o.id}`}
                          value={b?.sessionId ?? ""}
                          onChange={(e) =>
                            act(() => {
                              const r = funnel.chooseClass(
                                o.id,
                                userId,
                                e.target.value,
                                now,
                              );
                              return `Kelas dipilih: ${r.session.dayLabel}, ${dateLabel(r.session.date)} pukul 19.00 WIB. Tautan Zoom ada di halaman ini menjelang kelas.`;
                            })
                          }
                        >
                          <option value="" disabled>
                            Pilih jadwal
                          </option>
                          {sessions.map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                              disabled={
                                funnel.seatsTaken(s.id) >= RT3.capacity &&
                                b?.sessionId !== s.id
                              }
                            >
                              {s.dayLabel}, {dateLabel(s.date)} · 19.00 WIB (
                              {RT3.capacity - funnel.seatsTaken(s.id)} kursi
                              tersisa)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          );
        })}
        {orders.length > 0 && (
          <Panel
            title="Pesan WhatsApp"
            hint={
              orders[0].waConsent
                ? "Anda setuju menerima pengingat"
                : "Anda tidak menerima pesan WhatsApp"
            }
          >
            {orders.some((o) => o.waConsent) && !stopped ? (
              <>
                <p>
                  Pengingat dikirim ke {orders[0].whatsapp}: konfirmasi
                  pembayaran, sehari sebelum kelas pukul 19.00, dan satu jam
                  sebelum kelas. Tidak ada pesan antara pukul 21.00 dan 07.00
                  WIB.
                </p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 10 }}
                  onClick={() =>
                    act(
                      () => (
                        funnel.wa.inbound(userId, "BERHENTI"),
                        "Anda tidak akan menerima pesan WhatsApp lagi."
                      ),
                    )
                  }
                >
                  Berhenti menerima WhatsApp
                </button>
                <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                  Sama dengan membalas BERHENTI di WhatsApp.
                </p>
              </>
            ) : (
              <p className="muted">
                {stopped
                  ? "Anda sudah berhenti menerima pesan WhatsApp. Pengingat tetap tampil di halaman ini."
                  : "Anda tidak memberi persetujuan pesan WhatsApp. Pengingat tetap tampil di halaman ini."}
              </p>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
