import { useMemo, useState } from "react";
import {
  EngineError,
  FUNNEL_LABEL,
  maskPhone,
  parseZoomParticipants,
  sessionFor,
  upcomingSessions,
  RT3,
  type WaMessage,
} from "../../engine";
import { Badge, Kpi, Panel } from "../components/ui";
import { dateLabel } from "../format";
import { useDemo } from "../store";

const WA_KIND: Record<WaMessage["kind"], string> = {
  pembayaran_lunas: "Pembayaran lunas",
  pengingat_kelas_h1: "Pengingat H-1",
  pengingat_kelas_1jam: "Pengingat 1 jam",
};
const WA_TONE: Record<WaMessage["status"], "info" | "good" | "mute"> = {
  antre: "info",
  terkirim: "good",
  dibatalkan: "mute",
};

function timeLabel(t: number) {
  return new Date(t).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Kelas webinar RT3 (peserta dan kehadiran) dan antrean WhatsApp pembeli e-book. Izin kelas.kelola. */
export function KelasWhatsApp() {
  const { ebooks, funnel, access, staffId, now, version, bump } = useDemo();
  const sessions = useMemo(() => {
    const ids = new Set([...funnel.bookings.values()].map((b) => b.sessionId));
    for (const s of upcomingSessions(now)) ids.add(s.id);
    return [...ids].sort().map((id) => sessionFor(id.replace("RT3-", ""))!);
  }, [funnel, now, version]);
  const [sid, setSid] = useState(sessions[0]?.id);
  const sel = sessions.find((s) => s.id === sid) ?? sessions[0];
  const booked = sel
    ? [...funnel.bookings.entries()].filter(([, b]) => b.sessionId === sel.id)
    : [];
  const [msg, setMsg] = useState<string | null>(null);
  const started = sel ? now >= sel.startsAt : false;
  const queue = [...funnel.wa.messages].reverse();

  const attend = (orderId: string) => {
    try {
      funnel.markAttendance(sel!.id, [orderId], now);
      access.record(
        staffId,
        "Kehadiran RT3 dicatat",
        now,
        `${sel!.id}: ${orderId}`,
      );
      setMsg(null);
    } catch (e) {
      setMsg(e instanceof EngineError ? e.message : "Gagal mencatat kehadiran");
    }
    bump();
  };

  // Kehadiran otomatis: unggah CSV laporan peserta Zoom (Reports → Usage → Participants).
  const importZoom = async (f: File | undefined) => {
    if (!f || !sel) return;
    try {
      const r = funnel.importZoomAttendance(sel.id, parseZoomParticipants(await f.text()), now);
      access.record(staffId, "Laporan Zoom diimpor", now, `${sel.id}: ${r.hadir.length} hadir`);
      setMsg(
        `Laporan Zoom diimpor: ${r.hadir.length} hadir, ${r.kurang.length} di bawah ${RT3.minAttendMinutes} menit, ${r.tidakTerdaftar.length} surel tidak cocok dengan pesanan.`,
      );
    } catch (e) {
      setMsg(e instanceof EngineError ? e.message : "Laporan Zoom tidak dapat dibaca");
    }
    bump();
  };

  return (
    <>
      <div className="kpis">
        <Kpi
          label="Kelas terjadwal"
          value={String(upcomingSessions(now).length)}
          sub="14 hari ke depan · Selasa, Rabu, Kamis 19.00 WIB"
        />
        <Kpi
          label="Peserta terdaftar"
          value={String(funnel.bookings.size)}
          sub={`Kapasitas ${RT3.capacity} per kelas`}
        />
        <Kpi
          label="Pesan WhatsApp antre"
          value={String(
            funnel.wa.messages.filter((m) => m.status === "antre").length,
          )}
          sub={`${funnel.wa.optedOut.size} pembeli berhenti`}
        />
      </div>
      <div className="row2" style={{ marginTop: 16 }}>
        <Panel
          title="Peserta kelas RT3"
          hint={
            sel
              ? `${sel.dayLabel}, ${dateLabel(sel.date)} · 19.00 WIB`
              : "Belum ada kelas"
          }
        >
          <div className="toolbar">
            <select
              aria-label="Pilih kelas"
              value={sel?.id}
              onChange={(e) => setSid(e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.dayLabel}, {dateLabel(s.date)} ({funnel.seatsTaken(s.id)}{" "}
                  peserta)
                </option>
              ))}
            </select>
            <label className="btn-secondary" style={{ cursor: started ? "pointer" : "not-allowed", opacity: started ? 1 : 0.5 }} title={started ? "Unggah CSV laporan peserta Zoom" : "Laporan diimpor setelah kelas dimulai"}>
              Impor laporan Zoom (CSV)
              <input id="zoom-csv" type="file" accept=".csv,text/csv" hidden disabled={!started} onChange={(e) => void importZoom(e.target.files?.[0])} />
            </label>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
            Peserta dicocokkan lewat surel pesanan; dianggap hadir bila total waktu di Zoom paling sedikit {RT3.minAttendMinutes} menit. Tombol “Tandai hadir” tetap tersedia untuk koreksi.
          </p>
          {msg && (
            <div
              className="callout warn"
              role="status"
              style={{ marginBottom: 10 }}
            >
              {msg}
            </div>
          )}
          <div className="table-wrap" style={{ maxHeight: 360 }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Peserta</th>
                  <th>E-book</th>
                  <th>Tahap</th>
                  <th>Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {booked.map(([orderId, b]) => {
                  const o = ebooks.orders.get(orderId)!;
                  return (
                    <tr key={orderId}>
                      <td>{o.name}</td>
                      <td>{ebooks.ebooks.get(o.ebookId)?.title}</td>
                      <td>{FUNNEL_LABEL[funnel.stage(orderId)]}</td>
                      <td>
                        {b.minutes !== undefined && <span className="muted" style={{ fontSize: 12, marginRight: 6 }}>{b.minutes} menit</span>}
                        {b.attended ? (
                          <Badge tone="good">Hadir</Badge>
                        ) : (
                          <button
                            className="btn-secondary"
                            disabled={!started}
                            title={
                              started
                                ? undefined
                                : "Kehadiran dicatat setelah kelas dimulai"
                            }
                            onClick={() => attend(orderId)}
                          >
                            Tandai hadir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {booked.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Belum ada peserta di kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel
          title="Antrean WhatsApp"
          hint="Hanya pembeli yang setuju; nomor tersamar"
        >
          <div className="table-wrap" style={{ maxHeight: 360 }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Jadwal kirim</th>
                  <th>Jenis</th>
                  <th>Nomor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((m) => (
                  <tr key={m.id} title={m.body}>
                    <td className="num">{timeLabel(m.sendAt)}</td>
                    <td>{WA_KIND[m.kind]}</td>
                    <td className="num">{maskPhone(m.to)}</td>
                    <td>
                      <Badge tone={WA_TONE[m.status]}>
                        {m.status === "antre"
                          ? "Antre"
                          : m.status === "terkirim"
                            ? "Terkirim"
                            : "Dibatalkan"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {queue.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Belum ada pesan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            Jam tenang 21.00–07.00 WIB. Balasan BERHENTI menghentikan semua
            pesan. Prototipe: penyedia WhatsApp belum disambungkan, jadi pesan
            hanya diantrekan.
          </p>
        </Panel>
      </div>
    </>
  );
}
