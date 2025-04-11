import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import ImageUploader from './components/ImageUploader'

function App() {
  return (
    <div className="w-full min-h-screen">
      <div className="fixed top-0 left-0 w-full h-full">
        <Canvas>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <OrbitControls enableZoom={false} />
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        </Canvas>
      </div>
      <div className="relative z-10 w-full mx-auto pt-8 px-4 md:w-1/2">
        <ImageUploader />
      </div>
    </div>
  )
}

export default App 