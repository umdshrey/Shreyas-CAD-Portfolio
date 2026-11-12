import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createModel } from './models.js';
import { createStage } from './stage.js';
import { profile, sections, modelNames } from './content.js';

const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Page content                                                        */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const allMedia = []; // flat list for the lightbox

function mediaHTML(item, sectionIdx) {
  const i = allMedia.push({ ...item, sectionIdx }) - 1;
  const thumb = `assets/thumb/${item.img || item.poster}.webp`;
  return `<button class="tile${item.video ? ' is-video' : ''}" data-media="${i}" aria-label="Open ${esc(item.cap)}">
      <img src="${thumb}" alt="${esc(item.cap)}" loading="lazy" decoding="async">
      ${item.video ? '<span class="play" aria-hidden="true"></span>' : ''}
      <span class="tile-cap">${esc(item.cap)}</span>
    </button>`;
}

function renderSections() {
  const host = $('#sections');
  const linkHTML = profile.links.map((l) => `<a class="btn ghost" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
  $('#hero-links').innerHTML = linkHTML;
  $('#tools').innerHTML = profile.tools.map((t) => `<li>${t}</li>`).join('');
  host.innerHTML = sections.map((s, i) => `
    <section class="sec" id="${s.id}" data-model="${s.model}" data-accent="${s.accent || '#4da3ff'}" data-index="${i + 1}" data-title="${esc(s.title)}">
      <article class="panel">
        <span class="bignum" aria-hidden="true">${pad(i + 1)}</span>
        <p class="kicker"><span class="num">${pad(i + 1)}</span><span>${esc(s.kicker)}</span></p>
        <h2>${esc(s.title)}</h2>
        ${s.body.map((p) => `<p>${esc(p)}</p>`).join('')}
        <ul class="tags">${s.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="gallery">${s.media.map((m) => mediaHTML(m, i)).join('')}</div>
      </article>
    </section>`).join('');
  // nav index
  $('#index-list').innerHTML = sections.map((s, i) =>
    `<li><a href="#${s.id}" data-target="${s.id}"><span class="num">${pad(i + 1)}</span>${esc(s.title)}</a></li>`).join('');
  $('#rail').innerHTML = ['top', ...sections.map((s) => s.id), 'thanks'].map((id, i, arr) =>
    `<a href="#${id}" data-target="${id}" title="${i === 0 ? 'Home' : i === arr.length - 1 ? 'Thank you' : esc(sections[i - 1].title)}"><span></span></a>`).join('');
  $('#thanks-links').innerHTML = linkHTML;
}
renderSections();

/* ------------------------------------------------------------------ */
/* Renderer, scene, studio                                             */
/* ------------------------------------------------------------------ */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const BG = new THREE.Color(0x0b0d12);
scene.background = BG;
scene.fog = new THREE.Fog(new THREE.Color(0x121620), 16, 40);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.85;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(6, 3.5, 7);

// lights
const key = new THREE.DirectionalLight(0xfff3e6, 2.6);
key.position.set(5, 9, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -4;
key.shadow.camera.right = key.shadow.camera.top = 4;
key.shadow.camera.near = 1; key.shadow.camera.far = 25;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
key.shadow.radius = 6;
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb6ff, 1.4); rim.position.set(-6, 4, -6); scene.add(rim);
const fill = new THREE.HemisphereLight(0xdfe8ff, 0x1a1410, 0.35); scene.add(fill);

// floor: soft radial fade + faint CAD grid
function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const floor = new THREE.Mesh(new THREE.CircleGeometry(25, 128),
  new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.7, metalness: 0.0, envMapIntensity: 0.25, map: radialTexture('#ffffff', '#30333a') }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(24, 48, 0x4d6a94, 0x2a3442);
grid.material.transparent = true; grid.material.opacity = 0.22; grid.material.depthWrite = false; grid.position.y = 0.002;
scene.add(grid);
// turntable disc
const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.3, 0.06, 96),
  new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.6, roughness: 0.35 }));
disc.position.y = -0.02; disc.receiveShadow = true; scene.add(disc);
const discRing = new THREE.Mesh(new THREE.TorusGeometry(2.27, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: 0x4da3ff }));
discRing.rotation.x = Math.PI / 2; discRing.position.y = 0.012; scene.add(discRing);
// machined rings on the turntable
const grooves = new THREE.Mesh(new THREE.RingGeometry(0.3, 2.2, 128, 24), new THREE.MeshStandardMaterial({
  color: 0x1b1f26, metalness: 0.85, roughness: 0.45, transparent: true, opacity: 0.7,
  roughnessMap: (() => { const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#888'; g.fillRect(0, 0, 1024, 1024);
    for (let r = 2; r < 512; r += 1.5) { const v = 90 + Math.random() * 140; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1.2; g.beginPath(); g.arc(512, 512, r, 0, Math.PI * 2); g.stroke(); }
    return new THREE.CanvasTexture(c); })(),
}));
grooves.rotation.x = -Math.PI / 2; grooves.position.y = 0.011; grooves.receiveShadow = true; scene.add(grooves);
const stage = createStage(scene, { rim, discRing });

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.enableZoom = false;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI / 2 - 0.04;
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 0.6;
controls.target.set(0, 1.3, 0);

/* ------------------------------------------------------------------ */
/* Layout: on wide screens the model sits to the right of the text     */
/* ------------------------------------------------------------------ */
let wide = false;
function resize() {
  const w = window.innerWidth, h = canvas.clientHeight || window.innerHeight;
  wide = w >= 980;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (wide) camera.setViewOffset(w, h, -w * 0.2, h * 0.04, w, h);
  else camera.setViewOffset(w, h, 0, h * 0.07, w, h); // lift above the control bar
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ------------------------------------------------------------------ */
/* Model switching                                                     */
/* ------------------------------------------------------------------ */
const ctx = { textureLoader: new THREE.TextureLoader() };
const cache = new Map();
let current = null, previous = null;
let camTween = null;
const clock = new THREE.Clock();
const ui = {
  label: $('#viewer-label'), explode: $('#explode'), explodeWrap: $('#explode-wrap'),
  motion: $('#btn-motion'), xray: $('#btn-xray'), rotate: $('#btn-rotate'), reset: $('#btn-reset'), mats: $('#materials'),
};

function getModel(key) {
  if (!cache.has(key)) cache.set(key, createModel(key, ctx));
  return cache.get(key);
}

function viewFor(m) {
  const d = new THREE.Vector3(...m.view.dir).normalize();
  const h = m.height || 2;
  const target = new THREE.Vector3(0, Math.max(h * 0.48, 0.9), 0);
  // keep the model (≈3.4 units) inside the visible area at any aspect ratio
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = wide ? Math.max(8.8, 4.4 / (t * camera.aspect)) : Math.max(9.4, 2.5 / (t * camera.aspect));
  return { pos: target.clone().addScaledVector(d, dist), target };
}

// Camera moves along an arc (spherical interpolation) with a slight dolly-out mid-way.
function tweenCamera(to, dur = 1.3, swing = 0) {
  const sFrom = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  const sTo = new THREE.Spherical().setFromVector3(to.pos.clone().sub(to.target));
  let dTheta = sTo.theta - sFrom.theta;
  dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta)) + swing;
  camTween = { sFrom, sTo, dTheta, fromT: controls.target.clone(), toT: to.target, t: 0, dur, dolly: swing ? 0.22 : 0.08 };
}

const toast = $('#model-toast');
let toastTimer = 0, firstActivation = true;
function activate(key, el) {
  if (current && current.key === key) return;
  const m = getModel(key);
  if (el) stage.setAccent(el.dataset.accent || '#4da3ff');
  if (!firstActivation && !reduceMotion) {
    stage.pulse(m.height);
    toast.querySelector('.t-name').textContent = modelNames[key] || '';
    toast.querySelector('.t-num').textContent = el?.dataset.index ? `Assembly ${pad(+el.dataset.index)}` : 'Assembly';
    toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1700);
  }
  if (m.caps.explode && !reduceMotion && !firstActivation) { m.assemble = 0; m.setExplode(1); }
  firstActivation = false;
  if (previous && previous !== m) scene.remove(previous.root);
  previous = current;
  if (previous) previous.leaving = 0;
  current = m;
  m.leaving = null;
  m.root.rotation.y = 0;
  m.entering = 0;
  m.root.scale.setScalar(0.001);
  scene.add(m.root);
  tweenCamera(viewFor(m), reduceMotion ? 0.01 : 1.6, reduceMotion ? 0 : 0.5);
  syncUI();
}

function syncUI() {
  const m = current;
  ui.label.textContent = modelNames[m.key] || '';
  ui.explodeWrap.hidden = !m.caps.explode;
  ui.explode.value = Math.round(m.explode * 100);
  ui.motion.hidden = !m.caps.motion;
  ui.motion.setAttribute('aria-pressed', m.playing);
  ui.motion.querySelector('span').textContent = m.playing ? 'Pause' : 'Play';
  ui.xray.hidden = !m.caps.xray;
  ui.xray.setAttribute('aria-pressed', m.xray);
  ui.xray.querySelector('span').textContent = m.key === 'jet' || m.key === 'hero' ? 'Cutaway' : 'X-ray';
  ui.rotate.setAttribute('aria-pressed', controls.autoRotate);
  ui.mats.hidden = !m.caps.materials;
  if (m.caps.materials) {
    ui.mats.innerHTML = m.caps.materials.map((k) =>
      `<button class="chip" aria-pressed="${k === m.material}" data-mat="${k}">${k}</button>`).join('');
  }
}

let explodeTarget = null;
ui.explode.addEventListener('input', () => { explodeTarget = ui.explode.value / 100; if (current) current.assemble = null; });
ui.motion.addEventListener('click', () => { current.playing = !current.playing; syncUI(); });
ui.xray.addEventListener('click', () => { current.setXray(!current.xray); syncUI(); });
ui.rotate.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; syncUI(); });
ui.reset.addEventListener('click', () => { explodeTarget = 0; tweenCamera(viewFor(current), 1); });
ui.mats.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mat]');
  if (b) { current.setMaterial(b.dataset.mat); syncUI(); }
});

/* ------------------------------------------------------------------ */
/* Scroll tracking                                                     */
/* ------------------------------------------------------------------ */
const tracked = [...document.querySelectorAll('[data-model]')];
const railLinks = [...document.querySelectorAll('#rail a')];
const indexLinks = [...document.querySelectorAll('#index-list a')];
function onScroll() {
  const probe = wide ? window.innerHeight * 0.5 : window.innerHeight * 0.72;
  let active = tracked[0];
  for (const el of tracked) if (el.getBoundingClientRect().top <= probe) active = el;
  activate(active.dataset.model, active);
  const id = active.id;
  railLinks.forEach((a) => a.classList.toggle('on', a.dataset.target === id));
  indexLinks.forEach((a) => a.classList.toggle('on', a.dataset.target === id));
  const doc = document.documentElement;
  $('#progress').style.transform = `scaleX(${doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight)})`;
  document.body.classList.toggle('scrolled', doc.scrollTop > 40);
}
window.addEventListener('scroll', onScroll, { passive: true });

// index menu
const menuBtn = $('#menu-btn'), menu = $('#index');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', open); menu.classList.toggle('open', open);
});
menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menuBtn.setAttribute('aria-expanded', false); menu.classList.remove('open'); } });

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */
const lb = $('#lightbox'), lbStage = $('#lb-stage'), lbCap = $('#lb-cap'), lbCount = $('#lb-count');
let lbIndex = -1, lbList = [];
function openLightbox(i) {
  const item = allMedia[i];
  lbList = allMedia.map((m, k) => k).filter((k) => allMedia[k].sectionIdx === item.sectionIdx);
  lbIndex = lbList.indexOf(i);
  showLightbox();
  lb.hidden = false;
  document.body.classList.add('lb-open');
  $('#lb-close').focus();
}
function showLightbox() {
  const item = allMedia[lbList[lbIndex]];
  lbStage.innerHTML = '';
  if (item.video) {
    const v = document.createElement('video');
    v.src = `assets/video/${item.video}.mp4`;
    v.poster = `assets/img/${item.poster}.webp`;
    v.controls = true; v.autoplay = true; v.muted = true; v.loop = item.start == null; v.playsInline = true;
    if (item.start != null) {
      v.addEventListener('loadedmetadata', () => { v.currentTime = item.start; });
      v.addEventListener('timeupdate', () => { if (v.currentTime >= item.end || v.currentTime < item.start - 0.5) v.currentTime = item.start; });
    }
    lbStage.append(v);
  } else {
    const img = new Image();
    img.src = `assets/img/${item.img}.webp`; img.alt = item.cap;
    lbStage.append(img);
  }
  lbCap.textContent = item.cap;
  lbCount.textContent = `${lbIndex + 1} / ${lbList.length}`;
  $('#lb-prev').hidden = $('#lb-next').hidden = lbList.length < 2;
}
function closeLightbox() {
  lb.hidden = true; lbStage.innerHTML = ''; document.body.classList.remove('lb-open');
}
const step = (d) => { lbIndex = (lbIndex + d + lbList.length) % lbList.length; showLightbox(); };
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-media]');
  if (t) openLightbox(+t.dataset.media);
});
$('#lb-close').addEventListener('click', closeLightbox);
$('#lb-prev').addEventListener('click', () => step(-1));
$('#lb-next').addEventListener('click', () => step(1));
lb.addEventListener('click', (e) => { if (e.target === lb || e.target === lbStage) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});

/* ------------------------------------------------------------------ */
/* Render loop                                                         */
/* ------------------------------------------------------------------ */
const easeOutBack = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
let elapsed = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  if (camTween) {
    camTween.t += dt / camTween.dur;
    const k = easeInOut(Math.min(camTween.t, 1)), c = camTween;
    const sph = new THREE.Spherical(
      THREE.MathUtils.lerp(c.sFrom.radius, c.sTo.radius, k) * (1 + c.dolly * Math.sin(Math.PI * k)),
      THREE.MathUtils.lerp(c.sFrom.phi, c.sTo.phi, k),
      c.sFrom.theta + c.dTheta * k);
    controls.target.lerpVectors(c.fromT, c.toT, k);
    camera.position.setFromSpherical(sph).add(controls.target);
    if (c.t >= 1) camTween = null;
  }
  if (previous && previous.leaving != null) {
    previous.leaving += dt / 0.35;
    const k = Math.max(0, 1 - previous.leaving);
    previous.root.scale.setScalar(Math.max(k * k, 0.001));
    previous.root.rotation.y += dt * 2;
    if (previous.caps.explode) previous.setExplode(Math.min(1, previous.leaving * 1.6));
    if (previous.leaving >= 1) { scene.remove(previous.root); previous.root.rotation.y = 0; previous.leaving = null; previous = null; }
  }
  if (current) {
    let s = 1;
    if (current.entering != null) {
      current.entering += dt / (reduceMotion ? 0.01 : 0.7);
      const k = Math.min(current.entering, 1);
      s = Math.max(easeOutBack(k), 0.001);
      if (k >= 1) current.entering = null;
    }
    // shrink a little as parts fly apart so the exploded view stays in frame
    current.root.scale.setScalar(s * (1 - 0.32 * current.explode));
    if (current.assemble != null) {
      current.assemble += dt / 1.5;
      const k = Math.min(current.assemble, 1);
      current.setExplode(Math.pow(1 - k, 3));
      if (k >= 1) { current.assemble = null; current.setExplode(0); ui.explode.value = 0; }
    }
    if (explodeTarget != null) {
      const e = current.explode + (explodeTarget - current.explode) * Math.min(1, dt * 10);
      current.setExplode(Math.abs(e - explodeTarget) < 0.001 ? explodeTarget : e);
      if (current.explode === explodeTarget) explodeTarget = null;
    }
    if (current.clip) {
      // keep the cutaway plane through the model's centre in world space
      current.clip.normal.set(camera.position.x >= 0 ? -1 : 1, 0, 0);
      current.clip.constant = 0;
    }
    current.update(dt, elapsed);
  }
  stage.update(dt, elapsed);
  controls.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// panels slide in as they enter the viewport
const revealObs = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.panel').forEach((p) => revealObs.observe(p));

// boot
onScroll();
camera.position.copy(viewFor(current).pos).multiplyScalar(1.6);
requestAnimationFrame(() => {
  frame();
  document.body.classList.add('ready');
  setTimeout(() => $('#loader')?.remove(), 900);
});
// warm the cache for smoother first transitions
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
const warm = [...new Set(tracked.map((t) => t.dataset.model))];
(function warmNext() { const k = warm.shift(); if (!k) return; idle(() => { getModel(k); warmNext(); }); })();
