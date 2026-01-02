import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1020)

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.z = 5

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.getElementById('app').appendChild(renderer.domElement)

// Sphere geometry
const sphereGeometry = new THREE.SphereGeometry(1.2, 80, 80)
const basePositions = sphereGeometry.attributes.position
const count = basePositions.count

// Buffers
const scattered = new Float32Array(count * 3)
const sphere = new Float32Array(count * 3)

// Fill buffers
for (let i = 0; i < count; i++) {
  const i3 = i * 3

  scattered[i3]     = (Math.random() - 0.5) * 10
  scattered[i3 + 1] = (Math.random() - 0.5) * 10
  scattered[i3 + 2] = (Math.random() - 0.5) * 10

  sphere[i3]     = basePositions.getX(i)
  sphere[i3 + 1] = basePositions.getY(i)
  sphere[i3 + 2] = basePositions.getZ(i)
}

// Points geometry
const geometry = new THREE.BufferGeometry()
geometry.setAttribute(
  'position',
  new THREE.BufferAttribute(scattered.slice(), 3)
)

const material = new THREE.PointsMaterial({
  color: 0x00ffcc,
  size: 0.02,
  sizeAttenuation: true
})

const points = new THREE.Points(geometry, material)
scene.add(points)

// Controls (optional rotation only)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enablePan = false
controls.enableZoom = false
controls.enableDamping = true

// Scroll control
let targetProgress = 0
let progress = 0

const SCROLL_SPEED = 0.001
const EASING = 0.08

window.addEventListener('wheel', (e) => {
  targetProgress += e.deltaY * SCROLL_SPEED
  targetProgress = THREE.MathUtils.clamp(targetProgress, 0, 1)
}, { passive: true })

// Animate
function animate() {
  requestAnimationFrame(animate)

  // Smooth bidirectional interpolation
  progress += (targetProgress - progress) * EASING

  const positions = geometry.attributes.position.array

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    positions[i3]     = THREE.MathUtils.lerp(scattered[i3],     sphere[i3],     progress)
    positions[i3 + 1] = THREE.MathUtils.lerp(scattered[i3 + 1], sphere[i3 + 1], progress)
    positions[i3 + 2] = THREE.MathUtils.lerp(scattered[i3 + 2], sphere[i3 + 2], progress)
  }

  geometry.attributes.position.needsUpdate = true

  // Optional ambient motion
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
