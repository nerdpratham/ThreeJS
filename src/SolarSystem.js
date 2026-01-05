import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/* ---------------- Scene ---------------- */
const scene = new THREE.Scene()

/* ---------------- Camera ---------------- */
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 20, 60)

/* ---------------- Renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.physicallyCorrectLights = true
document.getElementById('app').appendChild(renderer.domElement)

/* ---------------- Controls ---------------- */
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 10
controls.maxDistance = 200

/* ---------------- Texture Loader ---------------- */
const loader = new THREE.TextureLoader()

/* ---------------- Sun ---------------- */
const sunGeometry = new THREE.SphereGeometry(5, 64, 64)
const sunMaterial = new THREE.MeshBasicMaterial({
  map: loader.load('/public/sun.jpg')
})
const sun = new THREE.Mesh(sunGeometry, sunMaterial)
scene.add(sun)

/* ---------------- Sun Light ---------------- */
const sunLight = new THREE.PointLight(0xffffff, 2.5, 300)
sunLight.position.set(0, 0, 0)
scene.add(sunLight)

/* ---------------- Planet Factory ---------------- */
const planets = []

function createPlanet({
  size,
  texture,
  distance,
  orbitSpeed,
  rotationSpeed
}) {
  const orbit = new THREE.Object3D()
  scene.add(orbit)

  const geometry = new THREE.SphereGeometry(size, 48, 48)
  const material = new THREE.MeshStandardMaterial({
    map: loader.load(texture)
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.x = distance

  orbit.add(mesh)

  planets.push({
    orbit,
    mesh,
    orbitSpeed,
    rotationSpeed
  })
}

/* ---------------- Planets ---------------- */
createPlanet({
  size: 1,
  texture: '/public/mercury.jpg',
  distance: 10,
  orbitSpeed: 0.02,
  rotationSpeed: 0.01
})

createPlanet({
  size: 1.8,
  texture: '/textures/venus.jpg',
  distance: 15,
  orbitSpeed: 0.015,
  rotationSpeed: 0.008
})

createPlanet({
  size: 2,
  texture: '/textures/earth.jpg',
  distance: 20,
  orbitSpeed: 0.01,
  rotationSpeed: 0.02
})

/* ---------------- Moon (Earth child) ---------------- */
const moonOrbit = new THREE.Object3D()
const moonGeo = new THREE.SphereGeometry(0.5, 32, 32)
const moonMat = new THREE.MeshStandardMaterial({
  map: loader.load('/textures/moon.jpg')
})
const moon = new THREE.Mesh(moonGeo, moonMat)
moon.position.x = 3
moonOrbit.add(moon)
planets[2].mesh.add(moonOrbit)

/* ---------------- Scroll Zoom ---------------- */
window.addEventListener('wheel', (e) => {
  const zoomFactor = e.deltaY > 0 ? 1.05 : 0.95
  camera.position.multiplyScalar(zoomFactor)
})

/* ---------------- Resize ---------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

/* ---------------- Animation Loop ---------------- */
function animate() {
  requestAnimationFrame(animate)

  sun.rotation.y += 0.002

  planets.forEach(p => {
    p.orbit.rotation.y += p.orbitSpeed
    p.mesh.rotation.y += p.rotationSpeed
  })

  moonOrbit.rotation.y += 0.03

  controls.update()
  renderer.render(scene, camera)
}

animate()
