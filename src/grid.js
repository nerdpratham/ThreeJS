import * as THREE from 'three'

export default class Grid {
  constructor() {
    // =====================
    // GEOMETRY
    // =====================
    this.geometry = new THREE.TorusGeometry(2, 0.55, 32, 160)

    // =====================
    // MATERIAL
    // =====================
    this.material = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.5,
      roughness: 0.2,
      metalness: 0.6,
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)

    // =====================
    // VERTEX DATA
    // =====================
    this.positions = this.geometry.attributes.position
    this.basePositions = this.positions.array.slice()

    // =====================
    // INTERACTION STATE
    // =====================
    this.targetPosition = new THREE.Vector3()
    this.currentPosition = new THREE.Vector3()
  }

  update(time, mouse) {
    // =====================
    // VERTEX DEFORMATION
    // =====================
    for (let i = 0; i < this.positions.count; i++) {
      const i3 = i * 3

      const x = this.basePositions[i3]
      const y = this.basePositions[i3 + 1]
      const z = this.basePositions[i3 + 2]

      const wave =
        Math.sin(time * 2 + x * 4) *
        Math.cos(time * 1.5 + y * 4) *
        0.08

      this.positions.array[i3]     = x + x * wave
      this.positions.array[i3 + 1] = y + y * wave
      this.positions.array[i3 + 2] = z + z * wave
    }

    this.positions.needsUpdate = true

    // =====================
    // CURSOR MOVEMENT
    // =====================
    this.targetPosition.x = mouse.x * 2
    this.targetPosition.y = mouse.y * 1.5

    this.currentPosition.lerp(this.targetPosition, 0.08)
    this.mesh.position.copy(this.currentPosition)

    // =====================
    // ROTATION
    // =====================
    this.mesh.rotation.x = mouse.y * 0.5 + time * 0.2
    this.mesh.rotation.y = mouse.x * 0.6 + time * 0.3
  }
}
