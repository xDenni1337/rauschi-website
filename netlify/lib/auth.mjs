// Admin-Session für den privaten Bereich.
// Einziges Geheimnis ist die Netlify-Umgebungsvariable ADMIN_PASSWORD.
// Der Schlüssel zum Signieren der Session wird daraus abgeleitet, d. h.
// ein neues Passwort meldet automatisch alle alten Sessions ab.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 Tage

// Netlify stellt Variablen in Functions über Netlify.env bereit, process.env als Rückfall
function password() {
  const v = globalThis.Netlify?.env?.get?.("ADMIN_PASSWORD") ?? process.env.ADMIN_PASSWORD;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function secret() {
  const pw = password();
  if (!pw) return null;
  return createHash("sha256").update("admin-session:" + pw).digest();
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function sign(payload, key) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isConfigured() {
  return Boolean(password());
}

export function checkPassword(input) {
  const pw = password();
  if (!pw || typeof input !== "string") return false;
  input = input.trim();
  // Über Hashes vergleichen, damit die Länge nichts verrät
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}

export function createSessionCookie() {
  const key = secret();
  const payload = b64url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  const token = `${payload}.${sign(payload, key)}`;
  return `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function readCookie(req, name) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export function isAdmin(req) {
  const key = secret();
  const token = readCookie(req, COOKIE);
  if (!key || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload, key))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

export const unauthorized = () => json(401, { error: "Nicht angemeldet" });
