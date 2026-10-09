// Lauf-Dashboard (/admin/laufen/)
// Daten kommen von /api/laeufe (nur mit Admin-Session).
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const DAY = 86400000;

  // ---------- Texte (Deutsch / Englisch, je nach <html lang>) ----------
  const LANG = document.documentElement.lang === "en" ? "en" : "de";
  const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const STR = {
    de: {
      locale: "de-DE",
      months: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
      weekdays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
      dateFmt: (d, m, y) => `${d}. ${m}${y ? " " + y : ""}`,
      runs: (n) => pl(n, "Lauf", "Läufe"),
      weeks: (n) => pl(n, "Woche", "Wochen"),
      week: "KW",
      weekFrom: (w, d) => `KW ${w} (ab ${d})`,
      vsBefore: "ggü. davor",
      kpi: ["Läufe", "Distanz", "Laufzeit", "Ø Pace", "Ø Distanz", "Ø Puls", "Höhenmeter", "Aktive kcal"],
      bpm: "S/min",
      distPer: { day: "Distanz pro Tag", week: "Distanz pro Woche", month: "Distanz pro Monat" },
      noRuns: "Keine Läufe im Zeitraum.",
      noRunsYet: "Noch keine Läufe im Zeitraum.",
      needTwo: "Für einen Verlauf braucht es mindestens zwei Läufe im Zeitraum.",
      avgPace: "Ø Pace",
      last5: "Ø letzte 5",
      avgHr: "Ø Puls",
      noRun: "kein Lauf",
      ariaDist: "Balkendiagramm Distanz",
      ariaPace: "Pace-Verlauf",
      ariaHeat: "Aktivitätskalender",
      heatDays: ["Mo", "", "Mi", "", "Fr", "", ""],
      rec: {
        longest: "Längster Lauf",
        fastest: "Schnellste Pace (ab 3 km)",
        best: (d) => `Beste ${d === 21.1 ? "Halbmarathon" : d + " km"}-Zeit*`,
        mostWeek: "Meiste km in einer Woche",
        streak: "Längste Serie",
        streakSub: "mit mind. einem Lauf",
        footnote: "* hochgerechnet aus der Ø-Pace eines mindestens so langen Laufs",
      },
      goal: {
        title: (y) => `Jahresziel ${y}`,
        of: "von",
        target: "Soll heute",
        ahead: "vor dem Plan",
        behind: "hinter dem Plan",
        left: (a, b) => `Noch ${a}, also etwa ${b} pro Woche`,
        forecast: (f) => `Prognose bei aktuellem Tempo: ${f}`,
        none: "Noch kein Ziel gesetzt.",
        soFar: (km, y, f) => `Bisher ${km} in ${y}, Prognose ${f}.`,
        thisWeek: "Diese Woche",
        streak: "Wochen-Serie",
      },
      table: {
        edit: "Bearbeiten",
        del: "Löschen",
        less: "Weniger anzeigen",
        all: (n) => `Alle ${n} Läufe anzeigen`,
        confirmDel: (d, km) => `Lauf vom ${d} (${km}) löschen?`,
      },
      rangeLabel: (a, b, n) => `${a} bis ${b} · ${n}`,
      dialog: { add: "Lauf hinzufügen", edit: "Lauf bearbeiten", more: (n) => `Noch ${n} weitere Screenshots`, required: "Datum, Distanz und Zeit werden gebraucht." },
      defaultType: "Outdoor-Lauf",
      indoorType: "Indoor-Lauf",
      shot: {
        unreadable: "Bild konnte nicht gelesen werden.",
        reading: "Erkenne Werte …",
        ocr: "Erkenne Werte im Browser (OCR) … das dauert beim ersten Mal etwas.",
        ocrFailed: "OCR konnte nicht geladen werden.",
        fields: { date: "Datum", dist: "Distanz", time: "Zeit" },
        missing: (e, m) => `Erkannt per ${e}. Nicht gefunden: ${m}. Bitte ergänzen.`,
        ok: (e) => `Erkannt per ${e}. Bitte kurz prüfen und speichern.`,
        manual: "Du kannst die Werte auch von Hand eintragen.",
        ai: "KI",
      },
      csv: {
        head: ["Datum", "Startzeit", "Art", "Distanz (km)", "Zeit", "Pace (min/km)", "Ø Puls", "Max Puls", "Höhenmeter", "Aktive kcal", "Schrittfrequenz", "Notiz"],
        file: "laeufe",
        none: "In der Datei wurden keine Läufe gefunden.",
        confirm: (n) => `${n} Läufe importieren?`,
        done: (n, skip) => `${n} Läufe importiert${skip ? `, ${skip} übersprungen (Datum, Distanz oder Zeit fehlte)` : ""}.`,
      },
      notLoggedIn: "Nicht angemeldet",
      error: (s) => `Fehler ${s}`,
      loadFailed: (m) => `Konnte Daten nicht laden: ${m}`,
      adminHome: "/admin/",
    },
    en: {
      locale: "en-GB",
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      dateFmt: (d, m, y) => `${d} ${m}${y ? " " + y : ""}`,
      runs: (n) => pl(n, "run", "runs"),
      weeks: (n) => pl(n, "week", "weeks"),
      week: "W",
      weekFrom: (w, d) => `Week ${w} (from ${d})`,
      vsBefore: "vs. previous",
      kpi: ["Runs", "Distance", "Time", "Avg pace", "Avg distance", "Avg heart rate", "Elevation", "Active kcal"],
      bpm: "bpm",
      distPer: { day: "Distance per day", week: "Distance per week", month: "Distance per month" },
      noRuns: "No runs in this period.",
      noRunsYet: "No runs in this period yet.",
      needTwo: "A trend needs at least two runs in the period.",
      avgPace: "Avg pace",
      last5: "Avg last 5",
      avgHr: "Avg HR",
      noRun: "no run",
      ariaDist: "Bar chart of distance",
      ariaPace: "Pace trend",
      ariaHeat: "Activity calendar",
      heatDays: ["Mon", "", "Wed", "", "Fri", "", ""],
      rec: {
        longest: "Longest run",
        fastest: "Fastest pace (3 km+)",
        best: (d) => `Best ${d === 21.1 ? "half marathon" : d + " km"} time*`,
        mostWeek: "Most km in a week",
        streak: "Longest streak",
        streakSub: "with at least one run",
        footnote: "* projected from the average pace of a run at least that long",
      },
      goal: {
        title: (y) => `Goal for ${y}`,
        of: "of",
        target: "Target today",
        ahead: "ahead of plan",
        behind: "behind plan",
        left: (a, b) => `${a} to go, about ${b} per week`,
        forecast: (f) => `Forecast at current rate: ${f}`,
        none: "No goal set yet.",
        soFar: (km, y, f) => `${km} so far in ${y}, forecast ${f}.`,
        thisWeek: "This week",
        streak: "Week streak",
      },
      table: {
        edit: "Edit",
        del: "Delete",
        less: "Show less",
        all: (n) => `Show all ${n} runs`,
        confirmDel: (d, km) => `Delete the run from ${d} (${km})?`,
      },
      rangeLabel: (a, b, n) => `${a} to ${b} · ${n}`,
      dialog: { add: "Add run", edit: "Edit run", more: (n) => `${n} more screenshots`, required: "Date, distance and time are required." },
      defaultType: "Outdoor run",
      indoorType: "Indoor run",
      shot: {
        unreadable: "Could not read the image.",
        reading: "Reading values …",
        ocr: "Reading values in the browser (OCR) … the first time takes a moment.",
        ocrFailed: "Could not load OCR.",
        fields: { date: "date", dist: "distance", time: "time" },
        missing: (e, m) => `Read via ${e}. Not found: ${m}. Please fill in.`,
        ok: (e) => `Read via ${e}. Please check and save.`,
        manual: "You can also enter the values by hand.",
        ai: "AI",
      },
      csv: {
        head: ["Date", "Start time", "Type", "Distance (km)", "Time", "Pace (min/km)", "Avg HR", "Max HR", "Elevation", "Active kcal", "Cadence", "Notes"],
        file: "runs",
        none: "No runs found in the file.",
        confirm: (n) => `Import ${n} runs?`,
        done: (n, skip) => `${n} runs imported${skip ? `, ${skip} skipped (date, distance or time missing)` : ""}.`,
      },
      notLoggedIn: "Not logged in",
      error: (s) => `Error ${s}`,
      loadFailed: (m) => `Could not load data: ${m}`,
      adminHome: "/en/admin/",
    },
  };
  const T = STR[LANG];
  const MONTHS = T.months;
  const WEEKDAYS = T.weekdays;

  let runs = [];
  let settings = {};
  let range = readRange();

  // ---------- Formatierung ----------
  const nf = (d) => new Intl.NumberFormat(T.locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtKm = (km, d = 1) => `${nf(d).format(km)} km`;
  const fmtInt = (n) => nf(0).format(n);

  function fmtDuration(sec, long) {
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (long) return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  }

  // immer h:mm:ss, fürs Eingabefeld
  function fmtHms(sec) {
    const s = Math.round(sec);
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function fmtPace(secPerKm) {
    if (!secPerKm || !isFinite(secPerKm)) return "–";
    const r = Math.round(secPerKm);
    return `${Math.floor(r / 60)}'${String(r % 60).padStart(2, "0")}"`;
  }

  const pace = (r) => r.durationSec / r.distanceKm;

  // ---------- Datum (lokal, als YYYY-MM-DD) ----------
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseIso = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const today = () => iso(new Date());
  const addDays = (s, n) => {
    const d = parseIso(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  };
  const daysBetween = (a, b) => Math.round((parseIso(b) - parseIso(a)) / DAY);
  const fmtDate = (s, withYear = true) => {
    const d = parseIso(s);
    return T.dateFmt(d.getDate(), MONTHS[d.getMonth()], withYear ? d.getFullYear() : null);
  };
  const weekStart = (s) => {
    const d = parseIso(s);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return iso(d);
  };
  function isoWeek(s) {
    const d = parseIso(s);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const jan4 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - jan4) / DAY - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  }

  // ---------- Parser für Eingaben ----------
  function parseNum(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().replace(/\s/g, "");
    if (!s) return null;
    const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
    return isFinite(n) ? n : null;
  }

  function parseDuration(v) {
    const s = String(v || "").trim();
    if (!s) return null;
    if (/^\d+([.,]\d+)?$/.test(s)) return Math.round(parseNum(s) * 60); // reine Minuten
    const parts = s.split(":").map((p) => Number(p));
    if (parts.some((p) => !isFinite(p))) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }

  function parsePace(v) {
    const m = String(v || "").match(/(\d{1,2})\s*[:'’′]\s*(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  // ---------- API ----------
  async function api(path, opts = {}) {
    const r = await fetch(path, {
      credentials: "same-origin",
      headers: opts.body ? { "Content-Type": "application/json" } : {},
      ...opts,
    });
    if (r.status === 401) {
      location.replace(T.adminHome + "?next=" + encodeURIComponent(location.pathname));
      throw new Error(T.notLoggedIn);
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(data.error || T.error(r.status));
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function setData(data) {
    runs = (data.runs || []).slice();
    settings = data.settings || {};
    render();
  }

  // ---------- Zeitraum ----------
  function readRange() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem("lauf_range") || "null");
    } catch {}
    return saved && saved.key ? saved : { key: "12m" };
  }

  function storeRange() {
    try {
      localStorage.setItem("lauf_range", JSON.stringify(range));
    } catch {}
  }

  function resolveRange() {
    const t = today();
    const first = runs.length ? runs[0].date : t;
    const y = new Date().getFullYear();
    switch (range.key) {
      case "7d": return { from: addDays(t, -6), to: t };
      case "30d": return { from: addDays(t, -29), to: t };
      case "3m": return { from: addDays(t, -90), to: t };
      case "ytd": return { from: `${y}-01-01`, to: t };
      case "lastyear": return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
      case "all": return { from: first < t ? first : t, to: t, all: true };
      case "custom": {
        const from = range.from || addDays(t, -29);
        const to = range.to || t;
        return from <= to ? { from, to } : { from: to, to: from };
      }
      default: return { from: addDays(t, -364), to: t };
    }
  }

  const inRange = (r, { from, to }) => r.date >= from && r.date <= to;

  // ---------- Kennzahlen ----------
  function stats(list) {
    const km = list.reduce((a, r) => a + r.distanceKm, 0);
    const sec = list.reduce((a, r) => a + r.durationSec, 0);
    const hr = list.filter((r) => r.avgHr);
    const hrAvg = hr.length
      ? hr.reduce((a, r) => a + r.avgHr * r.durationSec, 0) / hr.reduce((a, r) => a + r.durationSec, 0)
      : null;
    return {
      count: list.length,
      km,
      sec,
      pace: km ? sec / km : null,
      avgKm: list.length ? km / list.length : null,
      hr: hrAvg,
      // null, wenn kein Lauf den Wert hat (z. B. importierte Läufe)
      elev: list.some((r) => r.elevationM != null) ? list.reduce((a, r) => a + (r.elevationM || 0), 0) : null,
      kcal: list.some((r) => r.calories != null) ? list.reduce((a, r) => a + (r.calories || 0), 0) : null,
    };
  }

  function delta(cur, prev, lowerIsBetter) {
    if (prev === null || prev === undefined || !cur || !prev) return "";
    const pct = ((cur - prev) / prev) * 100;
    if (Math.abs(pct) < 0.5) return `<span class="delta">± 0 % ${T.vsBefore}</span>`;
    const better = lowerIsBetter ? pct < 0 : pct > 0;
    const arrow = pct > 0 ? "▲" : "▼";
    return `<span class="delta ${better ? "good" : "bad"}"><span aria-hidden="true">${arrow}</span> ${nf(0).format(Math.abs(pct))} % ${T.vsBefore}</span>`;
  }

  function renderKpis(cur, prev) {
    const p = prev || {};
    const tiles = [
      [fmtInt(cur.count), delta(cur.count, p.count)],
      [fmtKm(cur.km), delta(cur.km, p.km)],
      [fmtDuration(cur.sec, true), delta(cur.sec, p.sec)],
      [cur.pace ? `${fmtPace(cur.pace)} /km` : "–", delta(cur.pace, p.pace, true)],
      [cur.avgKm ? fmtKm(cur.avgKm, 2) : "–", delta(cur.avgKm, p.avgKm)],
      [cur.hr ? `${fmtInt(cur.hr)} ${T.bpm}` : "–", ""],
      [cur.elev != null ? `${fmtInt(cur.elev)} m` : "–", delta(cur.elev, p.elev)],
      [cur.kcal != null ? fmtInt(cur.kcal) : "–", delta(cur.kcal, p.kcal)],
    ];
    $("kpis").innerHTML = tiles
      .map(([value, d], i) => [T.kpi[i], value, d])
      .map(([label, value, d]) => `<div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p>${d}</div>`)
      .join("");
  }

  // ---------- Tooltip ----------
  const tip = $("tooltip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let left = x + 14;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    let top = y - h - 12;
    if (top < 8) top = y + 16;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${top}px`;
  }
  const hideTip = () => (tip.hidden = true);

  // ---------- SVG-Helfer ----------
  const NS = "http://www.w3.org/2000/svg";
  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function niceTicks(max, count = 4) {
    if (max <= 0) return [0, 1];
    const raw = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const ticks = [];
    for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  function emptyChart(host, text) {
    host.innerHTML = `<p class="chart-empty muted">${text}</p>`;
  }

  // ---------- Distanz pro Tag/Woche/Monat ----------
  function buckets(list, { from, to }) {
    const span = daysBetween(from, to) + 1;
    const unit = span <= 31 ? "day" : span <= 190 ? "week" : "month";
    const keyOf = (d) => (unit === "day" ? d : unit === "week" ? weekStart(d) : d.slice(0, 7));
    const out = [];
    const map = new Map();
    let cur = unit === "week" ? weekStart(from) : unit === "month" ? from.slice(0, 7) + "-01" : from;
    while (cur <= to) {
      const k = keyOf(cur);
      const b = { key: k, start: cur, km: 0, count: 0, sec: 0 };
      out.push(b);
      map.set(k, b);
      if (unit === "day") cur = addDays(cur, 1);
      else if (unit === "week") cur = addDays(cur, 7);
      else {
        const d = parseIso(cur);
        d.setMonth(d.getMonth() + 1);
        cur = iso(d);
      }
    }
    for (const r of list) {
      const b = map.get(keyOf(r.date));
      if (b) {
        b.km += r.distanceKm;
        b.sec += r.durationSec;
        b.count++;
      }
    }
    return { unit, list: out };
  }

  function bucketLabel(b, unit, short) {
    const d = parseIso(b.start);
    if (unit === "day") return short ? `${d.getDate()}.` : `${WEEKDAYS[d.getDay()]}, ${fmtDate(b.start)}`;
    if (unit === "week") return short ? `${T.week} ${isoWeek(b.start)}` : T.weekFrom(isoWeek(b.start), fmtDate(b.start));
    return short ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function renderDistChart(list, r) {
    const host = $("distChart");
    const { unit, list: bs } = buckets(list, r);
    $("distTitle").textContent = T.distPer[unit];
    if (!list.length) return emptyChart(host, T.noRuns);

    const W = Math.max(host.clientWidth, 280);
    const H = 220;
    const m = { t: 10, r: 8, b: 26, l: 40 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    const ticks = niceTicks(Math.max(...bs.map((b) => b.km)));
    const yMax = ticks[ticks.length - 1];
    const y = (v) => m.t + ih - (v / yMax) * ih;
    const slot = iw / bs.length;
    const bw = Math.max(2, Math.min(28, slot * 0.7));

    host.innerHTML = "";
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": T.ariaDist }, host);
    for (const t of ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "grid" }, svg);
      el("text", { x: m.l - 6, y: y(t) + 4, class: "axis", "text-anchor": "end" }, svg).textContent = nf(0).format(t);
    }
    const every = Math.ceil(bs.length / Math.floor(iw / 44));
    bs.forEach((b, i) => {
      const cx = m.l + slot * i + slot / 2;
      if (b.km > 0) {
        const h = Math.max(2, y(0) - y(b.km));
        const x = cx - bw / 2;
        const top = y(0) - h;
        const rad = Math.min(4, bw / 2, h);
        // oben abgerundet, unten gerade auf der Grundlinie
        el("path", {
          class: "bar",
          d: `M${x},${y(0)} V${top + rad} Q${x},${top} ${x + rad},${top} H${x + bw - rad} Q${x + bw},${top} ${x + bw},${top + rad} V${y(0)} Z`,
        }, svg);
      }
      if (i % every === 0) {
        el("text", { x: cx, y: H - 8, class: "axis", "text-anchor": "middle" }, svg).textContent = bucketLabel(b, unit, true);
      }
      const hit = el("rect", { x: m.l + slot * i, y: m.t, width: slot, height: ih, class: "hit" }, svg);
      const html = `<strong>${bucketLabel(b, unit)}</strong><br>${fmtKm(b.km, 2)} · ${T.runs(b.count)}${b.count ? `<br>${T.avgPace} ${fmtPace(b.sec / b.km)} /km` : ""}`;
      hit.addEventListener("pointermove", (e) => {
        hit.classList.add("on");
        showTip(html, e.clientX, e.clientY);
      });
      hit.addEventListener("pointerleave", () => {
        hit.classList.remove("on");
        hideTip();
      });
    });
    el("line", { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: "baseline" }, svg);
  }

  // ---------- Pace-Verlauf ----------
  function renderPaceChart(list) {
    const host = $("paceChart");
    const pts = list.filter((r) => r.distanceKm >= 1).map((r) => ({ r, t: parseIso(r.date).getTime(), p: pace(r) }));
    if (pts.length < 2) return emptyChart(host, T.needTwo);

    // gleitender Schnitt der letzten 5 Läufe
    pts.forEach((pt, i) => {
      const win = pts.slice(Math.max(0, i - 4), i + 1);
      const km = win.reduce((a, w) => a + w.r.distanceKm, 0);
      pt.avg = win.reduce((a, w) => a + w.r.durationSec, 0) / km;
    });

    const W = Math.max(host.clientWidth, 280);
    const H = 220;
    const m = { t: 12, r: 12, b: 26, l: 44 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    const t0 = pts[0].t;
    const t1 = pts[pts.length - 1].t;
    const ps = pts.map((p) => p.p);
    const step = 15;
    const pMin = Math.floor((Math.min(...ps) - 5) / step) * step;
    const pMax = Math.ceil((Math.max(...ps) + 5) / step) * step;
    const x = (t) => m.l + (t1 === t0 ? iw / 2 : ((t - t0) / (t1 - t0)) * iw);
    const y = (p) => m.t + ((p - pMin) / (pMax - pMin)) * ih; // schneller = weiter oben

    host.innerHTML = "";
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": T.ariaPace }, host);
    const tickStep = Math.max(step, Math.ceil((pMax - pMin) / 4 / step) * step);
    for (let p = pMin; p <= pMax; p += tickStep) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(p), y2: y(p), class: "grid" }, svg);
      el("text", { x: m.l - 6, y: y(p) + 4, class: "axis", "text-anchor": "end" }, svg).textContent = fmtPace(p);
    }
    // Zeitachse: ein paar Daten
    const nLabels = Math.max(2, Math.min(6, Math.floor(iw / 90)));
    for (let i = 0; i < nLabels; i++) {
      const t = t0 + ((t1 - t0) * i) / (nLabels - 1);
      const d = iso(new Date(t));
      el("text", { x: x(t), y: H - 8, class: "axis", "text-anchor": i === 0 ? "start" : i === nLabels - 1 ? "end" : "middle" }, svg).textContent =
        fmtDate(d, (t1 - t0) / DAY > 300);
    }
    for (const pt of pts) el("circle", { cx: x(pt.t), cy: y(pt.p), r: 4, class: "dot" }, svg);
    el("path", { class: "line", d: pts.map((pt, i) => `${i ? "L" : "M"}${x(pt.t)},${y(pt.avg)}`).join(" ") }, svg);

    const cross = el("line", { y1: m.t, y2: m.t + ih, class: "cross", visibility: "hidden" }, svg);
    const ring = el("circle", { r: 6, class: "dot-on", visibility: "hidden" }, svg);
    const hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, class: "hit" }, svg);
    hit.addEventListener("pointermove", (e) => {
      const box = svg.getBoundingClientRect();
      const mx = e.clientX - box.left;
      let best = pts[0];
      for (const pt of pts) if (Math.abs(x(pt.t) - mx) < Math.abs(x(best.t) - mx)) best = pt;
      cross.setAttribute("x1", x(best.t));
      cross.setAttribute("x2", x(best.t));
      ring.setAttribute("cx", x(best.t));
      ring.setAttribute("cy", y(best.p));
      cross.setAttribute("visibility", "visible");
      ring.setAttribute("visibility", "visible");
      const r = best.r;
      showTip(
        `<strong>${fmtDate(r.date)}</strong><br>Pace ${fmtPace(best.p)} /km · ${fmtKm(r.distanceKm, 2)}<br>${T.last5}: ${fmtPace(best.avg)} /km${r.avgHr ? `<br>${T.avgHr} ${r.avgHr}` : ""}`,
        e.clientX,
        e.clientY
      );
    });
    hit.addEventListener("pointerleave", () => {
      cross.setAttribute("visibility", "hidden");
      ring.setAttribute("visibility", "hidden");
      hideTip();
    });
  }

  // ---------- Aktivitätskalender ----------
  function renderHeatmap() {
    const host = $("heatmap");
    const end = today();
    const start = weekStart(addDays(end, -364));
    const perDay = new Map();
    for (const r of runs) perDay.set(r.date, (perDay.get(r.date) || 0) + r.distanceKm);
    const level = (km) => (!km ? 0 : km < 3 ? 1 : km < 6 ? 2 : km < 10 ? 3 : 4);

    const cell = 12;
    const gap = 3;
    const left = 24;
    const top = 16;
    const weeks = Math.ceil((daysBetween(start, end) + 1) / 7);
    const W = left + weeks * (cell + gap);
    const H = top + 7 * (cell + gap);
    host.innerHTML = "";
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": T.ariaHeat }, host);
    T.heatDays.forEach((l, i) => {
      if (l) el("text", { x: 0, y: top + i * (cell + gap) + cell - 2, class: "axis" }, svg).textContent = l;
    });
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const day = addDays(start, w * 7 + d);
        if (day > end) break;
        const mon = parseIso(day).getMonth();
        if (d === 0 && mon !== lastMonth) {
          if (w < weeks - 2) el("text", { x: left + w * (cell + gap), y: 10, class: "axis" }, svg).textContent = MONTHS[mon];
          lastMonth = mon;
        }
        const km = perDay.get(day) || 0;
        const rect = el("rect", {
          x: left + w * (cell + gap),
          y: top + d * (cell + gap),
          width: cell,
          height: cell,
          rx: 3,
          class: `cell h${level(km)}`,
        }, svg);
        rect.addEventListener("pointermove", (e) =>
          showTip(`<strong>${WEEKDAYS[parseIso(day).getDay()]}, ${fmtDate(day)}</strong><br>${km ? fmtKm(km, 2) : T.noRun}`, e.clientX, e.clientY)
        );
        rect.addEventListener("pointerleave", hideTip);
      }
    }
    // ans Ende scrollen, damit die aktuellen Wochen sichtbar sind
    const wrap = host.parentElement;
    wrap.scrollLeft = wrap.scrollWidth;
  }

  // ---------- Bestleistungen ----------
  function weekTotals(list) {
    const m = new Map();
    for (const r of list) m.set(weekStart(r.date), (m.get(weekStart(r.date)) || 0) + r.distanceKm);
    return m;
  }

  function longestWeekStreak(list) {
    const weeks = [...weekTotals(list).keys()].sort();
    let best = 0;
    let cur = 0;
    let prev = null;
    for (const w of weeks) {
      cur = prev && daysBetween(prev, w) === 7 ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = w;
    }
    return best;
  }

  function currentWeekStreak() {
    const weeks = new Set(weekTotals(runs).keys());
    let w = weekStart(today());
    if (!weeks.has(w)) w = addDays(w, -7); // laufende Woche zählt noch nicht als Lücke
    let n = 0;
    while (weeks.has(w)) {
      n++;
      w = addDays(w, -7);
    }
    return n;
  }

  function renderRecords(list) {
    const rows = [];
    const by = (f) => list.slice().sort(f)[0];
    if (list.length) {
      const longest = by((a, b) => b.distanceKm - a.distanceKm);
      rows.push([T.rec.longest, fmtKm(longest.distanceKm, 2), fmtDate(longest.date)]);
      const fast = list.filter((r) => r.distanceKm >= 3);
      if (fast.length) {
        const f = by((a, b) => pace(a) - pace(b));
        rows.push([T.rec.fastest, `${fmtPace(pace(f))} /km`, `${fmtDate(f.date)} · ${fmtKm(f.distanceKm, 1)}`]);
      }
      for (const dist of [5, 10, 21.1]) {
        const c = list.filter((r) => r.distanceKm >= dist);
        if (!c.length) continue;
        const best = c.reduce((a, r) => (pace(r) < pace(a) ? r : a));
        rows.push([T.rec.best(dist), fmtDuration(pace(best) * dist), fmtDate(best.date)]);
      }
      const wk = [...weekTotals(list).entries()].sort((a, b) => b[1] - a[1])[0];
      rows.push([T.rec.mostWeek, fmtKm(wk[1]), `${T.week} ${isoWeek(wk[0])} / ${parseIso(wk[0]).getFullYear()}`]);
      rows.push([T.rec.streak, T.weeks(longestWeekStreak(list)), T.rec.streakSub]);
    }
    $("records").innerHTML = rows.length
      ? rows.map(([k, v, s]) => `<div class="rec"><dt>${k}</dt><dd><strong>${v}</strong><span class="muted">${s}</span></dd></div>`).join("") +
        (rows.some((r) => r[0].includes("*")) ? `<p class="footnote muted">${T.rec.footnote}</p>` : "")
      : `<p class="muted">${T.noRunsYet}</p>`;
  }

  // ---------- Jahresziel ----------
  function renderGoal() {
    const y = new Date().getFullYear();
    $("goalTitle").textContent = T.goal.title(y);
    const goal = settings.yearGoalKm || 0;
    const km = runs.filter((r) => r.date.startsWith(String(y))).reduce((a, r) => a + r.distanceKm, 0);
    const dayOfYear = daysBetween(`${y}-01-01`, today()) + 1;
    const daysInYear = daysBetween(`${y}-01-01`, `${y}-12-31`) + 1;
    const forecast = (km / dayOfYear) * daysInYear;
    const streak = currentWeekStreak();
    const thisWeek = weekTotals(runs).get(weekStart(today())) || 0;

    let html = "";
    if (goal) {
      const pct = Math.min(100, (km / goal) * 100);
      const soll = (goal * dayOfYear) / daysInYear;
      const diff = km - soll;
      const left = Math.max(0, goal - km);
      const weeksLeft = Math.max(1, (daysInYear - dayOfYear) / 7);
      html += `
        <p class="goal-big"><strong>${fmtKm(km, 0)}</strong> <span class="muted">${T.goal.of} ${fmtKm(goal, 0)}</span></p>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}">
          <span style="width:${pct}%"></span><i style="left:${Math.min(100, (soll / goal) * 100)}%" title="${T.goal.target}"></i>
        </div>
        <ul class="goal-facts">
          <li><span class="delta ${diff >= 0 ? "good" : "bad"}">${diff >= 0 ? "▲" : "▼"} ${fmtKm(Math.abs(diff), 0)}</span> ${diff >= 0 ? T.goal.ahead : T.goal.behind}</li>
          <li>${T.goal.left(fmtKm(left, 0), fmtKm(left / weeksLeft, 1))}</li>
          <li>${T.goal.forecast(fmtKm(forecast, 0))}</li>
        </ul>`;
    } else {
      html += `<p class="muted">${T.goal.none} ${km ? T.goal.soFar(fmtKm(km, 0), y, fmtKm(forecast, 0)) : ""}</p>`;
    }
    html += `<div class="mini-stats">
        <div><p class="kpi-label">${T.goal.thisWeek}</p><p class="kpi-value sm">${fmtKm(thisWeek)}</p></div>
        <div><p class="kpi-label">${T.goal.streak}</p><p class="kpi-value sm">${T.weeks(streak)}</p></div>
      </div>`;
    $("goal").innerHTML = html;
  }

  $("goalEdit").addEventListener("click", () => {
    const f = $("goalForm");
    f.hidden = !f.hidden;
    $("goalInput").value = settings.yearGoalKm || "";
    if (!f.hidden) $("goalInput").focus();
  });
  $("goalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = await api("/api/laeufe?settings=1", {
      method: "PUT",
      body: JSON.stringify({ settings: { yearGoalKm: parseNum($("goalInput").value) || null } }),
    });
    $("goalForm").hidden = true;
    setData(data);
  });

  // ---------- Tabelle ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  let showAllRows = false;
  const ROW_LIMIT = 20;

  function renderTable(list) {
    const all = list.slice().reverse();
    const rows = showAllRows ? all : all.slice(0, ROW_LIMIT);
    $("moreRows").hidden = all.length <= ROW_LIMIT;
    $("moreRows").textContent = showAllRows ? T.table.less : T.table.all(all.length);
    $("runRows").innerHTML = rows.length
      ? rows
          .map(
            (r) => `<tr>
          <td>${fmtDate(r.date)}${r.startTime ? `<span class="muted"> ${r.startTime}</span>` : ""}</td>
          <td>${esc(r.type)}</td>
          <td class="num">${fmtKm(r.distanceKm, 2)}</td>
          <td class="num">${fmtDuration(r.durationSec)}</td>
          <td class="num">${fmtPace(pace(r))}</td>
          <td class="num">${r.avgHr ?? "–"}</td>
          <td class="num">${r.elevationM != null ? r.elevationM + " m" : "–"}</td>
          <td class="num">${r.calories ?? "–"}</td>
          <td class="note">${esc(r.notes)}</td>
          <td class="row-actions">
            <button type="button" class="link-btn" data-edit="${esc(r.id)}">${T.table.edit}</button>
            <button type="button" class="link-btn danger" data-del="${esc(r.id)}">${T.table.del}</button>
          </td></tr>`
          )
          .join("")
      : `<tr><td colspan="10" class="muted">${T.noRuns}</td></tr>`;
  }

  $("moreRows").addEventListener("click", () => {
    showAllRows = !showAllRows;
    render();
  });

  $("runRows").addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if (edit) openDialog(runs.find((r) => r.id === edit.dataset.edit));
    if (del) {
      const r = runs.find((x) => x.id === del.dataset.del);
      if (!r || !confirm(T.table.confirmDel(fmtDate(r.date), fmtKm(r.distanceKm, 2)))) return;
      setData(await api(`/api/laeufe?id=${encodeURIComponent(r.id)}`, { method: "DELETE" }));
    }
  });

  // ---------- Gesamtes Rendering ----------
  function render() {
    const r = resolveRange();
    const list = runs.filter((x) => inRange(x, r));
    let prevStats = null;
    if (!r.all) {
      const len = daysBetween(r.from, r.to) + 1;
      const prev = { from: addDays(r.from, -len), to: addDays(r.from, -1) };
      // nur vergleichen, wenn der Vorzeitraum komplett mit Daten abgedeckt ist
      const pl = runs.filter((x) => inRange(x, prev));
      if (pl.length && runs[0].date <= prev.from) prevStats = stats(pl);
    }

    document.querySelectorAll("#rangeChips .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.range === range.key)));
    $("customRange").hidden = range.key !== "custom";
    $("fromDate").value = r.from;
    $("toDate").value = r.to;
    $("rangeLabel").textContent = T.rangeLabel(fmtDate(r.from), fmtDate(r.to), T.runs(list.length));
    $("emptyState").hidden = runs.length > 0;

    renderKpis(stats(list), prevStats);
    renderDistChart(list, r);
    renderPaceChart(list);
    renderRecords(list);
    renderGoal();
    renderHeatmap();
    renderTable(list);
  }

  $("rangeChips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-range]");
    if (!c) return;
    range = { ...range, key: c.dataset.range };
    storeRange();
    render();
  });
  ["fromDate", "toDate"].forEach((id) =>
    $(id).addEventListener("change", () => {
      range = { key: "custom", from: $("fromDate").value, to: $("toDate").value };
      storeRange();
      render();
    })
  );

  let resizeT;
  new ResizeObserver(() => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => runs.length && render(), 120);
  }).observe($("distChart"));

  // ---------- Dialog: Lauf hinzufügen / bearbeiten ----------
  const dialog = $("runDialog");
  const form = $("runForm");
  let editingId = null;
  let queue = [];
  let currentSource = "manuell";

  function fillForm(r = {}) {
    form.date.value = r.date || "";
    form.startTime.value = r.startTime || "";
    form.type.value = r.type || "";
    form.distanceKm.value = r.distanceKm != null ? nf(2).format(r.distanceKm) : "";
    form.duration.value = r.durationSec ? fmtHms(r.durationSec) : "";
    for (const k of ["avgHr", "maxHr", "elevationM", "calories", "cadence"]) form[k].value = r[k] ?? "";
    form.notes.value = r.notes || "";
    updatePace();
  }

  function updatePace() {
    const km = parseNum(form.distanceKm.value);
    const sec = parseDuration(form.duration.value);
    form.pace.value = km && sec ? `${fmtPace(sec / km)} /km` : "";
  }
  form.distanceKm.addEventListener("input", updatePace);
  form.duration.addEventListener("input", updatePace);

  function openDialog(run) {
    editingId = run ? run.id : null;
    currentSource = run ? run.source || "manuell" : "manuell";
    $("dialogTitle").textContent = run ? T.dialog.edit : T.dialog.add;
    $("dropzone").hidden = Boolean(run);
    $("formMsg").textContent = "";
    $("shotStatus").textContent = "";
    $("shotPreview").hidden = true;
    queue = [];
    updateQueueInfo();
    fillForm(run || { date: today() });
    dialog.showModal();
    if (!run) $("dropzone").focus();
  }

  function closeDialog() {
    dialog.close();
    queue = [];
  }

  $("addBtn").addEventListener("click", () => openDialog());
  document.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => openDialog()));
  $("dialogClose").addEventListener("click", closeDialog);

  function updateQueueInfo() {
    $("queueInfo").textContent = queue.length > 1 ? T.dialog.more(queue.length - 1) : "";
    $("skipBtn").hidden = queue.length < 2;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const run = {
      date: form.date.value,
      startTime: form.startTime.value,
      type: form.type.value.trim() || T.defaultType,
      distanceKm: parseNum(form.distanceKm.value),
      durationSec: parseDuration(form.duration.value),
      avgHr: parseNum(form.avgHr.value),
      maxHr: parseNum(form.maxHr.value),
      elevationM: parseNum(form.elevationM.value),
      calories: parseNum(form.calories.value),
      cadence: parseNum(form.cadence.value),
      notes: form.notes.value,
      source: currentSource,
    };
    if (!run.date || !run.distanceKm || !run.durationSec) {
      $("formMsg").textContent = T.dialog.required;
      return;
    }
    $("saveBtn").disabled = true;
    try {
      const data = editingId
        ? await api(`/api/laeufe?id=${encodeURIComponent(editingId)}`, { method: "PUT", body: JSON.stringify({ run }) })
        : await api("/api/laeufe", { method: "POST", body: JSON.stringify({ run }) });
      setData(data);
      nextInQueue();
    } catch (err) {
      $("formMsg").textContent = err.message;
    } finally {
      $("saveBtn").disabled = false;
    }
  });

  $("skipBtn").addEventListener("click", nextInQueue);

  function nextInQueue() {
    queue.shift();
    if (!queue.length) return closeDialog();
    updateQueueInfo();
    recognize(queue[0]);
  }

  // ---------- Screenshot-Erkennung ----------
  const dz = $("dropzone");
  dz.addEventListener("click", (e) => {
    if (!dz.classList.contains("busy") && e.target.id !== "shotInput") $("shotInput").click();
  });
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $("shotInput").click();
    }
  });
  $("shotInput").addEventListener("click", (e) => e.stopPropagation());
  $("shotInput").addEventListener("change", (e) => {
    takeFiles(e.target.files);
    e.target.value = "";
  });
  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("over");
  });
  dz.addEventListener("dragleave", () => dz.classList.remove("over"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("over");
    takeFiles(e.dataTransfer.files);
  });
  document.addEventListener("paste", (e) => {
    if (!dialog.open || editingId) return;
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) takeFiles(files);
  });

  function takeFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    queue = files;
    updateQueueInfo();
    recognize(files[0]);
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Verkleinert für den Upload (Netlify-Functions haben ein Größenlimit)
  async function toJpegBase64(img, max = 1800) {
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9).split(",")[1];
  }

  async function recognize(file) {
    const status = $("shotStatus");
    const preview = $("shotPreview");
    $("formMsg").textContent = "";
    fillForm({ date: today() });
    let img;
    try {
      img = await loadImage(file);
    } catch {
      status.textContent = T.shot.unreadable;
      return;
    }
    preview.src = img.src;
    preview.hidden = false;
    status.textContent = T.shot.reading;
    dz.classList.add("busy");

    try {
      let result = null;
      try {
        const data = await api("/api/lauf-screenshot", {
          method: "POST",
          body: JSON.stringify({ image: await toJpegBase64(img), mediaType: "image/jpeg" }),
        });
        result = { run: data.run, engine: T.shot.ai };
      } catch (err) {
        if (!err.data || err.data.fallback !== "ocr") throw err;
        status.textContent = T.shot.ocr;
        result = { run: parseOcrText(await ocr(img)), engine: "OCR" };
      }
      const r = result.run;
      currentSource = result.engine === T.shot.ai ? "screenshot-ki" : "screenshot-ocr";
      fillForm({ ...r, date: r.date || today() });
      const missing = [!r.date && T.shot.fields.date, !r.distanceKm && T.shot.fields.dist, !r.durationSec && T.shot.fields.time].filter(Boolean);
      status.textContent = missing.length
        ? T.shot.missing(result.engine, missing.join(", "))
        : T.shot.ok(result.engine);
    } catch (err) {
      status.textContent = `${err.message} ${T.shot.manual}`;
    } finally {
      dz.classList.remove("busy");
    }
  }

  // Tesseract.js wird nur bei Bedarf geladen
  let tesseractPromise = null;
  function loadTesseract() {
    if (!tesseractPromise) {
      tesseractPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
        s.onload = () => resolve(window.Tesseract);
        s.onerror = () => reject(new Error(T.shot.ocrFailed));
        document.head.appendChild(s);
      });
    }
    return tesseractPromise;
  }

  // Graustufen, bei dunklem Hintergrund invertieren (Apple Fitness ist meist schwarz)
  function prepareForOcr(img) {
    const scale = Math.min(2, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      px[i] = px[i + 1] = px[i + 2] = g;
      sum += g;
    }
    const invert = sum / (px.length / 4) < 128;
    for (let i = 0; i < px.length; i += 4) {
      let g = invert ? 255 - px[i] : px[i];
      g = g > 170 ? 255 : g < 90 ? 0 : (g - 90) * 3.2; // Kontrast anheben
      px[i] = px[i + 1] = px[i + 2] = g;
    }
    ctx.putImageData(data, 0, 0);
    return c;
  }

  async function ocr(img) {
    const T = await loadTesseract();
    const worker = await T.createWorker(["deu", "eng"]);
    try {
      const { data } = await worker.recognize(prepareForOcr(img));
      return data.text;
    } finally {
      worker.terminate();
    }
  }

  const MONTH_RX = { jan: 0, feb: 1, mär: 2, mar: 2, apr: 3, mai: 4, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, dez: 11, dec: 11 };

  function parseOcrText(text) {
    const t = text.replace(/ /g, " ");
    const r = {};

    const dur = t.match(/\b(\d{1,2}:\d{2}:\d{2})\b/);
    if (dur) r.durationSec = parseDuration(dur[1]);

    const dist = t.match(/(\d{1,3}[.,]\d{1,2})\s*km\b(?!\s*\/\s*h)/i);
    if (dist) r.distanceKm = parseNum(dist[1].replace(".", ","));

    const pc = t.match(/(\d{1,2})\s*['’′‘`]\s*(\d{2})\s*(?:["”″]|''|’’)?\s*\/\s*km/i);
    const paceSec = pc ? Number(pc[1]) * 60 + Number(pc[2]) : null;
    if (!r.durationSec && paceSec && r.distanceKm) r.durationSec = Math.round(paceSec * r.distanceKm);
    if (!r.durationSec) {
      const ms = t.match(/\b(\d{1,2}:\d{2})\b(?!\s*[–-]\s*\d)/);
      if (ms) r.durationSec = parseDuration(ms[1]);
    }

    const hr = t.match(/(\d{2,3})\s*(?:S\s*\/\s*MIN|BPM)/i);
    if (hr) r.avgHr = Number(hr[1]);
    const cad = t.match(/(\d{2,3})\s*SPM/i);
    if (cad) r.cadence = Number(cad[1]);
    const kcal = t.match(/(\d{1,4})\s*k\s*cal/i);
    if (kcal) r.calories = Number(kcal[1]);
    const elev = t.match(/(?<![\d.,])(\d{1,4})\s?m(?![a-zäöü\/])/i);
    if (elev) r.elevationM = Number(elev[1]);

    const start = t.match(/(\d{1,2}:\d{2})\s*[–-]\s*\d{1,2}:\d{2}/);
    if (start) r.startTime = start[1].padStart(5, "0");

    const type = t.match(/(Outdoor|Indoor)[\s-]?(Lauf|Run)|Laufband/i);
    if (type) r.type = /indoor|laufband/i.test(type[0]) ? T.indoorType : T.defaultType;

    const now = new Date();
    if (/\bHeute\b|\bToday\b/i.test(t)) r.date = today();
    else if (/\bGestern\b|\bYesterday\b/i.test(t)) r.date = addDays(today(), -1);
    else {
      const MON = "Jan|Feb|Mär|Mar|Apr|Mai|May|Jun|Jul|Aug|Sep|Okt|Oct|Nov|Dez|Dec";
      let dm = t.match(new RegExp(`(\\d{1,2})\\.?\\s*(${MON})[a-zä]*\\.?,?\\s*(\\d{4})?`, "i"));
      const en = !dm && t.match(new RegExp(`(${MON})[a-z]*\\.?\\s+(\\d{1,2}),?\\s*(\\d{4})?`, "i"));
      if (en) dm = [en[0], en[2], en[1], en[3]];
      const dn = t.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
      let d = null;
      if (dm) {
        const mon = MONTH_RX[dm[2].toLowerCase().slice(0, 3)];
        let y = dm[3] ? Number(dm[3]) : now.getFullYear();
        d = new Date(y, mon, Number(dm[1]));
        if (!dm[3] && d > now) d.setFullYear(y - 1);
      } else if (dn) {
        const y = Number(dn[3]) < 100 ? 2000 + Number(dn[3]) : Number(dn[3]);
        d = new Date(y, Number(dn[2]) - 1, Number(dn[1]));
      }
      if (d && !isNaN(d)) r.date = iso(d);
    }
    return r;
  }

  // ---------- CSV ----------
  function toCsv() {
    const head = T.csv.head;
    const q = (v) => (/[";\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const lines = runs.map((r) =>
      [
        r.date, r.startTime, r.type, nf(2).format(r.distanceKm), fmtDuration(r.durationSec),
        fmtPace(pace(r)).replace("'", ":").replace('"', ""), r.avgHr ?? "", r.maxHr ?? "", r.elevationM ?? "",
        r.calories ?? "", r.cadence ?? "", r.notes || "",
      ].map(q).join(";")
    );
    return "﻿" + [head.join(";"), ...lines].join("\n");
  }

  $("exportCsv").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toCsv()], { type: "text/csv;charset=utf-8" }));
    a.download = `${T.csv.file}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  function parseCsv(text) {
    text = text.replace(/^﻿/, "");
    const firstLine = text.split(/\r?\n/)[0];
    const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === sep) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }

  function csvToRuns(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];
    const head = rows[0].map((h) => h.toLowerCase().trim());
    // erst exakte Treffer ("Art"), dann Teiltreffer ("Distanz (km)")
    const col = (...names) => {
      const exact = head.findIndex((h) => names.some((n) => h === n || h.startsWith(n + " ") || h.startsWith(n + "(")));
      return exact >= 0 ? exact : head.findIndex((h) => names.some((n) => n.length > 3 && h.includes(n)));
    };
    const c = {
      date: col("datum", "date"),
      start: col("start"),
      type: col("art", "type", "typ"),
      dist: col("distanz", "distance", "km"),
      dur: col("zeit", "dauer", "duration", "time"),
      pace: col("pace", "tempo"),
      hr: col("ø puls", "puls", "avg hr", "heart", "hr"),
      maxHr: col("max"),
      elev: col("höhe", "hoehe", "elevation"),
      kcal: col("kcal", "kalorien", "calories"),
      cad: col("schritt", "cadence", "trittfrequenz"),
      notes: col("notiz", "notes", "bemerkung"),
    };
    // "Startzeit" enthält auch "zeit": dann die echte Zeit-Spalte nehmen
    if (c.dur === c.start) c.dur = head.findIndex((h, i) => i !== c.start && /zeit|dauer|duration|time/.test(h));
    const get = (r, i) => (i >= 0 ? (r[i] || "").trim() : "");
    return rows.slice(1).map((r) => {
      let date = get(r, c.date);
      const de = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
      if (de) date = `${de[3].length === 2 ? "20" + de[3] : de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
      const distanceKm = parseNum(get(r, c.dist));
      let durationSec = parseDuration(get(r, c.dur));
      const p = parsePace(get(r, c.pace));
      if (!durationSec && p && distanceKm) durationSec = Math.round(p * distanceKm);
      return {
        date,
        startTime: get(r, c.start),
        type: get(r, c.type),
        distanceKm,
        durationSec,
        avgHr: parseNum(get(r, c.hr)),
        maxHr: c.maxHr !== c.hr ? parseNum(get(r, c.maxHr)) : null,
        elevationM: parseNum(get(r, c.elev)),
        calories: parseNum(get(r, c.kcal)),
        cadence: parseNum(get(r, c.cad)),
        notes: get(r, c.notes),
        source: "import",
      };
    });
  }

  document.querySelectorAll("[data-import]").forEach((b) => b.addEventListener("click", () => $("csvInput").click()));
  $("csvInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const list = csvToRuns(await file.text());
    if (!list.length) return alert(T.csv.none);
    if (!confirm(T.csv.confirm(list.length))) return;
    try {
      const data = await api("/api/laeufe", { method: "POST", body: JSON.stringify({ runs: list }) });
      setData(data);
      alert(T.csv.done(data.added.length, data.skipped));
    } catch (err) {
      alert(err.message);
    }
  });

  // ---------- Abmelden & Start ----------
  document.querySelectorAll("[data-logout]").forEach((b) =>
    b.addEventListener("click", async () => {
      await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
      location.replace(T.adminHome);
    })
  );

  api("/api/laeufe")
    .then((data) => {
      $("dashLoading").hidden = true;
      $("dash").hidden = false;
      setData(data);
    })
    .catch((err) => {
      if (err.message !== T.notLoggedIn) $("dashLoading").textContent = T.loadFailed(err.message);
    });

  // Für Tests im Browser
  window.__lauf = { parseOcrText, csvToRuns, parseDuration };
})();
