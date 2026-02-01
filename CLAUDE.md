# CLAUDE.md - WebMaigeXR

This file provides guidance to Claude Code (claude.ai/code) when working with the Next.js web implementation of m{ai}geXR.

**WebMaigeXR** is an AI-powered Extended Reality development platform built with Next.js that combines professional 3D libraries, multi-provider AI integration, and real-time code execution into a comprehensive web-based XR development environment.

> **Professional Web-Based XR Development Platform**
> Democratizing 3D and Extended Reality development through conversational AI assistance, multi-framework support, and browser-based workflows.

---

## 🎯 Project Overview

### What is WebMaigeXR?

WebMaigeXR (formerly part of the m{ai}geXR monorepo) is now a standalone Next.js 14 web application providing:

- **AI-powered 3D development** - Natural language to working 3D scenes
- **Multi-library support** - Babylon.js, Three.js, React Three Fiber
- **Professional code editor** - Monaco editor with IntelliSense
- **Real-time execution** - Live preview with sandboxed iframe rendering
- **Multi-provider AI** - Together.ai, OpenAI, Anthropic Claude
- **CodeSandbox integration** - Deploy R3F scenes with Sandpack

### This Repository

**Status**: Standalone Next.js web application (no longer a monorepo)

**Purpose**: Web-based XR development platform accessible via browser

**Deployment**: Local development environment (not for production - API keys in localStorage)

---

## 🏗️ Architecture

### **Tech Stack**

**Core Framework**:
- **Next.js 14.0.4** - React framework with App Router
- **React 18.2.0** - UI library
- **TypeScript 5.3.0** - Type-safe development
- **Tailwind CSS 3.3.6** - Utility-first styling

**State Management**:
- **Zustand 4.4.7** - Lightweight state management with persistence
- **localStorage** - Client-side persistence (local development only)

**AI Integration**:
- **Multi-provider support** - Together.ai, OpenAI, Anthropic
- **Streaming responses** - Real-time AI generation
- **SSE support** - Server-Sent Events for streaming

**Code Editor**:
- **Monaco Editor** (@monaco-editor/react 4.6.0) - VS Code editor component
- **Syntax highlighting** - TypeScript, JavaScript, JSX
- **IntelliSense** - Auto-completion and type information

**3D Rendering**:
- **Sandboxed iframe** - Secure code execution
- **Sandpack** (@codesandbox/sandpack-react 2.13.5) - React Three Fiber live preview
- **CodeSandbox API** - Deploy and share scenes

**UI Components**:
- **Framer Motion 10.16.16** - Animations
- **Lucide React 0.294.0** - Icon library
- **React Hot Toast 2.4.1** - Notifications
- **React Markdown 9.0.1** - Markdown rendering
- **Next Themes 0.2.1** - Dark/light mode

---

## 📁 Project Structure

```
WebMaigeXr/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root layout with providers
│   │   ├── page.tsx                 # Main application page
│   │   └── globals.css              # Global styles
│   │
│   ├── components/
│   │   ├── chat/                    # AI conversation interface
│   │   │   ├── chat-interface.tsx  # Main chat UI with message handling
│   │   │   └── chat-message.tsx    # Message display with markdown
│   │   │
│   │   ├── playground/              # 3D development environment
│   │   │   ├── playground-view.tsx # Split-view code editor + renderer
│   │   │   ├── code-editor.tsx     # Monaco editor wrapper
│   │   │   ├── scene-renderer.tsx  # Iframe 3D scene execution
│   │   │   ├── sandpack-webview.tsx # R3F Sandpack integration
│   │   │   └── error-boundary.tsx  # Error handling
│   │   │
│   │   ├── settings/                # Configuration panel
│   │   │   └── settings-panel.tsx  # API keys, models, parameters
│   │   │
│   │   ├── layout/                  # Navigation components
│   │   │   ├── header.tsx          # Top header with title
│   │   │   └── bottom-navigation.tsx # Tab navigation (chat/playground)
│   │   │
│   │   └── theme-provider.tsx      # Dark/light mode provider
│   │
│   ├── lib/                         # Core services
│   │   ├── ai-service.ts           # Multi-provider AI client
│   │   ├── codesandbox-service.ts  # CodeSandbox API integration
│   │   ├── sharing-service.ts      # Share functionality
│   │   └── utils.ts                # Helper functions
│   │
│   └── store/
│       └── app-store.ts            # Zustand state with persistence
│
├── public/                          # Static assets
├── package.json                     # Dependencies and scripts
├── tailwind.config.js               # Tailwind configuration
├── next.config.js                   # Next.js configuration
├── tsconfig.json                    # TypeScript configuration
└── CLAUDE.md                        # This file
```

---

## 🤖 AI Provider System

### **Supported Providers**

1. **Together.ai** (Primary - FREE models available)
   - DeepSeek R1 70B (FREE)
   - Llama 3.3 70B (FREE)
   - Llama 3 8B Lite ($0.10/1M tokens)
   - Qwen 2.5 7B Turbo ($0.30/1M tokens)
   - Qwen 2.5 Coder 32B ($0.80/1M tokens)

2. **OpenAI**
   - GPT-4o ($5.00/1M tokens)
   - GPT-4o Mini ($0.15/1M tokens)

3. **Anthropic Claude**
   - Claude 3.5 Sonnet ($3.00/1M tokens)
   - Claude 3 Haiku ($0.25/1M tokens)

4. **CodeSandbox**
   - Sandbox deployment (Free)

### **AI Service Architecture**

From [src/lib/ai-service.ts](src/lib/ai-service.ts):

```typescript
export class AIService {
  private static instance: AIService

  async generateResponse(
    prompt: string,
    options: {
      provider: string      // 'together' | 'openai' | 'anthropic'
      model: string        // Model-specific ID
      apiKey: string       // User-provided API key
      temperature?: number // 0.0-2.0 creativity control
      topP?: number        // 0.1-1.0 vocabulary diversity
      systemPrompt?: string // Framework-specific instructions
      maxTokens?: number   // Max response length
    }
  ): Promise<AIResponse>

  async generateStreamingResponse(
    prompt: string,
    options: AIOptions,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void>
}
```

### **Key Features**

- ✅ **Streaming responses** - Real-time AI generation with SSE
- ✅ **Framework-aware prompts** - Automatic system prompt injection
- ✅ **Error handling** - Comprehensive error messages and retry logic
- ✅ **Multi-provider routing** - Seamless switching between providers

---

## 🎨 3D Library System

### **Supported Libraries**

From [src/store/app-store.ts](src/store/app-store.ts):

1. **Babylon.js v8.22.3**
   - Professional WebGL engine
   - Full XR support
   - Advanced physics and materials
   - System prompt optimized for Babylon.js API

2. **Three.js r171**
   - Lightweight 3D library
   - Extensive community support
   - WebGL renderer
   - System prompt optimized for Three.js patterns

3. **React Three Fiber 8.17.10**
   - Declarative React renderer for Three.js
   - **Sandpack integration** for live preview
   - **CodeSandbox deployment** support
   - Component-based 3D development
   - System prompt optimized for R3F hooks and patterns

### **Library3D Interface**

```typescript
export interface Library3D {
  id: string                // 'babylonjs' | 'threejs' | 'react-three-fiber'
  name: string              // Display name
  version: string           // Library version
  description: string       // Feature description
  cdnUrls: string[]        // CDN resources
  systemPrompt: string     // AI instructions for this framework
  codeTemplate: string     // Starting template code
}
```

### **Framework Selection**

The app automatically:
1. Injects framework-specific system prompts into AI requests
2. Loads appropriate CDN resources
3. Provides correct code templates
4. Validates code for framework compatibility

---

## 💾 State Management

### **Zustand Store with Persistence**

From [src/store/app-store.ts](src/store/app-store.ts):

```typescript
interface AppState {
  // View state
  currentView: ViewType // 'chat' | 'playground'
  setCurrentView: (view: ViewType) => void

  // Chat state
  messages: ChatMessage[]
  isLoading: boolean
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void

  // Code state
  currentCode: string
  setCurrentCode: (code: string) => void

  // Settings state
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void

  // Library state
  libraries: Library3D[]
  getCurrentLibrary: () => Library3D | undefined

  // AI Provider state
  providers: AIProvider[]
  getCurrentProvider: () => AIProvider | undefined
  getCurrentModel: () => AIProvider['models'][0] | undefined
}
```

### **Persistence Strategy**

```typescript
persist(
  (set, get) => ({ /* state */ }),
  {
    name: 'xrai-assistant-storage',
    partialize: (state) => ({
      settings: state.settings,      // ⚠️ Contains API keys
      messages: state.messages,      // Chat history
      currentCode: state.currentCode, // Last edited code
      libraries: state.libraries,    // Library definitions
      providers: state.providers     // Provider definitions
    })
  }
)
```

**⚠️ Security Note**: API keys are stored in browser localStorage. This is acceptable for local development but **NOT for production deployment**.

---

## 🎮 Component Architecture

### **Main Components**

**1. Chat Interface** ([src/components/chat/chat-interface.tsx](src/components/chat/chat-interface.tsx))
- AI conversation UI
- Message history display
- Streaming response handling
- Code block extraction
- "Send to Playground" functionality

**2. Playground View** ([src/components/playground/playground-view.tsx](src/components/playground/playground-view.tsx))
- Split-pane layout (code + preview)
- Monaco editor integration
- Real-time code execution
- Upload/download code files

**3. Scene Renderer** ([src/components/playground/scene-renderer.tsx](src/components/playground/scene-renderer.tsx))
- Sandboxed iframe execution
- Dynamic CDN injection
- Error boundary handling
- Console output capture

**4. Sandpack WebView** ([src/components/playground/sandpack-webview.tsx](src/components/playground/sandpack-webview.tsx))
- React Three Fiber live preview
- CodeSandbox integration
- Hot reload support
- Deploy to CodeSandbox

**5. Settings Panel** ([src/components/settings/settings-panel.tsx](src/components/settings/settings-panel.tsx))
- API key management
- Model selection
- Temperature/Top-P controls
- Library selection
- Theme toggle

---

## 🚀 Development Workflow

### **Local Development Setup**

```bash
# Install dependencies
pnpm install

# Start development server (localhost:3000 only)
pnpm run dev

# Build for local testing
pnpm run build

# Start production build locally
pnpm run start

# Type checking
pnpm run type-check

# Linting
pnpm run lint
```

### **First-Time Setup**

1. **Install Node.js 20+** and **pnpm 8+**
2. Clone repository and run `pnpm install`
3. Start dev server: `pnpm run dev`
4. Open `http://localhost:3000`
5. Configure API keys in Settings:
   - **Together.ai**: https://api.together.ai/settings/api-keys
   - **OpenAI**: https://platform.openai.com
   - **Anthropic**: https://console.anthropic.com

### **Development Commands**

```bash
pnpm run dev          # Start Next.js dev server
pnpm run build        # Build for local production
pnpm run start        # Start production server locally
pnpm run lint         # Run ESLint
pnpm run type-check   # TypeScript validation
```

---

## 🎯 Feature Highlights

### **AI-Powered Development**

Ask in natural language:
```
"Create a spinning cube with rainbow colors"
"Make a solar system with orbiting planets"
"Build a particle system with gravity"
"Generate a procedural landscape"
```

AI automatically:
1. Understands your request
2. Selects appropriate framework APIs
3. Generates complete, working code
4. Includes proper lighting and camera setup
5. Provides executable code in playground

### **Multi-Framework Support**

Switch frameworks seamlessly:
1. Select library in Settings
2. AI adapts to framework patterns
3. Code templates auto-update
4. System prompts change automatically

Supported conversions:
- Babylon.js ↔ Three.js ↔ React Three Fiber

### **Live Code Execution**

**Babylon.js / Three.js**:
- Iframe sandbox execution
- Dynamic CDN loading
- Real-time preview
- Console output capture

**React Three Fiber**:
- Sandpack live preview
- Hot module reload
- Deploy to CodeSandbox
- Share with URL

### **Professional Code Editor**

- **Monaco Editor** - Same as VS Code
- **IntelliSense** - Auto-completion
- **Syntax highlighting** - Multi-language
- **Error detection** - Real-time validation

---

## ⚙️ Configuration

### **AI Parameters**

**Temperature (0.0-2.0)**:
- `0.0-0.3`: Precise, deterministic (debugging)
- `0.4-0.8`: Balanced creativity (general use)
- `0.9-2.0`: Experimental, creative (exploration)

**Top-P (0.1-1.0)**:
- `0.1-0.5`: Focused vocabulary (technical code)
- `0.6-0.9`: Balanced vocabulary (recommended)
- `0.9-1.0`: Full vocabulary (creative scenarios)

### **Library Selection**

- **Babylon.js**: Complex 3D apps, WebXR, physics simulations
- **Three.js**: Lightweight scenes, prototyping, learning
- **React Three Fiber**: Declarative React patterns, component reuse

### **Storage**

All data persists in browser localStorage:
- ✅ API keys (⚠️ local development only)
- ✅ Chat history
- ✅ Code snippets
- ✅ User preferences
- ✅ Library settings

---

## 🔒 Security & Privacy

### **Local Development Only**

⚠️ **DO NOT DEPLOY TO PRODUCTION**

This application stores API keys in browser localStorage, which is:
- ✅ **Safe for localhost** development
- ❌ **NOT safe for public** deployment
- ❌ **NOT safe for production** use

**Why?**
- API keys are accessible to all site visitors
- localStorage is not encrypted
- Keys can be extracted from browser DevTools

### **For Production Deployment**

Consider implementing:
1. **Server-side API key management**
2. **OAuth authentication flows**
3. **Environment variable configuration**
4. **API proxy with rate limiting**
5. **Database-backed user sessions**

---

## 🧪 Testing

### **Manual Testing Checklist**

**AI Integration**:
- [ ] Toggle between providers (Together.ai, OpenAI, Anthropic)
- [ ] Streaming responses work correctly
- [ ] Error handling displays helpful messages
- [ ] System prompts inject correctly

**3D Libraries**:
- [ ] Babylon.js scenes render correctly
- [ ] Three.js scenes render correctly
- [ ] React Three Fiber Sandpack loads
- [ ] CDN resources load without errors

**Code Editor**:
- [ ] Monaco editor loads
- [ ] Syntax highlighting works
- [ ] Code execution updates preview
- [ ] Upload/download functionality

**Settings**:
- [ ] API keys save and persist
- [ ] Model selection updates
- [ ] Temperature/Top-P sliders work
- [ ] Theme toggle persists

---

## 📝 Development Guidelines

### **Code Style**

1. **TypeScript Conventions**
   - Use explicit types for function parameters
   - Prefer `interface` over `type` for objects
   - Use `const` for immutable values
   - Avoid `any` - use `unknown` or proper types

2. **React Best Practices**
   - Use functional components with hooks
   - Memoize expensive computations with `useMemo`
   - Optimize re-renders with `useCallback`
   - Keep components focused and small

3. **Next.js Patterns**
   - Use App Router for routing
   - Prefer server components when possible
   - Use client components (`'use client'`) only when needed
   - Follow Next.js metadata conventions

4. **State Management**
   - Use Zustand for global state
   - Keep component state local when possible
   - Prefer `useState` for simple local state
   - Use `useEffect` sparingly - prefer event handlers

### **File Organization**

```
New feature implementation:
1. Create component in appropriate directory
2. Add types to interface definitions
3. Update store if needed
4. Add to navigation if applicable
5. Test locally before committing
```

### **Commit Guidelines**

```bash
# Format: <type>: <description>

feat: Add Google AI provider integration
fix: Resolve Monaco editor loading issue
docs: Update CLAUDE.md with new features
refactor: Simplify AI service error handling
style: Format code with Prettier
test: Add unit tests for AI service
```

---

## 🐛 Common Issues & Solutions

### **Monaco Editor Not Loading**

**Symptom**: Blank editor or loading spinner
**Solution**: Check console for CDN errors, verify `@monaco-editor/react` version

### **Iframe Sandbox Errors**

**Symptom**: Scene doesn't render, console shows CSP errors
**Solution**: Check `Content-Security-Policy` in Next.js config

### **API Key Not Working**

**Symptom**: 401/403 errors from AI providers
**Solution**:
1. Verify API key is correct (no extra spaces)
2. Check Settings panel shows the key
3. Verify provider is selected correctly
4. Clear localStorage and re-enter key

### **Streaming Responses Not Working**

**Symptom**: AI responses appear all at once instead of streaming
**Solution**:
1. Verify provider supports streaming
2. Check network tab for SSE connection
3. Ensure `stream: true` in AI service call

### **Build Failures**

**Symptom**: `pnpm run build` fails with type errors
**Solution**:
1. Run `pnpm run type-check` to see all errors
2. Fix TypeScript errors systematically
3. Ensure all imports are correct
4. Clear `.next` cache and rebuild

---

## 🚀 Future Roadmap

### **Planned Features**

**1. Additional 3D Libraries**
- A-Frame v1.7.0 (WebXR framework)
- Reactylon 3.2.1 (React + Babylon.js)
- PlayCanvas integration

**2. Enhanced AI Providers**
- Google AI (Gemini) support
- Local LLM support (Ollama, LM Studio)
- Custom API endpoint configuration

**3. Advanced Features**
- **Conversation history** - Save and load chat sessions
- **Code snippets library** - Reusable templates
- **Export options** - Download as HTML, CodePen, etc.
- **Collaboration** - Share live editing sessions
- **Version control** - Git integration

**4. Build System**
- **Node.js builds** - Full npm package support
- **Hot reload** - Live code updates without refresh
- **Bundling** - Webpack/Vite integration
- **Deployment** - One-click deploy to Vercel/Netlify

**5. Mobile Optimization**
- **Responsive UI** - Better mobile layout
- **Touch controls** - Mobile-friendly editor
- **PWA support** - Installable web app
- **Offline mode** - Service worker caching

---

## 🎓 Learning Resources

### **Next.js Documentation**
- https://nextjs.org/docs
- App Router guide
- Server vs Client Components

### **3D Libraries**
- **Babylon.js**: https://doc.babylonjs.com
- **Three.js**: https://threejs.org/docs
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber

### **AI Providers**
- **Together.ai**: https://docs.together.ai
- **OpenAI**: https://platform.openai.com/docs
- **Anthropic**: https://docs.anthropic.com

---

## 📄 License

See LICENSE file for details.

---

## **WebMaigeXR: The Future of Browser-Based XR Development**

**From conversation to 3D experience - all in your browser.**

WebMaigeXR democratizes Extended Reality development by making it as simple as having a conversation with AI. Whether you're learning WebGL, prototyping XR experiences, or building professional 3D applications, our platform provides the tools and AI assistance you need.

**No installation required. Just open your browser and start creating.** 🚀

---

**Need Help?**
- Check the [README.md](README.md) for setup instructions
- Review [Feature Parity Plan](FEATURE_PARITY_PLAN.md) for upcoming features
- Compare with iOS implementation: `../iOSMaigeXr/CLAUDE.md`
- Compare with Android implementation: `../AndroidMaigeXr/CLAUDE.md`
