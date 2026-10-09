// Login / Logout / Status für den Admin-Bereich.
//   GET    /api/admin/session  -> { admin: true|false, configured }
//   POST   /api/admin/session  -> { password }  setzt das Session-Cookie
//   DELETE /api/admin/session  -> abmelden
import {
  checkPassword,
  clearSessionCookie,
  createSessionCookie,
  isAdmin,
  isConfigured,
  json,
} from "../lib/auth.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req) => {
  if (req.method === "GET") {
    return json(200, { admin: isAdmin(req), configured: isConfigured() });
  }

  if (req.method === "DELETE") {
    return json(200, { admin: false }, { "Set-Cookie": clearSessionCookie() });
  }

  if (req.method === "POST") {
    if (!isConfigured()) {
      return json(503, { error: "ADMIN_PASSWORD ist in Netlify noch nicht gesetzt." });
    }
    let body = {};
    try {
      body = await req.json();
    } catch {}
    if (!checkPassword(body.password)) {
      await wait(1200); // bremst Durchprobieren aus
      return json(401, { error: "Falsches Passwort" });
    }
    return json(200, { admin: true }, { "Set-Cookie": createSessionCookie() });
  }

  return json(405, { error: "Methode nicht erlaubt" });
};

export const config = { path: "/api/admin/session" };
