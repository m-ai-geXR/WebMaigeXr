/**
 * The m{ai}geXR wordmark.
 *
 * Brand rule: "{ai}" is cobalt, the rest takes the surrounding text colour
 * (white on the app's dark chrome). Cobalt #2050e0 is --color-accent from the
 * brand site.
 *
 * This exists as a component for two reasons: the rule stays in one place, and
 * the literal string "m{ai}geXR" cannot be typed directly into JSX, where
 * {ai} parses as an expression referencing an undefined variable.
 */

export const BRAND_COBALT = '#2050e0'

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      m<span style={{ color: BRAND_COBALT }}>{'{ai}'}</span>geXR
    </span>
  )
}

/** Plain-text form, for titles, metadata and anywhere markup is not allowed. */
export const WORDMARK_TEXT = 'm{ai}geXR'
