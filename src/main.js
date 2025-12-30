import * as THREE from 'three'

// Scene
const scene = new THREE.Scene()

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.z = 4

// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

// Cube
const geometry = new THREE.BoxGeometry(1, 4, 1)
const material = new THREE.MeshStandardMaterial({
  color: 0x6366f1,
  roughness: 0.4,
  metalness: 0.5
})
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6))

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(3, 3, 3)
scene.add(dirLight)

// Mouse state (normalized)
const mouse = {
  x: 0,
  y: 0
}

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
})

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Animation
const clock = new THREE.Clock()

const animate = () => {
  const time = clock.getElapsedTime()

  // 🔁 CONSTANT cube animation (independent)
  cube.rotation.x = time * 0.5
  cube.rotation.y = time * 0.8

  // 🎥 Camera parallax (cursor controls perspective)
  camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.05
  camera.position.y += (mouse.y * 1.5 - camera.position.y) * 0.05
  camera.lookAt(scene.position)

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()
