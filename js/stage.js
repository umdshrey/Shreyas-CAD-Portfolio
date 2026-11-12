// Studio environment around the models: blueprint cyclorama wall, volumetric light beams,
// floating dust, and the transition effects (scan band + floor ripples) used between projects.
import * as THREE from 'three';

const easeOut = (x) => 1 - Math.pow(1 - x, 3);

// Large faint technical drawing wrapped around the backdrop wall.
function blueprintTexture() {
  const W = 4096, H = 1024;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
  let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const arrow = (x1, y1, x2, y2, label) => {
    g.lineWidth = 2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (const [x, y, s] of [[x1, y1, 1], [x2, y2, -1]]) {
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + s * 18 * Math.cos(a) - 7 * Math.sin(a), y + s * 18 * Math.sin(a) + 7 * Math.cos(a));
      g.lineTo(x + s * 18 * Math.cos(a) + 7 * Math.sin(a), y + s * 18 * Math.sin(a) - 7 * Math.cos(a));
      g.fill();
    }
    if (label) { g.font = '600 26px JetBrains Mono, monospace'; g.textAlign = 'center'; g.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 12); }
  };
  const centre = (x, y, s) => { g.setLineDash([26, 8, 4, 8]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke(); g.setLineDash([]); };
  const gear = (x, y, R, n) => {
    g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= n * 4; i++) {
      const a = (i / (n * 4)) * Math.PI * 2, rr = i % 4 < 2 ? R : R * 0.88;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke(); g.beginPath(); g.arc(x, y, R * 0.3, 0, Math.PI * 2); g.stroke();
  };
  for (let k = 0; k < 4; k++) {
    const ox = k * 1024;
    // part outline with holes
    g.lineWidth = 3; g.strokeRect(ox + 120, 250, 380, 260);
    [[180, 310], [440, 310], [180, 450], [440, 450]].forEach(([x, y]) => { g.beginPath(); g.arc(ox + x, y, 18, 0, Math.PI * 2); g.stroke(); });
    g.beginPath(); g.arc(ox + 310, 380, 80, 0, Math.PI * 2); g.stroke();
    centre(ox + 310, 380, 130);
    arrow(ox + 120, 200, ox + 500, 200, `${(80 + k * 15).toFixed(0)}.00`);
    arrow(ox + 560, 250, ox + 560, 510, '');
    gear(ox + 760, 330, 120 + r() * 30, 18 + k * 2);
    centre(ox + 760, 330, 170);
    g.lineWidth = 2; g.beginPath(); g.arc(ox + 760, 330, 175, -0.4, 0.9); g.stroke();
    g.font = '500 24px JetBrains Mono, monospace'; g.textAlign = 'left';
    g.fillText(['SECTION A-A', 'DETAIL B  SCALE 3:1', 'ISOMETRIC VIEW', 'FLAT PATTERN'][k], ox + 120, 600);
    g.fillText(`Ø${(5 + k * 2.5).toFixed(1)} THRU  ${4 + k}X`, ox + 640, 560);
    // title block
    g.lineWidth = 2; g.strokeRect(ox + 640, 640, 340, 150);
    g.beginPath(); g.moveTo(ox + 640, 690); g.lineTo(ox + 980, 690); g.moveTo(ox + 800, 690); g.lineTo(ox + 800, 790); g.stroke();
    g.font = '700 26px Inter, sans-serif'; g.fillText('SHREYAS NAGARAJU', ox + 655, 675);
    g.font = '500 20px JetBrains Mono, monospace'; g.fillText('UNITS: mm', ox + 655, 725); g.fillText(`SHEET ${k + 1} OF 4`, ox + 815, 725);
    g.fillText('CAD PORTFOLIO', ox + 655, 770); g.fillText('SCALE NTS', ox + 815, 770);
    // section hatch
    g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(ox + 120 + i * 20, 900); g.lineTo(ox + 180 + i * 20, 840); g.stroke(); }
    g.lineWidth = 2.5; g.strokeRect(ox + 120, 840, 340, 60);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function dotSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createStage(scene, { rim, discRing }) {
  const accent = new THREE.Color('#4da3ff'), accentTarget = accent.clone();
  const group = new THREE.Group(); scene.add(group);

  /* -- cyclorama wall -- */
  const wallMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uDraw: { value: blueprintTexture() }, uAccent: { value: accent }, uTime: { value: 0 },
      uTop: { value: new THREE.Color('#07080b') }, uLow: { value: new THREE.Color('#151922') },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vW;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uDraw; uniform vec3 uAccent, uTop, uLow; uniform float uTime;
      varying vec2 vUv; varying vec3 vW;
      float grid(vec2 p){ vec2 g = abs(fract(p - .5) - .5) / fwidth(p); return 1. - min(min(g.x, g.y), 1.); }
      void main(){
        float h = clamp(vW.y / 16., 0., 1.);
        vec3 col = mix(uLow, uTop, smoothstep(0., .75, h));
        vec2 p = vec2(vUv.x * 140., vW.y);
        float minor = grid(p * 2.), major = grid(p * .4);
        float draw = texture2D(uDraw, vec2((1. - vUv.x) * 2., clamp((vW.y - .2) / 8., 0., 1.))).r;
        float band = smoothstep(.0, .12, h) * (1. - smoothstep(.45, .85, h));
        col += uAccent * (minor * .012 + major * .035 + draw * .1) * band;
        col += uAccent * .10 * exp(-pow((vW.y - 1.2) / 2.2, 2.));               // horizon glow
        float scan = smoothstep(.06, 0., abs(fract(uTime * .05) * 14. - vW.y));      // slow sweep line
        col += uAccent * scan * .06 * band;
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 22, 160, 1, true), wallMat);
  wall.position.y = 10.5;
  group.add(wall);

  /* -- volumetric light beams -- */
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uColor: { value: new THREE.Color('#fff4e0') }, uAccent: { value: accent }, uStrength: { value: 0.11 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN, vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor, uAccent; uniform float uStrength; varying vec2 vUv; varying vec3 vN, vV;
      void main(){ float f = pow(abs(dot(vN, vV)), 2.5); float a = smoothstep(0., .9, vUv.y) * (1. - smoothstep(.92, 1., vUv.y));
        gl_FragColor = vec4(mix(uColor, uAccent, .35) * f * a * uStrength, 1.); }`,
  });
  const beams = [];
  for (const [x, z, tilt] of [[-1.6, -1.2, 0.12], [1.9, -0.6, -0.1]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 3.0, 13, 48, 1, true), beamMat);
    b.position.set(x, 6.4, z); b.rotation.z = tilt;
    group.add(b); beams.push(b);
  }

  /* -- floating dust -- */
  const N = 520, pos = new Float32Array(N * 3), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, rr = 1.5 + Math.random() * 10;
    pos.set([Math.cos(a) * rr, Math.random() * 9, Math.sin(a) * rr], i * 3);
    speed[i] = 0.05 + Math.random() * 0.15;
  }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.055, map: dotSprite(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcfe2ff,
  }));
  group.add(dust);

  /* -- transition effects -- */
  const fxMat = (alpha) => new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: alpha, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const ripples = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 160), fxMat(0));
    r.rotation.x = -Math.PI / 2; r.position.y = 0.015; r.visible = false; group.add(r); return r;
  });
  const bandMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uColor: { value: accent }, uAlpha: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv;
      void main(){ float a = pow(vUv.y, 3.) ; float line = smoothstep(.9, 1., vUv.y);
        float ticks = step(.5, fract(vUv.x * 96.)) * .35 + .65;
        gl_FragColor = vec4(uColor * (a * .55 + line * 1.6) * ticks * uAlpha, 1.); }`,
  });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.7, 160, 1, true), bandMat);
  band.visible = false; group.add(band);
  const scanDisc = new THREE.Mesh(new THREE.RingGeometry(2.15, 2.32, 160), fxMat(0));
  scanDisc.rotation.x = -Math.PI / 2; scanDisc.visible = false; group.add(scanDisc);

  let fx = null;
  const baseRim = rim.color.clone();

  return {
    setAccent(hex) { accentTarget.set(hex); },
    pulse(height = 3) { fx = { t: 0, h: Math.max(height, 1.5) }; },
    update(dt, time) {
      accent.lerp(accentTarget, Math.min(1, dt * 2.5));
      wallMat.uniforms.uTime.value = time;
      discRing.material.color.copy(accent);
      rim.color.copy(baseRim).lerp(accent, 0.55);
      // dust drift
      const p = dustGeo.attributes.position;
      for (let i = 0; i < N; i++) {
        let y = p.getY(i) + speed[i] * dt;
        if (y > 9) y = 0;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(time * 0.3 + i) * 0.0015);
      }
      p.needsUpdate = true;
      beams.forEach((b, i) => { b.material.uniforms.uStrength.value = 0.09 + Math.sin(time * 0.7 + i * 2) * 0.02; });
      // transition: floor ripples + rising scan band
      if (fx) {
        fx.t += dt;
        ripples.forEach((r, i) => {
          const k = (fx.t - i * 0.18) / 1.8;
          r.visible = k > 0 && k < 1;
          if (r.visible) { r.scale.setScalar(1.5 + easeOut(k) * 11); r.material.opacity = (1 - k) * 0.55; r.material.color.copy(accent); }
        });
        const k = Math.min(fx.t / 1.25, 1);
        band.visible = scanDisc.visible = k < 1;
        band.position.y = easeOut(k) * (fx.h + 0.4) - 0.35;
        bandMat.uniforms.uAlpha.value = Math.sin(k * Math.PI) * 0.9;
        scanDisc.position.y = band.position.y + 0.35;
        scanDisc.material.opacity = Math.sin(k * Math.PI) * 0.8; scanDisc.material.color.copy(accent);
        if (fx.t > 2.4) { fx = null; ripples.forEach((r) => (r.visible = false)); }
      }
    },
  };
}
