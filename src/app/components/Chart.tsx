import { useState, type ReactNode } from "react";

/**
 * Grafik ringan berbasis SVG (tanpa pustaka). Satu sumbu Y, garis tipis, batang berujung bulat,
 * tooltip saat disorot, dan tabel alternatif untuk aksesibilitas.
 */
export interface Series {
  name: string;
  color: string; // var(--series-n)
  values: number[];
}

interface BaseProps {
  labels: string[];
  format: (v: number) => string;
  height?: number;
  title: string;
}

const W = 640;
const PAD = { l: 52, r: 12, t: 12, b: 26 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

function Frame({
  labels,
  format,
  height,
  max,
  children,
  tip,
  onMove,
  onLeave,
}: BaseProps & {
  max: number;
  children: ReactNode;
  tip: ReactNode;
  onMove: (i: number) => void;
  onLeave: () => void;
}) {
  const H = height ?? 220;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const step = Math.max(1, Math.ceil(labels.length / 8));
  return (
    <div className="chart" onMouseLeave={onLeave}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {ticks.map((t) => {
          const y = PAD.t + ih - (t / max) * ih;
          return (
            <g key={t}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y}
                y2={y}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={PAD.l - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--text-3)"
              >
                {format(t)}
              </text>
            </g>
          );
        })}
        {labels.map((l, i) =>
          i % step === 0 ? (
            <text
              key={l + i}
              x={PAD.l + ((i + 0.5) * iw) / labels.length}
              y={H - 6}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-3)"
            >
              {l}
            </text>
          ) : null,
        )}
        {children}
        {labels.map((_, i) => (
          <rect
            key={`hit${i}`}
            x={PAD.l + (i * iw) / labels.length}
            y={PAD.t}
            width={iw / labels.length}
            height={ih}
            fill="transparent"
            onMouseEnter={() => onMove(i)}
            onFocus={() => onMove(i)}
            tabIndex={0}
          />
        ))}
      </svg>
      {tip}
    </div>
  );
}

export function LineChart({
  labels,
  series,
  format,
  height,
  title,
  refLine,
}: BaseProps & {
  series: Series[];
  refLine?: { value: number; label: string };
}) {
  const [hover, setHover] = useState<number | null>(null);
  const H = height ?? 220;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const max = niceMax(
    Math.max(...series.flatMap((s) => s.values), refLine?.value ?? 0) * 1.05,
  );
  const x = (i: number) => PAD.l + ((i + 0.5) * iw) / labels.length;
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const tip =
    hover !== null ? (
      <div
        className="tip"
        style={{
          left: `${(x(hover) / W) * 100}%`,
          top: `${(Math.min(...series.map((s) => y(s.values[hover]))) / H) * 100}%`,
        }}
      >
        <b>{labels[hover]}</b>
        {series.map((s) => (
          <div key={s.name}>
            <i
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 4,
                background: s.color,
                marginRight: 6,
              }}
            />
            {s.name}: <span className="num">{format(s.values[hover])}</span>
          </div>
        ))}
      </div>
    ) : null;
  return (
    <figure style={{ margin: 0 }} aria-label={title}>
      <div className="legend">
        {series.length > 1 &&
          series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        {refLine && (
          <span>
            <i className="ref-dash" />
            {refLine.label}
          </span>
        )}
      </div>
      <Frame
        labels={labels}
        format={format}
        height={height}
        title={title}
        max={max}
        tip={tip}
        onMove={setHover}
        onLeave={() => setHover(null)}
      >
        {refLine && (
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(refLine.value)}
            y2={y(refLine.value)}
            stroke="var(--text-3)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
        )}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.t}
            y2={PAD.t + ih}
            stroke="var(--text-3)"
            strokeWidth={1}
            opacity={0.5}
          />
        )}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            />
            {hover !== null && (
              <circle
                cx={x(hover)}
                cy={y(s.values[hover])}
                r={4.5}
                fill={s.color}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            )}
          </g>
        ))}
      </Frame>
      <DataTable
        labels={labels}
        series={series}
        format={format}
        title={title}
      />
    </figure>
  );
}

export function BarChart({
  labels,
  values,
  color,
  format,
  height,
  title,
  name,
}: BaseProps & { values: number[]; color: string; name: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const H = height ?? 220;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const max = niceMax(Math.max(...values) * 1.05);
  const bw = Math.max(4, iw / labels.length - 6);
  const x = (i: number) =>
    PAD.l + (i * iw) / labels.length + (iw / labels.length - bw) / 2;
  const tip =
    hover !== null ? (
      <div
        className="tip"
        style={{
          left: `${((x(hover) + bw / 2) / W) * 100}%`,
          top: `${((PAD.t + ih - (values[hover] / max) * ih) / H) * 100}%`,
        }}
      >
        <b>{labels[hover]}</b>
        {name}: <span className="num">{format(values[hover])}</span>
      </div>
    ) : null;
  return (
    <figure style={{ margin: 0 }} aria-label={title}>
      <Frame
        labels={labels}
        format={format}
        height={height}
        title={title}
        max={max}
        tip={tip}
        onMove={setHover}
        onLeave={() => setHover(null)}
      >
        {values.map((v, i) => {
          const h = Math.max(0, (v / max) * ih);
          const r = Math.min(4, h, bw / 2);
          const x0 = x(i);
          const y0 = PAD.t + ih - h;
          // Ujung atas membulat 4px, menempel ke garis dasar.
          const d =
            h <= 0
              ? ""
              : `M${x0},${PAD.t + ih} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${PAD.t + ih} Z`;
          return (
            <path
              key={i}
              d={d}
              fill={color}
              opacity={hover === null || hover === i ? 1 : 0.55}
            />
          );
        })}
      </Frame>
      <DataTable
        labels={labels}
        series={[{ name, color, values }]}
        format={format}
        title={title}
      />
    </figure>
  );
}

function DataTable({
  labels,
  series,
  format,
  title,
}: {
  labels: string[];
  series: Series[];
  format: (v: number) => string;
  title: string;
}) {
  return (
    <details style={{ marginTop: 6 }}>
      <summary className="muted" style={{ fontSize: 12, cursor: "pointer" }}>
        Lihat tabel data
      </summary>
      <div className="table-wrap" style={{ maxHeight: 240, marginTop: 6 }}>
        <table className="t">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th>Periode</th>
              {series.map((s) => (
                <th key={s.name} className="r">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l + i}>
                <td>{l}</td>
                {series.map((s) => (
                  <td key={s.name} className="r num">
                    {format(s.values[i])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
