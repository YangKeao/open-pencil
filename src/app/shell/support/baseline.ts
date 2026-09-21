/**
 * Minimum browser engines OpenPencil supports.
 *
 * This is the single source for the Vite `build.target` (syntax lowering), the
 * startup support gate, and the system requirements in the docs. Chrome, Edge
 * and Safari follow Vite's "baseline widely available" default; Firefox is
 * raised to 128 because Tailwind CSS 4 needs `@property`, which Firefox gained
 * there. Pinned explicitly so a Vite major cannot move it silently.
 *
 * Vite lowers syntax but never polyfills APIs, so every runtime built-in the
 * app uses must exist in these versions; the `no-builtins-above-browser-baseline`
 * lint rule rejects the known offenders. On macOS the desktop app renders in
 * the system WebKit, which reaches Safari 16.4 with macOS 13.3.
 */
export const BROWSER_BASELINE = {
  chrome: 111,
  edge: 111,
  firefox: 128,
  safari: 16.4,
  ios: 16.4
} as const

export type BaselineBrowser = keyof typeof BROWSER_BASELINE

/** Vite/esbuild target strings derived from the baseline. */
export function viteBuildTarget(): string[] {
  return Object.entries(BROWSER_BASELINE).map(([browser, version]) => `${browser}${version}`)
}

/**
 * A capability that is absent on any engine older than the baseline. The gate
 * runs `test()` before loading the app; `since` records each browser's first
 * supporting version so a unit test can prove no sentinel demands more than
 * the baseline while every browser has at least one sentinel at it.
 */
export interface SupportSentinel {
  readonly name: string
  readonly since: Readonly<Partial<Record<BaselineBrowser, number>>>
  readonly test: () => boolean
}

function hasCSSSupport(property: string, value: string): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports(property, value)
    : false
}

export const SUPPORT_SENTINELS: readonly SupportSentinel[] = [
  {
    name: 'WebAssembly',
    since: { chrome: 57, edge: 16, firefox: 52, safari: 11, ios: 11 },
    test: () => typeof WebAssembly === 'object'
  },
  {
    name: 'WebGL 2',
    since: { chrome: 56, edge: 79, firefox: 51, safari: 15, ios: 15 },
    test: () => typeof WebGL2RenderingContext === 'function'
  },
  {
    name: 'structuredClone',
    since: { chrome: 98, edge: 98, firefox: 94, safari: 15.4, ios: 15.4 },
    test: () => typeof structuredClone === 'function'
  },
  {
    name: 'Array.prototype.toSorted',
    since: { chrome: 110, edge: 110, firefox: 115, safari: 16, ios: 16 },
    test: () => typeof Array.prototype.toSorted === 'function'
  },
  {
    name: 'String.prototype.isWellFormed',
    since: { chrome: 111, edge: 111, firefox: 119, safari: 16.4, ios: 16.4 },
    test: () => typeof String.prototype.isWellFormed === 'function'
  },
  {
    name: 'CSS color-mix()',
    since: { chrome: 111, edge: 111, firefox: 113, safari: 16.2, ios: 16.2 },
    test: () => hasCSSSupport('color', 'color-mix(in srgb, red, blue)')
  },
  {
    name: 'CSS @property',
    since: { chrome: 85, edge: 85, firefox: 128, safari: 16.4, ios: 16.4 },
    test: () => typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function'
  }
]

/** Names of the sentinels the current engine fails; empty when supported. */
export function missingSupportSentinels(
  sentinels: readonly SupportSentinel[] = SUPPORT_SENTINELS
): string[] {
  const missing: string[] = []
  for (const sentinel of sentinels) {
    let supported = false
    try {
      supported = sentinel.test()
    } catch {
      supported = false
    }
    if (!supported) missing.push(sentinel.name)
  }
  return missing
}
