import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  signWebhook,
  verifyTicket,
  verifyWebhook,
} from "../server/integration";

// Vektor uji di docs/SPESIFIKASI_INTEGRASI_ATLASTRADE.md bagian 6 harus cocok dengan kode server.
const spec = readFileSync(
  new URL("../docs/SPESIFIKASI_INTEGRASI_ATLASTRADE.md", import.meta.url),
  "utf8",
);
const section = spec.slice(spec.indexOf("## 6."), spec.indexOf("## 7."));
const blocks = [...section.matchAll(/```\n([^\n]+)\n```/g)].map((m) => m[1]);
const [ticket, body, header] = blocks;
const TS = /RUJUKAN_TICKET_SECRET = ([^`]+)`/.exec(section)![1];
const WS = /ATLAS_WEBHOOK_SECRET = ([^`]+)`/.exec(section)![1];

describe("Vektor uji spesifikasi atlastrade.io", () => {
  it("tiket contoh sah untuk sponsor MTR-000123 dan kedaluwarsa setelah 72 jam", () => {
    const iat = Date.parse("2026-11-02T03:00:00Z");
    expect(verifyTicket(ticket, TS, iat + 1000)).toMatchObject({
      ok: true,
      ticket: { sponsor: "MTR-000123", iat, exp: iat + 72 * 3600_000 },
    });
    expect(verifyTicket(ticket, TS, iat + 72 * 3600_000 + 1)).toEqual({
      ok: false,
      reason: "kedaluwarsa",
    });
  });

  it("header contoh sama persis dengan tanda tangan server atas isi contoh", () => {
    const sig = header.replace("X-Atlas-Signature: ", "");
    expect(signWebhook(body, WS, 1793589200)).toBe(sig);
    expect(verifyWebhook(body, sig, WS, 1793589200)).toEqual({ ok: true });
    expect(JSON.parse(body).data.ticket).toBe(ticket);
  });
});
