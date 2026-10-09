// Rauschen: generative Kunst aus einem Wort.
// Das Wort wird zu einem Seed; daraus entstehen Zufallszahlen, ein Perlin-Rauschfeld
// und Parameter. Partikel folgen dem Feld und hinterlassen Spuren. Gleiches Wort = gleiches Bild.
(() => {
  const textEl = document.getElementById("rauschenText");
  const canvas = document.getElementById("rCanvas");
  if (!textEl || !canvas) return;

  const T = JSON.parse(textEl.textContent);
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const TAU = Math.PI * 2;

  const seedInput = document.getElementById("rSeed");
  const paletteSel = document.getElementById("rPalette");
  const styleSel = document.getElementById("rStyle");
  const titleEl = document.getElementById("rTitle");
  const statusEl = document.getElementById("rStatus");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- Farben ----------
  const PALETTES = {
    theme: null, // hängt vom Seiten-Theme ab, siehe themePalette()
    sunset: { bg: "#1b1029", colors: ["#ff6b6b", "#feca57", "#ff9ff3", "#f368e0", "#ffb38a"] },
    ocean: { bg: "#03182b", colors: ["#00b4d8", "#90e0ef", "#caf0f8", "#0077b6", "#48cae4"] },
    forest: { bg: "#f1efe4", colors: ["#2d6a4f", "#40916c", "#95d5b2", "#1b4332", "#d4a373"] },
    ink: { bg: "#f5f2ea", colors: ["#111111", "#2b2b2b", "#555555", "#b91c1c"] },
    neon: { bg: "#050505", colors: ["#39ff14", "#ff073a", "#00f0ff", "#ffe600", "#bc13fe"] },
  };
  const PALETTE_KEYS = Object.keys(PALETTES);

  function themePalette() {
    return document.documentElement.dataset.theme === "dark"
      ? { bg: "#0b1220", colors: ["#3b82f6", "#e6e9ef", "#93c5fd", "#fbbf24", "#60a5fa"] }
      : { bg: "#faf7f1", colors: ["#2563eb", "#0f172a", "#60a5fa", "#f59e0b", "#1d4ed8"] };
  }

  // ---------- Seed & Zufall ----------
  function hashString(str) {
    // cyrb53-artiger Hash -> 32 Bit
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h1 ^ h2) >>> 0;
  }

  function mulberry32(a) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Perlin-Rauschen (2D) ----------
  function makeNoise(rand) {
    const p = new Uint8Array(512);
    const perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y) => {
      switch (h & 7) {
        case 0: return x + y;
        case 1: return -x + y;
        case 2: return x - y;
        case 3: return -x - y;
        case 4: return x;
        case 5: return -x;
        case 6: return y;
        default: return -y;
      }
    };

    function noise(x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const a = p[X] + Y, b = p[X + 1] + Y;
      return lerp(
        lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u),
        lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u),
        v
      ); // etwa -1 .. 1
    }

    // Zwei Oktaven für etwas mehr Struktur
    return (x, y) => noise(x, y) * 0.7 + noise(x * 2.1 + 17.3, y * 2.1 - 4.7) * 0.3;
  }

  // ---------- Stile ----------
  const STYLES = {
    flow: { total: 2600, alive: 700, life: [90, 240], step: 2.2, width: [0.8, 2.4], alpha: 0.6, every: 1 },
    brush: { total: 650, alive: 220, life: [30, 90], step: 3, width: [6, 20], alpha: 0.13, every: 1 },
    dots: { total: 1800, alive: 500, life: [20, 70], step: 3.2, width: [1.5, 5.5], alpha: 0.85, every: 5 },
  };

  // ---------- Zeichnen ----------
  let run = null; // aktueller Mal-Durchgang

  function pick(rand, arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  function between(rand, [a, b]) {
    return a + rand() * (b - a);
  }

  function titleFor(seed) {
    const rand = mulberry32(hashString("titel:" + seed));
    const no = String(hashString(seed) % 10000).padStart(4, "0");
    return `${pick(rand, T.adjectives)} ${pick(rand, T.nouns)} · ${T.no} ${no}`;
  }

  function settings() {
    const seed = seedInput.value.trim() || "Denni";
    let paletteKey = paletteSel.value;
    if (paletteKey === "auto" || !PALETTE_KEYS.includes(paletteKey)) {
      paletteKey = PALETTE_KEYS[hashString("farbe:" + seed) % PALETTE_KEYS.length];
    }
    const styleKey = STYLES[styleSel.value] ? styleSel.value : "flow";
    return { seed, paletteKey, styleKey };
  }

  function spawn(r, x, y) {
    const s = r.style;
    return {
      x: x ?? r.rand() * W,
      y: y ?? r.rand() * H,
      life: Math.round(between(r.rand, s.life)),
      age: 0,
      w: between(r.rand, s.width),
      c: pick(r.rand, r.palette.colors),
    };
  }

  function step(r, pt) {
    const angle = r.field(pt.x * r.scale + r.offX, pt.y * r.scale + r.offY) * TAU * r.turns + r.drift;
    const nx = pt.x + Math.cos(angle) * r.style.step;
    const ny = pt.y + Math.sin(angle) * r.style.step;

    if (r.style.every > 1) {
      if (pt.age % r.style.every === 0) {
        const radius = pt.w * (1 - pt.age / pt.life) + 0.4;
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
    }

    pt.x = nx;
    pt.y = ny;
    pt.age++;
    return pt.age < pt.life && nx > -20 && nx < W + 20 && ny > -20 && ny < H + 20;
  }

  // Ein Frame: jede lebende Partikel ein paar Schritte weiter
  function tick(r, stepsPerParticle) {
    ctx.globalAlpha = r.style.alpha;
    ctx.lineCap = "round";
    const next = [];
    for (const pt of r.particles) {
      ctx.strokeStyle = ctx.fillStyle = pt.c;
      ctx.lineWidth = pt.w;
      let alive = true;
      for (let i = 0; i < stepsPerParticle && alive; i++) alive = step(r, pt);
      if (alive) next.push(pt);
      else if (r.budget > 0) {
        r.budget--;
        next.push(spawn(r));
      }
    }
    r.particles = next;
    ctx.globalAlpha = 1;
  }

  function signature(r) {
    const text = `„${r.seed}“ · denni-rauschenberg.de`;
    ctx.save();
    ctx.font = "600 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 32;
    // Kleines Etikett in Hintergrundfarbe, damit die Signatur lesbar bleibt
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = r.palette.bg;
    ctx.beginPath();
    ctx.roundRect(W - 24 - w, H - 64, w, 40, 20);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = r.palette.colors[1] || r.palette.colors[0];
    ctx.fillText(text, W - 40, H - 44);
    ctx.restore();
  }

  function loop() {
    const r = run;
    if (!r) return;
    tick(r, 3);
    if (r.particles.length) {
      r.frame = requestAnimationFrame(loop);
    } else {
      r.frame = 0;
      if (!r.signed) {
        signature(r);
        r.signed = true;
      }
      statusEl.textContent = T.done;
    }
  }

  function finishInstantly(r) {
    while (r.particles.length) tick(r, 12);
    signature(r);
    r.signed = true;
    statusEl.textContent = T.done;
  }

  function paint() {
    if (run && run.frame) cancelAnimationFrame(run.frame);

    const { seed, paletteKey, styleKey } = settings();
    const rand = mulberry32(hashString(seed));
    const palette = paletteKey === "theme" ? themePalette() : PALETTES[paletteKey];
    const style = STYLES[styleKey];

    const r = {
      seed,
      paletteKey,
      rand,
      palette,
      style,
      field: makeNoise(rand),
      scale: 0.0012 + rand() * 0.0038,
      turns: 0.6 + rand() * 2.4,
      drift: rand() * TAU,
      offX: rand() * 100,
      offY: rand() * 100,
      particles: [],
      budget: style.total - style.alive,
      frame: 0,
      signed: false,
    };
    for (let i = 0; i < style.alive; i++) r.particles.push(spawn(r));
    run = r;

    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    titleEl.textContent = titleFor(seed);
    statusEl.textContent = T.painting;
    updateUrl();

    if (reducedMotion.matches) finishInstantly(r);
    else r.frame = requestAnimationFrame(loop);
  }

  // Klick ins Bild: neuer Farbspritzer an dieser Stelle
  function burst(e) {
    const r = run;
    if (!r) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const n = Math.round(r.style.alive / 6);
    for (let i = 0; i < n; i++) {
      const a = r.rand() * TAU;
      const d = r.rand() * 40;
      r.particles.push(spawn(r, x + Math.cos(a) * d, y + Math.sin(a) * d));
    }
    if (reducedMotion.matches) {
      while (r.particles.length) tick(r, 12);
    } else if (!r.frame) {
      statusEl.textContent = T.painting;
      r.frame = requestAnimationFrame(loop);
    }
  }

  // ---------- URL (zum Teilen) ----------
  function updateUrl() {
    const params = new URLSearchParams();
    if (seedInput.value.trim()) params.set("s", seedInput.value.trim());
    if (paletteSel.value !== "auto") params.set("p", paletteSel.value);
    if (styleSel.value !== "flow") params.set("st", styleSel.value);
    const qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  function readUrl() {
    const params = new URLSearchParams(location.search);
    const s = params.get("s");
    const p = params.get("p");
    const st = params.get("st");
    if (s) seedInput.value = s.slice(0, 40);
    if (p && [...paletteSel.options].some((o) => o.value === p)) paletteSel.value = p;
    if (st && STYLES[st]) styleSel.value = st;
  }

  // ---------- Aktionen ----------
  function download() {
    const slug = (run ? run.seed : "rauschen")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w]+/g, "-")
      .replace(/^-+|-+$/g, "") || "rauschen";
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rauschen-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  }

  async function share() {
    updateUrl();
    try {
      await navigator.clipboard.writeText(location.href);
      statusEl.textContent = T.copied;
    } catch (e) {
      statusEl.textContent = T.copyFailed;
    }
  }

  let typing = 0;
  seedInput.addEventListener("input", () => {
    clearTimeout(typing);
    typing = setTimeout(paint, 350);
  });
  seedInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(typing);
      paint();
    }
  });
  document.getElementById("rRandom").addEventListener("click", () => {
    const word = T.randomWords[Math.floor(Math.random() * T.randomWords.length)];
    seedInput.value = `${word} ${Math.floor(Math.random() * 900) + 100}`;
    paint();
  });
  paletteSel.addEventListener("change", paint);
  styleSel.addEventListener("change", paint);
  canvas.addEventListener("click", burst);
  document.getElementById("rDownload").addEventListener("click", download);
  document.getElementById("rShare").addEventListener("click", share);

  // Bei "Wie die Seite" neu malen, wenn das Theme wechselt
  new MutationObserver(() => {
    if (run && run.paletteKey === "theme") paint();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  readUrl();
  paint();
})();
