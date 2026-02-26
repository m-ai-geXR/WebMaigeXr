// src/lib/app-config.ts
// Mirrors iOS AppConfig.swift / Android AppConfig.kt
// Reads typed values from NEXT_PUBLIC_* env vars.
// Auto-disables ads in Electron (policy + technical constraint).

const isElectron =
  typeof window !== 'undefined' && !!(window as any).electronAPI

export const AppConfig = {
  // Master ad switch — always false in Electron
  adsEnabled: !isElectron && process.env.NEXT_PUBLIC_ADS_ENABLED === 'true',
  forcePremiumMode: process.env.NEXT_PUBLIC_FORCE_PREMIUM === 'true',
  showAdDebugLogs: process.env.NEXT_PUBLIC_AD_DEBUG_LOGS === 'true',

  // AdSense IDs
  adsensePublisherId: process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? '',
  adsenseBannerSlot: process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT ?? '',
  adsenseInterstitialSlot: process.env.NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT ?? '',
  adsenseRewardedSlot: process.env.NEXT_PUBLIC_ADSENSE_REWARDED_SLOT ?? '',

  // Frequency caps
  interstitialMinIntervalSeconds: parseInt(
    process.env.NEXT_PUBLIC_INTERSTITIAL_INTERVAL_SECONDS ?? '480',
    10
  ),
  scenesBeforeInterstitial: parseInt(
    process.env.NEXT_PUBLIC_SCENES_BEFORE_INTERSTITIAL ?? '3',
    10
  ),

  // Feature flags
  premiumSubscriptionEnabled: true,
  cloudSyncEnabled: false,

  printConfiguration() {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[AppConfig]', {
        adsEnabled: this.adsEnabled,
        forcePremium: this.forcePremiumMode,
        interstitialInterval: this.interstitialMinIntervalSeconds,
        scenesBeforeAd: this.scenesBeforeInterstitial,
        isElectron,
      })
    }
  },
} as const
