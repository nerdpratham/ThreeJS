import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/* ─── tunables ─────────────────────────────────────────────────────── */
const IMG_SRC        = '/Hut.png'
const BRIGHTNESS_THR = 30       // 0-255: pixels darker than this are skipped
const SAMPLE_STEP    = 2         // sample every N pixels (1 = every pixel)
const PARTICLE_SIZE  = 0.012
const SCATTER_RANGE  = 6         // initial explosion radius
const EASING         = 0.06      // lerp speed toward target
const SCROLL_SPEED   = 0.0012
const JITTER_AMOUNT  = 0.003     // per-frame random nudge on settled particles
const DEPTH_SPREAD   = 1.2       // how deep (Z) particles are spread initially
/* ──────────────────────────────────────────────────────────────────── */

export default function Hut() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    /* ── Scene ── */
    const scene    = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0f)

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 0, 4)

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    /* ── Scroll state ── */
    let targetProgress       = 0
    let progress             = 0
    let targetCameraProgress = 0
    let cameraProgress       = 0

    const onWheel = (e) => {
      if (targetProgress < 0.998) {
        // Stage 1: fill particle progress first
        targetProgress += e.deltaY * SCROLL_SPEED
        targetProgress  = THREE.MathUtils.clamp(targetProgress, 0, 0.998)
      } else {
        // Stage 2: particles done — scroll now drives the camera
        targetCameraProgress += e.deltaY * SCROLL_SPEED
        targetCameraProgress  = THREE.MathUtils.clamp(targetCameraProgress, 0, 1)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true })

    /* ── Load image → sample pixels → build geometry ── */
    let points, animFrameId
    let scattered, target, jitterSeeds

    const img = new Image()
    img.src = IMG_SRC

    img.onload = () => {
      /* hidden canvas to read pixels */
      const canvas  = document.createElement('canvas')
      const W = canvas.width  = img.width
      const H = canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, W, H)   // RGBA flat array

      /* collect bright-enough pixels */
      const positions = []   // final 3-D positions
      const colors    = []   // per-particle colour from image

      /* compute visible world-space dimensions at z=0 from the camera */
      const fovRad    = 60 * (Math.PI / 180)
      const camZ      = 4                                      // camera.position.z
      const visHalfH  = Math.tan(fovRad / 2) * camZ           // ≈ 2.31
      const visHalfW  = visHalfH * (mount.clientWidth / mount.clientHeight)

      for (let py = 0; py < H; py += SAMPLE_STEP) {
        for (let px = 0; px < W; px += SAMPLE_STEP) {
          const idx = (py * W + px) * 4
          const r = data[idx], g = data[idx + 1], b = data[idx + 2]
          const brightness = (r + g + b) / 3

          if (brightness < BRIGHTNESS_THR) continue   // skip dark / empty pixels

          /* map pixel → full visible frustum extent at z=0 */
          const x =  ((px / W) - 0.5) * 2 * visHalfW
          const y = -((py / H) - 0.5) * 2 * visHalfH  // flip Y (canvas Y is down)

          positions.push(x, y, 0)
          colors.push(r / 255, g / 255, b / 255)
        }
      }

      const count = positions.length / 3

      /* target buffer (image-space positions) */
      target    = new Float32Array(positions)

      /* scattered buffer (random start positions) */
      scattered = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        scattered[i3]     = (Math.random() - 0.5) * SCATTER_RANGE * 2
        scattered[i3 + 1] = (Math.random() - 0.5) * SCATTER_RANGE * 2
        scattered[i3 + 2] = (Math.random() - 0.5) * DEPTH_SPREAD
      }

      /* jitter seeds – unique random phase per particle */
      jitterSeeds = new Float32Array(count * 3)
      for (let i = 0; i < jitterSeeds.length; i++) {
        jitterSeeds[i] = Math.random() * Math.PI * 2
      }

      /* BufferGeometry – starts at scattered positions */
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(scattered.slice(), 3))
      geo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(colors), 3))

      const mat = new THREE.PointsMaterial({
        size:            PARTICLE_SIZE,
        vertexColors:    true,
        sizeAttenuation: true,
        transparent:     true,
        opacity:         0.9,
        depthWrite:      false,
      })

      points = new THREE.Points(geo, mat)
      scene.add(points)

      /* ── Animation loop ── */
      let frame = 0
      function animate() {
        animFrameId = requestAnimationFrame(animate)
        frame++

        /* smooth scroll progress */
        progress += (targetProgress - progress) * EASING

        const pos = geo.attributes.position.array

        for (let i = 0; i < count; i++) {
          const i3 = i * 3

          /* lerp scattered → target driven by progress */
          pos[i3]     = THREE.MathUtils.lerp(scattered[i3],     target[i3],     progress)
          pos[i3 + 1] = THREE.MathUtils.lerp(scattered[i3 + 1], target[i3 + 1], progress)
          pos[i3 + 2] = THREE.MathUtils.lerp(scattered[i3 + 2], target[i3 + 2], progress)

          /* subtle jitter on settled particles */
          const settle = progress  // more settled = more jitter visible
          pos[i3]     += Math.sin(frame * 0.03 + jitterSeeds[i3])     * JITTER_AMOUNT * settle
          pos[i3 + 1] += Math.cos(frame * 0.03 + jitterSeeds[i3 + 1]) * JITTER_AMOUNT * settle
          pos[i3 + 2] += Math.sin(frame * 0.02 + jitterSeeds[i3 + 2]) * JITTER_AMOUNT * settle * 0.5
        }

        geo.attributes.position.needsUpdate = true

        /* opacity fade-in as particles dissolve into place */
        mat.opacity = 0.5 + progress * 0.5

        /* ── Camera pan ─────────────────────────────────────────────────
           Starts only after particles have fully converged (Stage 2).
           cameraProgress 0 = hovering in front | 1 = past the back    */
        cameraProgress += (targetCameraProgress - cameraProgress) * EASING

        // smooth ease-in-out
        const ease = cameraProgress * cameraProgress * (3 - 2 * cameraProgress)

        const camZ = THREE.MathUtils.lerp( 4,   -6,   ease)
        const camY = THREE.MathUtils.lerp( 0,   -1.5, ease)

        camera.position.set(0, camY, camZ)
        camera.lookAt(0, camY - 0.25 * ease, camZ - 3)
        /* ─────────────────────────────────────────────────────────────── */

        renderer.render(scene, camera)
      }

      animate()
    }

    img.onerror = () => console.error('Could not load', IMG_SRC)

    /* ── Resize ── */
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('wheel',  onWheel)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    />
  )
}
