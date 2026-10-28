/**
 * Menjalankan API server: `npm run server`.
 *
 * Variabel lingkungan (hanya di server, jangan berawalan VITE_):
 *   CLERK_JWT_KEY            kunci publik PEM dari dasbor Clerk (verifikasi tanpa jaringan), dan/atau
 *   CLERK_SECRET_KEY         secret key Clerk (JWKS + membaca publicMetadata bila token tidak membawa klaim metadata)
 *   CLERK_AUTHORIZED_PARTIES asal situs yang sah, dipisah koma, mis. https://mitrans.id,https://staging.mitrans.id
 *   PORT (8787), HOST (127.0.0.1)
 * Integrasi atlastrade.io (opsional; aktif hanya bila ketiganya diisi):
 *   RUJUKAN_TICKET_SECRET    rahasia tiket rujukan, paling sedikit 32 karakter, sama dengan di atlastrade.io
 *   ATLAS_WEBHOOK_SECRET     rahasia tanda tangan webhook, paling sedikit 32 karakter, berbeda dari rahasia tiket
 *   ATLAS_CHECKOUT_URL       alamat checkout Lisensi, mis. https://www.atlastrade.io/checkout
 * Server menolak berjalan bila konfigurasi tidak aman (fail-closed).
 */
import { createServer } from "node:http";
import { createApp } from "./app";
import { clerkAuthenticator } from "./session";

export function readConfig(env: NodeJS.ProcessEnv) {
  const errors: string[] = [];
  const jwtKey = env.CLERK_JWT_KEY?.trim() || undefined;
  const secretKey = env.CLERK_SECRET_KEY?.trim() || undefined;
  const authorizedParties = (env.CLERK_AUTHORIZED_PARTIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!jwtKey && !secretKey)
    errors.push("Isi CLERK_JWT_KEY atau CLERK_SECRET_KEY.");
  if (!authorizedParties.length)
    errors.push("Isi CLERK_AUTHORIZED_PARTIES dengan asal situs yang sah.");
  for (const p of authorizedParties)
    if (!/^https?:\/\/[^/\s]+$/.test(p))
      errors.push(
        `Asal tidak sah: ${p} (contoh benar: https://mitrans.id, tanpa garis miring di akhir)`,
      );
  if (
    env.NODE_ENV === "production" &&
    authorizedParties.some((p) => p.startsWith("http://"))
  )
    errors.push("Di produksi, asal situs wajib https.");
  if (secretKey && !/^sk_(test|live)_/.test(secretKey))
    errors.push("CLERK_SECRET_KEY tidak berformat sk_test_/sk_live_.");
  if (env.NODE_ENV === "production" && secretKey?.startsWith("sk_test_"))
    errors.push("Di produksi, pakai sk_live_.");
  const ticketSecret = env.RUJUKAN_TICKET_SECRET?.trim() || undefined;
  const webhookSecret = env.ATLAS_WEBHOOK_SECRET?.trim() || undefined;
  const checkoutUrl = env.ATLAS_CHECKOUT_URL?.trim() || undefined;
  let integration: { ticketSecret: string; webhookSecret: string; checkoutUrl: string } | undefined;
  if (ticketSecret || webhookSecret || checkoutUrl) {
    if (!ticketSecret || !webhookSecret || !checkoutUrl)
      errors.push("Integrasi atlastrade.io: isi RUJUKAN_TICKET_SECRET, ATLAS_WEBHOOK_SECRET, dan ATLAS_CHECKOUT_URL sekaligus.");
    else {
      if (ticketSecret.length < 32 || webhookSecret.length < 32)
        errors.push("Rahasia integrasi minimal 32 karakter.");
      if (ticketSecret === webhookSecret)
        errors.push("Rahasia tiket dan rahasia webhook harus berbeda.");
      if (!/^https?:\/\/[^\s]+$/.test(checkoutUrl))
        errors.push("ATLAS_CHECKOUT_URL tidak sah.");
      else if (env.NODE_ENV === "production" && !checkoutUrl.startsWith("https://"))
        errors.push("Di produksi, ATLAS_CHECKOUT_URL wajib https.");
      integration = { ticketSecret, webhookSecret, checkoutUrl };
    }
  }
  return {
    errors,
    integration,
    jwtKey,
    secretKey,
    authorizedParties,
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? "127.0.0.1",
  };
}

async function main() {
  const cfg = readConfig(process.env);
  if (cfg.errors.length) {
    console.error("Server tidak dijalankan:\n- " + cfg.errors.join("\n- "));
    process.exit(1);
  }
  const authenticate = await clerkAuthenticator(cfg);
  const app = createApp({ authenticate, corsOrigins: cfg.authorizedParties, integration: cfg.integration });
  createServer((req, res) => void app(req, res)).listen(
    cfg.port,
    cfg.host,
    () => {
      console.log(
        `API Mitra PLS di http://${cfg.host}:${cfg.port} · asal sah: ${cfg.authorizedParties.join(", ")}`,
      );
      console.log(
        `Integrasi atlastrade.io: ${cfg.integration ? `aktif · checkout ${cfg.integration.checkoutUrl}` : "tidak aktif"}`,
      );
      console.log(
        `Verifikasi: ${cfg.jwtKey ? "CLERK_JWT_KEY (tanpa jaringan)" : "JWKS lewat CLERK_SECRET_KEY"} · peran: klaim metadata${cfg.secretKey ? " atau Backend API" : " saja"}`,
      );
    },
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  void main();
