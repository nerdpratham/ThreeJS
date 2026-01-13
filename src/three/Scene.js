import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function initScene(container) {
  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1e1e);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 6);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // FBX Loader
  const loader = new FBXLoader();
  let mixer;
  const clock = new THREE.Clock();

  loader.load(
    '/Horse.fbx',
    (object) => {
      // Scale FBX (important: FBX units are often large)
      object.scale.set(0.01, 0.01, 0.01);

      scene.add(object);

      // Handle animations if present
      if (object.animations.length > 0) {
        mixer = new THREE.AnimationMixer(object);
        const action = mixer.clipAction(object.animations[0]);
        action.play();
      }
    },
    (xhr) => {
      console.log(`FBX ${((xhr.loaded / xhr.total) * 100).toFixed(0)}% loaded`);
    },
    (error) => {
      console.error('Error loading FBX:', error);
    }
  );

  // Resize Handling
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    if (mixer) mixer.update(clock.getDelta());

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}
