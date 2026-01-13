import * as THREE from 'three';

export function createCylinder() {
  const geometry = new THREE.CylinderGeometry(0.6, 0.6, 1.5, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0xf97316 });
  const cylinder = new THREE.Mesh(geometry, material);

  cylinder.position.x = 2;
  return cylinder;
}
