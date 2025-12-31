import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1020)

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.getElementById('app').appendChild(renderer.domElement)

// Target sphere geometry
const sphereGeometry = new THREE.SphereGeometry(1.2, 64, 64)
const positionAttribute = sphereGeometry.attributes.position
const count = positionAttribute.count

// Buffers
const startPositions = new Float32Array(count * 3)
const targetPositions = new Float32Array(count * 3)

// Fill buffers
for (let i = 0; i < count; i++) {
  const i3 = i * 3

  startPositions[i3] = (Math.random() - 0.5) * 10
  startPositions[i3 + 1] = (Math.random() - 0.5) * 10
  startPositions[i3 + 2] = (Math.random() - 0.5) * 10

  targetPositions[i3] = positionAttribute.getX(i)
  targetPositions[i3 + 1] = positionAttribute.getY(i)
  targetPositions[i3 + 2] = positionAttribute.getZ(i)
}

// Points geometry
const pointsGeometry = new THREE.BufferGeometry()
pointsGeometry.setAttribute('position', new THREE.BufferAttribute(startPositions, 3))

const pointsMaterial = new THREE.PointsMaterial({
  color: 0x00ffcc,
  size: 0.02,
  sizeAttenuation: true
})

const points = new THREE.Points(pointsGeometry, pointsMaterial)
scene.add(points)

// Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.enableZoom = false

// Virtual scroll
let scrollProgress = 0
const scrollSpeed = 0.0005

window.addEventListener(
  'wheel',
  (e) => {
    scrollProgress += e.deltaY * scrollSpeed
    scrollProgress = THREE.MathUtils.clamp(scrollProgress, 0, 1)
  },
  { passive: true }
)

// Animate
function animate() {
  requestAnimationFrame(animate)

  const positions = pointsGeometry.attributes.position.array

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    positions[i3] = THREE.MathUtils.lerp(startPositions[i3], targetPositions[i3], scrollProgress)
    positions[i3 + 1] = THREE.MathUtils.lerp(startPositions[i3 + 1], targetPositions[i3 + 1], scrollProgress)
    positions[i3 + 2] = THREE.MathUtils.lerp(startPositions[i3 + 2], targetPositions[i3 + 2], scrollProgress)
  }

  pointsGeometry.attributes.position.needsUpdate = true

  // Continuous animation
  points.rotation.y += 0.002
  points.rotation.x += 0.001

  controls.update()
  renderer.render(scene, camera)
}

animate()

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
