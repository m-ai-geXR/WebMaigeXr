# WebMaigeXR Feature Parity Plan

**Goal**: Bring the Next.js web application to feature parity with iOS and Android implementations of XRAiAssistant.

**Current Status**: Web application has core AI and 3D library support but is missing several advanced features present in mobile platforms.

**Priority Levels**:
- 🔴 **Critical** - Essential features for basic functionality
- 🟡 **High** - Important features that significantly enhance UX
- 🟢 **Medium** - Nice-to-have features that improve experience
- 🔵 **Low** - Future enhancements and optimizations

---

## 📊 Feature Comparison Matrix

| Feature Category | iOS | Android | Web | Priority |
|-----------------|-----|---------|-----|----------|
| **AI Providers** | | | | |
| Together.ai | ✅ | ✅ | ✅ | ✅ |
| OpenAI | ✅ | ✅ | ✅ | ✅ |
| Anthropic Claude | ✅ | ✅ | ✅ | ✅ |
| Google AI (Gemini) | ✅ | ❌ | ❌ | 🟡 |
| LlamaStack | ✅ | ❌ | ❌ | 🔵 |
| | | | | |
| **3D Libraries** | | | | |
| Babylon.js | ✅ | ✅ | ✅ | ✅ |
| Three.js | ✅ | ✅ | ✅ | ✅ |
| React Three Fiber | ✅ | ✅ | ✅ | ✅ |
| A-Frame | ✅ | ✅ | ❌ | 🟡 |
| Reactylon | ✅ | ✅ | ❌ | 🟢 |
| | | | | |
| **Core Features** | | | | |
| Chat interface | ✅ | ✅ | ✅ | ✅ |
| Code playground | ✅ | ✅ | ✅ | ✅ |
| Settings panel | ✅ | ✅ | ✅ | ✅ |
| AI streaming | ✅ | ✅ | ✅ | ✅ |
| Code editor | ✅ | ✅ | ✅ | ✅ |
| Scene rendering | ✅ | ✅ | ✅ | ✅ |
| | | | | |
| **Advanced Features** | | | | |
| Conversation history | ✅ | ✅ | ❌ | 🔴 |
| Conversation management | ✅ | ✅ | ❌ | 🔴 |
| Build system | ✅ | ❌ | ❌ | 🟡 |
| Hot reload | ✅ | ❌ | ❌ | 🟢 |
| Node.js builds | ✅ | ❌ | ❌ | 🟢 |
| Wasm builds | ✅ | ❌ | ❌ | 🔵 |
| Secure sandbox | ✅ | ❌ | Partial | 🟡 |
| Enhanced chat view | ✅ | ❌ | ❌ | 🟡 |
| | | | | |
| **Data Persistence** | | | | |
| Settings persistence | ✅ | ✅ | ✅ | ✅ |
| Chat history | ✅ | ✅ | ❌ | 🔴 |
| Code snippets | ❌ | ❌ | ❌ | 🟢 |
| Conversation DB | ✅ | ✅ | ❌ | 🔴 |
| Encrypted API keys | ❌ | ✅ | ❌ | 🟡 |

---

## 🎯 Phase 1: Critical Features (Weeks 1-4)

### **1.1 Conversation History & Management** 🔴

**Current State**:
- ✅ Web: Messages stored in Zustand state with sqllite storage 
- ❌ No conversation management (create, save, load, delete)
- ❌ No conversation list view
- ❌ No conversation metadata (title, date, library)

**iOS Implementation**:
- ConversationHistoryView.swift - Full conversation management UI
- ConversationModels.swift - Data models for conversations
- CoreData/Room persistence

**Android Implementation**:
- ConversationRepository.kt - Repository pattern
- Room database with ConversationEntity and MessageEntity
- ConversationHistoryScreen.kt - Jetpack Compose UI

**Web Implementation Plan**:

```typescript
// 1. Create conversation models
interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  library: string
  messageCount: number
  preview?: string  // First user message
}

interface ConversationMessage extends ChatMessage {
  conversationId: string
}

// 2. Add to Zustand store
interface AppState {
  // ... existing state

  // Conversation state
  conversations: Conversation[]
  currentConversationId: string | null

  // Actions
  createConversation: (title?: string) => string
  loadConversation: (id: string) => void
  deleteConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  getConversationMessages: (id: string) => ChatMessage[]
}

// 3. Create UI components
// - ConversationList.tsx - List of saved conversations
// - ConversationListItem.tsx - Individual conversation preview
// - ConversationActions.tsx - Create, delete, rename buttons
```

**Files to Create**:
1. `src/lib/conversation-service.ts` - Conversation management logic
2. `src/components/conversation/conversation-list.tsx` - List view
3. `src/components/conversation/conversation-list-item.tsx` - List item
4. `src/components/conversation/conversation-actions.tsx` - Action buttons
5. `src/components/conversation/new-conversation-dialog.tsx` - Create dialog

**Database Options**:
- Option A: Continue with localStorage (simple, no dependencies)
- Option B: IndexedDB with Dexie.js (better performance, larger storage)
- Option C: Server-side persistence with Next.js API routes + DB

**Recommended**: Start with Option A (localStorage), migrate to Option B later for better performance.

**Acceptance Criteria**:
- [ ] Create new conversation with optional title
- [ ] Auto-generate title from first user message
- [ ] Load conversation restores all messages
- [ ] Delete conversation removes all data
- [ ] Rename conversation
- [ ] Show conversation metadata (date, message count, library)
- [ ] Search/filter conversations
- [ ] Persist across browser sessions

---

### **1.2 Google AI (Gemini) Provider** 🟡

**Current State**:
- ✅ Together.ai, OpenAI, Anthropic support
- ❌ Google AI / Gemini not integrated

**iOS Implementation**:
- GoogleAIProvider.swift - Full Gemini API client
- Supports streaming via SSE
- Models: Gemini 2.5 Flash, Pro, 3.0 Flash Thinking

**Web Implementation Plan**:

```typescript
// src/lib/ai-service.ts

interface GoogleAIOptions {
  prompt: string
  model: string
  apiKey: string
  temperature: number
  topP: number
  systemPrompt: string
  maxTokens: number
}

private async callGoogleAI(options: GoogleAIOptions): Promise<AIResponse> {
  const { prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens } = options

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          topP,
          maxOutputTokens: maxTokens
        },
        systemInstruction: systemPrompt ? {
          parts: [{ text: systemPrompt }]
        } : undefined
      })
    }
  )

  const data = await response.json()
  return {
    content: data.candidates[0].content.parts[0].text,
    model: data.model,
    usage: data.usageMetadata
  }
}

private async streamGoogleAI(
  options: GoogleAIOptions,
  onChunk: (chunk: StreamingResponse) => void
): Promise<void> {
  // SSE streaming implementation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* same as above */ })
    }
  )

  // Parse SSE response
  const reader = response.body?.getReader()
  // ... SSE parsing logic
}
```

**Files to Modify**:
1. `src/lib/ai-service.ts` - Add Google AI methods
2. `src/store/app-store.ts` - Add Gemini models to providers
3. `src/components/settings/settings-panel.tsx` - Add Google AI API key field

**Gemini Models to Add**:
```typescript
{
  id: 'google',
  name: 'Google AI',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  models: [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Fast, improved performance (FREE tier)',
      pricing: 'Free tier available'
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Advanced reasoning, 1M context (FREE tier)',
      pricing: 'Free tier available'
    },
    {
      id: 'gemini-3-pro-preview',
      name: 'Gemini 3.0 Pro Preview',
      description: 'Thinking mode, advanced reasoning',
      pricing: 'Free tier available'
    }
  ]
}
```

**Acceptance Criteria**:
- [ ] Google AI provider integrated into AIService
- [ ] Streaming responses work correctly
- [ ] API key management in settings
- [ ] All Gemini models available in dropdown
- [ ] Error handling for API failures
- [ ] Token usage tracking

---

## 🎯 Phase 2: High Priority Features (Weeks 5-8)

### **2.1 A-Frame Library Support** 🟡

**Current State**:
- ✅ Babylon.js, Three.js, R3F supported
- ❌ A-Frame not integrated

**iOS Implementation**:
- AFrameLibrary.swift - Complete A-Frame integration
- WebXR-optimized system prompts
- VR/AR examples library

**Web Implementation Plan**:

```typescript
// Add to src/store/app-store.ts

{
  id: 'aframe',
  name: 'A-Frame',
  version: '1.7.0',
  description: 'WebXR framework for VR/AR experiences',
  cdnUrls: [
    'https://aframe.io/releases/1.7.0/aframe.min.js'
  ],
  systemPrompt: `You are an expert A-Frame developer. Generate complete VR/AR scenes.

Key guidelines:
- Use declarative HTML-based entity-component system
- Leverage A-Frame primitives (<a-box>, <a-sphere>, <a-cylinder>)
- Create reusable components with AFRAME.registerComponent()
- Use proper camera and lighting setup
- Include VR/AR controllers when relevant
- Optimize for performance (avoid excessive entities)
- Use A-Frame extras and community components when beneficial
- Include helpful comments explaining WebXR concepts`,
  codeTemplate: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>A-Frame VR Scene</title>
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

      <!-- Your code here -->

    </a-scene>
  </body>
</html>`
}
```

**Scene Renderer Modifications**:

A-Frame requires full HTML page rendering (not just JavaScript injection). Update `scene-renderer.tsx`:

```typescript
const renderAFrameScene = (code: string) => {
  // A-Frame needs full HTML document
  const fullHTML = code.includes('<!DOCTYPE html>')
    ? code
    : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>A-Frame Scene</title>
  <script src="https://aframe.io/releases/1.7.0/aframe.min.js"></script>
</head>
<body>
${code}
</body>
</html>`

  const blob = new Blob([fullHTML], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  iframeRef.current.src = url
}
```

**Acceptance Criteria**:
- [ ] A-Frame library available in library selector
- [ ] System prompt generates proper A-Frame HTML
- [ ] Scenes render correctly in iframe
- [ ] VR mode works (WebXR support)
- [ ] Camera controls functional
- [ ] AI generates entity-component patterns correctly

---

### **2.2 Reactylon Library Support** 🟢

**Current State**:
- ✅ React Three Fiber supported
- ❌ Reactylon (React + Babylon.js) not integrated

**iOS Implementation**:
- ReactylonLibrary.swift - Complete Reactylon integration
- Reactylon-specific system prompts
- Fix for Engine import pattern (`'reactylon/web'`)
- Examples library with voxel wormhole, etc.

**Web Implementation Plan**:

Similar to A-Frame, add Reactylon to library definitions and handle via Sandpack (like R3F):

```typescript
{
  id: 'reactylon',
  name: 'Reactylon',
  version: '3.2.1',
  description: 'React renderer for Babylon.js (Sandpack preview)',
  cdnUrls: [], // Handled by Sandpack
  systemPrompt: `You are an expert Reactylon developer. Generate React components using Babylon.js.

Key guidelines:
- Import Engine from 'reactylon/web' (NOT 'reactylon')
- Import all other components from 'reactylon'
- Use onSceneReady callback for camera setup: <Scene onSceneReady={(scene) => createDefaultCameraOrLight(scene, true, true, true)}>
- Import createDefaultCameraOrLight from '@babylonjs/core'
- Use Babylon.js classes: Color3, Vector3, etc. (NOT plain arrays)
- Use lowercase component names: <box>, <sphere>, <hemisphericLight>
- Material components: <standardMaterial>, <pBRMaterial> (capital BR!)
- Never use <ArcRotateCamera /> or other declarative cameras
- Include proper error boundaries`,
  codeTemplate: `import React from 'react'
import { Engine } from 'reactylon/web'
import { Scene, box, sphere, hemisphericLight, standardMaterial } from 'reactylon'
import { Color3, Vector3, createDefaultCameraOrLight } from '@babylonjs/core'

function App() {
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

        <box name="box1" position={new Vector3(-2, 1, 0)} size={2}>
          <standardMaterial name="mat1" diffuseColor={Color3.Red()} />
        </box>

        <sphere name="sphere1" position={new Vector3(0, 1, 0)} diameter={2}>
          <standardMaterial name="mat2" diffuseColor={Color3.Green()} />
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
```

**Sandpack Dependencies**:
```typescript
dependencies: {
  'reactylon': '^3.2.1',
  '@babylonjs/core': '^8.0.0',
  '@babylonjs/loaders': '^8.0.0',
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
  'react-reconciler': '^0.29.0'
}
```

**Acceptance Criteria**:
- [ ] Reactylon library available in selector
- [ ] System prompt generates correct import patterns
- [ ] Sandpack preview renders Reactylon scenes
- [ ] AI uses correct component naming (lowercase)
- [ ] Engine import from 'reactylon/web' enforced
- [ ] Camera setup uses onSceneReady callback

---

### **2.3 Enhanced Chat View** 🟡

**Current State**:
- ✅ Basic chat interface with messages
- ❌ No message actions (copy, delete, regenerate)
- ❌ No code block syntax highlighting options
- ❌ No message editing

**iOS Implementation**:
- EnhancedChatView.swift - Advanced chat UI
- Message actions (copy, delete, regenerate)
- Code block highlighting
- Message editing

**Web Implementation Plan**:

```typescript
// src/components/chat/chat-message.tsx

interface MessageActions {
  onCopy?: () => void
  onDelete?: () => void
  onRegenerate?: () => void
  onEdit?: () => void
  onSendToPlayground?: () => void
}

function ChatMessage({ message, actions }: { message: ChatMessage, actions: MessageActions }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)

  return (
    <div className="message-container">
      {/* Message header with timestamp and actions */}
      <div className="message-header">
        <span className="timestamp">{formatTimestamp(message.timestamp)}</span>

        <div className="message-actions">
          {message.role === 'user' && (
            <button onClick={() => setIsEditing(true)}>
              <Edit2 size={16} />
            </button>
          )}

          <button onClick={actions.onCopy}>
            <Copy size={16} />
          </button>

          {message.role === 'assistant' && (
            <button onClick={actions.onRegenerate}>
              <RotateCcw size={16} />
            </button>
          )}

          <button onClick={actions.onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Message content */}
      {isEditing ? (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onBlur={() => {
            setIsEditing(false)
            actions.onEdit?.(editedContent)
          }}
        />
      ) : (
        <ReactMarkdown
          components={{
            code: CodeBlock  // Custom code block with language selector
          }}
        >
          {message.content}
        </ReactMarkdown>
      )}

      {/* Code block actions */}
      {message.hasCode && (
        <button onClick={actions.onSendToPlayground}>
          Send to Playground
        </button>
      )}
    </div>
  )
}
```

**Code Block Component**:

```typescript
// src/components/chat/code-block.tsx

function CodeBlock({ language, children }: { language: string, children: string }) {
  const [copied, setCopied] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(language)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="jsx">JSX</option>
          <option value="tsx">TSX</option>
        </select>

        <button onClick={copyToClipboard}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <SyntaxHighlighter language={selectedLanguage}>
        {children}
      </SyntaxHighlighter>
    </div>
  )
}
```

**Store Updates**:

```typescript
interface AppState {
  // ... existing state

  deleteMessage: (id: string) => void
  editMessage: (id: string, newContent: string) => void
  regenerateMessage: (id: string) => Promise<void>
}
```

**Acceptance Criteria**:
- [ ] Copy message content to clipboard
- [ ] Delete individual messages
- [ ] Edit user messages
- [ ] Regenerate AI responses
- [ ] Code block language selector
- [ ] Copy code blocks separately
- [ ] Send code to playground from chat
- [ ] Message timestamps
- [ ] Hover actions (don't clutter UI)

---

## 🎯 Phase 3: Medium Priority Features (Weeks 9-12)

### **3.1 Build System** 🟡

**Current State**:
- ✅ Sandpack for R3F (built-in bundler)
- ❌ No build system for npm packages
- ❌ No hot reload for Babylon.js/Three.js

**iOS Implementation**:
- BuildKit/BuildManager.swift - Orchestrates builds
- BuildKit/NodeBuildService.swift - Node.js environment
- BuildKit/WasmBuildService.swift - WebAssembly builds
- BuildKit/HotReloadManager.swift - Live updates

**Web Implementation Options**:

**Option A: Extend Sandpack** (Recommended)
- Use Sandpack for all frameworks (not just R3F)
- Benefits: No server needed, runs in browser
- Limitations: May not support all npm packages

**Option B: Next.js API Routes + Child Process**
- Run actual Node.js builds server-side
- Benefits: Full npm ecosystem
- Limitations: Requires server, more complex

**Option C: WebContainers** (Stackblitz technology)
- Full Node.js in browser via WebAssembly
- Benefits: No server, full npm support
- Limitations: Large bundle size, complex setup

**Recommended Approach**: Start with Option A (Sandpack for all), evaluate Option C later.

```typescript
// src/lib/build-service.ts

class BuildService {
  async buildBabylonJS(code: string, packages: string[]): Promise<string> {
    // Use Sandpack with Babylon.js template
    const files = {
      '/index.js': code,
      '/package.json': JSON.stringify({
        dependencies: {
          '@babylonjs/core': '^8.22.3',
          ...packages.reduce((acc, pkg) => ({ ...acc, [pkg]: 'latest' }), {})
        }
      })
    }

    // Sandpack handles bundling and execution
    return await sandpackBundler.bundle(files)
  }

  async buildThreeJS(code: string, packages: string[]): Promise<string> {
    // Similar for Three.js
  }

  enableHotReload(onUpdate: (code: string) => void) {
    // Watch for code changes and rebuild
    // Inject updated code without full page reload
  }
}
```

**Acceptance Criteria**:
- [ ] Install npm packages for Babylon.js/Three.js
- [ ] Build and bundle code with dependencies
- [ ] Hot reload updates without refresh
- [ ] Show build errors in UI
- [ ] Support common XR packages (cannon.js, ammo.js, etc.)

---

### **3.2 Encrypted API Key Storage** 🟡

**Current State**:
- ❌ API keys stored in plain text localStorage
- ❌ No encryption

**Android Implementation**:
- Security Crypto library
- EncryptedSharedPreferences
- Keystore integration

**Web Implementation Plan**:

**Option A: Web Crypto API** (Browser-native encryption)
```typescript
// src/lib/crypto-service.ts

class CryptoService {
  private async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,  // non-extractable
      ['encrypt', 'decrypt']
    )
  }

  async encryptAPIKey(apiKey: string, password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await this.deriveKey(password, salt)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    // Return base64 encoded: salt + iv + encrypted
    return this.encodeResult(salt, iv, encrypted)
  }

  async decryptAPIKey(encryptedKey: string, password: string): Promise<string> {
    const { salt, iv, data } = this.decodeResult(encryptedKey)
    const key = await this.deriveKey(password, salt)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }
}
```

**Option B: Session-based (Recommended for local dev)**
- Encrypt keys with session-based password
- Password never stored, only in memory
- User enters once per session
- Simpler UX for local development

```typescript
// src/components/settings/api-key-unlock.tsx

function APIKeyUnlock() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)

  const unlock = async () => {
    try {
      const cryptoService = new CryptoService()
      const decryptedKeys = await cryptoService.decryptAllKeys(password)

      // Store in memory only (Zustand state, not localStorage)
      useAppStore.setState({ apiKeys: decryptedKeys })
      setUnlocked(true)
    } catch (error) {
      toast.error('Incorrect password')
    }
  }

  if (unlocked) return null

  return (
    <div className="unlock-screen">
      <h2>Enter password to unlock API keys</h2>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && unlock()}
      />
      <button onClick={unlock}>Unlock</button>
    </div>
  )
}
```

**Acceptance Criteria**:
- [ ] API keys encrypted before localStorage storage
- [ ] User sets encryption password
- [ ] Password required to unlock keys each session
- [ ] Keys stored in memory only after unlock
- [ ] Automatic lock after inactivity
- [ ] Option to export encrypted keys

---

### **3.3 Code Snippets Library** 🟢

**Current State**:
- ❌ No code snippets functionality
- ❌ No template management

**Web Implementation Plan**:

```typescript
// src/store/app-store.ts

interface CodeSnippet {
  id: string
  title: string
  description: string
  code: string
  library: string  // 'babylonjs' | 'threejs' | etc.
  tags: string[]
  createdAt: number
  updatedAt: number
  category?: string  // 'geometry' | 'materials' | 'animation' | etc.
}

interface AppState {
  // ... existing state

  snippets: CodeSnippet[]
  addSnippet: (snippet: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateSnippet: (id: string, updates: Partial<CodeSnippet>) => void
  deleteSnippet: (id: string) => void
  loadSnippet: (id: string) => void
  searchSnippets: (query: string) => CodeSnippet[]
}
```

**UI Components**:

```typescript
// src/components/snippets/snippet-library.tsx

function SnippetLibrary() {
  const { snippets, searchSnippets } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredSnippets = useMemo(() => {
    let results = searchQuery ? searchSnippets(searchQuery) : snippets

    if (selectedCategory) {
      results = results.filter(s => s.category === selectedCategory)
    }

    return results
  }, [snippets, searchQuery, selectedCategory])

  return (
    <div className="snippet-library">
      <div className="library-header">
        <input
          type="search"
          placeholder="Search snippets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
        >
          <option value="">All Categories</option>
          <option value="geometry">Geometry</option>
          <option value="materials">Materials</option>
          <option value="animation">Animation</option>
          <option value="lighting">Lighting</option>
          <option value="physics">Physics</option>
        </select>
      </div>

      <div className="snippet-grid">
        {filteredSnippets.map(snippet => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>
    </div>
  )
}
```

**Acceptance Criteria**:
- [ ] Save current code as snippet
- [ ] Load snippet into editor
- [ ] Search snippets by title, description, tags
- [ ] Filter by library and category
- [ ] Edit snippet metadata
- [ ] Delete snippets
- [ ] Export/import snippet library
- [ ] Share snippet via URL

---

## 🎯 Phase 4: Low Priority / Future (Weeks 13+)

### **4.1 LlamaStack Provider** 🔵

**Current State**:
- ❌ No LlamaStack support

**iOS Implementation**:
- LlamaStackClient integration
- Fallback for Meta models

**Web Implementation**:
- Direct API integration (similar to other providers)
- Lower priority - Together.ai already supports Meta models

---

### **4.2 WebAssembly Builds** 🔵

**Current State**:
- ❌ No Wasm build support

**iOS Implementation**:
- WasmBuildService.swift

**Web Implementation**:
- Could use WebContainers or similar
- Very low priority for web platform

---

### **4.3 Advanced Build Features** 🔵

- TypeScript compilation
- Asset optimization
- Tree shaking
- Code splitting
- Bundle analysis
- Performance profiling

---

## 📋 Implementation Checklist

### **Phase 1: Critical (Weeks 1-4)**

- [ ] **Conversation Management**
  - [ ] Create conversation models and types
  - [ ] Implement conversation CRUD operations
  - [ ] Build conversation list UI
  - [ ] Add conversation search/filter
  - [ ] Persist to localStorage/IndexedDB
  - [ ] Test cross-session persistence

- [ ] **Google AI Integration**
  - [ ] Implement Google AI API client
  - [ ] Add streaming support
  - [ ] Create Gemini model definitions
  - [ ] Update settings UI for Google API key
  - [ ] Test all Gemini models
  - [ ] Handle error cases

### **Phase 2: High Priority (Weeks 5-8)**

- [ ] **A-Frame Support**
  - [ ] Add A-Frame library definition
  - [ ] Implement HTML rendering mode
  - [ ] Create A-Frame system prompts
  - [ ] Test VR mode
  - [ ] Add A-Frame examples

- [ ] **Reactylon Support**
  - [ ] Add Reactylon library definition
  - [ ] Configure Sandpack for Reactylon
  - [ ] Implement correct import patterns
  - [ ] Create Reactylon system prompts
  - [ ] Test scene rendering

- [ ] **Enhanced Chat View**
  - [ ] Add message actions (copy, delete, edit, regenerate)
  - [ ] Implement code block language selector
  - [ ] Add message timestamps
  - [ ] Create hover action menus
  - [ ] Test all interactions

### **Phase 3: Medium Priority (Weeks 9-12)**

- [ ] **Build System**
  - [ ] Evaluate Sandpack vs WebContainers
  - [ ] Implement npm package installation
  - [ ] Add build progress indicators
  - [ ] Implement hot reload
  - [ ] Test with common XR packages

- [ ] **Encrypted Storage**
  - [ ] Implement Web Crypto API encryption
  - [ ] Create unlock UI
  - [ ] Add auto-lock on inactivity
  - [ ] Test encryption/decryption
  - [ ] Add export functionality

- [ ] **Code Snippets**
  - [ ] Create snippet data models
  - [ ] Build snippet library UI
  - [ ] Implement search/filter
  - [ ] Add snippet sharing
  - [ ] Test persistence

### **Phase 4: Future (Week 13+)**

- [ ] Additional AI providers
- [ ] Advanced build features
- [ ] Wasm support
- [ ] Collaboration features
- [ ] Mobile optimization

---

## 🧪 Testing Strategy

### **Unit Tests**
- [ ] AI service provider methods
- [ ] Conversation management logic
- [ ] Code snippet operations
- [ ] Build service functionality

### **Integration Tests**
- [ ] End-to-end conversation flow
- [ ] AI provider switching
- [ ] Library switching
- [ ] Code execution pipeline

### **E2E Tests**
- [ ] Complete user workflows
- [ ] Settings persistence
- [ ] Conversation management
- [ ] Code playground usage

---

## 📊 Success Metrics

**Feature Completion**:
- Phase 1: 100% critical features
- Phase 2: 80% high priority features
- Phase 3: 50% medium priority features

**Quality Metrics**:
- All tests passing
- No console errors
- Responsive UI (mobile + desktop)
- Accessibility compliance (WCAG 2.1 AA)

**Performance**:
- Lighthouse score: 90+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Code editor load: < 500ms

---

## 🎓 Learning Resources

**Conversation Management**:
- Dexie.js (IndexedDB): https://dexie.org/
- localStorage best practices

**Google AI/Gemini**:
- Gemini API docs: https://ai.google.dev/docs
- SSE streaming: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

**A-Frame**:
- A-Frame docs: https://aframe.io/docs/
- WebXR API: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API

**Reactylon**:
- Reactylon docs: https://www.reactylon.com/docs

**Build Systems**:
- Sandpack docs: https://sandpack.codesandbox.io/
- WebContainers: https://webcontainers.io/

**Security**:
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- Secure storage patterns

---

## 🚀 Getting Started

To begin implementing feature parity:

1. **Review this plan** with the team
2. **Prioritize phases** based on user needs
3. **Set up project board** (GitHub Projects, Jira, etc.)
4. **Create feature branches** for each major feature
5. **Write tests first** (TDD approach recommended)
6. **Implement incrementally** (small PRs, frequent merges)
7. **Document as you go** (update this plan + CLAUDE.md)

**Next Steps**:
1. Start with Phase 1 conversation management
2. Add Google AI provider integration
3. Continue with Phase 2 features

---

**This is a living document. Update as priorities change and features are completed.** ✨
