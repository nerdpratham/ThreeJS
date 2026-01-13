import * as THREE from 'three';

export function createTorus() {
  const geometry = new THREE.TorusGeometry(0.8, 0.3, 16, 100);
  const material = new THREE.MeshStandardMaterial({ color: 0x22c55e });
  const torus = new THREE.Mesh(geometry, material);

  torus.position.x = 0;
  return torus;
}
