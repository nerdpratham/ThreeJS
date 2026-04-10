import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function Motor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    const camera = new THREE.PerspectiveCamera(
      45,
      initialWidth / initialHeight,
      0.001,
      200
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.65;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223366, 2.4);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(2, 4, 3);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x6b8fd6, 2);
    fill.position.set(-3, 1, -2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffe8cf, 1.4);
    rim.position.set(0, -2, -3);
    scene.add(rim);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = false;
    controls.target.set(0, 0, 0);
    controls.update();

    const hint = document.createElement('div');
    hint.textContent = 'Scroll to explode or assemble. Drag to orbit.';
    Object.assign(hint.style, {
      position: 'fixed',
      bottom: '28px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'rgba(255,255,255,0.48)',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      letterSpacing: '0.04em',
      pointerEvents: 'none',
      userSelect: 'none',
      textTransform: 'uppercase',
    });
    document.body.appendChild(hint);

    const loader = new GLTFLoader();
    const parts = [];
    const tmpWorld = new THREE.Vector3();
    const tmpLocal = new THREE.Vector3();
    const modelCenter = new THREE.Vector3();
    const meshBox = new THREE.Box3();

    let rafId = 0;
    let modelRoot = null;
    let explodeDistance = 1;
    let targetProgress = 0;
    let currentProgress = 0;

    const onWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const step = THREE.MathUtils.clamp(event.deltaY * 0.0009, -0.08, 0.08);
      targetProgress = THREE.MathUtils.clamp(targetProgress + step, 0, 1);
    };

    window.addEventListener('wheel', onWheel, { passive: false });

    loader.load(
      '/MOTOR(1).gltf',
      (gltf) => {
        modelRoot = gltf.scene;
        scene.add(modelRoot);

        const box = new THREE.Box3().setFromObject(modelRoot);
        box.getCenter(modelCenter);
        const size = box.getSize(new THREE.Vector3());

        modelRoot.position.sub(modelCenter);
        modelRoot.updateWorldMatrix(true, true);

        const dimensions = [size.x, size.y, size.z];
        const maxDim = Math.max(...dimensions);
        const primaryAxisIndex = dimensions.indexOf(maxDim);
        const halfExtents = new THREE.Vector3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const fitDistance = ((maxDim / 2) / Math.tan(fovRad / 2)) * 1.55;

        camera.position.set(fitDistance * 0.38, fitDistance * 0.26, fitDistance);
        camera.near = fitDistance * 0.001;
        camera.far = fitDistance * 20;
        camera.updateProjectionMatrix();

        explodeDistance = maxDim * 0.72;

        const axisVector = new THREE.Vector3();
        axisVector.setComponent(primaryAxisIndex, 1);

        const buildDirection = (groupName, worldCenter) => {
          const radial = worldCenter.clone();
          radial.setComponent(primaryAxisIndex, 0);

          if (radial.lengthSq() < 1e-10) {
            radial.set(0, 1, 0);
            if (primaryAxisIndex === 1) radial.set(1, 0, 0);
          } else {
            radial.normalize();
          }

          const axialSign =
            Math.sign(worldCenter.getComponent(primaryAxisIndex)) || 1;
          const axialDirection = axisVector.clone().multiplyScalar(axialSign);
          const upDirection = new THREE.Vector3(0, Math.sign(worldCenter.y) || 1, 0);

          switch (groupName) {
            case 'front':
            case 'rear':
              return axialDirection.multiplyScalar(0.85).add(radial.multiplyScalar(0.25)).normalize();
            case 'top':
              return upDirection.multiplyScalar(0.8).add(radial.multiplyScalar(0.35)).normalize();
            case 'base':
              return new THREE.Vector3(0, -1, 0).multiplyScalar(0.85).add(radial.multiplyScalar(0.18)).normalize();
            case 'side':
              return radial.multiplyScalar(0.9).add(axialDirection.multiplyScalar(0.2)).normalize();
            case 'core':
              return axialDirection.multiplyScalar(0.95).normalize();
            default:
              return radial.multiplyScalar(0.8).add(axialDirection.multiplyScalar(0.15)).normalize();
          }
        };

        const classifyGroup = (worldCenter, worldSize) => {
          const axisHalfExtent = Math.max(halfExtents.getComponent(primaryAxisIndex), 0.0001);
          const axial = worldCenter.getComponent(primaryAxisIndex);
          const axialNorm = axial / axisHalfExtent;

          const radial = worldCenter.clone();
          radial.setComponent(primaryAxisIndex, 0);

          const radialSize = worldSize.clone();
          radialSize.setComponent(primaryAxisIndex, 0);
          const radialSpan = Math.max(radialSize.x, radialSize.y, radialSize.z);
          const radialLength = radial.length();

          if (Math.abs(axialNorm) > 0.48) {
            return axialNorm > 0 ? 'front' : 'rear';
          }

          if (worldCenter.y > halfExtents.y * 0.34) {
            return 'top';
          }

          if (worldCenter.y < -halfExtents.y * 0.4) {
            return 'base';
          }

          if (radialLength < maxDim * 0.13 && radialSpan < maxDim * 0.18) {
            return 'core';
          }

          if (radialLength > maxDim * 0.24) {
            return 'side';
          }

          return 'shell';
        };

        const groupCounts = new Map();

        modelRoot.traverse((child) => {
          if (!child.isMesh || !child.parent) return;

          child.castShadow = true;
          child.receiveShadow = true;

          const originalLocalPosition = child.position.clone();
          const originalLocalRotation = child.rotation.clone();
          const worldPosition = child.getWorldPosition(new THREE.Vector3());

          meshBox.setFromObject(child);
          const worldCenter = meshBox.getCenter(new THREE.Vector3());
          const worldSize = meshBox.getSize(new THREE.Vector3());

          const groupName = classifyGroup(worldCenter, worldSize);
          const direction = buildDirection(groupName, worldCenter);

          const normalizedHeight = THREE.MathUtils.clamp(
            (worldCenter.y / Math.max(maxDim, 0.0001)) * 0.5 + 0.5,
            0,
            1
          );
          const distanceFactorByGroup = {
            front: 1.2,
            rear: 1.2,
            top: 0.95,
            base: 0.45,
            side: 1.0,
            core: 0.75,
            shell: 0.85,
          };
          const rotationFactorByGroup = {
            front: 0.24,
            rear: 0.24,
            top: 0.16,
            base: 0.06,
            side: 0.12,
            core: 0.08,
            shell: 0.1,
          };
          const distanceFactor =
            (distanceFactorByGroup[groupName] ?? 0.85) * (0.92 + normalizedHeight * 0.25);
          const rotationFactor = rotationFactorByGroup[groupName] ?? 0.1;

          groupCounts.set(groupName, (groupCounts.get(groupName) ?? 0) + 1);

          parts.push({
            mesh: child,
            parent: child.parent,
            originalLocalPosition,
            originalLocalRotation,
            originalWorldPosition: worldPosition.clone(),
            direction,
            distanceFactor,
            rotationFactor,
            groupName,
          });
        });

        console.table(
          Array.from(groupCounts.entries()).map(([group, count]) => ({
            group,
            meshes: count,
          }))
        );

        controls.update();
      },
      undefined,
      (error) => {
        console.error('GLTF load error:', error);
      }
    );

    function animate() {
      rafId = requestAnimationFrame(animate);

      currentProgress += (targetProgress - currentProgress) * 0.08;

      for (const part of parts) {
        const {
          mesh,
          parent,
          originalLocalPosition,
          originalLocalRotation,
          originalWorldPosition,
          direction,
          distanceFactor,
          rotationFactor,
        } = part;

        tmpWorld
          .copy(originalWorldPosition)
          .addScaledVector(direction, explodeDistance * distanceFactor * currentProgress);

        tmpLocal.copy(tmpWorld);
        parent.worldToLocal(tmpLocal);

        mesh.position.lerp(tmpLocal, 0.14);

        const targetRotX = originalLocalRotation.x + direction.z * rotationFactor * currentProgress;
        const targetRotY = originalLocalRotation.y + direction.x * rotationFactor * currentProgress;
        const targetRotZ = originalLocalRotation.z + direction.y * rotationFactor * 0.55 * currentProgress;

        mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetRotX, 0.12);
        mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetRotY, 0.12);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, targetRotZ, 0.12);

        if (currentProgress < 0.001) {
          mesh.position.lerp(originalLocalPosition, 0.2);
        }
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
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      hint.remove();
      controls.dispose();
      renderer.dispose();

      if (modelRoot) {
        modelRoot.traverse((child) => {
          if (!child.isMesh) return;
          child.geometry?.dispose();

          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material?.dispose?.());
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
      style={{ width: '100vw', height: '100vh', display: 'block' }}
    />
  );
}
