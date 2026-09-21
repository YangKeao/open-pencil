import { describe, expect, test } from 'bun:test'

import {
  BROWSER_BASELINE,
  SUPPORT_SENTINELS,
  missingSupportSentinels,
  viteBuildTarget,
  type BaselineBrowser
} from '@/app/shell/support/baseline'

const BROWSERS = Object.keys(BROWSER_BASELINE) as BaselineBrowser[]

describe('browser baseline', () => {
  test('derives the Vite build target from the baseline', () => {
    expect(viteBuildTarget()).toEqual([
      'chrome111',
      'edge111',
      'firefox128',
      'safari16.4',
      'ios16.4'
    ])
  })

  test.each(BROWSERS)('no sentinel demands more than the %s baseline', (browser) => {
    for (const sentinel of SUPPORT_SENTINELS) {
      const since = sentinel.since[browser]
      expect(since, `${sentinel.name} has no ${browser} entry`).toBeDefined()
      expect(since ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(BROWSER_BASELINE[browser])
    }
  })

  test.each(BROWSERS)('at least one sentinel marks the %s baseline exactly', (browser) => {
    const newest = Math.max(...SUPPORT_SENTINELS.map((sentinel) => sentinel.since[browser] ?? 0))
    expect(newest).toBe(BROWSER_BASELINE[browser])
  })

  test('reports the names of failing sentinels and tolerates throwing tests', () => {
    const missing = missingSupportSentinels([
      { name: 'present', since: {}, test: () => true },
      { name: 'absent', since: {}, test: () => false },
      {
        name: 'throws',
        since: {},
        test: () => {
          throw new TypeError('not a function')
        }
      }
    ])
    expect(missing).toEqual(['absent', 'throws'])
  })
})
