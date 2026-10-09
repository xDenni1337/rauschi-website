// Laufdaten (nur für den Admin). Gespeichert in Netlify Blobs, Store "laufdaten".
//   GET    /api/laeufe            -> { runs: [...], settings: {...} }
//   POST   /api/laeufe            -> { run } oder { runs: [...] } (Import) anlegen
//   PUT    /api/laeufe?id=...     -> { run } ändern
//   PUT    /api/laeufe?settings=1 -> { settings } speichern (z. B. Jahresziel)
//   DELETE /api/laeufe?id=...     -> löschen
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { isAdmin, json, unauthorized } from "../lib/auth.mjs";

const KEY = "data";

function store() {
  return getStore({ name: "laufdaten", consistency: "strong" });
}

async function load() {
  const data = await store().get(KEY, { type: "json" });
  return { runs: [], settings: {}, ...(data || {}) };
}

async function save(data) {
  await store().setJSON(KEY, data);
}

const num = (v, min, max) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Bringt einen Eintrag in eine saubere Form; null = ungültig
function normalize(input, existing = {}) {
  const r = { ...existing, ...input };
  const date = str(r.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const distanceKm = num(r.distanceKm, 0.01, 500);
  const durationSec = num(r.durationSec, 1, 60 * 60 * 48);
  if (distanceKm === null || durationSec === null) return null;

  return {
    id: existing.id || str(r.id, 64) || randomUUID(),
    date,
    startTime: /^\d{2}:\d{2}$/.test(str(r.startTime, 5)) ? str(r.startTime, 5) : "",
    type: str(r.type, 40) || "Outdoor-Lauf",
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationSec: Math.round(durationSec),
    avgHr: num(r.avgHr, 30, 250),
    maxHr: num(r.maxHr, 30, 250),
    elevationM: num(r.elevationM, 0, 10000),
    calories: num(r.calories, 0, 10000),
    cadence: num(r.cadence, 50, 260),
    notes: str(r.notes, 500),
    source: str(r.source, 20) || "manuell",
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const sortRuns = (runs) =>
  runs.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

export default async (req) => {
  if (!isAdmin(req)) return unauthorized();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    return json(200, await load());
  }

  let body = {};
  if (req.method === "POST" || req.method === "PUT") {
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Ungültiges JSON" });
    }
  }

  const data = await load();

  if (req.method === "POST") {
    const incoming = Array.isArray(body.runs) ? body.runs : [body.run];
    const added = [];
    for (const raw of incoming.slice(0, 2000)) {
      const run = normalize({ ...(raw || {}), id: undefined });
      if (run) added.push(run);
    }
    if (!added.length) return json(400, { error: "Kein gültiger Lauf (Datum, Distanz und Zeit sind Pflicht)" });
    data.runs = sortRuns([...data.runs, ...added]);
    await save(data);
    return json(201, { added, skipped: incoming.length - added.length, ...data });
  }

  if (req.method === "PUT" && url.searchParams.has("settings")) {
    const s = body.settings || {};
    data.settings = { ...data.settings, yearGoalKm: num(s.yearGoalKm, 0, 20000) };
    await save(data);
    return json(200, data);
  }

  if (req.method === "PUT") {
    const i = data.runs.findIndex((r) => r.id === id);
    if (i < 0) return json(404, { error: "Lauf nicht gefunden" });
    const run = normalize({ ...(body.run || {}), id: undefined }, data.runs[i]);
    if (!run) return json(400, { error: "Ungültige Werte" });
    data.runs[i] = run;
    sortRuns(data.runs);
    await save(data);
    return json(200, data);
  }

  if (req.method === "DELETE") {
    const before = data.runs.length;
    data.runs = data.runs.filter((r) => r.id !== id);
    if (data.runs.length === before) return json(404, { error: "Lauf nicht gefunden" });
    await save(data);
    return json(200, data);
  }

  return json(405, { error: "Methode nicht erlaubt" });
};

export const config = { path: "/api/laeufe" };
