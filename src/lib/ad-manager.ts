// src/lib/ad-manager.ts
// Mirrors iOS AdManager.swift / Android AdManager.kt
// Module-level singleton — no class instantiation needed.

import { AppConfig } from './app-config'

export enum RewardType {
  PREMIUM_MODEL_ACCESS    = 'premiumModelAccess',
  ADVANCED_EXPORT         = 'advancedExport',
  CLOUD_SYNC              = 'cloudSync',
  UNLIMITED_FAVORITES_24H = 'unlimitedFavorites',
}

// Module-level state (singleton equivalent)
let sceneRunCount = 0
let lastInterstitialShownMs = 0
let showInterstitialCallback: (() => void) | null = null
let showRewardedCallback: ((type: RewardType) => void) | null = null

export const adManager = {
  // Register callbacks from React components
  onShowInterstitial(cb: () => void) {
    showInterstitialCallback = cb
  },

  onShowRewarded(cb: (type: RewardType) => void) {
    showRewardedCallback = cb
  },

  // Called by playground-view.tsx on every scene run
  onSceneRun() {
    if (!AppConfig.adsEnabled) return

    sceneRunCount++
    const elapsedSeconds = (Date.now() - lastInterstitialShownMs) / 1000

    if (AppConfig.showAdDebugLogs) {
      console.debug(
        `[AdManager] scene run #${sceneRunCount}, elapsed=${elapsedSeconds.toFixed(0)}s`
      )
    }

    if (
      sceneRunCount >= AppConfig.scenesBeforeInterstitial &&
      elapsedSeconds >= AppConfig.interstitialMinIntervalSeconds
    ) {
      sceneRunCount = 0
      lastInterstitialShownMs = Date.now()
      showInterstitialCallback?.()
    }
  },

  // Called to trigger a rewarded ad flow
  triggerRewarded(type: RewardType) {
    showRewardedCallback?.(type)
  },
}
