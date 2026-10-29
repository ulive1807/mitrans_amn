/**
 * Pembuat dokumen Word sederhana untuk draf dokumen resmi Mitrans-Astra.
 * Membutuhkan paket npm `docx` (v9), yang tidak menjadi dependensi aplikasi:
 *   npm i --no-save docx && node scripts/dokumen/rencana-pemasaran.cjs
 *
 * Isi dokumen ditulis sebagai daftar blok:
 *   ["h1", teks] ["h2", teks] ["h3", teks] ["p", teks] ["note", teks]
 *   ["ul", [butir...]] ["ol", [butir...]] ["table", header[], baris[][], lebarRelatif[]]
 *   ["box", [blok...]] ["pagebreak"]
 * Teks boleh memakai **tebal** dan _miring_.
 */
const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} = require("docx");

const FONT = "Calibri";
const ACCENT = "1F4E79";
const CONTENT_WIDTH = 9638; // A4 dengan margin 2 cm

function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last)
      out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**"))
      out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else
      out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length)
    out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

let listInstance = 0;

function build(blocks) {
  const out = [];
  for (const b of blocks) {
    const [kind, a, c, d] = b;
    if (kind === "h1")
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
          children: runs(a),
        }),
      );
    else if (kind === "h1n")
      out.push(
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs(a) }),
      );
    else if (kind === "h2")
      out.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(a) }),
      );
    else if (kind === "h3")
      out.push(
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: runs(a) }),
      );
    else if (kind === "p")
      out.push(new Paragraph({ children: runs(a), spacing: { after: 120 } }));
    else if (kind === "note")
      out.push(
        new Paragraph({
          children: runs(a, { size: 18, color: "555555" }),
          spacing: { after: 120 },
        }),
      );
    else if (kind === "center")
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: runs(a),
          spacing: { after: 120 },
        }),
      );
    else if (kind === "ul")
      for (const item of a)
        out.push(
          new Paragraph({
            numbering: { reference: "bullet", level: 0 },
            children: runs(item),
            spacing: { after: 60 },
          }),
        );
    else if (kind === "ol") {
      const instance = ++listInstance;
      for (const item of a)
        out.push(
          new Paragraph({
            numbering: { reference: "number", level: 0, instance },
            children: runs(item),
            spacing: { after: 60 },
          }),
        );
    } else if (kind === "nl") {
      // Daftar bernomor dengan nomor awal tertentu (mis. lanjutan Pasal 18).
      c.forEach((item, i) =>
        out.push(
          new Paragraph({
            indent: { left: 540, hanging: 360 },
            spacing: { after: 60 },
            children: runs(`${a + i}.  ${item}`),
          }),
        ),
      );
    } else if (kind === "table")
      out.push(
        table(a, c, d),
        new Paragraph({ children: [], spacing: { after: 60 } }),
      );
    else if (kind === "box")
      out.push(box(a), new Paragraph({ children: [], spacing: { after: 60 } }));
    else if (kind === "pagebreak")
      out.push(new Paragraph({ children: [new PageBreak()] }));
    else if (kind === "toc")
      out.push(
        new TableOfContents("Daftar Isi", {
          hyperlink: true,
          headingStyleRange: "1-2",
        }),
      );
    else throw new Error(`Blok tidak dikenal: ${kind}`);
  }
  return out;
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
const borders = { top: border, bottom: border, left: border, right: border };

function widths(rel) {
  const sum = rel.reduce((s, x) => s + x, 0);
  const w = rel.map((x) => Math.floor((x / sum) * CONTENT_WIDTH));
  w[w.length - 1] += CONTENT_WIDTH - w.reduce((s, x) => s + x, 0);
  return w;
}

function cell(text, width, opts = {}) {
  const lines = String(text).split("|");
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill
      ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: lines.map(
      (l) =>
        new Paragraph({
          alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: runs(l, { size: 19, bold: opts.bold, color: opts.color }),
        }),
    ),
  });
}

/** Kolom yang isinya diawali "Rp", angka, atau persen diratakan kanan. */
function isNumeric(s) {
  return (
    /^(Rp|−|-)?[\d.,]+( ?%| PV| jt)?$|^Rp[\d.,]+/.test(String(s).trim()) &&
    !/[a-z]{4,}/.test(String(s))
  );
}

function table(header, rows, rel) {
  const w = widths(rel ?? header.map(() => 1));
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({
        tableHeader: true,
        children: header.map((h, i) =>
          cell(h, w[i], { fill: ACCENT, bold: true, color: "FFFFFF" }),
        ),
      }),
      ...rows.map(
        (r, ri) =>
          new TableRow({
            children: r.map((v, i) => {
              const s = String(v);
              const bold = s.startsWith("**") && s.endsWith("**");
              return cell(bold ? s.slice(2, -2) : s, w[i], {
                fill: ri % 2 ? "F2F6FA" : undefined,
                right: i > 0 && isNumeric(bold ? s.slice(2, -2) : s),
                bold,
              });
            }),
          }),
      ),
    ],
  });
}

function box(blocks) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: ACCENT },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT },
              left: { style: BorderStyle.SINGLE, size: 24, color: ACCENT },
              right: { style: BorderStyle.SINGLE, size: 6, color: ACCENT },
            },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { fill: "EAF1F8", type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: build(blocks),
          }),
        ],
      }),
    ],
  });
}

function cover(lines) {
  const out = [new Paragraph({ children: [], spacing: { before: 1800 } })];
  for (const [text, size, opts = {}] of lines)
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: opts.after ?? 200 },
        children: runs(text, {
          size,
          bold: opts.bold,
          color: opts.color ?? (opts.bold ? ACCENT : "333333"),
        }),
      }),
    );
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

async function write(file, { title, coverLines, blocks }) {
  listInstance = 0;
  const doc = new Document({
    creator: "PT MITRANS (draf)",
    title,
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, font: FONT, color: ACCENT },
          paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 25, bold: true, font: FONT, color: ACCENT },
          paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 22, bold: true, font: FONT, color: "333333" },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullet",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 540, hanging: 270 } } },
            },
          ],
        },
        {
          reference: "number",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 540, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${title} · DRAF`,
                    size: 16,
                    color: "808080",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Halaman ", size: 16, color: "808080" }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: "808080",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [...cover(coverLines), ...build(blocks)],
      },
    ],
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, await Packer.toBuffer(doc));
  console.log("Ditulis:", file);
}

module.exports = {
  write,
  OUT_DIR: path.join(__dirname, "..", "..", "docs", "dokumen-resmi"),
};
