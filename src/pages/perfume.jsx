import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useFBX, OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';

import * as THREE from 'three';

function PerfumeModel() {
  const fbx = useFBX('/perfume.fbx');

  React.useEffect(() => {
    // Traverse the model and apply high-quality Three.js materials
    fbx.traverse((child) => {
      if (child.isMesh) {
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;

        // Apply a premium glass/liquid material to the meshes
        // You can customize this based on child.name if your Blender meshes have specific names (like "Bottle", "Cap")
        const isLikelyCap = child.name.toLowerCase().includes('cap') || child.name.toLowerCase().includes('metal');

        if (isLikelyCap) {
          // Gold / Metal material
          child.material = new THREE.MeshStandardMaterial({
            color: '#d4af37', // Gold color
            metalness: 1,
            roughness: 0.1,
          });
        } else {
          // Glass material
          child.material = new THREE.MeshPhysicalMaterial({
            color: '#ffffff', // Tint of the glass/perfume
            metalness: 0.1,
            roughness: 0.05,
            transmission: 1, // makes it act like glass
            ior: 1.5, // Index of refraction for glass
            thickness: 0.5, // Volume thickness
            envMapIntensity: 1.5,
            clearcoat: 1,
            clearcoatRoughness: 0.1
          });
        }
      }
    });
  }, [fbx]);

  return <primitive object={fbx} scale={0.01} />;
}

export default function PerfumePage() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#1a1a1a' }}>
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        <color attach="background" args={['#1a1a1a']} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

        <Suspense fallback={null}>
          <Center>
            <PerfumeModel />
          </Center>
          <Environment preset="city" />
        </Suspense>

        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.5}
          scale={10}
          blur={2}
          far={4}
        />

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} autoRotate autoRotateSpeed={1} />
      </Canvas>
    </div>
  );
}
