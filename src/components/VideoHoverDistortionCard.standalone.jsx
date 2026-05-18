/**
 * VideoHoverDistortionCard — self-contained drop-in component
 *
 * Dependencies (install in your project):
 *   npm install three @react-three/fiber @react-three/drei gsap
 *
 * Usage:
 *   <VideoHoverDistortionCard
 *     videoSrc="/your-video.mp4"
 *     title="Case Study"
 *     tag="WEB DESIGN"
 *     style={{ width: '600px', height: '400px' }}
 *   />
 */

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLE_ID = 'vh-distortion-card-styles';

const CSS = `
  .vh-card-container {
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    cursor: pointer;
    background-color: #111;
    transform: translateZ(0);
    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .vh-card-container:hover {
    transform: scale(0.98);
  }
  .vh-canvas-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
  }
  .vh-ui-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 32px;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.6) 100%);
    opacity: 0.8;
    transition: opacity 0.5s ease;
  }
  .vh-card-container:hover .vh-ui-overlay {
    opacity: 1;
  }
  .vh-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .vh-tag {
    padding: 6px 12px;
    font-size: 11px;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: white;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-transform: uppercase;
  }
  .vh-status {
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transform: translateY(-5px);
    transition: all 0.4s ease;
  }
  .vh-card-container:hover .vh-status {
    opacity: 1;
    transform: translateY(0);
  }
  .vh-dot {
    width: 6px;
    height: 6px;
    background-color: #fff;
    border-radius: 50%;
    animation: vh-pulse 1.5s infinite;
  }
  @keyframes vh-pulse {
    0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
    70%  { transform: scale(1);    box-shadow: 0 0 0 6px rgba(255,255,255,0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
  }
  .vh-title {
    font-family: 'Inter', sans-serif;
    font-size: 2.5rem;
    font-weight: 300;
    color: white;
    letter-spacing: -0.02em;
    text-shadow: 0 4px 12px rgba(0,0,0,0.5);
    transform: translateY(10px);
    transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
    margin: 0;
  }
  .vh-card-container:hover .vh-title {
    transform: translateY(0);
  }
`;

function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement('style');
    tag.id = STYLE_ID;
    tag.textContent = CSS;
    document.head.appendChild(tag);
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    };
  }, []);
}

// ─── Shader Material ──────────────────────────────────────────────────────────

const DistortionMaterial = shaderMaterial(
  {
    u_tex: null,
    u_hover: 0,
    u_mouse: new THREE.Vector2(0.5, 0.5),
    u_time: 0,
    u_planeResolution: new THREE.Vector2(1, 1),
    u_videoResolution: new THREE.Vector2(1, 1),
    u_wave_progress: 0,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    uniform float u_hover;
    uniform vec2 u_mouse;
    uniform float u_wave_progress;
    uniform float u_time;

    void main() {
      vUv = uv;
      vec3 pos = position;

      float dist = distance(uv, u_mouse);
      float bulge = smoothstep(0.8, 0.0, dist) * u_hover * 0.15;

      float wavePos    = u_wave_progress * 4.0 - 1.0;
      float distToWave = abs((vUv.x + vUv.y) - wavePos);
      float waveCrest  = smoothstep(1.2, 0.0, distToWave);
      float waveZ      = waveCrest * 0.2;

      pos.z += bulge + waveZ;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    varying vec2 vUv;
    uniform sampler2D u_tex;
    uniform float u_hover;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform vec2 u_planeResolution;
    uniform vec2 u_videoResolution;
    uniform float u_wave_progress;

    void main() {
      // object-fit: cover
      vec2 ratio = vec2(
        min((u_planeResolution.x / u_planeResolution.y) / (u_videoResolution.x / u_videoResolution.y), 1.0),
        min((u_planeResolution.y / u_planeResolution.x) / (u_videoResolution.y / u_videoResolution.x), 1.0)
      );
      vec2 baseUv = vec2(
        vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
      );

      vec2 aspectUv    = baseUv;
      aspectUv.x      *= u_planeResolution.x / u_planeResolution.y;
      vec2 aspectMouse = u_mouse;
      aspectMouse.x   *= u_planeResolution.x / u_planeResolution.y;

      float dist = distance(aspectUv, aspectMouse);

      // Mouse ripple — calm, low frequency
      float mouseWave = sin(dist * 8.0 - u_time * 2.0) * 0.007 * u_hover * smoothstep(0.6, 0.0, dist);

      // Sweeping wave
      float wavePos    = u_wave_progress * 4.0 - 1.0;
      float distToWave = abs((vUv.x + vUv.y) - wavePos);
      float waveCrest  = smoothstep(1.2, 0.0, distToWave);
      float wavePeak   = pow(smoothstep(0.6, 0.0, distToWave), 1.5);
      float globalWave = waveCrest * 0.08;

      vec2 dir        = normalize(aspectUv - aspectMouse);
      vec2 globalDir  = normalize(vec2(1.0, 1.0));
      vec2 distortedUv = baseUv + dir * mouseWave - globalDir * globalWave;

      vec4 texColor = texture2D(u_tex, distortedUv);

      float brightness = 1.0 + (u_hover * 0.1);
      texColor.rgb *= brightness;

      // Subtle brightness lift at the wave peak
      texColor.rgb = mix(texColor.rgb, vec3(1.0), wavePeak * 0.15 + waveCrest * 0.05);

      gl_FragColor = texColor;
    }
  `
);

extend({ DistortionMaterial });

// ─── Inner WebGL Scene ────────────────────────────────────────────────────────

function WebGLVideoScene({ videoSrc, isHovered, mousePos }) {
  const materialRef = useRef();
  const tlRef = useRef();
  const [video, setVideo] = useState(null);
  const [videoTexture, setVideoTexture] = useState(null);
  const [videoRes, setVideoRes] = useState([1, 1]);
  const { viewport } = useThree();

  useEffect(() => {
    const vid = document.createElement('video');
    vid.src = videoSrc;
    vid.crossOrigin = 'Anonymous';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';

    const onMeta = () => {
      setVideoRes([vid.videoWidth, vid.videoHeight]);
      vid.currentTime = 0.1;
    };
    vid.addEventListener('loadedmetadata', onMeta);
    vid.load();

    const tex = new THREE.VideoTexture(vid);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    setVideo(vid);
    setVideoTexture(tex);

    return () => {
      vid.removeEventListener('loadedmetadata', onMeta);
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
      tex.dispose();
    };
  }, [videoSrc]);

  useEffect(() => {
    if (!video || !materialRef.current) return;

    if (isHovered) {
      if (tlRef.current) tlRef.current.kill();

      tlRef.current = gsap.timeline({
        onComplete: () => video.play().catch(() => {}),
      });
      tlRef.current.to(materialRef.current.uniforms.u_wave_progress, {
        value: 1,
        duration: 2.0,
        ease: 'sine.inOut',
      });

      gsap.to(materialRef.current.uniforms.u_hover, {
        value: 1,
        duration: 0.8,
        ease: 'power3.out',
      });
    } else {
      if (tlRef.current) tlRef.current.kill();

      gsap.to(materialRef.current.uniforms.u_wave_progress, {
        value: 0,
        duration: 2.0,
        ease: 'sine.inOut',
      });

      gsap.to(materialRef.current.uniforms.u_hover, {
        value: 0,
        duration: 0.8,
        ease: 'power3.inOut',
        onComplete: () => {
          video.pause();
          video.currentTime = 0.1;
        },
      });
    }
  }, [isHovered, video]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.u_time = state.clock.elapsedTime;
    materialRef.current.u_mouse.x = THREE.MathUtils.lerp(
      materialRef.current.u_mouse.x,
      mousePos.current.x,
      0.08
    );
    materialRef.current.u_mouse.y = THREE.MathUtils.lerp(
      materialRef.current.u_mouse.y,
      mousePos.current.y,
      0.08
    );
    materialRef.current.u_planeResolution.set(viewport.width, viewport.height);
    materialRef.current.u_videoResolution.set(videoRes[0], videoRes[1]);
  });

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height, 64, 64]} />
      {videoTexture && (
        <distortionMaterial ref={materialRef} u_tex={videoTexture} transparent />
      )}
    </mesh>
  );
}

// ─── Public Component ─────────────────────────────────────────────────────────

export default function VideoHoverDistortionCard({
  videoSrc,
  title = 'Case Study',
  tag = 'WEB DESIGN',
  className = '',
  style = {},
}) {
  useInjectStyles();

  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const containerRef = useRef(null);

  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mousePos.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: 1.0 - (e.clientY - rect.top) / rect.height,
    };
  };

  return (
    <div
      ref={containerRef}
      className={`vh-card-container ${className}`}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerMove={handlePointerMove}
      style={style}
    >
      <div className="vh-canvas-wrapper">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        >
          <WebGLVideoScene
            videoSrc={videoSrc}
            isHovered={isHovered}
            mousePos={mousePos}
          />
        </Canvas>
      </div>

      <div className="vh-ui-overlay">
        <div className="vh-header">
          <span className="vh-tag">{tag}</span>
          <span className="vh-status">
            <span className="vh-dot" />
            PLAYING
          </span>
        </div>
        <div>
          <h2 className="vh-title">{title}</h2>
        </div>
      </div>
    </div>
  );
}
