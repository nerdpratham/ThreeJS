import { useEffect, useRef } from 'react';
import { initScene } from './three/Scene';

function App() {
  const containerRef = useRef(null);

  useEffect(() => {
    initScene(containerRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    />
  );
}

export default App;

