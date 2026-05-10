import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import './VideoHoverDistortionCard.css';

// 1. Define the custom shader material for the premium effect
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
  // Vertex Shader
  `
    varying vec2 vUv;
    uniform float u_hover;
    uniform vec2 u_mouse;
    uniform float u_wave_progress;
    uniform float u_time;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Subtle bulge effect towards the camera based on distance to mouse
      float dist = distance(uv, u_mouse);
      float bulge = smoothstep(0.8, 0.0, dist) * u_hover * 0.15;
      
      // Single big sweeping wave
      float wavePos = u_wave_progress * 4.0 - 1.0;
      float distToWave = abs((vUv.x + vUv.y) - wavePos);
      float waveCrest = smoothstep(1.2, 0.0, distToWave); // Wider and softer
      
      float waveZ = waveCrest * 0.6;
      
      pos.z += bulge + waveZ;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
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
      // Background cover logic (object-fit: cover)
      vec2 ratio = vec2(
        min((u_planeResolution.x / u_planeResolution.y) / (u_videoResolution.x / u_videoResolution.y), 1.0),
        min((u_planeResolution.y / u_planeResolution.x) / (u_videoResolution.y / u_videoResolution.x), 1.0)
      );
      
      vec2 baseUv = vec2(
        vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
      );
      
      vec2 aspectUv = baseUv;
      aspectUv.x *= u_planeResolution.x / u_planeResolution.y;
      
      vec2 aspectMouse = u_mouse;
      aspectMouse.x *= u_planeResolution.x / u_planeResolution.y;
      
      float dist = distance(aspectUv, aspectMouse);
      
      // Local mouse ripple
      float mouseWave = sin(dist * 15.0 - u_time * 4.0) * 0.015 * u_hover * smoothstep(0.6, 0.0, dist);
      
      // Single big sweeping wave math
      float wavePos = u_wave_progress * 4.0 - 1.0;
      float distToWave = abs((vUv.x + vUv.y) - wavePos);
      float waveCrest = smoothstep(1.2, 0.0, distToWave); // Much wider, softer falloff
      float wavePeak = pow(smoothstep(0.6, 0.0, distToWave), 1.5); // Smoother gradient peak
      
      float globalWave = waveCrest * 0.08; // Slightly less aggressive distortion
      
      // Displace UVs
      vec2 dir = normalize(aspectUv - aspectMouse);
      vec2 globalDir = normalize(vec2(1.0, 1.0));
      
      vec2 distortedUv = baseUv + dir * mouseWave - globalDir * globalWave;
      
      // RGB shift
      float totalWave = mouseWave + globalWave;
      float r = texture2D(u_tex, distortedUv + vec2(totalWave * 0.5)).r;
      float g = texture2D(u_tex, distortedUv).g;
      float b = texture2D(u_tex, distortedUv - vec2(totalWave * 0.5)).b;
      vec4 texColor = vec4(r, g, b, 1.0);
      
      // Brightness lift
      float brightness = 1.0 + (u_hover * 0.1);
      texColor.rgb *= brightness;
      
      // White kind of effect at the wave peak
      texColor.rgb = mix(texColor.rgb, vec3(1.0), wavePeak * 0.4 + waveCrest * 0.1);
      
      gl_FragColor = texColor;
    }
  `
);

// Register the material so we can use it as <distortionMaterial />
extend({ DistortionMaterial });

const WebGLVideoScene = ({ videoSrc, isHovered, mousePos }) => {
  const materialRef = useRef();
  const tlRef = useRef();
  const [video, setVideo] = useState(null);
  const [videoTexture, setVideoTexture] = useState(null);
  const [videoRes, setVideoRes] = useState([1, 1]);
  const { viewport } = useThree();

  // Initialize Video
  useEffect(() => {
    const vid = document.createElement('video');
    vid.src = videoSrc;
    vid.crossOrigin = 'Anonymous';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';
    
    const handleLoadedMetadata = () => {
      setVideoRes([vid.videoWidth, vid.videoHeight]);
      // Seek slightly to ensure first frame is drawn on texture
      vid.currentTime = 0.1;
    };
    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    vid.load();

    const tex = new THREE.VideoTexture(vid);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    
    setVideo(vid);
    setVideoTexture(tex);

    return () => {
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
      tex.dispose();
    };
  }, [videoSrc]);

  // Handle Play/Pause and GSAP Hover Animation
  useEffect(() => {
    if (!video || !materialRef.current) return;

    if (isHovered) {
      if (tlRef.current) tlRef.current.kill();
      
      tlRef.current = gsap.timeline({
        onComplete: () => {
          video.play().catch(e => console.warn("Video autoplay prevented", e));
        }
      });

      tlRef.current.to(materialRef.current.uniforms.u_wave_progress, {
        value: 1,
        duration: 2.0, // Slower wave
        ease: 'sine.inOut', // Smoother, more natural ease for waves
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
        duration: 0.8,
        ease: 'power2.out',
      });

      gsap.to(materialRef.current.uniforms.u_hover, {
        value: 0,
        duration: 0.8,
        ease: 'power3.inOut',
        onComplete: () => {
          video.pause();
          video.currentTime = 0.1; // Reset to start
        }
      });
    }
  }, [isHovered, video]);

  // Update uniforms per frame
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.u_time = state.clock.elapsedTime;
      
      // Smoothly interpolate mouse position for fluid feel
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
      
      // Update resolutions for aspect-ratio correct object-fit: cover
      materialRef.current.u_planeResolution.set(viewport.width, viewport.height);
      materialRef.current.u_videoResolution.set(videoRes[0], videoRes[1]);
    }
  });

  return (
    <mesh>
      {/* Plane geometry matching viewport size */}
      <planeGeometry args={[viewport.width, viewport.height, 64, 64]} />
      {videoTexture && (
        <distortionMaterial 
          ref={materialRef} 
          u_tex={videoTexture} 
          transparent={true} 
        />
      )}
    </mesh>
  );
};

export default function VideoHoverDistortionCard({ 
  videoSrc, 
  title = "Case Study", 
  tag = "WEB DESIGN", 
  className = "",
  style = {}
}) {
  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const containerRef = useRef(null);

  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Normalize coordinates to 0.0 - 1.0 (WebGL standard, where 0,0 is bottom-left)
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - ((e.clientY - rect.top) / rect.height);
    mousePos.current = { x, y };
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
      {/* WebGL Canvas Background */}
      <div className="vh-canvas-wrapper">
        <Canvas 
          // Use an OrthographicCamera to make mapping viewport to canvas perfectly flat
          camera={{ position: [0, 0, 5], fov: 50 }} 
          dpr={[1, 2]} // limit pixel ratio for performance
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        >
          <WebGLVideoScene 
            videoSrc={videoSrc} 
            isHovered={isHovered} 
            mousePos={mousePos} 
          />
        </Canvas>
      </div>

      {/* DOM Overlay UI */}
      <div className="vh-ui-overlay">
        <div className="vh-header">
          <span className="vh-tag">{tag}</span>
          <span className="vh-status">
            <span className="vh-dot"></span>
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
