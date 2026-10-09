// 3D-Zimmer: ein kleines, interaktives Zimmer mit three.js (selbst gehostet unter /assets/vendor/three/).
// Alles ist aus einfachen Formen und Canvas-Texturen gebaut, es werden keine Modelle geladen.
// Gegenstände tragen userData.item = Schlüssel aus src/_data/zimmer.js.
import * as THREE from "three";
import { OrbitControls } from "/assets/vendor/three/OrbitControls.js";

const T = JSON.parse(document.getElementById("roomText").textContent);
const stage = document.getElementById("roomStage");
const canvas = document.getElementById("roomCanvas");
const loadingEl = document.getElementById("roomLoading");
const tip = document.getElementById("roomTip");
const panel = document.getElementById("roomPanel");
const panelTitle = document.getElementById("roomPanelTitle");
const panelText = document.getElementById("roomPanelText");
const panelLink = document.getElementById("roomPanelLink");
const panelAction = document.getElementById("roomPanelAction");
const chips = [...document.querySelectorAll(".room-chip")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---------- Ohne WebGL: Liste statt Zimmer ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  renderer = null;
}

if (!renderer) {
  stage.hidden = true;
  document.getElementById("roomNoWebgl").hidden = false;
  document.querySelector(".room-hint").hidden = true;
  chips.forEach((chip) => {
    const item = T.items[chip.dataset.item];
    if (item.url) chip.addEventListener("click", () => (location.href = item.url));
    else chip.hidden = true;
  });
} else {
  buildRoom();
}

function buildRoom() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.6;
  controls.maxDistance = 28;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.38;
  controls.minAzimuthAngle = -0.12;
  controls.maxAzimuthAngle = Math.PI / 2 + 0.12;

  // ---------- Helfer ----------
  const interactive = []; // Meshes, die angeklickt werden können

  function mat(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
  }

  function box(w, h, d, material, x, y, z, parent = scene) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function cyl(rt, rb, h, material, x, y, z, parent = scene, seg = 24) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function sphere(r, material, x, y, z, parent = scene) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  function canvasTexture(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function glowPlane(w, h, texture, x, y, z, parent = scene, extra = {}) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, ...extra })
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function group(item, x = 0, y = 0, z = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (item) g.userData.item = item;
    scene.add(g);
    return g;
  }

  // Alle Meshes einer Gruppe klickbar machen
  function makeInteractive(g) {
    g.traverse((o) => {
      if (o.isMesh) interactive.push(o);
    });
  }

  // Kleiner, reproduzierbarer Zufall für Bücherfarben usw.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---------- Raum ----------
  const floorTex = canvasTexture(512, 512, (g, w, h) => {
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      let x = -rand() * 200;
      while (x < w) {
        const len = 160 + rand() * 180;
        const tone = 150 + rand() * 30;
        g.fillStyle = `rgb(${tone + 40}, ${tone}, ${tone - 45})`;
        g.fillRect(x, (r * h) / rows, len, h / rows);
        g.fillStyle = "rgba(60, 35, 15, .35)";
        g.fillRect(x, (r * h) / rows, 2, h / rows);
        x += len;
      }
      g.fillStyle = "rgba(60, 35, 15, .35)";
      g.fillRect(0, (r * h) / rows, w, 2);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(2, 2);

  const floor = box(8, 0.2, 8, mat("#ffffff", { map: floorTex, roughness: 0.7 }), 0, -0.1, 0);
  floor.castShadow = false;

  const wallMat = mat("#efe2cf");
  const backWall = box(8.2, 4.2, 0.2, wallMat, -0.1, 2.1, -4.1);
  const leftWall = box(0.2, 4.2, 8, mat("#e7d8c2"), -4.1, 2.1, 0);
  backWall.castShadow = leftWall.castShadow = false;

  // Fußleisten
  const trimMat = mat("#fbf7f0");
  box(8, 0.14, 0.04, trimMat, 0, 0.07, -3.98);
  box(0.04, 0.14, 8, trimMat, -3.98, 0.07, 0);

  // Teppich
  const rugTex = canvasTexture(512, 512, (g, w) => {
    const colors = ["#c2410c", "#f59e0b", "#fde68a", "#0f766e", "#f59e0b", "#c2410c"];
    colors.forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(w / 2, w / 2, w / 2 - i * 38, 0, Math.PI * 2);
      g.fill();
    });
  });
  const rug = cyl(1.7, 1.7, 0.02, mat("#ffffff", { map: rugTex, roughness: 1 }), 0.6, 0.01, 0.1, scene, 48);
  rug.castShadow = false;

  // ---------- Fenster (linke Wand) ----------
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 256;
  skyCanvas.height = 192;
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;

  function drawSky(night) {
    const g = skyCanvas.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, 192);
    if (night) {
      grd.addColorStop(0, "#0b1030");
      grd.addColorStop(1, "#27326b");
    } else {
      grd.addColorStop(0, "#5fb4f5");
      grd.addColorStop(1, "#cfeaff");
    }
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 192);
    if (night) {
      g.fillStyle = "#fff";
      let s = 3;
      for (let i = 0; i < 60; i++) {
        s = (s * 9301 + 49297) % 233280;
        const x = (s / 233280) * 256;
        s = (s * 9301 + 49297) % 233280;
        const y = (s / 233280) * 150;
        g.globalAlpha = 0.4 + (i % 3) * 0.25;
        g.fillRect(x, y, 1.6, 1.6);
      }
      g.globalAlpha = 1;
      g.fillStyle = "#fef3c7";
      g.beginPath();
      g.arc(190, 50, 20, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#0f1538";
      g.beginPath();
      g.arc(180, 44, 18, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = "#fde68a";
      g.beginPath();
      g.arc(60, 46, 22, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,.9)";
      [[150, 60, 22], [175, 52, 26], [200, 62, 20], [90, 120, 16], [112, 114, 20]].forEach(([x, y, r]) => {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      });
    }
    // Hügel
    g.fillStyle = night ? "#121a3a" : "#7cc47a";
    g.beginPath();
    g.moveTo(0, 192);
    g.quadraticCurveTo(70, 130, 140, 165);
    g.quadraticCurveTo(200, 140, 256, 160);
    g.lineTo(256, 192);
    g.fill();
    skyTex.needsUpdate = true;
  }

  const win = group(null, -3.98, 2.25, -1.8);
  const sky = glowPlane(1.7, 1.25, skyTex, 0.01, 0, 0, win);
  sky.rotation.y = Math.PI / 2;
  const frameMat = mat("#fbf7f0");
  box(0.08, 0.08, 1.86, frameMat, 0.03, 0.66, 0, win);
  box(0.08, 0.08, 1.86, frameMat, 0.03, -0.66, 0, win);
  box(0.08, 1.4, 0.08, frameMat, 0.03, 0, 0.9, win);
  box(0.08, 1.4, 0.08, frameMat, 0.03, 0, -0.9, win);
  box(0.06, 1.3, 0.05, frameMat, 0.03, 0, 0, win);
  box(0.06, 0.05, 1.7, frameMat, 0.03, 0.05, 0, win);
  box(0.26, 0.05, 2.0, frameMat, 0.12, -0.72, 0, win); // Fensterbank
  // Kaktus auf der Fensterbank
  cyl(0.07, 0.06, 0.14, mat("#c2410c"), 0.14, -0.62, 0.55, win);
  cyl(0.045, 0.05, 0.22, mat("#3f8f4f"), 0.14, -0.44, 0.55, win, 10);

  // ---------- Pflanze ----------
  const plant = group(null, -3.35, 0, -3.35);
  cyl(0.28, 0.22, 0.55, mat("#d97757"), 0, 0.275, 0, plant);
  const leafMat = mat("#2f7d4a", { flatShading: true });
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9 + rand() * 0.5, 5), leafMat);
    const a = (i / 9) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.12, 0.95, Math.sin(a) * 0.12);
    leaf.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
    leaf.castShadow = true;
    plant.add(leaf);
  }

  // ---------- Schreibtisch + Monitor (Projekt: Website) ----------
  const desk = group("website", 0.3, 0, -3.45);
  const woodMat = mat("#a8754a", { roughness: 0.6 });
  box(2.4, 0.07, 0.95, woodMat, 0, 0.76, 0, desk);
  [[-1.12, -0.4], [1.12, -0.4], [-1.12, 0.4], [1.12, 0.4]].forEach(([x, z]) =>
    box(0.07, 0.74, 0.07, mat("#3a3a44"), x, 0.37, z, desk)
  );
  // Monitor
  const codeTex = canvasTexture(512, 300, (g, w, h) => {
    g.fillStyle = "#0f172a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1e293b";
    g.fillRect(0, 0, w, 26);
    ["#ef4444", "#f59e0b", "#22c55e"].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(16 + i * 18, 13, 5, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = "#94a3b8";
    g.font = "600 13px monospace";
    g.fillText("denni-rauschenberg.de", 80, 18);
    const colors = ["#60a5fa", "#f472b6", "#a3e635", "#fbbf24", "#e2e8f0", "#c084fc"];
    let y = 48;
    let s = 11;
    for (let line = 0; line < 13; line++) {
      let x = 18 + ((line * 7) % 4) * 18;
      const parts = 1 + (line % 4);
      for (let p = 0; p < parts; p++) {
        s = (s * 9301 + 49297) % 233280;
        const len = 30 + (s / 233280) * 110;
        g.fillStyle = colors[(line + p) % colors.length];
        g.fillRect(x, y, len, 8);
        x += len + 10;
      }
      y += 19;
    }
    g.fillStyle = "#e2e8f0";
    g.fillRect(18, y, 9, 14);
  });
  box(0.06, 0.32, 0.06, mat("#2b2b33"), 0, 0.95, -0.2, desk);
  box(0.36, 0.03, 0.22, mat("#2b2b33"), 0, 0.81, -0.2, desk);
  box(1.12, 0.68, 0.06, mat("#1f2029", { roughness: 0.4 }), 0, 1.32, -0.24, desk);
  glowPlane(1.04, 0.6, codeTex, 0, 1.32, -0.205, desk);
  box(0.9, 0.03, 0.3, mat("#e5e7eb"), -0.05, 0.81, 0.15, desk); // Tastatur
  box(0.12, 0.03, 0.18, mat("#e5e7eb"), 0.55, 0.81, 0.18, desk); // Maus
  // Kaffeetasse
  cyl(0.06, 0.05, 0.13, mat("#2563eb"), -0.62, 0.86, 0.22, desk);
  makeInteractive(desk);

  // Stuhl
  const chair = group("website", 0.3, 0, -2.35);
  const chairMat = mat("#334155", { roughness: 0.6 });
  cyl(0.04, 0.04, 0.42, mat("#9ca3af", { metalness: 0.6, roughness: 0.3 }), 0, 0.25, 0, chair);
  cyl(0.32, 0.32, 0.04, mat("#9ca3af", { metalness: 0.6, roughness: 0.3 }), 0, 0.04, 0, chair, 5);
  box(0.62, 0.09, 0.58, chairMat, 0, 0.5, 0, chair);
  box(0.6, 0.7, 0.08, chairMat, 0, 0.92, 0.28, chair);
  // Kein Schatten, sonst wirft die Schreibtischlampe nachts einen riesigen Stuhl-Schatten
  chair.traverse((o) => (o.castShadow = false));
  makeInteractive(chair);

  // ---------- Lampe (schaltet das Theme) ----------
  const lamp = group("lamp", -0.55, 0.795, -3.7);
  const lampMat = mat("#f59e0b", { roughness: 0.4 });
  cyl(0.14, 0.16, 0.04, lampMat, 0, 0.02, 0, lamp);
  const arm = cyl(0.018, 0.018, 0.62, mat("#3f3f46"), 0, 0.33, 0, lamp, 8);
  arm.rotation.z = 0.25;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.24, 24, 1, true), mat("#f59e0b", { side: THREE.DoubleSide, roughness: 0.4 }));
  shade.position.set(-0.12, 0.66, 0.05);
  shade.rotation.z = -0.5;
  shade.castShadow = true;
  lamp.add(shade);
  const bulbMat = new THREE.MeshStandardMaterial({ color: "#fff7d6", emissive: "#ffcf7a", emissiveIntensity: 0 });
  const bulb = sphere(0.06, bulbMat, -0.1, 0.6, 0.05, lamp);
  bulb.castShadow = false;
  makeInteractive(lamp);

  // ---------- Quietscheente ----------
  const duck = group("duck", 0.95, 0.795, -3.25);
  const duckBody = new THREE.Group();
  duck.add(duckBody);
  const yellow = mat("#facc15", { roughness: 0.35 });
  const body = sphere(0.1, yellow, 0, 0.08, 0, duckBody);
  body.scale.set(1.25, 0.85, 1);
  sphere(0.065, yellow, 0.07, 0.19, 0, duckBody);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 12), mat("#f97316"));
  beak.position.set(0.14, 0.18, 0);
  beak.rotation.z = -Math.PI / 2;
  duckBody.add(beak);
  sphere(0.012, mat("#111827"), 0.11, 0.21, 0.035, duckBody);
  sphere(0.012, mat("#111827"), 0.11, 0.21, -0.035, duckBody);
  duckBody.rotation.y = 0.9;
  makeInteractive(duck);

  // ---------- Briefe (Kontakt) ----------
  const letters = group("contact", 1.3, 0.795, -3.7);
  const paper = mat("#fffdf7", { roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const env = box(0.36, 0.02, 0.24, paper, (i - 1) * 0.02, 0.012 + i * 0.022, 0, letters);
    env.rotation.y = (i - 1) * 0.18;
  }
  box(0.08, 0.005, 0.08, mat("#dc2626"), 0.02, 0.07, 0, letters); // Briefmarke/Siegel
  makeInteractive(letters);

  // ---------- Neon-Schild "DR" ----------
  const neonTex = canvasTexture(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = "900 170px system-ui, -apple-system, Segoe UI, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "#f472b6";
    g.shadowBlur = 30;
    g.strokeStyle = "#f9a8d4";
    g.lineWidth = 10;
    g.strokeText("DR", w / 2, h / 2 + 8);
    g.shadowBlur = 12;
    g.strokeStyle = "#fff1f7";
    g.lineWidth = 4;
    g.strokeText("DR", w / 2, h / 2 + 8);
  });
  const neon = glowPlane(1.1, 0.55, neonTex, 0.3, 2.75, -3.98, scene, { transparent: true, depthWrite: false });

  // ---------- Poster: LAN Party (Archiv) ----------
  const lan = group("lan", -2.3, 2.3, -3.97);
  const posterTex = canvasTexture(330, 450, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#1e1b4b");
    grd.addColorStop(1, "#7c3aed");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    // Retro-Sonne
    g.fillStyle = "#f472b6";
    g.beginPath();
    g.arc(w / 2, 250, 95, Math.PI, 0);
    g.fill();
    g.fillStyle = "#1e1b4b";
    for (let i = 0; i < 5; i++) g.fillRect(w / 2 - 100, 180 + i * 15, 200, 4 + i);
    g.strokeStyle = "#22d3ee";
    g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(w / 2, 250);
      g.lineTo(-60 + i * 56, h);
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const y = 260 + i * i * 9;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.fillStyle = "#fde68a";
    g.font = "900 52px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("LAN", w / 2, 70);
    g.fillText("PARTY", w / 2, 122);
    g.fillStyle = "#fff";
    g.font = "700 24px monospace";
    g.fillText("27.12.2025", w / 2, h - 30);
  });
  box(1.12, 1.52, 0.03, mat("#111827"), 0, 0, 0, lan);
  glowPlane(1.04, 1.44, posterTex, 0, 0, 0.02, lan);
  makeInteractive(lan);

  // ---------- Bücherregal (Über mich) ----------
  const shelf = group("about", -3.72, 0, 0.3);
  const shelfMat = mat("#7c4a2d", { roughness: 0.7 });
  const H = 2.3, D = 0.5, Wd = 1.5;
  box(D, H, 0.05, shelfMat, 0, H / 2, -Wd / 2, shelf);
  box(D, H, 0.05, shelfMat, 0, H / 2, Wd / 2, shelf);
  box(0.03, H, Wd, shelfMat, -D / 2 + 0.015, H / 2, 0, shelf);
  const bookColors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#14b8a6", "#e11d48", "#64748b"];
  for (let s = 0; s < 5; s++) {
    const y = 0.05 + s * 0.55;
    box(D, 0.04, Wd, shelfMat, 0, y, 0, shelf);
    if (s === 4) break;
    let z = -Wd / 2 + 0.06;
    while (z < Wd / 2 - 0.12) {
      const bw = 0.05 + rand() * 0.06;
      const bh = 0.3 + rand() * 0.16;
      if (rand() < 0.12) {
        z += 0.12; // kleine Lücke
        continue;
      }
      const b = box(0.3 + rand() * 0.08, bh, bw, mat(bookColors[Math.floor(rand() * bookColors.length)]), 0.02, y + 0.02 + bh / 2, z + bw / 2, shelf);
      if (rand() < 0.1) b.rotation.x = 0.18;
      z += bw + 0.008;
    }
  }
  // Ein kleiner Globus obendrauf
  sphere(0.14, mat("#38bdf8", { roughness: 0.4 }), 0, H + 0.2, 0.35, shelf);
  cyl(0.06, 0.08, 0.05, shelfMat, 0, H + 0.04, 0.35, shelf);
  makeInteractive(shelf);

  // ---------- Bett + Coco ----------
  // Coco ist Dennis echte Katze: braun getigert (Makrele), geringelter Schwanz,
  // helle Schnauze, große bernsteinfarbene Augen. Sie liegt wie auf dem Foto flach
  // auf dem Bauch und lässt die Vorderpfoten über die Bettkante hängen.
  const blanketTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#f1f5f9";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#8f9aa8";
    g.lineWidth = 11;
    for (let y = -32; y < h + 32; y += 32) {
      g.beginPath();
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + ((x / 32) % 2 ? 16 : 0));
      g.stroke();
    }
  });
  blanketTex.wrapS = blanketTex.wrapT = THREE.RepeatWrapping;
  blanketTex.repeat.set(2, 2);

  const bed = group(null, -3.3, 0, 2.75);
  box(1.35, 0.3, 2.2, mat("#8b5e3c"), 0, 0.2, 0, bed);
  box(1.3, 0.2, 2.1, mat("#4b5058", { roughness: 1 }), 0, 0.45, 0, bed); // grau wie Cocos Sofa
  box(1.36, 0.08, 1.0, mat("#ffffff", { map: blanketTex }), 0, 0.57, 0.55, bed);
  box(0.9, 0.14, 0.4, mat("#ffffff"), 0, 0.62, -0.8, bed);
  box(1.35, 0.9, 0.08, mat("#8b5e3c"), 0, 0.45, -1.1, bed);

  // Getigertes Fell: dunkle, wellige Streifen auf graubraunem Grund
  function tabbyTexture(rings, tip = rings) {
    return canvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = "#857865";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = rand() < 0.5 ? "rgba(60, 45, 30, .18)" : "rgba(200, 185, 160, .16)";
        g.fillRect(rand() * w, rand() * h, 2 + rand() * 6, 1 + rand() * 2);
      }
      g.strokeStyle = "#33281d";
      g.lineCap = "round";
      const n = rings ? 9 : 11;
      for (let i = 0; i < n; i++) {
        g.lineWidth = 5 + rand() * 6;
        g.beginPath();
        if (rings) {
          // Ringe um den Schwanz: Streifen quer zur Länge (u-Richtung)
          const x = ((i + 0.5) / n) * w;
          g.moveTo(x, 0);
          g.lineTo(x + (rand() - 0.5) * 12, h);
        } else {
          // Makrelen-Streifen quer über den Rücken
          const y = ((i + 0.5) / n) * h;
          for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 26 + i) * 5 + (rand() - 0.5) * 3);
        }
        g.stroke();
      }
      if (tip) {
        g.fillStyle = "#2a2018"; // dunkle Schwanzspitze
        g.fillRect(w - 40, 0, 40, h);
      }
    });
  }
  const furTex = tabbyTexture(false);
  const fur = mat("#ffffff", { map: furTex, roughness: 0.95 });
  const furPlain = mat("#857865", { roughness: 0.95 });
  const cream = mat("#e6dccb", { roughness: 0.9 });

  // Kopf: Fell mit "M" auf der Stirn und heller Schnauze (Blickrichtung +x, im Textur-Mittelpunkt)
  const headTex = canvasTexture(512, 256, (g, w, h) => {
    g.drawImage(furTex.image, 0, 0);
    g.fillStyle = "#857865";
    g.fillRect(w * 0.36, 0, w * 0.28, h);
    g.strokeStyle = "#2f241a";
    g.lineCap = "round";
    g.lineWidth = 6;
    [-24, -8, 8, 24].forEach((dx) => {
      g.beginPath();
      g.moveTo(w / 2 + dx, h * 0.06);
      g.lineTo(w / 2 + dx * 0.7, h * 0.36);
      g.stroke();
    });
    g.lineWidth = 5;
    [-1, 1].forEach((s) => {
      g.beginPath();
      g.moveTo(w / 2 + s * 40, h * 0.5);
      g.quadraticCurveTo(w / 2 + s * 62, h * 0.52, w / 2 + s * 82, h * 0.46);
      g.stroke();
    });
    g.fillStyle = "#e6dccb";
    g.beginPath();
    g.ellipse(w / 2, h * 0.68, 40, 30, 0, 0, Math.PI * 2);
    g.fill();
  });

  const cat = group("cat", -3.2, 0.61, 2.95);
  const catBody = new THREE.Group();
  cat.add(catBody);

  const torsoGeo = new THREE.SphereGeometry(0.18, 32, 20);
  torsoGeo.rotateZ(Math.PI / 2); // Pole an Kopf und Schwanz, damit die Streifen quer laufen
  const torso = new THREE.Mesh(torsoGeo, fur);
  torso.scale.set(1.7, 0.62, 1.0);
  torso.position.set(0, 0.1, 0);
  torso.castShadow = true;
  catBody.add(torso);

  // Hinterbeine als Polster an den Seiten
  [-1, 1].forEach((s) => {
    const haunch = sphere(0.09, fur, -0.17, 0.07, s * 0.14, catBody);
    haunch.scale.set(1.4, 0.8, 0.8);
  });

  // Vorderbeine nach vorn gestreckt, Pfoten hängen über die Bettkante (wie auf dem Foto)
  const legTex = tabbyTexture(true, false);
  const legMat = mat("#ffffff", { map: legTex, roughness: 0.95 });
  [-1, 1].forEach((s) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.16, 0.07, s * 0.1),
      new THREE.Vector3(0.4, 0.05, s * 0.115),
      new THREE.Vector3(0.575, 0.035, s * 0.12),
      new THREE.Vector3(0.625, -0.025, s * 0.12),
    ]);
    const leg = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.046, 12), legMat);
    leg.castShadow = true;
    catBody.add(leg);
    const paw = sphere(0.05, furPlain, 0.632, -0.045, s * 0.12, catBody);
    paw.scale.set(0.9, 0.75, 1.05);
    // Helle Zehen
    sphere(0.028, cream, 0.66, -0.07, s * 0.12, catBody).scale.set(1, 0.6, 1.4);
  });

  // Kopf liegt flach zwischen den Pfoten
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 32, 20), mat("#ffffff", { map: headTex, roughness: 0.95 }));
  head.scale.set(0.95, 0.85, 1.05);
  head.position.set(0.36, 0.13, 0);
  head.castShadow = true;
  catBody.add(head);
  // Schnauze und Kinn
  [-1, 1].forEach((s) => sphere(0.035, cream, 0.465, 0.09, s * 0.025, catBody));
  sphere(0.03, cream, 0.45, 0.065, 0, catBody);
  // Rosa Nase
  const nose = sphere(0.016, mat("#e8a0a0", { roughness: 0.5 }), 0.495, 0.115, 0, catBody);
  nose.scale.set(0.8, 0.7, 1.2);
  // Große bernsteinfarbene Augen mit runden Pupillen
  const eyeMat = mat("#e3a92b", { roughness: 0.25, emissive: "#6b4500", emissiveIntensity: 0.4 });
  const pupilMat = mat("#0b0b0b", { roughness: 0.2 });
  const shineMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  [-1, 1].forEach((s) => {
    const eye = sphere(0.032, eyeMat, 0.445, 0.155, s * 0.052, catBody);
    eye.castShadow = false;
    const pupil = sphere(0.02, pupilMat, 0.468, 0.155, s * 0.054, catBody);
    pupil.scale.set(0.5, 1, 1);
    pupil.castShadow = false;
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), shineMat);
    shine.position.set(0.474, 0.166, s * 0.048);
    catBody.add(shine);
    // Aufgestellte Ohren mit rosa Innenseite
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), furPlain);
    ear.position.set(0.33, 0.26, s * 0.075);
    ear.rotation.set(s * 0.35, Math.PI / 4, 0);
    ear.castShadow = true;
    catBody.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4), mat("#d9a3a0"));
    inner.position.set(0.345, 0.255, s * 0.075);
    inner.rotation.set(s * 0.35, Math.PI / 4, 0);
    catBody.add(inner);
  });
  // Schnurrhaare
  const whiskerMat = new THREE.LineBasicMaterial({ color: "#f1ede4" });
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 3; i++) {
      const pts = [new THREE.Vector3(0.48, 0.095, s * 0.03), new THREE.Vector3(0.52, 0.08 + i * 0.025, s * (0.17 + i * 0.01))];
      catBody.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), whiskerMat));
    }
  });

  // Geringelter Schwanz mit dunkler Spitze
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.28, 0.08, 0),
    new THREE.Vector3(-0.45, 0.05, 0.04),
    new THREE.Vector3(-0.58, 0.04, 0.16),
    new THREE.Vector3(-0.6, 0.04, 0.3),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 32, 0.032, 10), mat("#ffffff", { map: tabbyTexture(true), roughness: 0.95 }));
  tail.castShadow = true;
  catBody.add(tail);
  catBody.rotation.y = -0.15;

  // Napf mit Namen
  const bowlTex = canvasTexture(512, 64, (g, w, h) => {
    g.fillStyle = "#e11d48";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff";
    g.font = "800 40px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("COCO", w / 4, h / 2 + 2);
    g.fillText("COCO", (w * 3) / 4, h / 2 + 2);
  });
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.15, 0.1, 32, 1, true),
    mat("#ffffff", { map: bowlTex, side: THREE.DoubleSide, roughness: 0.4 })
  );
  bowl.position.set(1.65, -0.56, 0.75); // relativ zur Gruppe, die auf Betthöhe liegt
  bowl.castShadow = true;
  cat.add(bowl);
  cyl(0.16, 0.16, 0.02, mat("#7c4a1e", { roughness: 1 }), 1.65, -0.55, 0.75, cat);
  makeInteractive(cat);

  // ---------- Spielautomat (Minigame) ----------
  const arcade = group("minigame", 3.2, 0, -3.45);
  const cabMat = mat("#312e81", { roughness: 0.5 });
  box(0.95, 1.95, 0.8, cabMat, 0, 0.975, 0, arcade);
  box(1.0, 0.06, 0.85, mat("#f472b6"), 0, 1.98, 0, arcade);
  const arcadeTex = canvasTexture(320, 250, (g, w, h) => {
    g.fillStyle = "#020617";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#22c55e";
    g.beginPath();
    g.arc(w / 2, 115, 55, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#052e16";
    g.font = "900 34px monospace";
    g.textAlign = "center";
    g.fillText("GO!", w / 2, 127);
    g.fillStyle = "#fde68a";
    g.font = "700 22px monospace";
    g.fillText("REACTION", w / 2, 36);
    g.fillStyle = "#e2e8f0";
    g.font = "16px monospace";
    g.fillText("BEST 187 ms", w / 2, 210);
    g.fillText("PRESS START", w / 2, 234);
  });
  const arcadeScreen = glowPlane(0.72, 0.56, arcadeTex, 0, 1.42, 0.41, arcade);
  arcadeScreen.rotation.x = -0.12;
  const marqueeTex = canvasTexture(320, 80, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, "#f472b6");
    grd.addColorStop(1, "#22d3ee");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1e1b4b";
    g.font = "900 44px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("ARCADE", w / 2, h / 2 + 2);
  });
  const marquee = glowPlane(0.86, 0.22, marqueeTex, 0, 1.83, 0.41, arcade);
  box(0.95, 0.12, 0.3, mat("#1e1b4b"), 0, 1.02, 0.5, arcade); // Bedienfeld
  sphere(0.04, mat("#ef4444", { roughness: 0.3 }), -0.2, 1.1, 0.52, arcade);
  sphere(0.04, mat("#22c55e", { roughness: 0.3 }), 0.05, 1.1, 0.52, arcade);
  sphere(0.04, mat("#3b82f6", { roughness: 0.3 }), 0.2, 1.1, 0.52, arcade);
  cyl(0.012, 0.012, 0.12, mat("#111827"), -0.32, 1.13, 0.5, arcade, 8);
  sphere(0.035, mat("#ef4444"), -0.32, 1.2, 0.5, arcade);
  makeInteractive(arcade);

  // ---------- Lichterkette ----------
  const fairy = [];
  const fairyColors = ["#fde68a", "#f9a8d4", "#93c5fd", "#86efac"];
  function fairyLine(from, to, n) {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().lerpVectors(from, to, t);
      p.y -= Math.sin(t * Math.PI * 4) ** 2 * 0.12;
      const m = new THREE.MeshStandardMaterial({ color: "#fff", emissive: fairyColors[i % 4], emissiveIntensity: 0.3 });
      const s = sphere(0.035, m, p.x, p.y, p.z);
      s.castShadow = false;
      fairy.push(s);
    }
  }
  fairyLine(new THREE.Vector3(-3.9, 3.8, -3.9), new THREE.Vector3(3.9, 3.8, -3.9), 36);
  fairyLine(new THREE.Vector3(-3.9, 3.8, -3.8), new THREE.Vector3(-3.9, 3.8, 3.9), 34);

  // ---------- Licht ----------
  const hemi = new THREE.HemisphereLight("#fff6e8", "#b08968", 2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff1d6", 2.4);
  sun.position.set(-7, 9, 5);
  sun.target.position.set(0, 0, -1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -7;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const lampLight = new THREE.PointLight("#ffb46b", 0, 9, 1.6);
  lampLight.position.set(-0.65, 1.3, -3.6);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(512, 512);
  lampLight.shadow.bias = -0.002;
  scene.add(lampLight);
  // Warmes Raumlicht, das nachts mit der Lampe angeht
  const roomLight = new THREE.PointLight("#ffd2a0", 0, 14, 1.4);
  roomLight.position.set(0.2, 3.6, -0.2);
  scene.add(roomLight);
  const screenLight = new THREE.PointLight("#7aa7ff", 0, 4, 2);
  screenLight.position.set(0.3, 1.3, -2.9);
  const arcadeLight = new THREE.PointLight("#f472b6", 0, 4, 2);
  arcadeLight.position.set(3.1, 1.6, -2.6);
  const neonLight = new THREE.PointLight("#f472b6", 0, 3.5, 2);
  neonLight.position.set(0.3, 2.75, -3.6);
  scene.add(screenLight, arcadeLight, neonLight);

  // ---------- Tag & Nacht (folgt dem Website-Theme) ----------
  const isDark = () => document.documentElement.dataset.theme === "dark";
  let night = isDark() ? 1 : 0;
  let nightTarget = night;
  drawSky(night > 0.5);

  // Lampe = Lichtschalter fürs Zimmer. Nachts ist es mit Licht hell und gemütlich, ohne Licht dunkel.
  let light = 1;
  let lightTarget = 1;

  function applyNight(n) {
    const l = light;
    const dark = n * (1 - l); // 1 = Nacht ohne Licht
    hemi.intensity = THREE.MathUtils.lerp(2.0, THREE.MathUtils.lerp(0.18, 1.15, l), n);
    hemi.color.set(n > 0.5 ? (l > 0.5 ? "#ffe4c4" : "#9fb3ff") : "#fff6e8");
    sun.intensity = THREE.MathUtils.lerp(2.4, 0.05, n);
    lampLight.intensity = l * THREE.MathUtils.lerp(0.6, 9, n);
    roomLight.intensity = l * n * 14;
    bulbMat.emissiveIntensity = l * THREE.MathUtils.lerp(0.6, 3, n);
    screenLight.intensity = THREE.MathUtils.lerp(0.2, 2.2, n);
    arcadeLight.intensity = THREE.MathUtils.lerp(0.2, 2.5, n);
    neonLight.intensity = THREE.MathUtils.lerp(0.3, 2.5, n);
    neon.material.opacity = THREE.MathUtils.lerp(0.75, 1, n);
    neon.material.transparent = true;
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.0, 1.15, n);
    eyeMat.emissiveIntensity = THREE.MathUtils.lerp(0.4, 1.6, dark); // Katzenaugen leuchten im Dunkeln
  }
  applyNight(night);

  new MutationObserver(() => {
    nightTarget = isDark() ? 1 : 0;
    drawSky(nightTarget > 0.5);
    if (reducedMotion.matches) {
      night = nightTarget;
      applyNight(night);
    }
    updateLampButton();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function toggleLamp() {
    lightTarget = lightTarget ? 0 : 1;
    if (reducedMotion.matches) {
      light = lightTarget;
      applyNight(night);
    }
    updateLampButton();
  }

  // ---------- Geräusche ----------
  let audio;
  function sound(kind) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const now = audio.currentTime;
      const gain = audio.createGain();
      gain.connect(audio.destination);
      const osc = audio.createOscillator();
      if (kind === "quack") {
        const filter = audio.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1100;
        filter.Q.value = 3;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.18);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(filter).connect(gain);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (kind === "purr") {
        const lfo = audio.createOscillator();
        const lfoGain = audio.createGain();
        lfo.frequency.value = 24;
        lfoGain.gain.value = 0.12;
        lfo.connect(lfoGain).connect(gain.gain);
        osc.type = "triangle";
        osc.frequency.value = 52;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 1.3);
        osc.connect(gain);
        osc.start(now);
        lfo.start(now);
        osc.stop(now + 1.3);
        lfo.stop(now + 1.3);
      } else if (kind === "click") {
        osc.type = "square";
        osc.frequency.value = 1800;
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      /* ohne Ton geht's auch */
    }
  }

  // Herzchen über der Katze
  const heartTex = canvasTexture(64, 64, (g) => {
    g.font = "48px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("❤️", 32, 36);
  });
  const hearts = [];
  function spawnHearts() {
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
      s.scale.setScalar(0.18);
      s.position.set(-2.85 + (Math.random() - 0.5) * 0.3, 1.0, 2.95 + (Math.random() - 0.5) * 0.3);
      s.userData.born = performance.now() + i * 150;
      scene.add(s);
      hearts.push(s);
    }
  }

  // ---------- Kamera-Fahrten ----------
  const FOCUS = {
    website: { pos: [0.3, 1.75, -0.9], target: [0.3, 1.15, -3.5] },
    lamp: { pos: [0.1, 1.7, -1.7], target: [-0.55, 1.05, -3.65] },
    duck: { pos: [1.2, 1.25, -2.35], target: [0.95, 0.88, -3.25] },
    contact: { pos: [1.5, 1.4, -2.45], target: [1.3, 0.82, -3.65] },
    minigame: { pos: [3.2, 1.65, -0.8], target: [3.2, 1.3, -3.4] },
    lan: { pos: [-2.1, 2.2, -0.9], target: [-2.3, 2.25, -3.95] },
    about: { pos: [-0.3, 1.7, 0.8], target: [-3.7, 1.2, 0.3] },
    cat: { pos: [-1.85, 1.45, 3.95], target: [-3.0, 0.72, 2.95] },
  };
  function homeView() {
    const aspect = camera.aspect || 1.5;
    const k = aspect < 0.8 ? 2.05 : aspect < 1.2 ? 1.35 : 1;
    return { pos: [7.2 * k, 5.6 * k, 7.6 * k], target: [0, 1.1, -0.6] };
  }

  let flight = null;
  function flyTo(view) {
    const to = { pos: new THREE.Vector3(...view.pos), target: new THREE.Vector3(...view.target) };
    if (reducedMotion.matches) {
      camera.position.copy(to.pos);
      controls.target.copy(to.target);
      controls.update();
      return;
    }
    flight = {
      from: { pos: camera.position.clone(), target: controls.target.clone() },
      to,
      start: performance.now(),
      dur: 1100,
    };
    controls.enabled = false;
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  // ---------- Auswahl & Panel ----------
  const anim = { duck: 0, cat: 0 };
  let selected = null;

  function updateLampButton() {
    if (selected === "lamp") panelAction.textContent = lightTarget ? T.lampOff : T.lampOn;
  }

  function select(key) {
    const item = T.items[key];
    if (!item) return;
    selected = key;
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.item === key)));
    panelTitle.textContent = item.title;
    panelText.textContent = item.text;
    panelLink.hidden = !item.url;
    if (item.url) panelLink.href = item.url;
    panelAction.hidden = key !== "lamp";
    updateLampButton();
    panel.hidden = false;

    if (key === "duck") {
      anim.duck = performance.now();
      sound("quack");
    } else if (key === "cat") {
      anim.cat = performance.now();
      sound("purr");
      spawnHearts();
    } else {
      sound("click");
    }
    flyTo(FOCUS[key]);
  }

  function closePanel(fly = true) {
    selected = null;
    panel.hidden = true;
    chips.forEach((c) => c.setAttribute("aria-pressed", "false"));
    if (fly) flyTo(homeView());
  }

  document.getElementById("roomClose").addEventListener("click", () => closePanel());
  document.getElementById("roomReset").addEventListener("click", () => closePanel());
  panelAction.addEventListener("click", toggleLamp);
  chips.forEach((c) => c.addEventListener("click", () => select(c.dataset.item)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && selected) closePanel();
  });

  const fullBtn = document.getElementById("roomFull");
  if (!stage.requestFullscreen) fullBtn.hidden = true;
  fullBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.requestFullscreen().catch(() => {});
  });

  // ---------- Zeigen & Klicken ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;
  let down = null;

  function itemAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactive, false)[0];
    let o = hit && hit.object;
    while (o && !o.userData.item) o = o.parent;
    return o ? o.userData.item : null;
  }

  const highlightGroups = {};
  scene.traverse((o) => {
    if (o.userData.item) (highlightGroups[o.userData.item] ||= []).push(o);
  });

  function setHighlight(key, on) {
    (highlightGroups[key] || []).forEach((g) =>
      g.traverse((o) => {
        if (!o.isMesh || !o.material.emissive || o.material === bulbMat) return;
        if (on) {
          o.userData.emissive ??= o.material.emissive.getHex();
          o.userData.emissiveI ??= o.material.emissiveIntensity;
          // Dezent und nachts noch schwächer, sonst färbt sich alles gelb
          o.material.emissive.set("#fff4e0");
          o.material.emissiveIntensity = 0.04 + 0.12 * (1 - night);
        } else if (o.userData.emissive !== undefined) {
          o.material.emissive.setHex(o.userData.emissive);
          o.material.emissiveIntensity = o.userData.emissiveI;
        }
      })
    );
  }

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const key = itemAt(e.clientX, e.clientY);
    if (key !== hovered) {
      if (hovered) setHighlight(hovered, false);
      if (key) setHighlight(key, true);
      hovered = key;
      canvas.classList.toggle("is-hover", Boolean(key));
    }
    if (key) {
      const rect = stage.getBoundingClientRect();
      tip.textContent = T.items[key].label;
      tip.style.left = e.clientX - rect.left + "px";
      tip.style.top = e.clientY - rect.top + "px";
      tip.hidden = false;
    } else {
      tip.hidden = true;
    }
  });
  canvas.addEventListener("pointerleave", () => {
    if (hovered) setHighlight(hovered, false);
    hovered = null;
    tip.hidden = true;
  });
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    const key = itemAt(e.clientX, e.clientY);
    if (!key) return;
    if (key === "lamp") toggleLamp();
    select(key);
  });
  // Wer selbst dreht, beendet eine laufende Kamerafahrt
  controls.addEventListener("start", () => {
    flight = null;
    controls.enabled = true;
  });

  // ---------- Größe ----------
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  const start = homeView();
  camera.position.set(...start.pos);
  controls.target.set(...start.target);
  controls.update();

  // Nur rendern, wenn das Zimmer zu sehen ist
  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(stage);

  // ---------- Animation ----------
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    const now = performance.now();
    const calm = reducedMotion.matches;

    if (night !== nightTarget || light !== lightTarget) {
      const step = dt / 0.7;
      night = Math.abs(nightTarget - night) <= step ? nightTarget : night + Math.sign(nightTarget - night) * step;
      const lstep = dt / 0.35;
      light = Math.abs(lightTarget - light) <= lstep ? lightTarget : light + Math.sign(lightTarget - light) * lstep;
      applyNight(night);
    }

    if (flight) {
      const k = Math.min((now - flight.start) / flight.dur, 1);
      const e = ease(k);
      camera.position.lerpVectors(flight.from.pos, flight.to.pos, e);
      controls.target.lerpVectors(flight.from.target, flight.to.target, e);
      if (k >= 1) {
        flight = null;
        controls.enabled = true;
      }
    }
    controls.update();

    // Lichterkette funkelt (nachts heller)
    fairy.forEach((s, i) => {
      const twinkle = calm ? 0.8 : 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7);
      s.material.emissiveIntensity = (0.25 + night * 2.2) * twinkle;
    });

    // Katze atmet, Ente hüpft
    if (!calm) catBody.scale.y = 1 + Math.sin(t * 1.6) * 0.035;
    const catT = (now - anim.cat) / 1000;
    catBody.position.y = catT < 0.5 && !calm ? Math.sin(catT * Math.PI * 2) * 0.05 : 0;

    const duckT = (now - anim.duck) / 1000;
    if (duckT < 0.6 && !calm) {
      duckBody.position.y = Math.sin((duckT / 0.6) * Math.PI) * 0.18;
      duckBody.rotation.y = 0.9 + (duckT / 0.6) * Math.PI * 2;
    } else {
      duckBody.position.y = 0;
      duckBody.rotation.y = 0.9;
    }

    // Herzchen steigen auf
    for (let i = hearts.length - 1; i >= 0; i--) {
      const s = hearts[i];
      const age = (now - s.userData.born) / 1000;
      if (age < 0) {
        s.visible = false;
        continue;
      }
      s.visible = true;
      s.position.y += dt * 0.5;
      s.material.opacity = Math.max(0, 1 - age / 1.6);
      if (age > 1.6) {
        scene.remove(s);
        s.material.dispose();
        hearts.splice(i, 1);
      }
    }

    // Automat und Neon pulsieren leicht
    if (!calm) marquee.material.color.setScalar(0.85 + 0.15 * Math.sin(t * 3));

    renderer.render(scene, camera);
  });

  loadingEl.hidden = true;
}
