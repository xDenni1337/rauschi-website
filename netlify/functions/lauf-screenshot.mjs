// Liest einen Apple-Fitness-Screenshot aus (nur für den Admin).
//   POST /api/lauf-screenshot  { image: <base64>, mediaType: "image/jpeg" }
//   -> { run: { date, distanceKm, durationSec, ... } }
// Ist ANTHROPIC_API_KEY nicht gesetzt, antwortet die Funktion mit 501 und
// die Seite erkennt den Screenshot stattdessen per OCR im Browser.
import Anthropic from "@anthropic-ai/sdk";
import { isAdmin, json, unauthorized } from "../lib/auth.mjs";

const nullable = (type) => ({ type: [type, "null"] });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "isWorkout", "date", "startTime", "type", "distanceKm", "durationSec",
    "avgPaceSecPerKm", "avgHr", "maxHr", "elevationM", "calories", "cadence",
  ],
  properties: {
    isWorkout: { type: "boolean" },
    date: nullable("string"),
    startTime: nullable("string"),
    type: nullable("string"),
    distanceKm: nullable("number"),
    durationSec: nullable("integer"),
    avgPaceSecPerKm: nullable("integer"),
    avgHr: nullable("integer"),
    maxHr: nullable("integer"),
    elevationM: nullable("integer"),
    calories: nullable("integer"),
    cadence: nullable("integer"),
  },
};

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default async (req) => {
  if (!isAdmin(req)) return unauthorized();
  if (req.method !== "POST") return json(405, { error: "Methode nicht erlaubt" });
  if (!process.env.ANTHROPIC_API_KEY) return json(501, { error: "Kein API-Key", fallback: "ocr" });

  let body = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Ungültiges JSON" });
  }
  const mediaType = ALLOWED.has(body.mediaType) ? body.mediaType : null;
  if (!mediaType || typeof body.image !== "string" || body.image.length > 5_500_000) {
    return json(400, { error: "Bild fehlt oder ist zu groß" });
  }

  const today = new Date().toISOString().slice(0, 10);
  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: body.image } },
            {
              type: "text",
              text:
                `This is a screenshot from the Apple Fitness / Health app (often German UI). ` +
                `Extract the running workout shown. Today is ${today}; if the year is not visible, ` +
                `use the most recent date not after today. Rules: date as YYYY-MM-DD, startTime as HH:MM (24h), ` +
                `distanceKm in kilometres, durationSec = workout time ("Trainingszeit") in seconds, ` +
                `avgPaceSecPerKm from the average pace (e.g. 6'25"/km = 385), avgHr/maxHr in bpm ` +
                `("S/min"), elevationM = elevation gain ("Höhengewinn"), calories = active kcal ` +
                `("Aktive Kilokalorien"), cadence in steps per minute ("SPM"), type e.g. "Outdoor-Lauf". ` +
                `Use null for anything not visible. Set isWorkout=false if this is not a workout screenshot.`,
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return json(422, { error: "Der Screenshot konnte nicht ausgewertet werden." });
    }
    const text = response.content.find((b) => b.type === "text")?.text || "{}";
    const r = JSON.parse(text);
    if (!r.isWorkout) return json(422, { error: "Auf dem Bild wurde kein Training erkannt." });

    return json(200, {
      engine: "claude",
      run: {
        date: r.date,
        startTime: r.startTime,
        type: r.type,
        distanceKm: r.distanceKm,
        durationSec:
          r.durationSec ?? (r.avgPaceSecPerKm && r.distanceKm ? Math.round(r.avgPaceSecPerKm * r.distanceKm) : null),
        avgHr: r.avgHr,
        maxHr: r.maxHr,
        elevationM: r.elevationM,
        calories: r.calories,
        cadence: r.cadence,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return json(502, { error: "ANTHROPIC_API_KEY ist ungültig.", fallback: "ocr" });
    }
    if (err instanceof Anthropic.APIError) {
      return json(502, { error: `Erkennung fehlgeschlagen (${err.status}).`, fallback: "ocr" });
    }
    return json(502, { error: "Erkennung fehlgeschlagen.", fallback: "ocr" });
  }
};

export const config = { path: "/api/lauf-screenshot" };
