// Procedural, PBR-shaded 3D models of each portfolio project.
// Every builder returns a Model: { root, update(dt, t), setExplode(e), caps, ... }
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */
const std = (color, metalness, roughness, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const phys = (color, metalness, roughness, extra = {}) =>
  new THREE.MeshPhysicalMaterial({ color, metalness, roughness, ...extra });

export const MAT = {
  steel: std(0xc9cdd2, 1, 0.24),
  brushed: std(0xb4b9bf, 1, 0.38),
  darkSteel: std(0x4d5258, 1, 0.42),
  chrome: std(0xf1f3f5, 1, 0.08),
  alu: std(0xd3d6da, 0.95, 0.32),
  castAlu: std(0xa9adb2, 0.85, 0.55),
  brass: std(0xd7aa55, 1, 0.28),
  bronze: std(0xb47a3e, 1, 0.34),
  copper: std(0xc7764a, 1, 0.3),
  rubber: std(0x151618, 0, 0.88),
  blackPlastic: std(0x1c1e21, 0.05, 0.45),
  carbon: phys(0x1d1f23, 0.35, 0.32, { clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  paintBlue: phys(0x1f4f9c, 0.25, 0.38, { clearcoat: 0.7, clearcoatRoughness: 0.15 }),
  paintOrange: phys(0xe2661c, 0.2, 0.4, { clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  paintRed: phys(0x8e1f1f, 0.25, 0.38, { clearcoat: 0.7, clearcoatRoughness: 0.15 }),
  paintTeal: phys(0x177c84, 0.25, 0.38, { clearcoat: 0.7, clearcoatRoughness: 0.15 }),
  paintYellow: phys(0xe2ae16, 0.25, 0.42, { clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  goldAnodized: std(0xcfa337, 0.9, 0.36),
  blueAnodized: std(0x2a59b8, 0.85, 0.3),
  whitePaint: phys(0xf3f3f1, 0.05, 0.28, { clearcoat: 1, clearcoatRoughness: 0.08 }),
  titanium: std(0x7f8b99, 1, 0.3),
  inconel: std(0x6a5d50, 1, 0.42),
  stainless: std(0xb8ae9c, 1, 0.34),
  vinylRed: phys(0xc4161c, 0, 0.45, { clearcoat: 0.4 }),
  filter: std(0xe3701f, 0, 0.75, { flatShading: true }),
  dark: std(0x0b0c0e, 0, 0.9),
};

/* ---- procedural surface textures (brushed metal, cast/peel noise, 3D-print layers) ---- */
function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
  return t;
}
let rnd = 7; const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
export const TEX = {
  brushed: canvasTex(512, (g, n) => {
    g.fillStyle = 'rgb(200,200,200)'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) {
      const y = rand() * n, l = 40 + rand() * 260, x = rand() * n, v = 150 + rand() * 105;
      g.strokeStyle = `rgba(${v},${v},${v},${0.25 + rand() * 0.35})`; g.lineWidth = 0.6 + rand();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (rand() - 0.5) * 2); g.stroke();
    }
  }, 2),
  cast: canvasTex(256, (g, n) => {
    const d = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = 150 + rand() * 90; d.data.set([v, v, v, 255], i * 4); }
    g.putImageData(d, 0, 0);
    g.filter = 'blur(1px)'; g.drawImage(g.canvas, 0, 0);
  }, 3),
  peel: canvasTex(256, (g, n) => {
    g.fillStyle = '#888'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) {
      const r = 2 + rand() * 6, x = rand() * n, y = rand() * n, v = 110 + rand() * 60;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${v},${v},${v},0.6)`); grd.addColorStop(1, 'rgba(136,136,136,0)');
      g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 4),
  layers: canvasTex(256, (g, n) => {
    for (let y = 0; y < n; y += 4) {
      const v = 120 + rand() * 30;
      g.fillStyle = `rgb(${v + 70},${v + 70},${v + 70})`; g.fillRect(0, y, n, 2);
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y + 2, n, 2);
    }
  }, 1),
};
// Attach textures to the shared materials
for (const k of ['steel', 'brushed', 'darkSteel', 'chrome', 'alu', 'stainless', 'titanium']) {
  MAT[k].roughnessMap = TEX.brushed; MAT[k].bumpMap = TEX.brushed; MAT[k].bumpScale = 0.4;
}
for (const k of ['castAlu', 'inconel', 'bronze']) { MAT[k].bumpMap = TEX.cast; MAT[k].bumpScale = 1.2; MAT[k].roughnessMap = TEX.cast; }
for (const k of ['paintBlue', 'paintOrange', 'paintRed', 'paintTeal', 'paintYellow', 'whitePaint']) { MAT[k].bumpMap = TEX.peel; MAT[k].bumpScale = 0.35; }
MAT.blackPaint = phys(0x17181b, 0.3, 0.45, { clearcoat: 0.5, bumpMap: TEX.cast, bumpScale: 0.6 });
MAT.wood = phys(0x6a3b1c, 0, 0.42, { clearcoat: 0.9, clearcoatRoughness: 0.1, bumpMap: TEX.brushed, bumpScale: 0.6 });

function ghostMaterial(color = 0xa9c8ff) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.14,
    depthWrite: false, side: THREE.DoubleSide, clearcoat: 1,
  });
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */
function mesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
// cylinder along Y
const cyl = (rt, rb, h, mat, seg = 48) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
const rbox = (w, h, d, r, mat, seg = 3) => mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999), mat);
function alongX(o) { o.rotation.z = Math.PI / 2; return o; }
function alongZ(o) { o.rotation.x = Math.PI / 2; return o; }
function at(o, x = 0, y = 0, z = 0) { o.position.set(x, y, z); return o; }

function circlePath(x, y, r, hole = true) {
  const p = hole ? new THREE.Path() : new THREE.Shape();
  p.absarc(x, y, r, 0, TAU, hole);
  return p;
}
function slotPath(x, y, len, r, hole = true) {
  const p = hole ? new THREE.Path() : new THREE.Shape();
  p.moveTo(x - len / 2, y - r);
  p.lineTo(x + len / 2, y - r);
  p.absarc(x + len / 2, y, r, -Math.PI / 2, Math.PI / 2, false);
  p.lineTo(x - len / 2, y + r);
  p.absarc(x - len / 2, y, r, Math.PI / 2, Math.PI * 1.5, false);
  return p;
}
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// Extrude a shape along Z, centered on z=0, with a small bevel for realistic highlights.
function extrude(shape, depth, bevel = 0.012, curveSegments = 48) {
  const b = Math.min(bevel, depth / 4);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - 2 * b, 0.001), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b,
    bevelSegments: 2, curveSegments,
  });
  g.translate(0, 0, -depth / 2 + b);
  return g;
}
// Ring (washer/flange) along Z with optional extra holes.
function ringGeo(rOut, rIn, depth, holes = [], bevel = 0.015) {
  const s = circlePath(0, 0, rOut, false);
  if (rIn > 0) s.holes.push(circlePath(0, 0, rIn));
  holes.forEach((h) => s.holes.push(circlePath(h[0], h[1], h[2])));
  return extrude(s, depth, bevel, 64);
}
// Hex nut along Y.
function hexNut(r, h, mat) {
  const g = new THREE.CylinderGeometry(r, r, h, 6);
  const m = mesh(g, mat);
  const washer = cyl(r * 0.95, r * 0.95, h * 0.15, mat, 32);
  washer.position.y = -h * 0.55;
  m.add(washer);
  return m;
}
function bolt(rShank, len, mat) {
  const g = new THREE.Group();
  const head = mesh(new THREE.CylinderGeometry(rShank * 1.8, rShank * 1.8, rShank * 1.3, 6), mat);
  head.position.y = rShank * 0.65;
  const shank = cyl(rShank, rShank, len, mat, 20);
  shank.position.y = -len / 2;
  g.add(head, shank);
  return g;
}
// Tube with varying radius along a curve (used for the crane hook).
function variableTube(curve, radiusFn, tubular = 140, radial = 28) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos = [], idx = [];
  const P = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    curve.getPointAt(u, P);
    const N = frames.normals[i], B = frames.binormals[i], r = radiusFn(u);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU;
      v.copy(P).addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r * 1.12);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < tubular; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Screw thread helix around the X axis.
function threadGeo(rCore, pitch, length, tubeR) {
  const turns = length / pitch;
  const pts = [];
  const n = Math.ceil(turns * 24);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * turns * TAU;
    pts.push(new THREE.Vector3(-length / 2 + (i / n) * length, Math.cos(a) * rCore, Math.sin(a) * rCore));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, tubeR, 6, false);
}
// Connecting rod spanning 0..L along +Y, pin axis along Z.
function conRod(L, rBig, rSmall, thick, mat) {
  const g = new THREE.Group();
  const big = mesh(ringGeo(rBig, rBig * 0.55, thick), mat);
  const small = mesh(ringGeo(rSmall, rSmall * 0.5, thick * 0.85), mat);
  small.position.y = L;
  const shape = new THREE.Shape();
  shape.moveTo(-rBig * 0.7, 0); shape.lineTo(rBig * 0.7, 0);
  shape.lineTo(rSmall * 0.55, L); shape.lineTo(-rSmall * 0.55, L); shape.closePath();
  const beam = mesh(extrude(shape, thick * 0.6, 0.008), mat);
  g.add(big, small, beam);
  return g;
}
function piston(r, h, mat) {
  const g = new THREE.Group();
  const body = cyl(r, r, h, mat, 40);
  body.position.y = h * 0.28;
  g.add(body);
  for (let i = 0; i < 3; i++) {
    const ring = mesh(new THREE.TorusGeometry(r * 1.0, r * 0.035, 8, 40), MAT.darkSteel);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = h * 0.28 + h * 0.36 - i * h * 0.12;
    g.add(ring);
  }
  const pin = alongZ(cyl(r * 0.22, r * 0.22, r * 1.9, MAT.chrome, 20));
  g.add(pin);
  return g;
}
// Slider-crank kinematics in the XY plane. Angles measured clockwise from +Y.
const dirOf = (a, out = new THREE.Vector3()) => out.set(Math.sin(a), Math.cos(a), 0);
function pistonDistance(pin, axisAngle, L) {
  const u = dirOf(axisAngle);
  const pu = pin.x * u.x + pin.y * u.y;
  const perp2 = pin.x * pin.x + pin.y * pin.y - pu * pu;
  return pu + Math.sqrt(Math.max(L * L - perp2, 0));
}
const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
function pointAt(obj, from, to) {
  obj.position.copy(from);
  _v.subVectors(to, from).normalize();
  obj.quaternion.setFromUnitVectors(UP, _v);
}

// Heat-tint colouring along a tube (straw -> bronze -> purple -> blue -> grey), like real exhaust headers.
const HEAT = ['#d9b56a', '#b8763e', '#7d4a7c', '#3f5ea8', '#7f8fa6', '#a7abb0'].map((c) => new THREE.Color(c));
function heatTint(geo, tubular, radial, start = 0) {
  const n = geo.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i <= tubular; i++) {
    const t = Math.min(1, start + (i / tubular) * (1 - start)) * (HEAT.length - 1);
    const k = Math.min(HEAT.length - 2, Math.floor(t));
    c.copy(HEAT[k]).lerp(HEAT[k + 1], t - k);
    for (let j = 0; j <= radial; j++) { const v = i * (radial + 1) + j; if (v < n) c.toArray(col, v * 3); }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const heatMat = std(0xffffff, 1, 0.34, { vertexColors: true, roughnessMap: TEX.brushed, bumpMap: TEX.cast, bumpScale: 0.6 });

/* ------------------------------------------------------------------ */
/* Model base                                                        */
/* ------------------------------------------------------------------ */
class Model {
  constructor() {
    this.root = new THREE.Group();     // positioned/scaled by the viewer
    this.inner = new THREE.Group();    // raw model space
    this.root.add(this.inner);
    this.parts = [];
    this.housings = [];
    this.caps = { explode: false, motion: false, xray: false, materials: null };
    this.explode = 0;
    this.xray = false;
    this.playing = true;
    this.view = { dir: [1, 0.55, 1.3], fit: 1 };
  }
  part(obj, dir) {
    this.parts.push({ obj, base: obj.position.clone(), dir: new THREE.Vector3(...dir) });
    this.caps.explode = true;
    return obj;
  }
  housing(m, ghostColor) {
    const ghost = ghostMaterial(ghostColor);
    this.housings.push({ m, solid: m.material, ghost });
    this.caps.xray = true;
    return m;
  }
  setExplode(e) {
    this.explode = e;
    for (const p of this.parts) p.obj.position.copy(p.base).addScaledVector(p.dir, e);
  }
  setXray(on) {
    this.xray = on;
    for (const h of this.housings) {
      h.m.material = on ? h.ghost : h.solid;
      h.m.castShadow = !on;
    }
  }
  // Fit the model to ~size units, centered, resting on y=0.
  normalize(size = 3.4) {
    this.inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.inner);
    const s = box.getSize(new THREE.Vector3());
    const k = (size * this.view.fit) / Math.max(s.x, s.y, s.z);
    this.inner.scale.setScalar(k);
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(k);
    this.inner.position.set(-c.x, -box.min.y * k + 0.02, -c.z);
    this.height = s.y * k;
    return this;
  }
  update() {}
}

/* ------------------------------------------------------------------ */
/* Certificate in a frame                                              */
/* ------------------------------------------------------------------ */
function buildCertificate(textureLoader) {
  const m = new Model();
  const W = 3.2, H = (W * 994) / 1287;
  const g = new THREE.Group();
  const tex = textureLoader.load('assets/img/certification.webp');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const wood = phys(0x2b2f36, 0.6, 0.35, { clearcoat: 0.6 });
  const fw = 0.16, fd = 0.12;
  const frame = [
    at(rbox(W + 0.7, fw, fd, 0.03, wood), 0, (H + 0.7) / 2 - fw / 2, 0),
    at(rbox(W + 0.7, fw, fd, 0.03, wood), 0, -(H + 0.7) / 2 + fw / 2, 0),
    at(rbox(fw, H + 0.7, fd, 0.03, wood), (W + 0.7) / 2 - fw / 2, 0, 0),
    at(rbox(fw, H + 0.7, fd, 0.03, wood), -(W + 0.7) / 2 + fw / 2, 0, 0),
  ];
  frame.forEach((f) => g.add(f));
  const mat = mesh(new THREE.PlaneGeometry(W + 0.42, H + 0.42), std(0xf4f1ea, 0, 0.95));
  mat.position.z = -0.02;
  const paper = mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  paper.position.z = -0.01;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.42, H + 0.42),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.08, clearcoat: 1 }));
  glass.position.z = 0.03;
  const back = mesh(new THREE.BoxGeometry(W + 0.5, H + 0.5, 0.03), MAT.blackPlastic);
  back.position.z = -0.05;
  g.add(mat, paper, glass, back);
  // easel stand
  const leg = rbox(0.18, H * 0.95, 0.06, 0.02, wood);
  leg.position.set(0, -0.2, -0.55); leg.rotation.x = -0.45;
  g.add(leg);
  g.rotation.x = -0.12;
  g.position.y = (H + 0.7) / 2;
  m.inner.add(g);
  m.view = { dir: [0.35, 0.18, 1.4], fit: 1.08 };
  m.update = (dt, t) => { g.rotation.y = Math.sin(t * 0.4) * 0.12; };
  return m;
}

/* ------------------------------------------------------------------ */
/* Sheet metal: bent sheets generated from a flat pattern + bend line  */
/* ------------------------------------------------------------------ */
// Centerline polyline with filleted (bent) corners. pts: [[x, y, bendRadius], ...]
function filletProfile(pts, seg = 14) {
  const V = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const out = [V[0].clone()];
  for (let i = 1; i < V.length - 1; i++) {
    const r = pts[i][2] || 0, P = V[i];
    if (!r) { out.push(P.clone()); continue; }
    const d1 = P.clone().sub(V[i - 1]).normalize(), d2 = V[i + 1].clone().sub(P).normalize();
    const cross = d1.x * d2.y - d1.y * d2.x, sgn = Math.sign(cross) || 1;
    const phi = Math.acos(THREE.MathUtils.clamp(d1.dot(d2), -1, 1));
    const T = r * Math.tan(phi / 2);
    const A = P.clone().addScaledVector(d1, -T), B = P.clone().addScaledVector(d2, T);
    const C = A.clone().add(new THREE.Vector2(-d1.y, d1.x).multiplyScalar(r * sgn));
    const a0 = Math.atan2(A.y - C.y, A.x - C.x);
    let da = Math.atan2(B.y - C.y, B.x - C.x) - a0;
    if (sgn > 0) while (da < 0) da += TAU; else while (da > 0) da -= TAU;
    for (let k = 0; k <= seg; k++) { const a = a0 + (da * k) / seg; out.push(new THREE.Vector2(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r)); }
  }
  out.push(V[V.length - 1].clone());
  return out;
}
function profileMap(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const segN = [];
  for (let i = 0; i < pts.length - 1; i++) { const d = pts[i + 1].clone().sub(pts[i]).normalize(); segN.push(new THREE.Vector2(-d.y, d.x)); }
  const vN = pts.map((_, i) => segN[Math.max(0, i - 1)].clone().add(segN[Math.min(segN.length - 1, i)]).normalize());
  const L = s[s.length - 1];
  const P = new THREE.Vector2(), N = new THREE.Vector2();
  return {
    length: L,
    at(u) {
      u = THREE.MathUtils.clamp(u, 0, L);
      let lo = 0, hi = s.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s[mid] <= u) lo = mid; else hi = mid; }
      const f = (u - s[lo]) / Math.max(s[hi] - s[lo], 1e-9);
      P.lerpVectors(pts[lo], pts[hi], f); N.lerpVectors(vN[lo], vN[hi], f).normalize();
      return { P, N };
    },
    uOf(x, y) {
      let best = 0, bd = Infinity;
      pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } });
      return s[best];
    },
  };
}
// Thick sheet: flat-pattern shape (u along the bend profile, v along Z) wrapped onto the profile.
function bentSheet(prof, shape, t, maxEdge = 1.6) {
  const pos = [], nor = [], uv = [];
  const map = (u, v, side) => {
    const { P, N } = prof.at(u), o = (side * t) / 2;
    return { p: [P.x + N.x * o, P.y + N.y * o, v], n: [N.x * side, N.y * side, 0], d: [N.y, -N.x] };
  };
  const push = (m, u, v, n) => { pos.push(...m.p); nor.push(...(n || m.n)); uv.push(v, u); };
  // top and bottom faces
  let flat = new THREE.ShapeGeometry(shape, 32);
  flat = new TessellateModifier(maxEdge, 16).modify(flat);
  const fp = flat.attributes.position;
  for (let i = 0; i < fp.count; i += 3) {
    const tri = [0, 1, 2].map((k) => [fp.getX(i + k), fp.getY(i + k)]);
    for (const k of [0, 2, 1]) push(map(tri[k][0], tri[k][1], 1), tri[k][0], tri[k][1]);
    for (const k of [0, 1, 2]) push(map(tri[k][0], tri[k][1], -1), tri[k][0], tri[k][1]);
  }
  // edge walls around the outline and every hole
  const { shape: outer, holes } = shape.extractPoints(32);
  const loops = [THREE.ShapeUtils.isClockWise(outer) ? outer.slice().reverse() : outer,
    ...holes.map((h) => (THREE.ShapeUtils.isClockWise(h) ? h : h.slice().reverse()))];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i++) {
      const p0 = loop[i], p1 = loop[(i + 1) % loop.length];
      const len = p0.distanceTo(p1);
      if (len < 1e-6) continue;
      const steps = Math.max(1, Math.ceil(len / 0.8));
      const ou = (p1.y - p0.y) / len, ov = -(p1.x - p0.x) / len; // outward normal in the flat plane
      for (let k = 0; k < steps; k++) {
        const q0 = p0.clone().lerp(p1, k / steps), q1 = p0.clone().lerp(p1, (k + 1) / steps);
        const A0 = map(q0.x, q0.y, 1), B0 = map(q0.x, q0.y, -1), A1 = map(q1.x, q1.y, 1), B1 = map(q1.x, q1.y, -1);
        const n0 = [A0.d[0] * ou, A0.d[1] * ou, ov], n1 = [A1.d[0] * ou, A1.d[1] * ou, ov];
        let tris = [[B0, q0, n0], [B1, q1, n1], [A1, q1, n1], [B0, q0, n0], [A1, q1, n1], [A0, q0, n0]];
        a.fromArray(B0.p); b.fromArray(B1.p).sub(a); c.fromArray(A1.p).sub(a);
        const fn = b.cross(c);
        if (fn.x * n0[0] + fn.y * n0[1] + fn.z * n0[2] < 0) tris = [tris[0], tris[2], tris[1], tris[3], tris[5], tris[4]];
        for (const [m, q, n] of tris) push(m, q.x, q.y, n);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return mesh(g, null);
}
function vSlot(x, y, len, r) { // obround slot running along Y
  const p = new THREE.Path();
  p.moveTo(x + r, y - len / 2); p.lineTo(x + r, y + len / 2);
  p.absarc(x, y + len / 2, r, 0, Math.PI, false);
  p.lineTo(x - r, y - len / 2);
  p.absarc(x, y - len / 2, r, Math.PI, TAU, false);
  return p;
}
function rectPath(x0, y0, x1, y1, r = 0) {
  const p = new THREE.Path();
  p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r);
  p.lineTo(x1, y1 - r); p.quadraticCurveTo(x1, y1, x1 - r, y1);
  p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r);
  p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p;
}
// Flat plate from a 2D shape: thickness along Y, shape-Y mapped to -Z.
function hPlate(shape, t, x, y, z) {
  const g = extrude(shape, t, 0.25, 32); g.rotateX(-Math.PI / 2); g.translate(x, y, z);
  return mesh(g, null);
}
// Printed-filament and sheet-steel finishes, with textures scaled in millimetres.
const mmTex = (tex, per) => { const t = tex.clone(); t.repeat.set(1 / per, 1 / per); t.needsUpdate = true; return t; };
const LAYERS = mmTex(TEX.layers, 26), BRUSH_MM = mmTex(TEX.brushed, 70), PEEL_MM = mmTex(TEX.peel, 40);
function printMaterials(name, color, extra = {}) {
  return {
    [name]: phys(color, 0, 0.62, { roughnessMap: LAYERS, bumpMap: LAYERS, bumpScale: 0.9, sheen: 0.3, sheenColor: new THREE.Color(color), ...extra }),
    'Zinc-plated steel': phys(0xc4c9cf, 1, 0.36, { roughnessMap: BRUSH_MM, bumpMap: BRUSH_MM, bumpScale: 0.5, iridescence: 0.25, iridescenceIOR: 1.4 }),
    'Powder-coat black': phys(0x1b1d21, 0.2, 0.55, { clearcoat: 0.4, bumpMap: PEEL_MM, bumpScale: 0.6 }),
  };
}
function sheetModel(materialSet, first) {
  const m = new Model();
  const meshes = [];
  m.sheet = (x, parent = m.inner) => { meshes.push(x); x.material = materialSet[m.material]; parent.add(x); return x; };
  m.material = first;
  m.caps.materials = Object.keys(materialSet);
  m.setMaterial = (k) => { m.material = k; meshes.forEach((x) => (x.material = materialSet[k])); };
  return m;
}

// 1) Sheet metal bracket — saddle profile with four bent ear tabs (printed in TPU)
function buildBracketSaddle() {
  const m = sheetModel(printMaterials('TPU print', 0xe2582a, { roughness: 0.78 }), 'TPU print');
  const t = 2, half = 35;
  const W1 = new THREE.Vector2(-45, 0), A1 = new THREE.Vector2(-17, 33);
  const W2 = new THREE.Vector2(45, 0), A2 = new THREE.Vector2(17, 33);
  const d1 = A1.clone().sub(W1).normalize(), d2 = W2.clone().sub(A2).normalize();
  const lipL = W1.clone().add(new THREE.Vector2(-d1.y, d1.x).multiplyScalar(12));
  const lipR = W2.clone().add(new THREE.Vector2(-d2.y, d2.x).multiplyScalar(12));
  const prof = profileMap(filletProfile([[lipL.x, lipL.y], [W1.x, W1.y, 2], [A1.x, A1.y, 2], [0, 12, 14], [A2.x, A2.y, 2], [W2.x, W2.y, 2], [lipR.x, lipR.y]]));
  const L = prof.length, uc = L / 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, -half); shape.lineTo(L, -half); shape.lineTo(L, half); shape.lineTo(0, half); shape.closePath();
  const uW1 = (prof.uOf(W1.x, W1.y) + prof.uOf(A1.x, A1.y)) / 2, uW2 = (prof.uOf(W2.x, W2.y) + prof.uOf(A2.x, A2.y)) / 2;
  for (const v of [-20, 20]) shape.holes.push(circlePath(uW1, v, 2.5), circlePath(uW2, v, 2.5), vSlot(uc, v, 7, 6));
  m.sheet(bentSheet(prof, shape, t));
  // ear tabs (R10, Ø5 hole) bent 90° up from the front & back edges of each wall
  for (const [P0, P1] of [[W1, A1], [A2, W2]]) {
    const d = P1.clone().sub(P0).normalize(), N = new THREE.Vector2(-d.y, d.x), mid = P0.clone().add(P1).multiplyScalar(0.5);
    const tab = new THREE.Shape();
    tab.moveTo(-10, 0); tab.lineTo(10, 0); tab.lineTo(10, 12); tab.absarc(0, 12, 10, 0, Math.PI, false); tab.lineTo(-10, 0);
    tab.holes.push(circlePath(0, 12, 2.5));
    for (const sz of [-1, 1]) {
      const g = extrude(tab, t, 0.3, 32);
      const mtx = new THREE.Matrix4().makeBasis(new THREE.Vector3(d.x, d.y, 0), new THREE.Vector3(N.x, N.y, 0), new THREE.Vector3(0, 0, 1));
      mtx.setPosition(mid.x, mid.y, sz * (half - t / 2));
      g.applyMatrix4(mtx);
      m.sheet(mesh(g, null));
    }
  }
  m.view = { dir: [0.9, 0.85, 1.25], fit: 0.95 };
  return m;
}

// 2) Sheet metal mounting bracket — hat profile, four feet, joggled motor tabs (printed in ABS)
function buildBracketMount() {
  const m = sheetModel(printMaterials('ABS print', 0x2c63b5, { roughness: 0.5 }), 'ABS print');
  const t = 2, H = 25;
  const prof = profileMap(filletProfile([[-70, 0], [-50, 0, 2], [-50, H, 2], [50, H, 2], [50, 0, 2], [70, 0]]));
  const L = prof.length, uc = L / 2;
  const cutL = prof.uOf(-50, H - 3), cutR = prof.uOf(50, H - 3);
  const sh = new THREE.Shape();
  sh.moveTo(0, -50); sh.lineTo(0, -30); sh.lineTo(cutL, -30); sh.lineTo(cutL, 30); sh.lineTo(0, 30); sh.lineTo(0, 50);
  sh.lineTo(uc - 25, 50);
  sh.absarc(uc, 50 + 31.2, 40, Math.PI + 0.675, TAU - 0.675, false); // R40 notch
  sh.lineTo(L, 50); sh.lineTo(L, 30); sh.lineTo(cutR, 30); sh.lineTo(cutR, -30); sh.lineTo(L, -30); sh.lineTo(L, -50); sh.closePath();
  sh.holes.push(circlePath(10, 40, 2.75), circlePath(10, -40, 2.75), circlePath(L - 10, 40, 2.75), circlePath(L - 10, -40, 2.75));
  sh.holes.push(circlePath(uc, 0, 30), vSlot(uc - 35, -36, 10, 3), vSlot(uc + 35, -36, 10, 3));
  m.sheet(bentSheet(prof, sh, t));
  // four joggled tabs (Ø3.4 holes) reaching into the Ø60 motor opening
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group();
    g.rotation.y = (k * Math.PI) / 2;
    const wall = rbox(10, 8, t, 0.4, null); wall.position.set(0, H - 3.5, 29);
    const tab = new THREE.Shape();
    tab.moveTo(-5, 0); tab.lineTo(5, 0); tab.lineTo(5, 15); tab.absarc(0, 15, 5, 0, Math.PI, false); tab.lineTo(-5, 0);
    tab.holes.push(circlePath(0, 15, 1.7));
    m.sheet(wall, g); m.sheet(hPlate(tab, t, 0, H - 7, 29), g);
    m.inner.add(g);
  }
  m.view = { dir: [0.95, 0.9, 1.2], fit: 0.95 };
  return m;
}

// 3) Motor bracket — upright motor plate with gussets, feet and lip (printed in PETG)
function buildMotorBracket() {
  const m = sheetModel(printMaterials('PETG print', 0x17a497, { roughness: 0.28, transmission: 0.25, thickness: 2, clearcoat: 0.5 }), 'PETG print');
  const t = 2;
  // main plate (shape centred, y in -50..50)
  const plate = roundedRectShape(80, 100, 1.5);
  const cy = 65 - 50;
  const yi = cy - Math.sqrt(625 - 17.5 * 17.5), a0 = Math.atan2(yi - cy, -17.5), a1 = Math.atan2(yi - cy, 17.5);
  const cut = new THREE.Path();
  cut.moveTo(-17.5, 35 - 50); cut.lineTo(17.5, 35 - 50); cut.lineTo(17.5, yi);
  cut.absarc(0, cy, 25, a1, a0 + TAU, false); cut.lineTo(-17.5, 35 - 50);
  plate.holes.push(cut);
  const cb = [[-27.5, 87.5], [27.5, 87.5], [-27.5, 42.5], [27.5, 42.5]];
  cb.forEach(([x, y]) => plate.holes.push(circlePath(x, y - 50, 2.5)));
  const ry = 16.25 - 50;
  [-30, -3, 5, 32].forEach((x) => plate.holes.push(circlePath(x, ry, 1.5)));
  plate.holes.push(circlePath(-15, ry, 7.5), rectPath(11, 10 - 50, 26, 22.5 - 50, 1.5));
  const pg = extrude(plate, t, 0.3, 48); pg.translate(0, 50, -t / 2);
  m.sheet(mesh(pg, null));
  // counterbore rings around the four Ø5 motor holes
  cb.forEach(([x, y]) => { const r = mesh(ringGeo(6.25, 2.5, 0.8, [], 0.2), null); r.position.set(x, y, 0.4); m.sheet(r); });
  // top flange G
  m.sheet(hPlate(roundedRectShape(80, 10, 1), t, 0, 100 - t / 2, 5));
  // side gussets E / F with feet B / C
  const gus = new THREE.Shape();
  gus.moveTo(0, 0); gus.lineTo(40, 0); gus.lineTo(40, 4); gus.lineTo(8, 50); gus.lineTo(8, 100); gus.lineTo(0, 100); gus.closePath();
  for (const sx of [-1, 1]) {
    const g = extrude(gus, t, 0.3, 8); g.rotateY(-Math.PI / 2); g.translate(sx * (40 - t / 2), 0, 0);
    m.sheet(mesh(g, null));
    const foot = roundedRectShape(10, 27.5, 1.5); foot.holes.push(circlePath(0, 6.25, 1.75), circlePath(0, -6.25, 1.75));
    m.sheet(hPlate(foot, t, sx * 45, t / 2, 26.25));
  }
  // bottom flange D
  const D = roundedRectShape(60, 20, 1.5); D.holes.push(circlePath(-17.5, 0, 1.75), circlePath(17.5, 0, 1.75));
  m.sheet(hPlate(D, t, 0, t / 2, 10));
  // lip A under the motor opening
  m.sheet(hPlate(roundedRectShape(30, 6, 0.8), t, 0, 35 - t / 2, 3));
  m.view = { dir: [0.75, 0.5, 1.35], fit: 0.84 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Bush-pin flexible coupling (axis X)                                 */
/* ------------------------------------------------------------------ */
function buildCoupling() {
  const m = new Model();
  const R = 1.0, T = 0.36, pcd = 0.66, gap = 0.06;
  const pinAngles = [0, 1, 2, 3].map((k) => Math.PI / 4 + (k * Math.PI) / 2);
  const holesFor = (rh) => pinAngles.map((a) => [Math.cos(a) * pcd, Math.sin(a) * pcd, rh]);
  const flangeGeo = (rh) => { const g = ringGeo(R, 0.26, T, holesFor(rh), 0.025); g.rotateY(Math.PI / 2); return g; };
  const side = (sx, paint, rh) => {
    const grp = new THREE.Group();
    const f = mesh(flangeGeo(rh), paint);
    f.position.x = sx * (gap + T / 2);
    const hub = alongX(cyl(0.48, 0.48, 0.55, paint, 64));
    hub.position.x = sx * (gap + T + 0.27);
    const chamfer = alongX(cyl(0.42, 0.48, 0.05, paint, 64));
    chamfer.position.x = sx * (gap + T + 0.57); if (sx > 0) chamfer.rotation.z = -Math.PI / 2;
    grp.add(f, hub, chamfer);
    return grp;
  };
  const A = m.part(side(-1, MAT.paintTeal, 0.09), [-1.1, 0, 0]);
  const B = m.part(side(1, MAT.paintRed, 0.16), [1.1, 0, 0]);
  m.inner.add(A, B);
  // shafts with keys
  for (const sx of [-1, 1]) {
    const s = new THREE.Group();
    const shaft = alongX(cyl(0.26, 0.26, 2.0, MAT.steel, 48));
    shaft.position.x = sx * 1.2;
    const key = rbox(1.1, 0.1, 0.12, 0.02, MAT.darkSteel);
    key.position.set(sx * 0.8, 0.27, 0);
    s.add(shaft, key);
    m.inner.add(m.part(s, [sx * 2.4, 0, 0]));
  }
  // pins, rubber bushes, nuts, washers
  const pins = new THREE.Group(), bushes = new THREE.Group(), nuts = new THREE.Group();
  for (const a of pinAngles) {
    const y = Math.cos(a) * pcd, z = Math.sin(a) * pcd;
    const pin = alongX(cyl(0.075, 0.075, 1.05, MAT.chrome, 24)); pin.position.set(0.02, y, z);
    const collar = alongX(cyl(0.12, 0.12, 0.08, MAT.chrome, 24)); collar.position.set(gap + T + 0.04 + 0.08, y, z);
    pins.add(pin, collar);
    const bush = alongX(mesh(new THREE.CylinderGeometry(0.155, 0.155, T + 0.08, 32), MAT.rubber)); bush.position.set(gap + T / 2 - 0.04, y, z);
    for (let k = 0; k < 3; k++) {
      const rib = alongX(mesh(new THREE.TorusGeometry(0.155, 0.012, 6, 28), MAT.rubber));
      rib.rotation.set(0, Math.PI / 2, 0); rib.position.set(gap + 0.04 + k * 0.12, y, z); bushes.add(rib);
    }
    bushes.add(bush);
    const nut = hexNut(0.13, 0.11, MAT.brass); nut.rotation.z = Math.PI / 2; nut.position.set(-(gap + T + 0.07), y, z);
    nuts.add(nut);
  }
  m.inner.add(m.part(pins, [0.35, 0, 0]), m.part(bushes, [0.6, 0, 0]), m.part(nuts, [-1.9, 0, 0]));
  m.inner.rotation.y = -0.25;
  m.view = { dir: [0.9, 0.5, 1.4], fit: 0.95 };
  m.caps.motion = true;
  m.update = (dt) => { if (m.playing) spin.rotation.x += dt * 1.2; };
  // spin the whole drive train about its axis
  const spin = new THREE.Group();
  while (m.inner.children.length) spin.add(m.inner.children[0]);
  m.inner.add(spin);
  return m;
}

/* ------------------------------------------------------------------ */
/* Double bearing (split housing)                                      */
/* ------------------------------------------------------------------ */
function buildBearing() {
  const m = new Model();
  const L = 3.2, D = 1.4, split = 1.15;
  const base = new THREE.Group();
  const foot = rbox(3.9, 0.25, 1.7, 0.05, MAT.paintBlue); foot.position.y = 0.125;
  const lower = rbox(L, split - 0.25, D, 0.06, MAT.paintBlue); lower.position.y = 0.25 + (split - 0.25) / 2;
  base.add(foot, lower);
  for (const sx of [-1, 1]) {
    const slot = mesh(extrude(slotPath(0, 0, 0.25, 0.08, false), 0.02, 0), MAT.dark);
    slot.rotation.x = -Math.PI / 2; slot.position.set(sx * 1.7, 0.252, 0);
    base.add(slot);
  }
  m.inner.add(base);
  const cap = rbox(L, 0.8, D, 0.08, MAT.paintOrange); cap.position.y = split + 0.4;
  const ridge = rbox(L - 0.4, 0.12, D - 0.4, 0.05, MAT.paintOrange); ridge.position.y = split + 0.85;
  const capG = new THREE.Group(); capG.add(cap, ridge);
  m.inner.add(m.part(capG, [0, 1.3, 0]));
  // bolts
  const bolts = new THREE.Group();
  for (const x of [-1.4, 0, 1.4]) for (const z of [-0.48, 0.48]) {
    const b = bolt(0.07, 1.0, MAT.steel); b.position.set(x, split + 0.82, z); bolts.add(b);
  }
  m.inner.add(m.part(bolts, [0, 2.6, 0]));
  // flanged bushings, protruding front & back
  const bushG = new THREE.Group();
  for (const x of [-0.8, 0.8]) {
    const sleeve = mesh(ringGeo(0.38, 0.26, D + 0.2, [], 0.02), MAT.bronze); sleeve.position.set(x, split, 0);
    const flange = mesh(ringGeo(0.5, 0.26, 0.08, [], 0.015), MAT.bronze); flange.position.set(x, split, D / 2 + 0.1);
    const bore = mesh(new THREE.CylinderGeometry(0.26, 0.26, D + 0.18, 32, 1, true), MAT.darkSteel);
    bore.rotation.x = Math.PI / 2; bore.position.set(x, split, 0);
    bushG.add(sleeve, flange, bore);
  }
  m.inner.add(m.part(bushG, [0, 0, 2.0]));
  // split line
  const line = mesh(new THREE.BoxGeometry(L + 0.01, 0.012, D + 0.01), MAT.dark, false); line.position.y = split;
  m.inner.add(line);
  m.view = { dir: [1.0, 0.75, 1.35], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Four-into-one exhaust manifold                                      */
/* ------------------------------------------------------------------ */
function buildManifold() {
  const m = new Model();
  const ports = [-1.5, -0.5, 0.5, 1.5];
  // inlet flange: scalloped outline built from lobes
  const fl = new THREE.Shape();
  fl.moveTo(-2.35, 0);
  fl.quadraticCurveTo(-2.35, 0.42, -2.0, 0.34);
  ports.forEach((x) => fl.quadraticCurveTo(x, 0.66, x + 0.5, 0.34));
  fl.quadraticCurveTo(2.35, 0.42, 2.35, 0);
  fl.quadraticCurveTo(2.35, -0.42, 2.0, -0.34);
  [...ports].reverse().forEach((x) => fl.quadraticCurveTo(x, -0.66, x - 0.5, -0.34));
  fl.quadraticCurveTo(-2.35, -0.42, -2.35, 0);
  ports.forEach((x) => fl.holes.push(circlePath(x, 0, 0.25)));
  [-2.05, 2.05].forEach((x) => fl.holes.push(circlePath(x, 0, 0.1)));
  [-1, 0, 1].forEach((x) => fl.holes.push(circlePath(x, 0, 0.07)));
  const flange = mesh(extrude(fl, 0.2, 0.02), MAT.brushed);
  flange.position.set(0, 2.0, -0.1);
  m.inner.add(m.part(flange, [0, 0, -1.0]));
  // runners
  const runnerMat = MAT.stainless;
  const col = new THREE.Vector3(0, 0.0, 1.05);
  ports.forEach((x0) => {
    const k = Math.abs(x0) > 1 ? 1 : 0.6;
    const pts = [
      new THREE.Vector3(x0, 2.0, -0.02),
      new THREE.Vector3(x0, 2.0, 0.35),
      new THREE.Vector3(x0 * (1 + 0.08 * k), 1.55, 0.78),
      new THREE.Vector3(x0 * 0.72, 0.95, 1.02),
      new THREE.Vector3(x0 * 0.28, 0.42, 1.06),
      new THREE.Vector3(x0 * 0.08, 0.08, 1.05),
    ];
    const tube = mesh(heatTint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 96, 0.235, 28, false), 96, 28), heatMat);
    m.inner.add(tube);
    const weld = mesh(new THREE.TorusGeometry(0.245, 0.03, 10, 40), MAT.darkSteel);
    weld.position.set(x0, 2.0, 0.02); m.inner.add(weld);
  });
  // collector (lathe) and outlet flange
  const prof = [[0.0, 0.28], [0.52, 0.28], [0.6, 0.12], [0.56, -0.12], [0.42, -0.45], [0.33, -0.72], [0.33, -0.8], [0, -0.8]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const collector = mesh(new THREE.LatheGeometry(prof, 64), std(0x8d93a0, 1, 0.38, { roughnessMap: TEX.brushed, bumpMap: TEX.cast, bumpScale: 0.6 }));
  collector.position.copy(col);
  m.inner.add(collector);
  const out = new THREE.Shape();
  for (let i = 0; i <= 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 2;
    if (i === 0) out.moveTo(Math.cos(a) * 0.82, Math.sin(a) * 0.82);
    else out.quadraticCurveTo(Math.cos(a - TAU / 6) * 0.5, Math.sin(a - TAU / 6) * 0.5, Math.cos(a) * 0.82, Math.sin(a) * 0.82);
  }
  out.holes.push(circlePath(0, 0, 0.3));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + Math.PI / 2; out.holes.push(circlePath(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.08)); }
  const outlet = mesh(extrude(out, 0.16, 0.02), MAT.brushed);
  outlet.rotation.x = Math.PI / 2; outlet.position.set(col.x, col.y - 0.86, col.z);
  m.inner.add(m.part(outlet, [0, -0.9, 0]));
  m.view = { dir: [0.75, 0.45, 1.4], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Sliding vise with lead screw                                        */
/* ------------------------------------------------------------------ */
function buildVise() {
  const m = new Model();
  const base = new THREE.Group();
  const bed = rbox(4.4, 0.36, 1.7, 0.06, MAT.paintBlue); bed.position.set(0, 0.18, 0);
  base.add(bed);
  for (const z of [-0.55, 0.55]) { const rail = rbox(3.6, 0.14, 0.32, 0.03, MAT.brushed); rail.position.set(-0.2, 0.43, z); base.add(rail); }
  const fixed = rbox(0.7, 1.15, 1.7, 0.08, MAT.paintBlue); fixed.position.set(1.85, 0.36 + 0.575, 0);
  const fixedPlate = rbox(0.08, 0.5, 1.5, 0.02, MAT.darkSteel); fixedPlate.position.set(1.46, 1.05, 0);
  const endBlock = rbox(0.4, 0.9, 1.1, 0.06, MAT.paintBlue); endBlock.position.set(-2.0, 0.36 + 0.45, 0);
  base.add(fixed, fixedPlate, endBlock);
  m.inner.add(base);
  // plates & screws under the bed
  const plates = new THREE.Group();
  for (const z of [-0.6, 0.6]) { const p = rbox(4.0, 0.06, 0.3, 0.02, MAT.brushed); p.position.set(0, -0.03, z); plates.add(p); }
  m.inner.add(m.part(plates, [0, -0.7, 0]));
  // movable jaw
  const jaw = new THREE.Group();
  const jawBody = rbox(0.75, 0.95, 1.5, 0.08, MAT.paintBlue); jawBody.position.y = 0.5 + 0.475;
  const jawPlate = rbox(0.08, 0.5, 1.4, 0.02, MAT.darkSteel); jawPlate.position.set(0.41, 1.05, 0);
  const gib = rbox(0.75, 0.12, 1.75, 0.03, MAT.brushed); gib.position.y = 0.56;
  jaw.add(jawBody, jawPlate, gib);
  const jawWrap = new THREE.Group(); jawWrap.add(jaw);
  m.inner.add(m.part(jawWrap, [0, 1.1, 0]));
  // lead screw + handle
  const screwWrap = new THREE.Group();
  const screw = new THREE.Group();
  const len = 3.4, sy = 0.82;
  const core = alongX(cyl(0.11, 0.11, len, MAT.steel, 24));
  const thread = mesh(threadGeo(0.115, 0.09, len - 0.3, 0.028), MAT.steel);
  screw.add(core, thread);
  const hub = alongX(cyl(0.16, 0.16, 0.3, MAT.steel, 24)); hub.position.x = -len / 2 - 0.1;
  const bar = cyl(0.045, 0.045, 1.7, MAT.chrome, 16); bar.rotation.x = Math.PI / 2; bar.position.x = -len / 2 - 0.15;
  const k1 = mesh(new THREE.SphereGeometry(0.11, 24, 16), MAT.brass); k1.position.set(-len / 2 - 0.15, 0, 0.88);
  const k2 = k1.clone(); k2.position.z = -0.88;
  screw.add(hub, bar, k1, k2);
  screw.position.set(-0.6, sy, 0);
  screwWrap.add(screw);
  m.inner.add(m.part(screwWrap, [-1.4, 0.25, 0]));
  m.caps.motion = true;
  let phase = 0;
  m.update = (dt) => {
    if (!m.playing) return;
    phase += dt * 0.6;
    const x = -0.55 + Math.sin(phase) * 0.55;          // jaw travel
    jaw.position.x = x;
    screw.rotation.x = (x / 0.09) * TAU * 0.25;        // rotation tied to travel
  };
  m.view = { dir: [1.0, 0.75, 1.3], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Radial engine (5 cylinders, master + articulated rods)              */
/* ------------------------------------------------------------------ */
function buildRadial() {
  const m = new Model();
  const N = 5, r = 0.3, Lm = 1.25, a = 0.22;
  const axes = [...Array(N)].map((_, k) => (k * TAU) / N);
  const crankcase = m.housing(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.55, 64), MAT.blackPaint), 0xbfd3ff);
  crankcase.rotation.x = Math.PI / 2;
  m.inner.add(crankcase);
  const nose = alongZ(cyl(0.32, 0.55, 0.55, MAT.castAlu, 48)); nose.position.z = 0.55; nose.rotation.x = -Math.PI / 2;
  const prop = alongZ(cyl(0.12, 0.12, 0.6, MAT.steel, 24)); prop.position.z = 0.95;
  const ign = mesh(new THREE.TorusGeometry(0.62, 0.04, 10, 64), MAT.brass); ign.position.z = 0.32;
  const front = new THREE.Group(); front.add(nose, prop, ign);
  for (let k = 0; k < 5; k++) {
    const b = (k * TAU) / 5, u = dirOf(b);
    const p0 = new THREE.Vector3(u.x * 0.62, u.y * 0.62, 0.32), p2 = new THREE.Vector3(u.x * 2.35 + u.y * 0.25, u.y * 2.35 - u.x * 0.25, 0.1);
    const p1 = p0.clone().lerp(p2, 0.5).add(new THREE.Vector3(0, 0, 0.35));
    front.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p1, p2), 24, 0.022, 6), MAT.copper));
  }
  m.inner.add(m.part(front, [0, 0, 1.4]));
  // cylinders
  axes.forEach((b) => {
    const cylG = new THREE.Group();
    const barrel = m.housing(mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.15, 40, 1, true), MAT.castAlu), 0xbfd3ff);
    barrel.position.y = 1.35;
    cylG.add(barrel);
    for (let i = 0; i < 9; i++) {
      const fin = mesh(ringGeo(0.56 - i * 0.008, 0.37, 0.035, [], 0.004), MAT.alu);
      fin.rotation.x = Math.PI / 2; fin.position.y = 1.0 + i * 0.1;
      if (i > 2) cylG.add(fin);
    }
    const head = rbox(0.82, 0.42, 0.72, 0.12, MAT.castAlu); head.position.y = 2.1;
    const rocker = rbox(0.5, 0.16, 0.5, 0.06, MAT.blackPaint); rocker.position.y = 2.36;
    cylG.add(rocker);
    const plug = cyl(0.05, 0.05, 0.25, MAT.chrome, 12); plug.position.set(0.25, 2.35, 0);
    const pushrod = cyl(0.025, 0.025, 1.1, MAT.steel, 8); pushrod.position.set(-0.3, 1.5, 0.2); pushrod.rotation.z = 0.12;
    cylG.add(head, plug, pushrod);
    cylG.quaternion.setFromUnitVectors(UP, dirOf(b));
    m.inner.add(m.part(cylG, [Math.sin(b) * 1.1, Math.cos(b) * 1.1, 0]));
  });
  // crankshaft
  const crank = new THREE.Group();
  const web = rbox(0.5, 0.75, 0.12, 0.08, MAT.steel); web.position.set(0, 0.08, -0.2);
  const cw = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 40, 1, false, Math.PI / 2, Math.PI), MAT.steel);
  cw.rotation.x = Math.PI / 2; cw.position.set(0, -0.05, -0.2);
  const pinM = alongZ(cyl(0.11, 0.11, 0.4, MAT.chrome, 24)); pinM.position.y = r;
  const shaft = alongZ(cyl(0.14, 0.14, 1.2, MAT.chrome, 24));
  crank.add(web, cw, pinM, shaft);
  // varnished wooden propeller on the crank nose
  const propG = new THREE.Group(); propG.position.z = 1.3;
  for (const sgn of [-1, 1]) {
    const blade = mesh(new THREE.SphereGeometry(1, 32, 12), MAT.wood);
    blade.scale.set(0.16, 1.35, 0.05); blade.position.y = sgn * 1.3; blade.rotation.y = sgn * 0.35;
    const tip = mesh(new THREE.SphereGeometry(1, 20, 8), MAT.brass); tip.scale.set(0.12, 0.22, 0.055); tip.position.y = sgn * 2.45; tip.rotation.y = sgn * 0.35;
    propG.add(blade, tip);
  }
  const spinnerR = alongZ(cyl(0.02, 0.3, 0.4, MAT.paintRed, 40)); spinnerR.rotation.x = -Math.PI / 2; spinnerR.position.z = 0.25;
  propG.add(spinnerR);
  crank.add(m.part(propG, [0, 0, 1.6]));
  m.inner.add(crank);
  // pistons & rods
  const moving = new THREE.Group();
  m.inner.add(m.part(moving, [0, 0, 0.9]));
  const pistons = axes.map(() => { const p = piston(0.3, 0.42, MAT.alu); moving.add(p); return p; });
  const master = conRod(Lm, 0.3, 0.12, 0.12, MAT.steel);
  const masterHub = mesh(ringGeo(0.36, 0.12, 0.14, [], 0.01), MAT.steel); master.add(masterHub);
  moving.add(master);
  const links = axes.slice(1).map(() => { const l = conRod(Lm - a, 0.07, 0.1, 0.08, MAT.brushed); moving.add(l); return l; });
  m.caps.motion = true;
  m.xray = true;
  m.setXray(true);
  let th = 0;
  const pin = new THREE.Vector3(), pp = new THREE.Vector3(), lp = new THREE.Vector3(), u = new THREE.Vector3();
  m.update = (dt) => {
    if (m.playing) th += dt * 2.4;
    crank.rotation.z = -th;
    dirOf(th, pin).multiplyScalar(r);
    const s0 = pistonDistance(pin, 0, Lm);
    pp.set(0, s0, 0);
    pistons[0].position.copy(pp);
    pointAt(master, pin, pp);
    const delta = Math.atan2(pp.x - pin.x, pp.y - pin.y); // rod lean (clockwise from +Y)
    axes.slice(1).forEach((b, i) => {
      dirOf(b + delta, lp).multiplyScalar(a).add(pin);
      const s = pistonDistance(lp, b, Lm - a);
      dirOf(b, u).multiplyScalar(s);
      pistons[i + 1].position.copy(u);
      pistons[i + 1].quaternion.setFromUnitVectors(UP, dirOf(b));
      pointAt(links[i], lp, u);
    });
  };
  m.update(0);
  m.view = { dir: [0.35, 0.3, 1.4], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Three-piece ball valve                                              */
/* ------------------------------------------------------------------ */
function buildValve() {
  const m = new Model();
  const body = m.housing(rbox(1.05, 1.3, 1.3, 0.22, MAT.brass), 0xffe2a6);
  m.inner.add(body);
  const ball = new THREE.Group();
  ball.add(mesh(new THREE.SphereGeometry(0.58, 48, 32), MAT.chrome));
  for (const sx of [-1, 1]) {
    const bore = mesh(new THREE.CircleGeometry(0.3, 40), MAT.dark, false);
    bore.rotation.y = (sx * Math.PI) / 2; bore.position.x = sx * 0.585; ball.add(bore);
  }
  m.inner.add(ball);
  // end connectors
  for (const sx of [-1, 1]) {
    const end = new THREE.Group();
    const fl = rbox(0.22, 1.3, 1.3, 0.1, MAT.brass); fl.position.x = sx * 0.64;
    const hex = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.45, 6), MAT.brass); hex.rotation.z = Math.PI / 2; hex.position.x = sx * 0.98;
    const pipe = mesh(ringGeo(0.46, 0.33, 0.45, [], 0.02), MAT.brass); pipe.rotation.y = Math.PI / 2; pipe.position.x = sx * 1.4;
    for (let i = 0; i < 6; i++) {
      const th = mesh(new THREE.TorusGeometry(0.46, 0.018, 6, 40), MAT.brass); th.rotation.y = Math.PI / 2; th.position.x = sx * (1.22 + i * 0.065); end.add(th);
    }
    const seat = mesh(ringGeo(0.5, 0.3, 0.06, [], 0.01), std(0xeeeeea, 0, 0.6)); seat.rotation.y = Math.PI / 2; seat.position.x = sx * 0.52;
    end.add(fl, hex, pipe, seat);
    m.inner.add(m.part(end, [sx * 1.3, 0, 0]));
  }
  // through bolts
  for (const y of [-0.48, 0.48]) for (const z of [-0.48, 0.48]) {
    const b = new THREE.Group();
    const shank = alongX(cyl(0.055, 0.055, 1.75, MAT.steel, 16));
    const n1 = hexNut(0.11, 0.1, MAT.steel); n1.rotation.z = Math.PI / 2; n1.position.x = 0.85;
    const n2 = n1.clone(); n2.rotation.z = -Math.PI / 2; n2.position.x = -0.85;
    b.add(shank, n1, n2); b.position.set(0, y, z);
    m.inner.add(m.part(b, [0, y * 1.6, z * 1.6]));
  }
  // stem + handle
  const stem = new THREE.Group();
  const s = cyl(0.11, 0.11, 0.62, MAT.steel, 24); s.position.y = 0.75;
  const gland = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 6), MAT.brass); gland.position.y = 0.72;
  stem.add(s, gland);
  m.inner.add(m.part(stem, [0, 0.8, 0]));
  const handle = new THREE.Group();
  const lever = rbox(1.9, 0.07, 0.26, 0.03, MAT.steel); lever.position.set(0.75, 0, 0);
  const grip = rbox(1.15, 0.16, 0.34, 0.08, MAT.vinylRed); grip.position.set(1.15, 0, 0);
  const nut = hexNut(0.13, 0.1, MAT.steel); nut.position.y = 0.09;
  handle.add(lever, grip, nut);
  handle.position.y = 1.08;
  const handleWrap = new THREE.Group(); handleWrap.add(handle);
  m.inner.add(m.part(handleWrap, [0, 1.5, 0]));
  m.caps.motion = true;
  let ph = 0;
  m.update = (dt) => {
    if (!m.playing) return;
    ph += dt * 0.7;
    const k = THREE.MathUtils.smoothstep(Math.sin(ph), -0.6, 0.6) * (Math.PI / 2);
    handle.rotation.y = -k; ball.rotation.y = -k;
  };
  m.view = { dir: [0.9, 0.7, 1.4], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Crane hook block                                                    */
/* ------------------------------------------------------------------ */
function buildHook() {
  const m = new Model();
  const plateShape = () => {
    const s = new THREE.Shape();
    const P = [[-1.15, -0.75], [1.15, -0.75], [0, 1.15]], rr = 0.32;
    // rounded triangle via corner arcs
    const c = P.map(([x, y]) => new THREE.Vector2(x, y));
    const cen = new THREE.Vector2(0, -0.12);
    const inset = c.map((p) => p.clone().sub(cen).multiplyScalar(1 - rr / p.distanceTo(cen)).add(cen));
    for (let i = 0; i < 3; i++) {
      const p = inset[i], prev = inset[(i + 2) % 3], next = inset[(i + 1) % 3];
      const a0 = Math.atan2(p.y - prev.y, p.x - prev.x) - Math.PI / 2;
      const a1 = Math.atan2(next.y - p.y, next.x - p.x) - Math.PI / 2;
      s.absarc(p.x, p.y, rr, a0, a1 < a0 ? a1 + TAU : a1, false);
    }
    s.closePath();
    s.holes.push(circlePath(0, 0.72, 0.13), circlePath(-0.62, -0.42, 0.1), circlePath(0.62, -0.42, 0.1), circlePath(0, 0.05, 0.14));
    return s;
  };
  for (const sz of [-1, 1]) {
    const p = mesh(extrude(plateShape(), 0.12, 0.025), MAT.paintYellow);
    p.position.z = sz * 0.42;
    m.inner.add(m.part(p, [0, 0, sz * 1.1]));
  }
  // sheave
  const sheave = new THREE.Group();
  const prof = [[0.12, -0.18], [0.46, -0.18], [0.46, -0.13], [0.33, -0.04], [0.33, 0.04], [0.46, 0.13], [0.46, 0.18], [0.12, 0.18]].map(([x, y]) => new THREE.Vector2(x, y));
  const wheel = mesh(new THREE.LatheGeometry(prof, 64), MAT.darkSteel); wheel.rotation.x = Math.PI / 2;
  sheave.add(wheel);
  sheave.position.y = 0.05;
  m.inner.add(sheave);
  // pins & spacers
  const pins = new THREE.Group();
  const top = alongZ(cyl(0.12, 0.12, 1.25, MAT.chrome, 24)); top.position.y = 0.72;
  const axle = alongZ(cyl(0.13, 0.13, 1.15, MAT.chrome, 24)); axle.position.y = 0.05;
  pins.add(top, axle);
  for (const x of [-0.62, 0.62]) {
    const sp = alongZ(cyl(0.09, 0.09, 1.1, MAT.steel, 16)); sp.position.set(x, -0.42, 0); pins.add(sp);
    for (const sz of [-1, 1]) { const n = hexNut(0.13, 0.09, MAT.steel); n.rotation.x = (sz * Math.PI) / 2; n.position.set(x, -0.42, sz * 0.54); pins.add(n); }
  }
  for (const sz of [-1, 1]) { const n = hexNut(0.17, 0.1, MAT.steel); n.rotation.x = (sz * Math.PI) / 2; n.position.set(0, 0.72, sz * 0.56); pins.add(n); }
  m.inner.add(m.part(pins, [0, 0.9, 0]));
  // crosshead + hook (swivels)
  const swivel = new THREE.Group();
  const cross = rbox(1.15, 0.24, 0.66, 0.06, MAT.darkSteel); cross.position.y = -0.68;
  swivel.add(cross);
  const hookG = new THREE.Group();
  const shank = cyl(0.15, 0.15, 0.7, MAT.steel, 32); shank.position.y = -0.62;
  const collar = hexNut(0.24, 0.16, MAT.steel); collar.position.y = -0.48;
  hookG.add(shank, collar);
  const R = 0.6, cx = 0.6, cy = -1.55;
  const pts = [new THREE.Vector3(0, -0.9, 0), new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(0, -1.45, 0)];
  for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * (Math.PI + 0.55); pts.push(new THREE.Vector3(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const rf = (u) => (u < 0.18 ? 0.17 : u < 0.62 ? 0.17 + ((u - 0.18) / 0.44) * 0.1 : 0.27 - ((u - 0.62) / 0.38) * 0.2);
  const hook = mesh(variableTube(curve, rf), std(0x7d8389, 1, 0.42, { roughnessMap: TEX.cast, bumpMap: TEX.cast, bumpScale: 0.8 }));
  const tip = mesh(new THREE.SphereGeometry(0.075, 20, 12), hook.material); tip.position.copy(curve.getPointAt(1));
  hookG.add(hook, tip);
  const latch = rbox(0.06, 0.95, 0.24, 0.025, MAT.vinylRed);
  latch.position.set(0.62, -1.42, 0); latch.rotation.z = -0.62;
  const spring = mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 20), MAT.steel); spring.position.set(0.24, -1.08, 0); spring.rotation.y = Math.PI / 2;
  hookG.add(latch, spring);
  swivel.add(hookG);
  m.inner.add(m.part(swivel, [0, -0.9, 0]));
  m.caps.motion = true;
  m.update = (dt, t) => { if (m.playing) swivel.rotation.y = Math.sin(t * 0.6) * 0.5; };
  m.view = { dir: [0.8, 0.25, 1.4], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Engines: inline-four and V6 share slider-crank kinematics           */
/* ------------------------------------------------------------------ */
function crankshaft(throws, r, opts = {}) {
  // throws: [{z, angle, span}] ; main journals between throws
  const g = new THREE.Group();
  const zs = throws.map((t) => t.z);
  const zMin = Math.min(...zs) - 0.5, zMax = Math.max(...zs) + 0.5;
  const main = alongZ(cyl(0.17, 0.17, zMax - zMin + 0.4, MAT.chrome, 24)); main.position.z = (zMin + zMax) / 2;
  g.add(main);
  throws.forEach((t) => {
    const th = new THREE.Group();
    const span = t.span ?? 0.42;
    const pin = alongZ(cyl(0.15, 0.15, span, MAT.chrome, 24)); pin.position.y = r;
    th.add(pin);
    for (const s of [-1, 1]) {
      const web = rbox(0.42, r + 0.42, 0.12, 0.06, MAT.steel); web.position.set(0, r / 2 - 0.05, s * (span / 2 + 0.06));
      const cw = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 40, 1, false, Math.PI / 2, Math.PI), MAT.steel);
      cw.rotation.x = Math.PI / 2; cw.position.set(0, -0.05, s * (span / 2 + 0.06));
      th.add(web, cw);
    }
    th.rotation.z = -t.angle;
    th.position.z = t.z;
    g.add(th);
  });
  if (opts.flywheel) {
    const fw = mesh(ringGeo(0.95, 0.18, 0.14, [...Array(6)].map((_, i) => [Math.cos((i * TAU) / 6) * 0.5, Math.sin((i * TAU) / 6) * 0.5, 0.1])), MAT.darkSteel);
    fw.position.z = zMax + 0.3; g.add(fw);
    const ring = mesh(new THREE.TorusGeometry(0.97, 0.035, 8, 90), MAT.steel); ring.position.z = zMax + 0.3; g.add(ring);
  }
  if (opts.pulley) {
    const p = mesh(ringGeo(0.48, 0.17, 0.2, [], 0.02), MAT.alu); p.position.z = zMin - 0.25; g.add(p);
  }
  return g;
}

function buildInline4() {
  const m = new Model();
  const r = 0.35, L = 1.2, zs = [-1.5, -0.5, 0.5, 1.5], offs = [0, Math.PI, Math.PI, 0];
  const crank = crankshaft(zs.map((z, i) => ({ z, angle: offs[i] })), r, { flywheel: true, pulley: true });
  m.inner.add(crank);
  const moving = new THREE.Group();
  m.inner.add(m.part(moving, [0, 1.0, 0]));
  const pistons = zs.map((z) => { const p = piston(0.4, 0.5, MAT.alu); p.position.z = z; moving.add(p); return p; });
  const rods = zs.map(() => { const rd = conRod(L, 0.22, 0.12, 0.12, MAT.steel); moving.add(rd); return rd; });
  // block, head, cover, sump
  const block = m.housing(rbox(1.25, 2.0, 4.3, 0.1, MAT.castAlu), 0xbfd3ff); block.position.y = 1.2;
  const crankcase = m.housing(rbox(1.7, 1.0, 4.4, 0.12, MAT.castAlu), 0xbfd3ff); crankcase.position.y = -0.1;
  m.inner.add(m.part(block, [0, 0.6, 0]), m.part(crankcase, [0, 0, 0]));
  const head = rbox(1.35, 0.45, 4.3, 0.1, MAT.castAlu); head.position.y = 2.45;
  const cover = rbox(1.2, 0.32, 4.0, 0.14, MAT.paintRed); cover.position.y = 2.82;
  for (let i = 0; i < 4; i++) { const coil = cyl(0.09, 0.09, 0.22, MAT.blackPlastic, 16); coil.position.set(0, 3.0, zs[i]); cover.add(coil); coil.position.y = 0.18; coil.position.z = zs[i]; }
  const headG = new THREE.Group(); headG.add(head, cover);
  m.inner.add(m.part(headG, [0, 1.7, 0]));
  const sump = rbox(1.5, 0.5, 3.8, 0.12, MAT.darkSteel); sump.position.y = -0.85;
  m.inner.add(m.part(sump, [0, -0.8, 0]));
  const exh = new THREE.Group();
  zs.forEach((z) => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.65, 2.3, z), new THREE.Vector3(1.05, 2.15, z), new THREE.Vector3(1.2, 1.6, z * 0.6 + 0.4), new THREE.Vector3(1.2, 1.2, 1.8)]);
    exh.add(mesh(heatTint(new THREE.TubeGeometry(c, 48, 0.12, 16), 48, 16), heatMat));
  });
  m.inner.add(m.part(exh, [1.0, 0, 0]));
  m.caps.motion = true;
  m.setXray(true);
  let th = 0;
  const pin = new THREE.Vector3(), pp = new THREE.Vector3();
  m.update = (dt) => {
    if (m.playing) th += dt * 3.2;
    crank.rotation.z = -th;
    zs.forEach((z, i) => {
      dirOf(th + offs[i], pin).multiplyScalar(r); pin.z = z;
      const s = pistonDistance(pin, 0, L);
      pp.set(0, s, z);
      pistons[i].position.copy(pp);
      pointAt(rods[i], pin, pp);
    });
  };
  m.update(0);
  m.view = { dir: [1.3, 0.55, 1.0], fit: 1 };
  return m;
}

function buildV6() {
  const m = new Model();
  const r = 0.3, L = 1.1, bank = Math.PI / 6;
  const pairs = [-1.0, 0.0, 1.0];
  const cyls = [];
  pairs.forEach((z, k) => {
    cyls.push({ b: -bank, z: z - 0.2, k });
    cyls.push({ b: bank, z: z + 0.2, k });
  });
  const crank = crankshaft(pairs.map((z, k) => ({ z, angle: (k * TAU) / 3, span: 0.72 })), r, { flywheel: true });
  m.inner.add(crank);
  // pulley at front, rotates with crank
  const pulley = mesh(ringGeo(0.52, 0.17, 0.22, [], 0.02), MAT.alu); pulley.position.z = -2.0; crank.add(pulley);
  const moving = new THREE.Group(); m.inner.add(moving);
  const pistons = cyls.map(() => { const p = piston(0.34, 0.42, MAT.alu); moving.add(p); return p; });
  const rods = cyls.map(() => { const rd = conRod(L, 0.2, 0.11, 0.11, MAT.steel); moving.add(rd); return rd; });
  // banks
  for (const b of [-bank, bank]) {
    const u = dirOf(b);
    const blk = m.housing(rbox(1.0, 1.4, 3.3, 0.1, MAT.paintRed), 0xffc2c2);
    blk.position.copy(u).multiplyScalar(1.45); blk.rotation.z = -b;
    m.inner.add(m.part(blk, [u.x * 0.3, u.y * 0.3, 0]));
    const cover = rbox(0.92, 0.3, 3.2, 0.12, MAT.goldAnodized);
    for (let i = 0; i < 7; i++) { const rib = rbox(0.8, 0.06, 0.06, 0.02, MAT.goldAnodized); rib.position.set(0, 0.17, -1.35 + i * 0.45); cover.add(rib); }
    cover.position.copy(u).multiplyScalar(2.32); cover.rotation.z = -b;
    m.inner.add(m.part(cover, [u.x * 1.1, u.y * 1.1, 0]));
    // exhaust manifold along outer side
    const side = Math.sign(b);
    const n = new THREE.Vector3(Math.cos(b), -Math.sin(b), 0).multiplyScalar(side); // outward normal
    const ex = new THREE.Group();
    let end = null;
    [-1.0, 0, 1.0].forEach((z0) => {
      const zz = z0 + (b > 0 ? 0.2 : -0.2);
      const p0 = u.clone().multiplyScalar(1.85).addScaledVector(n, 0.45); p0.z = zz;
      const p1 = p0.clone().addScaledVector(n, 0.35); p1.y -= 0.12;
      const p2 = p1.clone(); p2.y -= 0.6;
      ex.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 32, 0.11, 16), MAT.blueAnodized));
      end = p2;
    });
    const log = alongZ(cyl(0.15, 0.15, 3.3, MAT.blueAnodized, 24)); log.position.set(end.x, end.y, 0.25);
    const capE = mesh(new THREE.SphereGeometry(0.15, 20, 12), MAT.blueAnodized); capE.position.set(end.x, end.y, -1.4);
    ex.add(log, capE);
    m.inner.add(m.part(ex, [n.x * 0.9, n.y * 0.9 - 0.2, 0]));
  }
  // crankcase + sump
  const cc = m.housing(rbox(1.9, 1.3, 3.5, 0.15, MAT.paintRed), 0xffc2c2); cc.position.y = 0.0;
  m.inner.add(cc);
  const sump = rbox(1.7, 0.45, 3.2, 0.12, MAT.darkSteel); sump.position.y = -0.85;
  m.inner.add(m.part(sump, [0, -0.9, 0]));
  // intake plenum + air filters
  const intake = new THREE.Group();
  const plen = rbox(0.62, 0.45, 2.9, 0.16, MAT.alu); plen.position.y = 2.15;
  intake.add(plen);
  for (const sx of [-1, 1]) {
    for (const z of [-1.0, 0, 1.0]) { const run = cyl(0.08, 0.08, 0.55, MAT.alu, 16); run.position.set(sx * 0.4, 1.95, z + sx * 0.2); run.rotation.z = sx * 0.9; intake.add(run); }
  }
  const tb = alongZ(cyl(0.2, 0.2, 0.3, MAT.alu, 32)); tb.position.set(0, 2.15, 1.6); intake.add(tb);
  m.inner.add(m.part(intake, [0, 1.3, 0]));
  const filters = new THREE.Group();
  for (const sx of [-1, 1]) {
    const f = mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.55, 28), MAT.filter);
    f.rotation.x = Math.PI / 2; f.position.set(sx * 0.42, 2.1, 2.05);
    const capF = cyl(0.39, 0.39, 0.05, MAT.chrome, 32); capF.rotation.x = Math.PI / 2; capF.position.set(sx * 0.42, 2.1, 2.34);
    filters.add(f, capF);
  }
  m.inner.add(m.part(filters, [0, 0.4, 1.0]));
  // front cam pulleys + belt
  const front = new THREE.Group();
  const cams = [-bank, bank].map((b) => dirOf(b).multiplyScalar(2.0));
  cams.forEach((c) => { const p = mesh(ringGeo(0.33, 0.08, 0.14, [...Array(5)].map((_, i) => [Math.cos((i * TAU) / 5) * 0.2, Math.sin((i * TAU) / 5) * 0.2, 0.05])), MAT.alu); p.position.set(c.x, c.y, -1.95); front.add(p); });
  const beltPts = [new THREE.Vector3(0.55, 0, -1.95), new THREE.Vector3(cams[1].x + 0.34, cams[1].y, -1.95), new THREE.Vector3(cams[1].x, cams[1].y + 0.34, -1.95),
    new THREE.Vector3(cams[0].x, cams[0].y + 0.34, -1.95), new THREE.Vector3(cams[0].x - 0.34, cams[0].y, -1.95), new THREE.Vector3(-0.55, 0, -1.95), new THREE.Vector3(0, -0.55, -1.95)];
  front.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPts, true), 120, 0.04, 8, true), MAT.rubber));
  m.inner.add(m.part(front, [0, 0, -1.2]));
  m.caps.motion = true;
  let th = 0;
  const pin = new THREE.Vector3(), pp = new THREE.Vector3();
  m.update = (dt) => {
    if (m.playing) th += dt * 3.0;
    crank.rotation.z = -th;
    front.children.forEach((c, i) => { if (i < 2) c.rotation.z = -th / 2; });
    cyls.forEach((c, i) => {
      dirOf(th + (c.k * TAU) / 3, pin).multiplyScalar(r); pin.z = c.z;
      const s = pistonDistance(pin, c.b, L);
      dirOf(c.b, pp).multiplyScalar(s); pp.z = c.z;
      pistons[i].position.copy(pp);
      pistons[i].quaternion.setFromUnitVectors(UP, dirOf(c.b));
      pointAt(rods[i], pin, pp);
    });
  };
  m.update(0);
  m.view = { dir: [1.1, 0.75, -1.2], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* 4DOF robotic arm                                                    */
/* ------------------------------------------------------------------ */
function buildRobot(wave = false) {
  const m = new Model();
  const joint = (r, len, mat = MAT.darkSteel) => {
    const g = new THREE.Group();
    const c = alongZ(cyl(r, r, len, mat, 40));
    const ring = alongZ(mesh(new THREE.TorusGeometry(r * 0.98, 0.025, 8, 48), MAT.blueAnodized)); ring.position.z = len / 2; ring.rotation.x = 0;
    const ring2 = ring.clone(); ring2.position.z = -len / 2;
    g.add(c, ring, ring2);
    return g;
  };
  const plinth = cyl(0.95, 1.0, 0.12, MAT.darkSteel, 64); plinth.position.y = 0.06;
  const base = cyl(0.72, 0.8, 0.38, MAT.paintOrange, 64); base.position.y = 0.31;
  for (let i = 0; i < 6; i++) { const b = bolt(0.035, 0.1, MAT.steel); const a = (i * TAU) / 6; b.position.set(Math.cos(a) * 0.86, 0.13, Math.sin(a) * 0.86); m.inner.add(b); }
  m.inner.add(plinth, base);
  const j1 = new THREE.Group(); j1.position.y = 0.5; m.inner.add(j1);
  const turret = cyl(0.55, 0.62, 0.3, MAT.paintOrange, 64); turret.position.y = 0.15;
  const ringB = mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 64), MAT.blueAnodized); ringB.rotation.x = Math.PI / 2; ringB.position.y = 0.02;
  j1.add(turret, ringB);
  for (const sz of [-1, 1]) { const y = rbox(0.55, 0.75, 0.12, 0.05, MAT.paintOrange); y.position.set(0, 0.6, sz * 0.32); j1.add(y); }
  const j2 = new THREE.Group(); j2.position.y = 0.75; j1.add(j2);
  const w2 = new THREE.Group(); j2.add(w2); // explode wrapper
  w2.add(joint(0.27, 0.52));
  const upper = rbox(0.36, 1.55, 0.42, 0.14, MAT.paintOrange); upper.position.y = 0.78; w2.add(upper);
  const j3 = new THREE.Group(); j3.position.y = 1.55; w2.add(j3);
  const w3 = new THREE.Group(); j3.add(w3);
  w3.add(joint(0.22, 0.48));
  const fore = rbox(0.3, 1.2, 0.34, 0.12, MAT.paintOrange); fore.position.y = 0.6; w3.add(fore);
  const j4 = new THREE.Group(); j4.position.y = 1.2; w3.add(j4);
  const w4 = new THREE.Group(); j4.add(w4);
  w4.add(joint(0.16, 0.38));
  const wrist = cyl(0.14, 0.17, 0.3, MAT.darkSteel, 32); wrist.position.y = 0.2; w4.add(wrist);
  const palm = rbox(0.5, 0.1, 0.24, 0.03, MAT.darkSteel); palm.position.y = 0.38; w4.add(palm);
  const fingers = [-1, 1].map((s) => {
    const f = new THREE.Group();
    const a = rbox(0.07, 0.36, 0.18, 0.025, MAT.brushed); a.position.y = 0.18;
    const tip = rbox(0.07, 0.12, 0.18, 0.025, MAT.rubber); tip.position.set(-s * 0.03, 0.34, 0);
    f.add(a, tip); f.position.set(s * 0.15, 0.42, 0); w4.add(f);
    return f;
  });
  m.part(w2, [0, 0.35, 0]); m.part(w3, [0, 0.45, 0]); m.part(w4, [0, 0.45, 0]);
  m.caps.motion = true;
  let t0 = 0;
  m.update = (dt) => {
    if (m.playing) t0 += dt;
    const t = t0;
    if (wave) {
      j1.rotation.y = 0.5 + Math.sin(t * 0.5) * 0.15;
      j2.rotation.z = -0.15;
      j3.rotation.z = 0.35 + Math.sin(t * 4) * 0.28;
      j4.rotation.z = Math.sin(t * 4 + 0.6) * 0.35;
      fingers.forEach((f, i) => (f.position.x = (i ? 1 : -1) * 0.17));
    } else {
      j1.rotation.y = Math.sin(t * 0.45) * 0.9;
      j2.rotation.z = -0.35 + Math.sin(t * 0.6) * 0.3;
      j3.rotation.z = 0.95 + Math.sin(t * 0.7 + 1) * 0.35;
      j4.rotation.z = 0.35 + Math.sin(t * 0.9) * 0.35;
      const o = 0.1 + (Math.sin(t * 1.4) * 0.5 + 0.5) * 0.08;
      fingers.forEach((f, i) => (f.position.x = (i ? 1 : -1) * o));
    }
  };
  m.update(0);
  m.view = { dir: [1.1, 0.6, 1.3], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Quadcopter                                                          */
/* ------------------------------------------------------------------ */
function buildDrone() {
  const m = new Model();
  const H = 0.75;
  const bottom = rbox(1.1, 0.06, 1.1, 0.03, MAT.carbon); bottom.position.y = H;
  const topP = rbox(1.0, 0.05, 1.0, 0.03, MAT.carbon); topP.position.y = H + 0.28;
  const frame = new THREE.Group(); frame.add(bottom);
  for (const x of [-0.4, 0.4]) for (const z of [-0.4, 0.4]) { const s = cyl(0.03, 0.03, 0.28, MAT.alu, 12); s.position.set(x, H + 0.14, z); frame.add(s); }
  const battery = rbox(0.42, 0.18, 0.75, 0.04, MAT.blackPlastic); battery.position.y = H + 0.14; frame.add(battery);
  m.inner.add(frame);
  m.inner.add(m.part(topP, [0, 0.5, 0]));
  const shell = rbox(0.75, 0.38, 0.6, 0.12, MAT.whitePaint); shell.position.y = H + 0.5;
  const cam = mesh(new THREE.SphereGeometry(0.09, 24, 16), MAT.dark); cam.position.set(0, H + 0.48, 0.31);
  const shellG = new THREE.Group(); shellG.add(shell, cam);
  m.inner.add(m.part(shellG, [0, 1.1, 0]));
  // legs
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    for (const z of [-0.3, 0.3]) { const l = cyl(0.025, 0.025, 0.72, MAT.carbon, 10); l.position.set(sx * 0.42, H - 0.36, z); l.rotation.z = sx * 0.3; leg.add(l); }
    const skid = alongZ(cyl(0.035, 0.035, 1.0, MAT.carbon, 12)); skid.position.set(sx * 0.53, 0.03, 0); leg.add(skid);
    m.inner.add(m.part(leg, [sx * 0.2, -0.5, 0]));
  }
  // arms + motors + props
  const props = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const arm = new THREE.Group();
    const bar = rbox(1.55, 0.1, 0.16, 0.04, MAT.paintOrange); bar.position.set(0.95, 0, 0); arm.add(bar);
    arm.rotation.y = -a; arm.position.y = H + 0.04;
    m.inner.add(m.part(arm, [d.x * 0.7, 0, d.z * 0.7]));
    const tipPos = d.clone().multiplyScalar(1.7);
    const motor = new THREE.Group();
    const mount = cyl(0.19, 0.19, 0.06, MAT.blackPlastic, 32); mount.position.y = H + 0.1;
    const stator = cyl(0.16, 0.16, 0.18, MAT.darkSteel, 32); stator.position.y = H + 0.22;
    const bell = cyl(0.165, 0.165, 0.12, MAT.blueAnodized, 32); bell.position.y = H + 0.35;
    motor.add(mount, stator, bell); motor.position.set(tipPos.x, 0, tipPos.z);
    m.inner.add(m.part(motor, [d.x * 0.7, 0.45, d.z * 0.7]));
    const prop = new THREE.Group();
    const hub = cyl(0.06, 0.07, 0.08, MAT.chrome, 20); prop.add(hub);
    for (const s of [-1, 1]) {
      const blade = mesh(new THREE.SphereGeometry(1, 24, 10), phys(0xc0262d, 0, 0.35, { clearcoat: 0.6 }));
      blade.scale.set(0.52, 0.018, 0.075); blade.position.x = s * 0.5; blade.rotation.x = s * 0.18;
      prop.add(blade);
    }
    prop.position.set(tipPos.x, H + 0.45, tipPos.z);
    prop.userData.dir = i % 2 ? 1 : -1;
    props.push(prop);
    m.inner.add(m.part(prop, [d.x * 0.7, 1.0, d.z * 0.7]));
  }
  m.caps.motion = true;
  m.update = (dt, t) => {
    if (!m.playing) return;
    props.forEach((p) => (p.rotation.y += dt * 22 * p.userData.dir));
    m.inner.position.y = m.baseY + Math.sin(t * 1.3) * 0.04;
  };
  m.view = { dir: [1.0, 0.85, 1.3], fit: 1 };
  m.afterNormalize = () => { m.baseY = m.inner.position.y + 0.15; };
  return m;
}

/* ------------------------------------------------------------------ */
/* Turbofan jet engine (axis Z, intake towards +Z)                     */
/* ------------------------------------------------------------------ */
function twistedBlade(span, chord, thick, twist0, twist1, sweep = 0) {
  const g = new THREE.BoxGeometry(span, thick, chord, 10, 1, 3);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const u = v.x / span + 0.5;
    const tw = THREE.MathUtils.lerp(twist0, twist1, u);
    const c = Math.cos(tw), s = Math.sin(tw);
    const taper = 1 - u * 0.25;
    const y = v.y, z = v.z * taper;
    v.y = y * c - z * s; v.z = y * s + z * c + sweep * u * u;
    p.setXYZ(i, v.x + span / 2, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
function bladeRing(count, rIn, rOut, chord, mat, twist = [0.9, 0.35]) {
  const geo = twistedBlade(rOut - rIn, chord, 0.018, twist[0], twist[1], -0.04);
  const im = new THREE.InstancedMesh(geo, mat, count);
  im.castShadow = true;
  const o = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    o.position.set(Math.cos(a) * rIn, Math.sin(a) * rIn, 0);
    o.rotation.set(0, 0, a);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
  }
  const g = new THREE.Group();
  g.add(im, alongZ(cyl(rIn, rIn, chord * 1.2, MAT.titanium, 48)));
  return g;
}
function buildJet() {
  const m = new Model();
  // nacelle via lathe (around Y) then rotated so Y -> Z
  const prof = [];
  const outer = [[1.06, 1.55], [1.13, 1.2], [1.16, 0.6], [1.12, -0.2], [1.02, -0.9], [0.92, -1.45]];
  const inner = [[0.88, -1.45], [0.93, -0.6], [0.96, 0.4], [0.96, 1.3], [0.99, 1.55]];
  outer.forEach(([r, y]) => prof.push(new THREE.Vector2(r, y)));
  inner.forEach(([r, y]) => prof.push(new THREE.Vector2(r, y)));
  // round lip
  for (let i = 0; i <= 8; i++) { const a = Math.PI - (i / 8) * Math.PI; prof.push(new THREE.Vector2(1.025 + Math.cos(a) * 0.035, 1.56 + Math.sin(a) * 0.05)); }
  const nacelleMat = MAT.whitePaint.clone();
  nacelleMat.side = THREE.DoubleSide;
  const nacelle = mesh(new THREE.LatheGeometry(prof, 128), nacelleMat);
  const lipRing = mesh(new THREE.TorusGeometry(1.02, 0.03, 12, 128), MAT.chrome); lipRing.rotation.x = Math.PI / 2; lipRing.position.y = 1.57;
  const stripe = mesh(new THREE.CylinderGeometry(1.162, 1.162, 0.12, 128, 1, true), phys(0x1f5fd1, 0.3, 0.3, { clearcoat: 1 }));
  stripe.position.y = 0.55;
  const stripe2 = mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.04, 128, 1, true), MAT.goldAnodized); stripe2.position.y = 0.44;
  const nacelleG = new THREE.Group(); nacelleG.add(nacelle, lipRing, stripe, stripe2);
  // core
  const coreMat = std(0xb8bcc2, 0.85, 0.4, { side: THREE.DoubleSide });
  const coreProf = [[0.5, 0.95], [0.56, 0.6], [0.6, 0.0], [0.58, -0.7], [0.5, -1.25], [0.47, -1.7]].map(([r, y]) => new THREE.Vector2(r, y));
  const core = mesh(new THREE.LatheGeometry(coreProf, 96), coreMat);
  const rotor = new THREE.Group();
  const spinner = mesh(new THREE.LatheGeometry([...Array(16)].map((_, i) => { const u = i / 15; return new THREE.Vector2(0.3 * Math.sqrt(1 - u * u) + 0.0001, 1.08 + u * 0.48); }), 64), std(0x2a2c30, 1, 0.25));
  const fan = bladeRing(22, 0.3, 0.95, 0.34, std(0x4f74b0, 1, 0.26, { roughnessMap: TEX.brushed }), [1.0, 0.3]);
  fan.rotation.x = -Math.PI / 2; fan.position.y = 1.15;
  const fanG = new THREE.Group(); fanG.add(fan, spinner);
  const stages = new THREE.Group();
  const comp = [0.5, 0.42, 0.36, 0.32, 0.29, 0.27];
  comp.forEach((ro, i) => {
    const ring = bladeRing(28 + i * 2, 0.16, ro, 0.08, std(0x5f8cc8, 1, 0.3), [0.7, 0.4]);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.85 - i * 0.14; stages.add(ring);
  });
  const combustor = mesh(ringGeo(0.36, 0.2, 0.35, [], 0.03), MAT.copper); combustor.rotation.x = Math.PI / 2; combustor.position.y = -0.2;
  stages.add(combustor);
  const turb = [0.34, 0.38, 0.42, 0.45];
  const turbG = new THREE.Group();
  turb.forEach((ro, i) => {
    const ring = bladeRing(34, 0.18, ro, 0.09, std(0xc58a3a, 1, 0.35), [-0.6, -0.3]);
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.5 - i * 0.14; turbG.add(ring);
  });
  const shaftJ = cyl(0.08, 0.08, 2.6, MAT.chrome, 16); shaftJ.position.y = -0.2;
  rotor.add(stages, shaftJ);
  const cone = mesh(new THREE.LatheGeometry([...Array(14)].map((_, i) => { const u = i / 13; return new THREE.Vector2(0.36 * (1 - u * u) + 0.0001, -1.1 - u * 0.9); }), 64), MAT.inconel);
  const nozzle = mesh(ringGeo(0.95, 0.85, 0.12, [], 0.01), MAT.inconel); nozzle.rotation.x = Math.PI / 2; nozzle.position.y = -1.48;
  nacelleG.add(nozzle);
  // assemble in Y-axis frame then rotate
  const frame = new THREE.Group();
  frame.add(m.part(nacelleG, [0, 0, 0]), core, m.part(fanG, [0, 1.6, 0]), rotor, m.part(turbG, [0, -0.5, 0]), m.part(cone, [0, -1.1, 0]));
  frame.rotation.x = Math.PI / 2; // Y -> +Z
  frame.position.y = 1.25;
  m.inner.add(frame);
  // frame is rotated (local Y -> world Z, local -Z -> world +Y): lift the nacelle straight up
  m.parts[0].dir.set(0, 0, -1.8);
  // cutaway clipping plane (half of nacelle & core removed)
  const plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  m.clip = plane;
  const clipped = [nacelleMat, coreMat];
  m.caps.xray = true;
  m.setXray = (on) => { m.xray = on; clipped.forEach((mt) => { mt.clippingPlanes = on ? [plane] : null; mt.needsUpdate = true; }); };
  m.caps.motion = true;
  m.update = (dt) => {
    if (!m.playing) return;
    fanG.rotation.y += dt * 4;
    rotor.rotation.y += dt * 7;
    turbG.rotation.y += dt * 7;
  };
  m.view = { dir: [0.8, 0.35, 1.25], fit: 1 };
  return m;
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */
export function createModel(key, ctx) {
  let m;
  switch (key) {
    case 'hero': m = buildJet(); m.view = { dir: [1.05, 0.3, 1.0], fit: 1.05 }; break;
    case 'certificate': m = buildCertificate(ctx.textureLoader); break;
    case 'bracket1': m = buildBracketSaddle(); break;
    case 'bracket2': m = buildBracketMount(); break;
    case 'bracket3': m = buildMotorBracket(); break;
    case 'coupling': m = buildCoupling(); break;
    case 'bearing': m = buildBearing(); break;
    case 'manifold': m = buildManifold(); break;
    case 'vise': m = buildVise(); break;
    case 'radial': m = buildRadial(); break;
    case 'valve': m = buildValve(); break;
    case 'hook': m = buildHook(); break;
    case 'inline4': m = buildInline4(); break;
    case 'robot': m = buildRobot(false); break;
    case 'wave': m = buildRobot(true); break;
    case 'drone': m = buildDrone(); break;
    case 'jet': m = buildJet(); break;
    case 'v6': m = buildV6(); break;
    default: throw new Error('Unknown model ' + key);
  }
  m.key = key;
  m.normalize();
  m.afterNormalize?.();
  return m;
}
