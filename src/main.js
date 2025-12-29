import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

import './style.css'
import Grid from './grid.js'

// =====================
// SCENE
// =====================
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)

// =====================
// CAMERA
// =====================
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.set(0, 0, 7)

// =====================
// RENDERER
// =====================
const canvas = document.querySelector('#webgl')
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 1.2

// =====================
// LIGHTS
// =====================
scene.add(new THREE.AmbientLight(0xffffff, 0.3))

const pointLight = new THREE.PointLight(0x00ffff, 2, 20)
pointLight.position.set(2, 2, 4)
scene.add(pointLight)

// =====================
// OBJECT  (CRITICAL)
// =====================
const torus = new Grid()
scene.add(torus.mesh)

// =====================
// MOUSE
// =====================
const mouse = { x: 0, y: 0 }

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
})

// =====================
// POST PROCESSING
// =====================
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.2
)
composer.addPass(bloomPass)

// =====================
// RESIZE
// =====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// =====================
// LOOP
// =====================
const clock = new THREE.Clock()

function animate() {
  const time = clock.getElapsedTime()
  torus.update(time, mouse)
  composer.render()
  requestAnimationFrame(animate)
}

animate()
