'use client'

import { useState } from 'react'
import { X, Copy, Play, Code2 } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { copyToClipboard } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Example {
  id: string
  title: string
  description: string
  library: string
  code: string
  category: 'basic' | 'intermediate' | 'advanced'
}

const EXAMPLES: Example[] = [
  {
    id: 'babylon-rotating-cube',
    title: 'Rotating Cube',
    description: 'A simple rotating cube with lighting',
    library: 'babylonjs',
    category: 'basic',
    code: `const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = () => {
  const scene = new BABYLON.Scene(engine);

  // Camera
  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 5, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  // Light
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  // Cube
  const box = BABYLON.MeshBuilder.CreateBox("box", { size: 2 }, scene);
  const material = new BABYLON.StandardMaterial("boxMat", scene);
  material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 1.0);
  box.material = material;

  // Animation
  scene.registerBeforeRender(() => {
    box.rotation.y += 0.01;
    box.rotation.x += 0.005;
  });

  return scene;
};

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());`
  },
  {
    id: 'threejs-scene',
    title: 'Three.js Scene',
    description: 'Interactive 3D scene with orbit controls',
    library: 'threejs',
    category: 'basic',
    code: `const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("scene-container").appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create geometry
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: 0x6699ff });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});`
  },
  {
    id: 'r3f-interactive',
    title: 'Interactive R3F Scene',
    description: 'React Three Fiber with interactive meshes',
    library: 'react-three-fiber',
    category: 'intermediate',
    code: `import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Box, Sphere } from '@react-three/drei'

function RotatingBox({ position }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <Box
      ref={meshRef}
      position={position}
      scale={active ? 1.5 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </Box>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <RotatingBox position={[-2, 0, 0]} />
        <Sphere position={[2, 0, 0]} args={[1, 32, 32]}>
          <meshStandardMaterial color="lightblue" />
        </Sphere>
        <OrbitControls />
      </Canvas>
    </div>
  )
}`
  },
  {
    id: 'reactylon-scene',
    title: 'Reactylon Scene',
    description: 'React + Babylon.js with Reactylon',
    library: 'reactylon',
    category: 'intermediate',
    code: `import { Engine } from 'reactylon/web'
import { Scene, box, sphere, arcRotateCamera, hemisphericLight, standardMaterial } from 'reactylon'
import { Color3, Vector3 } from '@babylonjs/core'

function App() {
  return (
    <Engine antialias adaptToDeviceRatio canvasId="canvas">
      <Scene>
        <arcRotateCamera
          name="camera"
          alpha={Math.PI / 2}
          beta={Math.PI / 2.5}
          radius={8}
          target={Vector3.Zero()}
        />
        <hemisphericLight
          name="light"
          direction={new Vector3(0, 1, 0)}
          intensity={0.7}
        />

        <box name="box1" position={new Vector3(-2, 1, 0)} size={2}>
          <standardMaterial name="boxMat" diffuseColor={Color3.Red()} />
        </box>

        <sphere name="sphere1" position={new Vector3(2, 1, 0)} diameter={2}>
          <standardMaterial name="sphereMat" diffuseColor={Color3.Blue()} />
        </sphere>
      </Scene>
    </Engine>
  )
}

export default App`
  },
  {
    id: 'aframe-vr',
    title: 'A-Frame VR Scene',
    description: 'WebXR VR scene with A-Frame',
    library: 'aframe',
    category: 'basic',
    code: `<a-scene>
  <!-- Camera with VR controls -->
  <a-entity
    camera
    position="0 1.6 0"
    look-controls
    wasd-controls
  ></a-entity>

  <!-- Lighting -->
  <a-light type="ambient" intensity="0.5"></a-light>
  <a-light type="directional" position="1 2 1" intensity="0.8" castShadow="true"></a-light>

  <!-- Objects -->
  <a-box
    position="-1 0.5 -3"
    rotation="0 45 0"
    color="#4CC3D9"
    shadow
  ></a-box>

  <a-sphere
    position="0 1.25 -5"
    radius="1.25"
    color="#EF2D5E"
    shadow
  ></a-sphere>

  <a-cylinder
    position="1 0.75 -3"
    radius="0.5"
    height="1.5"
    color="#FFC65D"
    shadow
  ></a-cylinder>

  <!-- Ground -->
  <a-plane
    position="0 0 -4"
    rotation="-90 0 0"
    width="10"
    height="10"
    color="#7BC8A4"
    shadow
  ></a-plane>

  <!-- Sky -->
  <a-sky color="#ECECEC"></a-sky>
</a-scene>`
  }
]

interface ExamplesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExamplesModal({ isOpen, onClose }: ExamplesModalProps) {
  const { getCurrentLibrary, setCurrentCode, setCurrentView, updateSettings } = useAppStore()
  const [selectedExample, setSelectedExample] = useState<Example | null>(null)
  const [filter, setFilter] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all')

  const currentLibrary = getCurrentLibrary()

  if (!isOpen) return null

  const filteredExamples = EXAMPLES.filter(ex =>
    (filter === 'all' || ex.category === filter) &&
    (!currentLibrary || ex.library === currentLibrary.id)
  )

  const handleUseExample = (example: Example) => {
    // Switch to the example's library if different
    if (currentLibrary?.id !== example.library) {
      updateSettings({ selectedLibrary: example.library })
      toast.success(`Switched to ${example.library}`)
    }

    setCurrentCode(example.code)
    setCurrentView('playground')
    toast.success('Example loaded in playground!')
    onClose()
  }

  const handleCopyExample = async (code: string) => {
    const success = await copyToClipboard(code)
    if (success) {
      toast.success('Example copied to clipboard!')
    } else {
      toast.error('Failed to copy example')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Code Examples
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {currentLibrary ? `Examples for ${currentLibrary.name}` : 'Browse examples across all libraries'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            {(['all', 'basic', 'intermediate', 'advanced'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Examples List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {filteredExamples.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Code2 size={48} className="mx-auto mb-4 opacity-50" />
                <p>No examples found</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredExamples.map((example) => (
                  <button
                    key={example.id}
                    onClick={() => setSelectedExample(example)}
                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                      selectedExample?.id === example.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                      {example.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {example.description}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                        {example.library}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        example.category === 'basic' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                        example.category === 'intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      }`}>
                        {example.category}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Example Preview */}
          <div className="flex-1 flex flex-col">
            {selectedExample ? (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    {selectedExample.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedExample.description}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{selectedExample.code}</code>
                  </pre>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                  <button
                    onClick={() => handleCopyExample(selectedExample.code)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Copy size={16} />
                    <span>Copy Code</span>
                  </button>
                  <button
                    onClick={() => handleUseExample(selectedExample)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Play size={16} />
                    <span>Use in Playground</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Code2 size={64} className="mx-auto mb-4 opacity-30" />
                  <p>Select an example to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
