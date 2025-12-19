const { createClient } = require("@supabase/supabase-js");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Use POST" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing Supabase env vars" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const game = String(payload.game || "").trim() || "reaction";
  const name = String(payload.name || "").trim();
  const ms = Number(payload.ms);

  // Basic validation
  if (!name || name.length > 18) return json(400, { error: "Invalid name" });
  if (!Number.isFinite(ms) || ms <= 0 || ms >= 60000) return json(400, { error: "Invalid ms" });
  if (game.length > 30) return json(400, { error: "Invalid game" });

  // Minimal sanitization
  const safeName = name.replace(/[<>]/g, "");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from("scores")
    .insert([{ game, name: safeName, ms }]);

  if (error) return json(500, { error: "DB insert failed", details: error.message });

  return json(200, { ok: true });
};
