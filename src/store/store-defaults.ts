/**
 * Default Store Values
 *
 * Separated from main store for better organization and reusability.
 */

import type { Library3D, AIProvider, AppSettings } from './app-store'

// Default 3D libraries
export const defaultLibraries: Library3D[] = [
  {
    id: 'babylonjs',
    name: 'Babylon.js',
    version: '8.22.3',
    description: 'Professional WebGL engine for 3D graphics',
    cdnUrls: [
      'https://cdn.babylonjs.com/babylon.js',
      'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js'
    ],
    systemPrompt: `You are an expert Babylon.js v8.22.3 developer. Generate complete, working 3D scenes using modern Babylon.js APIs.

Key guidelines:
- Use BABYLON namespace for all classes
- Create scenes with proper camera, lighting, and materials
- Include proper disposal and cleanup
- Use modern ES6+ syntax
- Focus on performance and best practices
- Include helpful comments explaining key concepts`,
    codeTemplate: `// Babylon.js v8.22.3 Scene Template
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);

const createScene = () => {
    const scene = new BABYLON.Scene(engine);

    // Camera
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), scene);
    camera.attachToCanvas(canvas, true);

    // Light
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Your code here

    return scene;
};

const scene = createScene();
engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener('resize', () => {
    engine.resize();
});`
  },
  {
    id: 'threejs',
    name: 'Three.js',
    version: 'r171',
    description: 'Lightweight 3D library with WebGL renderer',
    cdnUrls: [
      'https://unpkg.com/three@0.171.0/build/three.min.js'
    ],
    systemPrompt: `You are an expert Three.js r171 developer. Generate complete, working 3D scenes using modern Three.js APIs.

Key guidelines:
- Use THREE namespace for all classes
- Create scenes with proper camera, lighting, and materials
- Include proper cleanup and disposal
- Use modern ES6+ syntax and modules when possible
- Focus on performance optimization
- Include helpful comments explaining key concepts`,
    codeTemplate: `// Three.js r171 Scene Template
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Your code here

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);

    // Animation code here

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
    id: 'react-three-fiber',
    name: 'React Three Fiber',
    version: '8.17.10',
    description: 'React renderer for Three.js with live Sandpack preview and CodeSandbox deployment',
    cdnUrls: [
      'https://unpkg.com/three@0.171.0/build/three.min.js',
      'https://unpkg.com/@react-three/fiber@8.17.10/dist/index.esm.js'
    ],
    systemPrompt: `You are an expert React Three Fiber developer. Generate complete, working 3D scenes using React Three Fiber and modern React patterns.

Key guidelines:
- Use React Three Fiber components and hooks (useFrame, useThree, useRef)
- Implement proper React patterns (hooks, refs, state, context)
- Include interactive elements (onClick, onPointerOver, animations)
- Use @react-three/drei helpers (OrbitControls, Environment, Html, useGLTF, etc.)
- Focus on component composition and reusability
- Include performance optimizations (useMemo, useCallback, instancing)
- Add proper lighting (ambientLight, directionalLight, spotLight)
- Implement smooth animations and transitions
- Use proper TypeScript when applicable
- Include helpful comments explaining React Three Fiber concepts
- Consider XR/VR compatibility when possible
- Use modern Three.js patterns and geometries
- Implement responsive design for different screen sizes`,
    codeTemplate: `import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Stats, Html } from '@react-three/drei'
import * as THREE from 'three'

function InteractiveCube({ position = [0, 0, 0] }) {
  const meshRef = useRef()
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  // Smooth rotation animation
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.2

      // Gentle floating motion
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.1
    }
  })

  // Memoized material for performance
  const material = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color: hovered ? '#ff6b6b' : active ? '#4ecdc4' : '#45b7d1',
      roughness: 0.4,
      metalness: 0.8
    }), [hovered, active])

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={active ? 1.3 : hovered ? 1.1 : 1}
        onClick={() => setActive(!active)}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        castShadow
        receiveShadow
        material={material}
      >
        <boxGeometry args={[1, 1, 1]} />
      </mesh>

      {/* Interactive label */}
      {hovered && (
        <Html position={[0, 1.5, 0]} center>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {active ? 'Active!' : 'Click me!'}
          </div>
        </Html>
      )}
    </group>
  )
}

function Scene() {
  return (
    <>
      {/* Multiple interactive cubes */}
      <InteractiveCube position={[-2, 0, 0]} />
      <InteractiveCube position={[0, 0, 0]} />
      <InteractiveCube position={[2, 0, 0]} />

      {/* Ground plane */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
    </>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [5, 3, 5], fov: 60 }}
        shadows
        dpr={[1, 2]}
      >
        {/* Background and atmosphere */}
        <color attach="background" args={['#f0f8ff']} />
        <fog attach="fog" args={['#f0f8ff', 5, 20]} />

        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-10, 0, -20]} color="#4ecdc4" intensity={0.5} />

        {/* Scene content */}
        <Scene />

        {/* Controls and environment */}
        <OrbitControls
          makeDefault
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={20}
        />
        <Environment preset="city" />

        {/* Performance monitoring */}
        <Stats />
      </Canvas>
    </div>
  )
}`
  },
  {
    id: 'aframe',
    name: 'A-Frame',
    version: '1.7.0',
    description: 'WebXR framework for VR/AR experiences',
    cdnUrls: [
      'https://aframe.io/releases/1.7.0/aframe.min.js'
    ],
    systemPrompt: `You are an expert A-Frame developer. Generate complete VR/AR scenes using A-Frame's declarative HTML-based framework.

Key guidelines:
- Use A-Frame's entity-component system with HTML elements
- Leverage primitives: <a-box>, <a-sphere>, <a-cylinder>, <a-plane>, <a-sky>
- Create interactive elements with component properties
- Use proper camera setup: <a-camera> or <a-entity camera>
- Add VR/AR controllers when relevant: <a-entity laser-controls>
- Include lighting: <a-light> with types (ambient, directional, point, spot)
- Optimize for performance (avoid excessive entities)
- Use animations: <a-animation> or animation component
- Include helpful comments explaining WebXR concepts
- Consider cross-platform VR/AR compatibility
- Use A-Frame community components when beneficial`,
    codeTemplate: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>A-Frame VR Scene</title>
    <meta name="description" content="WebXR VR Scene">
    <script src="https://aframe.io/releases/1.7.0/aframe.min.js"></script>
  </head>
  <body>
    <a-scene>
      <!-- Camera -->
      <a-entity camera position="0 1.6 0" look-controls wasd-controls></a-entity>

      <!-- Lighting -->
      <a-light type="ambient" intensity="0.5"></a-light>
      <a-light type="directional" position="1 1 1" intensity="0.8"></a-light>

      <!-- Environment -->
      <a-sky color="#87CEEB"></a-sky>
      <a-plane position="0 0 0" rotation="-90 0 0" width="20" height="20" color="#7BC8A4"></a-plane>

      <!-- Interactive Objects -->
      <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9" shadow></a-box>
      <a-sphere position="0 1.25 -5" radius="1.25" color="#EF2D5E" shadow></a-sphere>
      <a-cylinder position="1 0.75 -3" radius="0.5" height="1.5" color="#FFC65D" shadow></a-cylinder>

      <!-- Text -->
      <a-text value="Welcome to A-Frame VR!" position="-2 2 -4" color="#000000"></a-text>
    </a-scene>
  </body>
</html>`
  },
  {
    id: 'reactylon',
    name: 'Reactylon',
    version: '3.2.1',
    description: 'React renderer for Babylon.js (Sandpack preview)',
    cdnUrls: [], // Handled by Sandpack
    systemPrompt: `You are an expert Reactylon developer. Generate React components using Babylon.js through Reactylon's declarative API.

Key guidelines:
- Import Engine from 'reactylon/web' (NOT 'reactylon')
- Import all other components from 'reactylon'
- Use onSceneReady callback for camera setup: <Scene onSceneReady={(scene) => createDefaultCameraOrLight(scene, true, true, true)}>
- Import createDefaultCameraOrLight from '@babylonjs/core'
- Use Babylon.js classes: Color3, Vector3, etc. (NOT plain arrays)
- Use lowercase component names: <box>, <sphere>, <hemisphericLight>
- Material components: <standardMaterial>, <pBRMaterial> (capital BR!)
- NEVER use <ArcRotateCamera /> or other declarative cameras
- Include proper error boundaries
- Use React hooks: useRef, useState, useMemo
- Implement animations with useEffect or Babylon.js animations
- Add interactive elements with onClick handlers
- Include helpful comments explaining Reactylon patterns`,
    codeTemplate: `import React, { useRef, useState } from 'react'
import { Engine } from 'reactylon/web'
import { Scene, box, sphere, hemisphericLight, standardMaterial } from 'reactylon'
import { Color3, Vector3, createDefaultCameraOrLight } from '@babylonjs/core'

function App() {
  const [active, setActive] = useState(false)

  return (
    <Engine antialias adaptToDeviceRatio canvasId="canvas">
      <Scene
        clearColor="#2c2c54"
        onSceneReady={(scene) => createDefaultCameraOrLight(scene, true, true, true)}
      >
        <hemisphericLight
          name="light1"
          direction={new Vector3(0, 1, 0)}
          intensity={0.7}
        />

        <box
          name="box1"
          position={new Vector3(-2, 1, 0)}
          size={2}
          onClick={() => setActive(!active)}
        >
          <standardMaterial
            name="mat1"
            diffuseColor={active ? Color3.Green() : Color3.Red()}
          />
        </box>

        <sphere name="sphere1" position={new Vector3(0, 1, 0)} diameter={2}>
          <standardMaterial name="mat2" diffuseColor={Color3.Blue()} />
        </sphere>

        <box name="ground" position={new Vector3(0, 0, 0)} size={10} depth={10} height={0.1}>
          <standardMaterial name="groundMat" diffuseColor={Color3.Gray()} />
        </box>
      </Scene>
    </Engine>
  )
}

export default App`
  }
]

// Default AI providers
export const defaultProviders: AIProvider[] = [
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    models: [
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        name: 'Llama 3.3 70B (FREE)',
        description: 'Latest Meta large model, free tier',
        pricing: 'Free'
      },
      {
        id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
        name: 'DeepSeek R1 70B (FREE)',
        description: 'Advanced reasoning distill, free tier',
        pricing: 'Free'
      },
      {
        id: 'deepseek-ai/DeepSeek-V3',
        name: 'DeepSeek V3',
        description: 'Latest DeepSeek MoE flagship model',
        pricing: '$1.25/1M tokens'
      },
      {
        id: 'deepseek-ai/DeepSeek-R1',
        name: 'DeepSeek R1',
        description: 'Full reasoning model, chain-of-thought',
        pricing: '$3.00/1M tokens'
      },
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        name: 'Llama 3.3 70B',
        description: 'Latest Meta large model',
        pricing: '$0.88/1M tokens'
      },
      {
        id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        name: 'Qwen 2.5 Coder 32B',
        description: 'Advanced coding & XR specialist',
        pricing: '$0.80/1M tokens'
      },
      {
        id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
        name: 'Qwen 2.5 72B Turbo',
        description: 'Large Qwen model, strong at code',
        pricing: '$1.20/1M tokens'
      }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-5.2',
        name: 'GPT-5.2',
        description: 'Best for coding and agentic tasks, 400K context',
        pricing: '$1.75/1M in · $14.00/1M out'
      },
      {
        id: 'gpt-5.2-pro',
        name: 'GPT-5.2 Pro',
        description: 'Smartest and most trustworthy, highest accuracy',
        pricing: 'Premium tier'
      },
      {
        id: 'gpt-5.2-chat-latest',
        name: 'GPT-5.2 Chat (Latest)',
        description: 'Latest ChatGPT model, auto-updates, 128K context',
        pricing: '$1.75/1M in · $14.00/1M out'
      },
      {
        id: 'o3-mini-2025-01-31',
        name: 'o3 Mini',
        description: 'Fast reasoning model, 200K context',
        pricing: '$1.10/1M in · $4.40/1M out'
      },
      {
        id: 'o1-2024-12-17',
        name: 'o1',
        description: 'Advanced reasoning for complex problems, 200K context',
        pricing: '$15.00/1M in · $60.00/1M out'
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Versatile multimodal model, 128K context',
        pricing: '$2.50/1M in · $10.00/1M out'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable, 128K context',
        pricing: '$0.15/1M in · $0.60/1M out'
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: [
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        description: 'Most capable Claude model',
        pricing: '$15.00/1M tokens'
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        description: 'Best balance of speed and intelligence',
        pricing: '$3.00/1M tokens'
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        description: 'Fastest and most affordable Claude',
        pricing: '$0.80/1M tokens'
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Reliable workhorse for complex tasks',
        pricing: '$3.00/1M tokens'
      }
    ]
  },
  {
    id: 'google',
    name: 'Google AI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        description: 'Latest and most powerful Gemini — reasoning, coding, multimodal, 1M context',
        pricing: 'Free tier available'
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'High-capability reasoning & coding, 1M context',
        pricing: '$1.25/1M in · $10.00/1M out'
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Best price/performance, 1M context, free tier',
        pricing: '$0.30/1M in · $2.50/1M out'
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Fastest and lightest Gemini, 1M context',
        pricing: '$0.10/1M in · $0.40/1M out'
      }
    ]
  },
  {
    id: 'xai',
    name: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    models: [
      {
        id: 'grok-4-0709',
        name: 'Grok 4',
        description: 'xAI flagship — advanced reasoning, coding, 256K context',
        pricing: '$3.00/1M in · $15.00/1M out'
      },
      {
        id: 'grok-4-fast-reasoning',
        name: 'Grok 4 Fast Reasoning',
        description: 'Fast reasoning, massive 2M context window',
        pricing: '$0.20/1M in · $0.50/1M out'
      },
      {
        id: 'grok-3',
        name: 'Grok 3',
        description: 'General-purpose, strong at coding, 131K context',
        pricing: '$3.00/1M in · $15.00/1M out'
      },
      {
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        description: 'Lightweight reasoning, fast and cost-effective, 131K context',
        pricing: '$0.30/1M in · $0.50/1M out'
      },
      {
        id: 'grok-code-fast-1',
        name: 'Grok Code Fast',
        description: 'Coding specialist with reasoning, optimized for code generation, 256K context',
        pricing: '$0.20/1M in · $1.50/1M out'
      }
    ]
  },
  {
    id: 'codesandbox',
    name: 'CodeSandbox',
    baseUrl: 'https://codesandbox.io/api/v1',
    models: [
      {
        id: 'sandbox-deployment',
        name: 'Sandbox Deployment',
        description: 'Deploy React Three Fiber scenes to CodeSandbox',
        pricing: 'Free (with optional API key for advanced features)'
      }
    ]
  }
]

// Default settings
export const defaultSettings: AppSettings = {
  apiKeys: {
    together: '',
    openai: '',
    anthropic: '',
    google: '',
    xai: '',
    codesandbox: ''
  },
  selectedProvider: 'together',
  selectedModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', // free default
  selectedLibrary: 'react-three-fiber',
  temperature: 0.7,
  topP: 0.9,
  systemPrompt: '',
  theme: 'system'
}
