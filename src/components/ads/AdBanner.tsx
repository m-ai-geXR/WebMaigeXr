'use client'

// src/components/ads/AdBanner.tsx
// Mirrors iOS AdBannerView.swift / Android AdBannerView.kt
// Renders a Google AdSense responsive banner above the bottom navigation.
// Invisible when ads are disabled or user is premium.

import { useEffect } from 'react'
import { AppConfig } from '@/lib/app-config'
import { useAppStore } from '@/store/app-store'

export function AdBanner() {
  const isPremiumUser = useAppStore((s) => s.isPremiumUser)

  useEffect(() => {
    if (!AppConfig.adsEnabled || isPremiumUser) return
    try {
      ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
      ;(window as any).adsbygoogle.push({})
    } catch (e) {
      if (AppConfig.showAdDebugLogs) console.debug('[AdBanner] push error', e)
    }
  }, [isPremiumUser])

  if (!AppConfig.adsEnabled || isPremiumUser) return null

  return (
    <div
      className="w-full flex justify-center bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
      style={{ minHeight: 50 }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AppConfig.adsensePublisherId}
        data-ad-slot={AppConfig.adsenseBannerSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
