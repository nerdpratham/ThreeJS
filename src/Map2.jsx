import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ════════════════════════════════════════════════════════════════
   ADJUSTABLE PARAMETERS
   ════════════════════════════════════════════════════════════════ */
const PARAMS = {
  edgeColor      : 0x44aaff,   // line colour
  bgColor        : 0x03050e,   // background
  lineOpacity    : 0.72,       // overall edge opacity  (0 – 1)
  thresholdAngle : 15,         // EdgesGeometry crease angle (degrees)
                               //   lower  = fewer lines (only sharp creases)
                               //   higher = more lines (softer creases included)
};

/* ════════════════════════════════════════════════════════════════
   REACT COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function Map2() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({
      antialias      : true,
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
      1000
    );
    camera.position.set(0, 10, 20);

    /* ── OrbitControls — scroll = zoom, drag = orbit ── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom    = true;
    controls.minDistance   = 2;
    controls.maxDistance   = 120;

    /* ── Shared line material (all edges share one material) ── */
    const lineMaterial = new THREE.LineBasicMaterial({
      color       : new THREE.Color(PARAMS.edgeColor),
      transparent : true,
      opacity     : PARAMS.lineOpacity,
      depthWrite  : false,
      blending    : THREE.AdditiveBlending,
    });

    /* ── Track everything we add so we can dispose on cleanup ── */
    const edgeObjects = [];   // THREE.LineSegments
    let   animId      = null;

    /* ── Load GLTF ── */
    new GLTFLoader().load(
      '/map/scene.gltf',
      (gltf) => {

        /* ── Centre + normalise the model ── */
        const box    = new THREE.Box3().setFromObject(gltf.scene);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 14.0 / maxDim;   // fit into 14-unit cube

        /* ── Traverse every mesh ── */
        gltf.scene.traverse((child) => {
          if (!child.isMesh) return;

          /* Bake the child's world transform into a clone so the
             centred / scaled geometry is in local space of the LineSegments */
          child.updateWorldMatrix(true, false);

          /* Clone & apply world matrix to get geometry in world space,
             then shift to centred + scaled space */
          const worldGeo = child.geometry.clone();
          worldGeo.applyMatrix4(child.matrixWorld);

          /* Shift to centred, normalised space */
          worldGeo.translate(-centre.x, -centre.y, -centre.z);
          worldGeo.scale(scale, scale, scale);

          /* ── Generate clean edge lines from the mesh geometry ──
               EdgesGeometry removes duplicate / internal edges; only
               keeps edges whose dihedral angle > thresholdAngle.        */
          const edgesGeo = new THREE.EdgesGeometry(
            worldGeo,
            PARAMS.thresholdAngle
          );

          const lineSegments = new THREE.LineSegments(edgesGeo, lineMaterial);
          scene.add(lineSegments);
          edgeObjects.push(lineSegments);

          /* Dispose the intermediate cloned geometry */
          worldGeo.dispose();
        });

        /* ── Position camera for the normalised model ── */
        const normSize  = size.clone().multiplyScalar(scale);
        const planeDist = Math.max(normSize.x, normSize.z);
        camera.position.set(0, planeDist * 0.75, planeDist * 1.05);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      (err) => console.error('[Map2] GLTF load error:', err)
    );

    /* ── Render loop ── */
    function animate() {
      animId = requestAnimationFrame(animate);
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
      edgeObjects.forEach((ls) => {
        ls.geometry.dispose();
        scene.remove(ls);
      });
      lineMaterial.dispose();
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
