'use client'

// src/components/ads/AdInterstitial.tsx
// Full-screen modal overlay ad triggered after N scene runs.
// Mirrors iOS/Android interstitial ad behavior.
// Dismissible after 5 seconds via the close button.

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { AppConfig } from '@/lib/app-config'
import { adManager } from '@/lib/ad-manager'
import { useAppStore } from '@/store/app-store'

export function AdInterstitial() {
  const isPremiumUser = useAppStore((s) => s.isPremiumUser)
  const [visible, setVisible] = useState(false)
  const [canDismiss, setCanDismiss] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!AppConfig.adsEnabled || isPremiumUser) return

    adManager.onShowInterstitial(() => {
      setVisible(true)
      setCanDismiss(false)
      timerRef.current = setTimeout(() => setCanDismiss(true), 5000)
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPremiumUser])

  useEffect(() => {
    if (!visible) return
    try {
      ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
      ;(window as any).adsbygoogle.push({})
    } catch (e) {
      if (AppConfig.showAdDebugLogs) console.debug('[AdInterstitial] push error', e)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-4 w-[336px]">
        {canDismiss ? (
          <button
            onClick={() => setVisible(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="Close ad"
          >
            <X size={18} />
          </button>
        ) : (
          <div className="text-xs text-gray-400 text-center mb-2">
            Ad closes in 5s...
          </div>
        )}
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={AppConfig.adsensePublisherId}
          data-ad-slot={AppConfig.adsenseInterstitialSlot}
          data-ad-format="auto"
        />
      </div>
    </div>
  )
}
