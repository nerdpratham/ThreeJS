import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useFBX, OrbitControls, Environment } from '@react-three/drei'

function FBXModel() {
  const fbx = useFBX('/environment.fbx')
  return <primitive object={fbx} scale={0.01} />
}

export default function EnvironmentScene() {
  return (
    <Canvas
      camera={{ position: [0, 5, 15], fov: 60 }}
      style={{ width: '100vw', height: '100vh', background: '#1e1e1e' }}
      shadows
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <Suspense fallback={null}>
        <FBXModel />
        <Environment preset="city" />
      </Suspense>

      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  )
}
