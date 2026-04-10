import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function EarphoneScene({ scrollProgress }) {
  const canvasRef = useRef(null);
  // Refs to hold mutable state that we need to update in the render loop based on props
  const progressRef = useRef(scrollProgress);
  const targetProgressRef = useRef(scrollProgress);
  
  // We keep track of the scene parts here so the animate loop can access them
  const partsRef = useRef([]);
  const vortexRef = useRef(null);
  
  // Update the target progress when the prop changes
  useEffect(() => {
    targetProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020513); // Very dark blue

    // Fog for depth in the vortex
    scene.fog = new THREE.FogExp2(0x020513, 0.03);

    const camera = new THREE.PerspectiveCamera(
      45,
      initialWidth / initialHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Zoom is handled by scrolling instead


    // --- Lighting ---
    const hemi = new THREE.HemisphereLight(0xffffff, 0x112244, 0.5);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(0, 2, 5);
    scene.add(key);

    // Glowing blue aura behind the model
    const glowLight = new THREE.PointLight(0x3a6af8, 10, 20);
    glowLight.position.set(0, 0, -2);
    scene.add(glowLight);

    // --- Background Vortex (The blue rings/grid effect) ---
    const vortexGroup = new THREE.Group();
    scene.add(vortexGroup);
    vortexRef.current = vortexGroup;

    // Create connected lines/dots to form the 'web' tunnel
    const ringsCount = 12;
    const pointsPerRing = 32;
    const baseRadius = 3;
    
    const positions = [];
    const colors = [];
    
    const colorInside = new THREE.Color(0x88bbff);
    const colorOutside = new THREE.Color(0x113388);

    for (let i = 0; i < ringsCount; i++) {
        const z = -i * 3 + 2; 
        const r = baseRadius + (i * 0.5); 
        
        for (let j = 0; j < pointsPerRing; j++) {
            const angle = (j / pointsPerRing) * Math.PI * 2;
            const noiseX = (Math.random() - 0.5) * 1.5;
            const noiseY = (Math.random() - 0.5) * 1.5;

            positions.push(Math.cos(angle) * r + noiseX);
            positions.push(Math.sin(angle) * r + noiseY);
            positions.push(z);
            
            const mixRatio = i / ringsCount;
            const c = colorOutside.clone().lerp(colorInside, 1 - mixRatio);
            colors.push(c.r, c.g, c.b);
        }
    }

    const vortexGeo = new THREE.BufferGeometry();
    vortexGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    vortexGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Glowing dots
    const vortexMat = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const vortexPoints = new THREE.Points(vortexGeo, vortexMat);
    vortexGroup.add(vortexPoints);

    // Lines connecting the dots
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x3a6af8,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
    });
    
    // We create line segments connecting rings
    const lineIndices = [];
    for (let i = 0; i < ringsCount - 1; i++) {
        for (let j = 0; j < pointsPerRing; j++) {
            const current = i * pointsPerRing + j;
            const nextInRing = i * pointsPerRing + ((j + 1) % pointsPerRing);
            const nextRing = (i + 1) * pointsPerRing + j;
            
            lineIndices.push(current, nextInRing); // Connect around
            lineIndices.push(current, nextRing);   // Connect backwards
        }
    }
    const lineGeo = vortexGeo.clone();
    lineGeo.setIndex(lineIndices);
    const vortexLines = new THREE.LineSegments(lineGeo, lineMat);
    vortexGroup.add(vortexLines);


    // --- Load Model ---
    const loader = new GLTFLoader();
    let modelRoot = null;
    let modelMaxDim = 1;

    // We reuse the MOTOR model for now. Once you provide the Earphone model, 
    // we change this URL and the animation logic.
    loader.load(
      '/MOTOR(1).gltf',
      (gltf) => {
        modelRoot = gltf.scene;
        scene.add(modelRoot);

        // Center the model
        const box = new THREE.Box3().setFromObject(modelRoot);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        modelRoot.position.sub(center);
        
        // Rotate 90 degrees (PI/2) on the Y axis to show the side view by default
        modelRoot.rotation.y = Math.PI / 2;
        
        modelRoot.updateWorldMatrix(true, true);

        modelMaxDim = Math.max(size.x, size.y, size.z);

        // Analyze and prepare parts for "explosion" (or opening)
        const parts = [];
        const primaryAxisIndex = [size.x, size.y, size.z].indexOf(modelMaxDim);
        const axisVector = new THREE.Vector3();
        axisVector.setComponent(primaryAxisIndex, 1);
        const halfExtents = new THREE.Vector3(size.x * 0.5, size.y * 0.5, size.z * 0.5);

        modelRoot.traverse((child) => {
          if (!child.isMesh || !child.parent) return;

          // For the Earphone, we would specifically look for child.name === 'Lid' etc.
          // For now, we reuse the procedural explosion trick to give it movement.
          
          const originalLocalPosition = child.position.clone();
          const originalLocalRotation = child.rotation.clone();
          const worldPosition = child.getWorldPosition(new THREE.Vector3());
          
          const meshBox = new THREE.Box3().setFromObject(child);
          const worldCenter = meshBox.getCenter(new THREE.Vector3());
          
          // Force the explosion direction to stay on the horizontal plane (X and Z only)
          const direction = worldCenter.clone();
          direction.y = 0; 
          direction.normalize();
          
          if (direction.lengthSq() === 0) direction.set(0,0,1);

          // We'll move parts outwards by max 1.5 units
          const maxDistance = modelMaxDim * 0.5;

          parts.push({
            mesh: child,
            parent: child.parent,
            originalLocalPosition,
            originalLocalRotation,
            originalWorldPosition: worldPosition.clone(),
            direction,
            maxDistance
          });
        });

        partsRef.current = parts;

        // Position camera to fit model
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const fitDistance = ((modelMaxDim / 2) / Math.tan(fovRad / 2)) * 2.0;

        camera.position.set(0, 0, fitDistance);
        camera.updateProjectionMatrix();

      },
      undefined,
      (error) => {
        console.error('GLTF load error:', error);
      }
    );

    // --- Animation Loop ---
    let rafId = 0;
    const tmpWorld = new THREE.Vector3();
    const tmpLocal = new THREE.Vector3();

    function animate() {
      rafId = requestAnimationFrame(animate);

      // Smooth interpolation of progress
      progressRef.current = THREE.MathUtils.lerp(progressRef.current, targetProgressRef.current, 0.05);
      const progress = progressRef.current;

      // 1. Animate Vortex (Tunnel effect)
      if (vortexRef.current) {
          vortexRef.current.position.z = progress * 10;
          vortexRef.current.rotation.z -= 0.001; 
      }
      
      // Move the entire model forward along Z axis as you scroll
      if (modelRoot) {
          modelRoot.position.z = progress * 2.5; 
      }

      // 2. Animate Model Parts
      for (const part of partsRef.current) {
        const {
          mesh, parent, originalLocalPosition, originalLocalRotation,
          originalWorldPosition, direction, maxDistance
        } = part;

        // When you get the earphone model, we can do:
        // if (mesh.name === 'Case_Lid') { mesh.rotation.x = progress * Math.PI / 2; }

        // Procedural move out based on scroll progress:
        tmpWorld
          .copy(originalWorldPosition)
          .addScaledVector(direction, maxDistance * progress);

        tmpLocal.copy(tmpWorld);
        parent.worldToLocal(tmpLocal);

        mesh.position.copy(tmpLocal);

        // Add a slight rotation to pieces as they explode for flair
        mesh.rotation.x = originalLocalRotation.x + direction.x * progress;
        mesh.rotation.y = originalLocalRotation.y + direction.y * progress;
        mesh.rotation.z = originalLocalRotation.z + direction.z * progress;
      }

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();

      if (modelRoot) {
        modelRoot.traverse((child) => {
          if (!child.isMesh) return;
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m?.dispose?.());
          } else {
            child.material?.dispose?.();
          }
        });
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
        zIndex: -1, // Sits behind the HTML UI
      }}
    />
  );
}
