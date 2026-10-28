import { useMemo, useState } from "react";
import {
  EBOOK_PRICE,
  EBOOK_STATUS_LABEL,
  EngineError,
  scanCompliance,
  type Ebook,
  type EbookInput,
  type EbookStatus,
} from "../../engine";
import { Badge, Kpi, Panel } from "../components/ui";
import { dateLabel, rp } from "../format";
import { useDemo } from "../store";

export const STATUS_TONE: Record<
  EbookStatus,
  "good" | "warn" | "bad" | "info" | "mute"
> = {
  draf: "mute",
  diajukan: "info",
  perlu_revisi: "warn",
  disetujui: "good",
  ditolak: "bad",
  ditarik: "bad",
};

const EMPTY: EbookInput = {
  title: "",
  summary: "",
  price: 49_000,
  lpHeadline: "",
  lpBody: "",
  webinarOffer: true,
};

/** Menandai kata berisiko dalam teks (dipakai di Kantor Maya dan Admin). */
export function Highlight({ text }: { text: string }) {
  const flags = scanCompliance(text).map((f) => f.match);
  if (!flags.length) return <>{text}</>;
  const re = new RegExp(
    `(${flags.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  return (
    <>
      {text.split(re).map((part, i) =>
        flags.some((m) => m.toLowerCase() === part.toLowerCase()) ? (
          <mark className="flag" key={i}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function LpPreview({ e }: { e: EbookInput }) {
  return (
    <div className="lp-preview">
      <span className="muted" style={{ fontSize: 12 }}>
        Pratinjau halaman penawaran
      </span>
      <h3>
        <Highlight text={e.lpHeadline || "Judul halaman penawaran"} />
      </h3>
      <p>
        <Highlight text={e.lpBody || "Isi halaman penawaran"} />
      </p>
      <p>
        <b>{e.title || "Judul e-book"}</b> · {rp(e.price || 0)}
      </p>
      {e.webinarOffer && (
        <p className="muted" style={{ fontSize: 13 }}>
          Setelah membeli: isi asesmen, unduh e-book, lalu pilih kelas webinar
          RT3 (Selasa, Rabu, atau Kamis pukul 19.00 WIB).
        </p>
      )}
    </div>
  );
}

/** Dasbor Agent Marketing: e-book dan LP milik Mitra PLS, diajukan untuk diperiksa Perusahaan sebelum tayang. */
export function AgentMarketing({ accId }: { accId: string }) {
  const { engine, ebooks, now, version, bump } = useDemo();
  const acc = engine.accounts.get(accId)!;
  const list = useMemo(() => ebooks.forMitra(accId), [ebooks, accId, version]);
  const [sel, setSel] = useState<string | "baru">(list[0]?.id ?? "baru");
  const current = sel === "baru" ? undefined : ebooks.ebooks.get(sel);
  const [form, setForm] = useState<EbookInput>(current ?? EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pick = (id: string | "baru") => {
    setSel(id);
    const e = id === "baru" ? undefined : ebooks.ebooks.get(id);
    setForm(
      e
        ? {
            title: e.title,
            summary: e.summary,
            price: e.price,
            lpHeadline: e.lpHeadline,
            lpBody: e.lpBody,
            webinarOffer: e.webinarOffer,
          }
        : EMPTY,
    );
    setMsg(null);
  };

  const run = (fn: () => Ebook, ok: string) => {
    try {
      const e = fn();
      setSel(e.id);
      setMsg({ ok: true, text: ok });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof EngineError ? err.message : "Gagal menyimpan.",
      });
    }
    bump();
  };
  const save = () =>
    run(
      () =>
        current
          ? ebooks.update(current.id, accId, form, now)
          : ebooks.create(accId, form, now),
      "Draf disimpan.",
    );
  const submit = () =>
    run(() => {
      const e = current ? ebooks.update(current.id, accId, form, now) : ebooks.create(accId, form, now);
      return ebooks.submit(e.id, accId, now);
    }, "Diajukan. Tim Kepatuhan akan memeriksa sebelum halaman penawaran tayang.");

  const live = list.filter((e) => e.status === "disetujui");
  const paid = [...ebooks.orders.values()].filter(
    (o) => o.sellerId === accId && o.status === "lunas",
  );
  const locked = ebooks.lockedProspects(accId);
  const editable =
    !current ||
    current.status === "draf" ||
    current.status === "perlu_revisi" ||
    current.status === "disetujui";
  const flags = scanCompliance(
    [form.title, form.summary, form.lpHeadline, form.lpBody].join("\n"),
  );
  const lastNote = current?.history.filter((h) => h.note).at(-1);

  return (
    <>
      <div className="callout info" style={{ marginBottom: 14 }}>
        E-book adalah produk milik Anda. Harga {rp(EBOOK_PRICE.min)}–
        {rp(EBOOK_PRICE.max)}, dan hasil penjualannya masuk ke rekening Anda.
        E-book <b>tidak menghasilkan PV, komisi, atau bonus</b>. Fasilitas Agent
        Marketing disediakan Perusahaan tanpa biaya. Setiap e-book dan halaman
        penawaran diperiksa Perusahaan sebelum tayang (Kode Etik Pasal 12).
      </div>
      <div className="kpis">
        <Kpi
          label="E-book tayang"
          value={String(live.length)}
          sub={`${list.length} e-book seluruhnya`}
        />
        <Kpi
          label="Pembeli e-book"
          value={String(paid.length)}
          sub={rp(paid.reduce((a, o) => a + o.price, 0)) + " ke rekening Anda"}
        />
        <Kpi
          label="Calon pengguna"
          value={String(locked.length)}
          sub="Sponsor terkunci kepada Anda"
        />
      </div>

      <div className="row2" style={{ marginTop: 16 }}>
        <Panel
          title={current ? "Ubah e-book" : "E-book baru"}
          hint={
            current
              ? `${EBOOK_STATUS_LABEL[current.status]} · versi ${current.version}`
              : "Draf"
          }
        >
          {msg && (
            <div
              className={`callout ${msg.ok ? "info" : "warn"}`}
              role="status"
              style={{ marginBottom: 12 }}
            >
              {msg.text}
            </div>
          )}
          {lastNote &&
            current &&
            (current.status === "perlu_revisi" ||
              current.status === "ditolak" ||
              current.status === "ditarik") && (
              <div className="callout warn" style={{ marginBottom: 12 }}>
                <b>Catatan pemeriksa ({dateLabel(lastNote.at)}):</b>{" "}
                {lastNote.note}
              </div>
            )}
          {current?.status === "disetujui" && (
            <div style={{ marginBottom: 12 }}>
              <div className="reflink">
                https://affiliatemarketing.network/e/{current.slug}
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                Mengubah isi akan menurunkan halaman ini sampai disetujui lagi.
              </p>
            </div>
          )}
          {!acc.quizPassed && (
            <div className="callout warn" style={{ marginBottom: 12 }}>
              Anda dapat menyusun draf, tetapi pengajuan baru bisa dilakukan
              setelah lulus kuis Kode Etik.
            </div>
          )}
          <fieldset
            disabled={!editable}
            style={{
              border: 0,
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 12,
            }}
          >
            <div className="field">
              <label htmlFor="eb-title">Judul e-book</label>
              <input
                id="eb-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="eb-summary">Ringkasan isi</label>
              <textarea
                id="eb-summary"
                rows={3}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="eb-price">Harga (Rp)</label>
              <input
                id="eb-price"
                type="number"
                min={EBOOK_PRICE.min}
                max={EBOOK_PRICE.max}
                step={EBOOK_PRICE.step}
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
              />
              <div className="hint">
                {rp(EBOOK_PRICE.min)}–{rp(EBOOK_PRICE.max)}, kelipatan{" "}
                {rp(EBOOK_PRICE.step)}.
              </div>
            </div>
            <div className="field">
              <label htmlFor="eb-head">Judul halaman penawaran</label>
              <input
                id="eb-head"
                value={form.lpHeadline}
                onChange={(e) =>
                  setForm({ ...form, lpHeadline: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="eb-body">Isi halaman penawaran</label>
              <textarea
                id="eb-body"
                rows={5}
                value={form.lpBody}
                onChange={(e) => setForm({ ...form, lpBody: e.target.value })}
              />
            </div>
            <label className="check">
              <input
                type="checkbox"
                id="eb-webinar"
                checked={form.webinarOffer}
                onChange={(e) =>
                  setForm({ ...form, webinarOffer: e.target.checked })
                }
              />
              <span>Tawarkan kelas webinar RT3 setelah pembelian</span>
            </label>
          </fieldset>
          {flags.length > 0 && (
            <div className="callout warn" style={{ marginTop: 12 }}>
              <b>Kalimat yang akan diperiksa ketat:</b>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {flags.map((f) => (
                  <li key={f.match}>
                    “{f.match}”: {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <button
              className="btn-secondary"
              onClick={save}
              disabled={!editable}
            >
              Simpan draf
            </button>
            <button
              className="btn-primary"
              onClick={submit}
              disabled={!editable || !acc.quizPassed}
            >
              Ajukan untuk diperiksa
            </button>
          </div>
        </Panel>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Panel title="E-book saya" hint={`${list.length} e-book`}>
            <div className="eb-list">
              <button
                className={`eb-item ${sel === "baru" ? "on" : ""}`}
                onClick={() => pick("baru")}
              >
                <b>+ Buat e-book baru</b>
              </button>
              {list.map((e) => (
                <button
                  key={e.id}
                  className={`eb-item ${sel === e.id ? "on" : ""}`}
                  onClick={() => pick(e.id)}
                >
                  <b>{e.title}</b>
                  <span className="meta">
                    <Badge tone={STATUS_TONE[e.status]}>
                      {EBOOK_STATUS_LABEL[e.status]}
                    </Badge>
                    {rp(e.price)} ·{" "}
                    {
                      ebooks.ordersFor(e.id).filter((o) => o.status === "lunas")
                        .length
                    }{" "}
                    pembeli
                  </span>
                </button>
              ))}
            </div>
          </Panel>
          <LpPreview e={form} />
        </div>
      </div>

      {current && (
        <Panel
          title="Pembeli e-book ini"
          hint="Sponsor pembeli baru terkunci kepada Anda saat pembayaran lunas"
        >
          <div className="table-wrap" style={{ maxHeight: 320 }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Pembeli</th>
                  <th>Dipesan</th>
                  <th>Status</th>
                  <th>WhatsApp</th>
                  <th>Sponsor</th>
                </tr>
              </thead>
              <tbody>
                {ebooks.ordersFor(current.id).map((o) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td className="num">{dateLabel(o.createdAt)}</td>
                    <td>
                      {o.status === "lunas" ? (
                        <Badge tone="good">Lunas</Badge>
                      ) : (
                        <Badge tone="mute">Menunggu bayar</Badge>
                      )}
                    </td>
                    <td>
                      {o.waConsent ? (
                        o.whatsapp
                      ) : (
                        <span className="muted">Tidak setuju dihubungi</span>
                      )}
                    </td>
                    <td>
                      {ebooks.sponsorLocks.get(o.userId)?.sponsorId ===
                      accId ? (
                        <Badge tone="info">Terkunci ke Anda</Badge>
                      ) : (
                        <span className="muted">–</span>
                      )}
                    </td>
                  </tr>
                ))}
                {ebooks.ordersFor(current.id).length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Belum ada pesanan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            Nomor WhatsApp hanya ditampilkan bila pembeli setuju dihubungi.
            Prototipe: pembayaran Xendit dan penerusan dana ke rekening Anda
            belum disambungkan.
          </p>
        </Panel>
      )}
    </>
  );
}
