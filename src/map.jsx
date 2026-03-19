import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ════════════════════════════════════════════════════════════════
   ADJUSTABLE PARAMETERS
   ════════════════════════════════════════════════════════════════ */
const PARAMS = {
  particleCount  : 50_000,    // ← was 120k; halved to prevent overdraw blowout
  particleSize   : 1.1,       // ← was 2.4; smaller so particles don't overlap into solid white
  noiseStrength  : 0.18,      // ← was 0.30; subtler drift
  animSpeed      : 0.28,
  glowColor      : 0x44aaff,
  bgColor        : 0x03050e,
};

/* ════════════════════════════════════════════════════════════════
   VERTEX SHADER
   ════════════════════════════════════════════════════════════════ */
const VERT = /* glsl */`
precision highp float;

uniform float uTime;
uniform float uNoiseStrength;
uniform float uAnimSpeed;
uniform float uParticleSize;

attribute float aSize;
attribute float aRandom;

varying float vAlpha;
varying float vDepth;

/* ─── Simplex 3-D Noise (Ashima Arts / Stefan Gustavson) ─── */
vec3 _m3(vec3 x){ return x - floor(x*(1./289.))*289.; }
vec4 _m4(vec4 x){ return x - floor(x*(1./289.))*289.; }
vec4 _pm(vec4 x){ return _m4(((x*34.)+10.)*x); }
vec4 _ti(vec4 r){ return 1.7928429140016 - .8537347209531*r; }

float snoise(vec3 v){
  const vec2 C = vec2(1./6., 1./3.);
  const vec4 D = vec4(0., .5, 1., 2.);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1. - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = _m3(i);
  vec4 p = _pm(_pm(_pm(
    i.z + vec4(0., i1.z, i2.z, 1.))
  + i.y + vec4(0., i1.y, i2.y, 1.))
  + i.x + vec4(0., i1.x, i2.x, 1.));

  float n_ = .142857142857;
  vec3  ns  = n_ * D.wyz - D.xzx;

  vec4 j  = p - 49. * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7. * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1. - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2. + 1.;
  vec4 s1 = floor(b1) * 2. + 1.;
  vec4 sh = -step(h, vec4(0.));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = _ti(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.);
  m = m * m;
  return 105. * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
/* ──────────────────────────────────────────────────────────── */

void main(){
  float t   = uTime * uAnimSpeed;
  vec3  pos = position;

  /* Three decorrelated noise octaves → smooth organic drift */
  vec3  sc = pos * 0.14;
  float nx = snoise(sc + vec3(t * 0.73,  aRandom * 11.3, t * 0.41));
  float ny = snoise(sc + vec3(t * 0.51 + 31., t * 0.69,  aRandom * 13.7));
  float nz = snoise(sc + vec3(aRandom * 9.1,  t * 0.47 + 61., t * 0.58));
  pos += vec3(nx, ny, nz) * uNoiseStrength;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

  /* Perspective-correct varying size; ← tighter clamp (was 20.0) */
  float sz = uParticleSize * aSize * (160.0 / max(-mvPos.z, 0.001));
  gl_PointSize = clamp(sz, 0.3, 12.0);
  gl_Position  = projectionMatrix * mvPos;

  /* Alpha: depth-fade × per-particle shimmer
     ← flicker range reduced to 0.38+0.38 (max 0.76) to curb overdraw blowout */
  float depthFade = 1.0 - clamp(-mvPos.z / 50.0, 0.0, 0.80);
  float flicker   = 0.38 + 0.38 * snoise(vec3(aRandom * 79.3, t * 2.8, 0.0));

  vAlpha = depthFade * flicker;
  vDepth = clamp(-mvPos.z / 50.0, 0.0, 1.0);
}
`;

/* ════════════════════════════════════════════════════════════════
   FRAGMENT SHADER
   ════════════════════════════════════════════════════════════════ */
const FRAG = /* glsl */`
precision highp float;

uniform vec3  uColor;

varying float vAlpha;
varying float vDepth;

void main(){
  vec2  uv   = gl_PointCoord - 0.5;
  float d    = length(uv) * 2.0;

  float disc = 1.0 - smoothstep(0.35, 1.0, d);
  float core = 1.0 - smoothstep(0.0,  0.30, d);

  /* ← core mix reduced 0.70 → 0.38 so particles don't saturate to solid white */
  vec3 col = mix(uColor, vec3(1.0), core * 0.38);
  col      = mix(col, uColor * 0.45, vDepth * 0.25);

  float alpha = disc * vAlpha;
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

/* ════════════════════════════════════════════════════════════════
   SURFACE SAMPLER
   ════════════════════════════════════════════════════════════════ */
function sampleSurface(gltf, count) {
  const triData = [];
  const cdf     = [];
  let   total   = 0;

  const vA  = new THREE.Vector3();
  const vB  = new THREE.Vector3();
  const vC  = new THREE.Vector3();
  const tri = new THREE.Triangle();

  gltf.scene.traverse((child) => {
    if (!child.isMesh) return;
    child.updateWorldMatrix(true, false);

    const wm  = child.matrixWorld;
    const geo = child.geometry;
    const pos = geo.getAttribute('position');
    const idx = geo.getIndex();

    if (!pos) return;

    const fc = idx ? idx.count / 3 : Math.floor(pos.count / 3);

    for (let f = 0; f < fc; f++) {
      let i0, i1, i2;
      if (idx) {
        i0 = idx.getX(f * 3);
        i1 = idx.getX(f * 3 + 1);
        i2 = idx.getX(f * 3 + 2);
      } else {
        i0 = f * 3; i1 = i0 + 1; i2 = i0 + 2;
      }

      vA.fromBufferAttribute(pos, i0).applyMatrix4(wm);
      vB.fromBufferAttribute(pos, i1).applyMatrix4(wm);
      vC.fromBufferAttribute(pos, i2).applyMatrix4(wm);
      tri.set(vA, vB, vC);

      const area = tri.getArea();
      if (area < 1e-10) continue;

      triData.push(
        vA.x, vA.y, vA.z,
        vB.x, vB.y, vB.z,
        vC.x, vC.y, vC.z
      );
      total += area;
      cdf.push(total);
    }
  });

  if (triData.length === 0) return null;

  const nTris     = cdf.length;
  const positions = new Float32Array(count * 3);
  const sizes     = new Float32Array(count);
  const randoms   = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r  = Math.random() * total;
    let lo = 0, hi = nTris - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      cdf[mid] < r ? (lo = mid + 1) : (hi = mid);
    }

    const base = lo * 9;
    const ax = triData[base],     ay = triData[base + 1], az = triData[base + 2];
    const bx = triData[base + 3], by = triData[base + 4], bz = triData[base + 5];
    const cx = triData[base + 6], cy = triData[base + 7], cz = triData[base + 8];

    let u = Math.random(), v = Math.random();
    if (u + v > 1.0) { u = 1.0 - u; v = 1.0 - v; }
    const w = 1.0 - u - v;

    positions[i * 3]     = ax * w + bx * u + cx * v;
    positions[i * 3 + 1] = ay * w + by * u + cy * v;
    positions[i * 3 + 2] = az * w + bz * u + cz * v;

    sizes[i]   = 0.25 + Math.random() * 1.75;
    randoms[i] = Math.random();
  }

  return { positions, sizes, randoms };
}

/* ════════════════════════════════════════════════════════════════
   REACT COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function Map() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({
      antialias      : false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(PARAMS.bgColor, 1);
    container.appendChild(renderer.domElement);

    /* ── Scene + Camera ── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.05,
      500
    );
    camera.position.set(0, 6, 22);  // overridden after model loads

    /* ── OrbitControls — scroll = zoom, drag = orbit ── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.enableZoom     = true;   // scroll-wheel zoom
    controls.minDistance    = 3;
    controls.maxDistance    = 80;

    /* ── Uniforms — no uDisperse; removed entirely ── */
    const uniforms = {
      uTime          : { value: 0 },
      uNoiseStrength : { value: PARAMS.noiseStrength },
      uAnimSpeed     : { value: PARAMS.animSpeed },
      uParticleSize  : { value: PARAMS.particleSize },
      uColor         : { value: new THREE.Color(PARAMS.glowColor) },
    };

    /* ── Material ── */
    const material = new THREE.ShaderMaterial({
      vertexShader   : VERT,
      fragmentShader : FRAG,
      uniforms,
      transparent    : true,
      depthWrite     : false,
      blending       : THREE.AdditiveBlending,
    });

    let points = null;
    let animId = null;
    const clock = new THREE.Clock();

    /* ── Load model ── */
    new GLTFLoader().load(
      '/map/scene.gltf',
      (gltf) => {
        const box    = new THREE.Box3().setFromObject(gltf.scene);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 14.0 / maxDim;

        const data = sampleSurface(gltf, PARAMS.particleCount);
        if (!data) { console.warn('[Map] No geometry found.'); return; }

        const { positions, sizes, randoms } = data;

        /* Normalise to centred 14-unit space */
        for (let i = 0; i < PARAMS.particleCount; i++) {
          positions[i * 3]     = (positions[i * 3]     - centre.x) * scale;
          positions[i * 3 + 1] = (positions[i * 3 + 1] - centre.y) * scale;
          positions[i * 3 + 2] = (positions[i * 3 + 2] - centre.z) * scale;
        }

        /* ← No aVelocity attribute; disperse removed */
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1));
        geo.setAttribute('aRandom',  new THREE.BufferAttribute(randoms,   1));

        points = new THREE.Points(geo, material);
        scene.add(points);

        /* ── Camera: elevated isometric view so flat city map is visible top-down
              ← was (0, normSize.y * 0.35, camDist) which put camera at near ground level */
        const normSize  = size.clone().multiplyScalar(scale);
        const planeDist = Math.max(normSize.x, normSize.z);
        camera.position.set(0, planeDist * 0.75, planeDist * 1.05);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      (err) => console.error('[Map] GLTF load error:', err)
    );

    /* ── Render loop — uDisperse line removed ── */
    function animate() {
      animId = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    /* ── Resize ── */
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      if (points) points.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#03050e' }}
    />
  );
}
