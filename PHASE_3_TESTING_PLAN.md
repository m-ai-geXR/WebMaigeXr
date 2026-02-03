# Phase 3 Comprehensive Testing Plan

**Date**: 2025-01-25
**Status**: Testing Phase
**Features to Test**: Build System, Snippet Library, Encrypted API Keys

---

## 🎯 Testing Scope

This document outlines comprehensive testing for all Phase 3 features:
1. **Build System** - npm package support for all frameworks
2. **Snippet Library** - Code snippet management and organization
3. **Encrypted API Keys** - Secure API key storage with encryption

---

## 🧪 Test Categories

### 1. Build System Tests

#### A. Package Manager UI
- [ ] Open package manager modal
- [ ] Verify common packages load for each framework
- [ ] Search for packages (e.g., "gsap")
- [ ] Toggle npm/CDN mode
- [ ] Install a common package
- [ ] Verify installed package appears with green badge
- [ ] Uninstall a package
- [ ] Add custom package with version (e.g., "lodash@4.17.21")
- [ ] Add custom package without version (should default to "latest")
- [ ] Verify package count badge in toolbar
- [ ] Close and reopen modal (state should persist)

#### B. Babylon.js with npm Packages
- [ ] Select Babylon.js library
- [ ] Open package manager
- [ ] Enable npm mode
- [ ] Install @babylonjs/materials
- [ ] Verify "npm Bundler" badge appears
- [ ] Write code using advanced materials:
```javascript
const material = new BABYLON.StandardMaterial("mat", scene)
material.diffuseColor = new BABYLON.Color3(1, 0, 0)
```
- [ ] Verify Sandpack preview loads
- [ ] Verify scene renders correctly
- [ ] Check browser console for errors

#### C. Three.js with npm Packages
- [ ] Select Three.js library
- [ ] Open package manager
- [ ] Enable npm mode
- [ ] Install cannon-es (physics)
- [ ] Verify "npm Bundler" badge appears
- [ ] Write code using physics:
```javascript
import * as CANNON from 'cannon-es'
const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)
```
- [ ] Verify Sandpack preview loads
- [ ] Verify physics simulation works
- [ ] Check browser console for errors

#### D. React Three Fiber with npm Packages
- [ ] Select React Three Fiber
- [ ] Open package manager
- [ ] Install @react-three/drei
- [ ] Verify "Sandpack Live" badge appears (should already be Sandpack)
- [ ] Write code using drei helpers:
```jsx
import { OrbitControls } from '@react-three/drei'
<OrbitControls />
```
- [ ] Verify preview updates
- [ ] Verify controls work in scene
- [ ] Check browser console for errors

#### E. CDN Mode Fallback
- [ ] Select Babylon.js
- [ ] Ensure npm mode is OFF
- [ ] Write standard Babylon.js code
- [ ] Verify iframe renderer is used (not Sandpack)
- [ ] Verify scene renders correctly
- [ ] Switch npm mode ON
- [ ] Verify Sandpack renderer is used
- [ ] Verify same code still works

#### F. Build Service Error Handling
- [ ] Install invalid package name (e.g., "this-package-does-not-exist-123456")
- [ ] Verify error handling
- [ ] Write code with syntax errors
- [ ] Verify Sandpack error boundary catches it
- [ ] Check error messages are helpful

---

### 2. Snippet Library Tests

#### A. Basic CRUD Operations
- [ ] Navigate to Snippets tab (bottom nav)
- [ ] Verify empty state if no snippets
- [ ] Click "Save Current Code" from playground
- [ ] Fill in snippet details:
  - Title: "Rotating Cube"
  - Description: "Simple animated cube"
  - Category: Geometry
  - Tags: "cube, animation, basic"
- [ ] Save snippet
- [ ] Verify snippet appears in library
- [ ] Verify snippet card shows all metadata
- [ ] Click "Load" on snippet
- [ ] Verify code loads in playground
- [ ] Verify switched to playground view

#### B. Search and Filter
- [ ] Create 3+ snippets with different frameworks
- [ ] Test search by title
- [ ] Test search by description
- [ ] Test search by tags
- [ ] Filter by library (Babylon.js)
- [ ] Verify only Babylon.js snippets show
- [ ] Filter by category (Materials)
- [ ] Verify only Materials snippets show
- [ ] Clear filters
- [ ] Verify all snippets show again

#### C. View Modes
- [ ] Switch to Grid view
- [ ] Verify cards display in grid
- [ ] Switch to List view
- [ ] Verify compact list display
- [ ] Verify both views show same data

#### D. Snippet Actions
- [ ] Click "Copy" on snippet
- [ ] Verify code copied to clipboard
- [ ] Verify toast notification
- [ ] Click "Share" on snippet
- [ ] Verify share menu appears
- [ ] Test Web Share API if available
- [ ] Click "Delete" on snippet
- [ ] Verify confirmation dialog
- [ ] Cancel deletion
- [ ] Verify snippet not deleted
- [ ] Delete snippet (confirm)
- [ ] Verify snippet removed

#### E. Snippet Integration
- [ ] Save snippet from Babylon.js code
- [ ] Switch to Three.js
- [ ] Navigate to Snippets
- [ ] Load Babylon.js snippet
- [ ] Verify library switches to Babylon.js
- [ ] Verify code loads correctly

---

### 3. Encrypted API Keys Tests

#### A. Initial Setup
- [ ] Open Settings panel
- [ ] Verify "API Key Security" section at top
- [ ] Verify encryption status shows "Disabled"
- [ ] Click "Enable" button
- [ ] Verify password setup dialog appears

#### B. Password Setup
- [ ] Try weak password (< 8 chars)
- [ ] Verify validation error
- [ ] Try password without uppercase
- [ ] Verify validation error
- [ ] Try password without lowercase
- [ ] Verify validation error
- [ ] Try password without number
- [ ] Verify validation error
- [ ] Click "Generate" password
- [ ] Verify strong random password generated
- [ ] Copy generated password (save externally)
- [ ] Enter API keys:
  - Together.ai: [test key]
  - OpenAI: [test key]
- [ ] Click "Create & Encrypt"
- [ ] Verify success toast
- [ ] Verify encryption status shows "Enabled"

#### C. Session Management
- [ ] Verify "Session Status" shows "Unlocked"
- [ ] Click "Lock Now"
- [ ] Verify status changes to "Locked"
- [ ] Refresh page
- [ ] Verify unlock screen appears
- [ ] Enter incorrect password
- [ ] Verify error message
- [ ] Verify failed attempt counter
- [ ] Enter correct password
- [ ] Verify unlock succeeds
- [ ] Verify API keys accessible in settings

#### D. Auto-Lock Feature
- [ ] Unlock session with correct password
- [ ] Wait 30+ minutes (or modify LOCK_TIMEOUT_MS for testing)
- [ ] Verify session auto-locks
- [ ] Refresh page
- [ ] Verify unlock screen appears
- [ ] NOTE: For faster testing, temporarily change line 34 in crypto-service.ts:
```typescript
private readonly LOCK_TIMEOUT_MS = 30 * 1000 // 30 seconds for testing
```

#### E. Encryption Persistence
- [ ] Unlock session
- [ ] Open browser DevTools
- [ ] Check localStorage for 'xrai-assistant-storage'
- [ ] Verify encrypted_api_keys is stored as Base64 string
- [ ] Verify salt and iv are different each time
- [ ] Close browser completely
- [ ] Reopen application
- [ ] Verify unlock screen appears
- [ ] Unlock with password
- [ ] Verify API keys accessible

#### F. Security Validation
- [ ] Verify password never appears in localStorage
- [ ] Verify raw API keys never appear in localStorage
- [ ] Verify encrypted data cannot be read directly
- [ ] Verify PBKDF2 iterations = 100,000
- [ ] Verify AES-256-GCM encryption algorithm
- [ ] Check browser console for security warnings

---

### 4. Cross-Feature Integration Tests

#### A. Build System + Snippets
- [ ] Enable npm mode for Babylon.js
- [ ] Install @babylonjs/materials
- [ ] Write code using npm package
- [ ] Save as snippet with title "Advanced Materials"
- [ ] Switch to CDN mode
- [ ] Load the snippet
- [ ] Verify npm mode auto-enables (if package detected)
- [ ] OR verify code works in CDN mode (backwards compat)

#### B. Build System + Encryption
- [ ] Lock API key session
- [ ] Try to enable npm mode
- [ ] Verify package manager requires CodeSandbox API key
- [ ] Unlock session
- [ ] Verify npm mode can be enabled
- [ ] Install packages
- [ ] Lock session again
- [ ] Verify installed packages list persists

#### C. Snippets + Encryption
- [ ] Save snippet with API keys unlocked
- [ ] Lock API key session
- [ ] Navigate to Snippets
- [ ] Load snippet
- [ ] Verify snippet loads correctly (no API keys needed)
- [ ] Verify playground code editor works
- [ ] Unlock session
- [ ] Generate AI response in chat
- [ ] Verify API keys work

#### D. All Three Features Together
- [ ] Unlock API keys
- [ ] Enable npm mode for React Three Fiber
- [ ] Install @react-three/drei
- [ ] Write code using drei + AI assistance:
  - Ask AI: "Create a scene with OrbitControls from drei"
  - Verify AI response includes drei import
- [ ] Save response code as snippet
- [ ] Lock API keys
- [ ] Switch to different library
- [ ] Load snippet from library
- [ ] Verify R3F + npm mode + snippet all work
- [ ] Unlock API keys to continue

---

### 5. Error Handling Tests

#### A. Build System Errors
- [ ] Enable npm mode
- [ ] Install package
- [ ] Write code with missing import
- [ ] Verify Sandpack error boundary catches it
- [ ] Verify error message is helpful
- [ ] Fix code
- [ ] Verify scene renders

#### B. Snippet Errors
- [ ] Try to save snippet with empty title
- [ ] Verify validation error
- [ ] Try to delete snippet (cancel)
- [ ] Verify snippet not deleted
- [ ] Try to load snippet while code is unsaved
- [ ] Verify confirmation dialog or auto-save

#### C. Encryption Errors
- [ ] Try to enable encryption without entering password
- [ ] Verify validation error
- [ ] Enter password, skip API keys
- [ ] Verify at least one key required (or empty is ok)
- [ ] Attempt 5+ failed unlock attempts
- [ ] Verify lockout or warning message

---

### 6. Performance Tests

#### A. Snippet Library Performance
- [ ] Create 50+ snippets (can use test data)
- [ ] Verify library renders smoothly
- [ ] Test search performance
- [ ] Test filter performance
- [ ] Switch between views (grid/list)
- [ ] Verify no lag or stuttering

#### B. Build System Performance
- [ ] Enable npm mode
- [ ] Install 5+ packages
- [ ] Measure time to first render
- [ ] Verify bundling completes within reasonable time
- [ ] Monitor browser memory usage
- [ ] Verify no memory leaks

#### C. Encryption Performance
- [ ] Measure encryption time (should be < 100ms)
- [ ] Measure decryption time (should be < 100ms)
- [ ] Test with 5+ API keys
- [ ] Verify no UI freezing during encryption

---

### 7. Browser Compatibility Tests

#### A. Chrome/Edge (Chromium)
- [ ] Test all features in Chrome
- [ ] Verify Web Crypto API works
- [ ] Verify Sandpack bundler works
- [ ] Verify IndexedDB/localStorage works

#### B. Firefox
- [ ] Test all features in Firefox
- [ ] Verify Web Crypto API works
- [ ] Verify Sandpack bundler works
- [ ] Verify IndexedDB/localStorage works

#### C. Safari
- [ ] Test all features in Safari
- [ ] Verify Web Crypto API works
- [ ] Verify Sandpack bundler works
- [ ] Verify IndexedDB/localStorage works
- [ ] Note: Some Sandpack features may be limited

---

### 8. User Experience Tests

#### A. Navigation Flow
- [ ] Start in Chat view
- [ ] Navigate to Playground
- [ ] Navigate to Snippets
- [ ] Navigate back to Chat
- [ ] Verify smooth transitions
- [ ] Verify state persists across views

#### B. Visual Feedback
- [ ] Verify toast notifications for all actions
- [ ] Verify loading states
- [ ] Verify error states
- [ ] Verify success states
- [ ] Verify badges update correctly

#### C. Dark Mode Support
- [ ] Toggle dark mode
- [ ] Verify all new components support dark theme
- [ ] Package manager modal
- [ ] Snippet library
- [ ] Encryption dialogs
- [ ] Verify contrast and readability

---

## 🐛 Bug Tracking

### Found Bugs:
_Document any bugs found during testing_

| # | Component | Description | Severity | Status |
|---|-----------|-------------|----------|--------|
| 1 | Build Service | ... | Low/Med/High | Open/Fixed |

---

## ✅ Test Results Summary

### Build System
- Total Tests: [ ] / [ ]
- Passed: [ ]
- Failed: [ ]
- Blocked: [ ]

### Snippet Library
- Total Tests: [ ] / [ ]
- Passed: [ ]
- Failed: [ ]
- Blocked: [ ]

### Encrypted API Keys
- Total Tests: [ ] / [ ]
- Passed: [ ]
- Failed: [ ]
- Blocked: [ ]

### Integration
- Total Tests: [ ] / [ ]
- Passed: [ ]
- Failed: [ ]
- Blocked: [ ]

---

## 📝 Testing Notes

_Add any observations, edge cases, or issues discovered during testing_

---

## 🚀 Ready to Test

**To begin testing**:
```bash
pnpm run dev
```

Navigate to `http://localhost:3000` and follow the test plan above.

**Recommended Testing Order**:
1. Basic UI navigation and layout
2. Individual feature testing (build system, snippets, encryption)
3. Cross-feature integration testing
4. Error handling and edge cases
5. Performance and browser compatibility

---

**Test Execution Date**: ___________
**Tester**: ___________
**Environment**: ___________
**Browser**: ___________
**Build Version**: ___________
