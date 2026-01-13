import * as THREE from 'three';

export function createSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0x4f46e5 });
  const sphere = new THREE.Mesh(geometry, material);

  sphere.position.x = -2;
  return sphere;
}
