import { describe, expect, test } from 'bun:test'

import { lint, ruleDiagnostics } from './helpers/lint.ts'

const rule = 'no-builtins-above-browser-baseline'
const rules = { [`open-pencil/${rule}`]: 'error' }

describe('no-builtins-above-browser-baseline', () => {
  test.each([
    'const completion = Promise.withResolvers<void>()',
    'const groups = Object.groupBy(items, (item) => item.kind)',
    'const rows = await Array.fromAsync(stream)',
    'const pattern = RegExp.escape(input)'
  ])('rejects static built-ins newer than the baseline: %s', async (source) => {
    expect(ruleDiagnostics(await lint(source, rules, 'src/app/example.ts'), rule)).toHaveLength(1)
    expect(
      ruleDiagnostics(await lint(source, rules, 'packages/core/src/example.ts'), rule)
    ).toHaveLength(1)
  })

  test.each([
    'tests/app/example.test.ts',
    'tools/lint/src/example.ts',
    'packages/cli/src/example.ts',
    'packages/core/tests/example.test.ts'
  ])('exempts code that never ships to a browser: %s', async (path) => {
    const source = 'const completion = Promise.withResolvers<void>()'
    expect(ruleDiagnostics(await lint(source, rules, path), rule)).toHaveLength(0)
  })

  test.each([
    'const completion = createDeferred<void>()',
    'const settled = await Promise.allSettled(tasks)',
    'const sorted = rows.toSorted((a, b) => a - b)',
    'const custom = { withResolvers: () => undefined }; custom.withResolvers()'
  ])('accepts baseline APIs and unrelated members: %s', async (source) => {
    expect(ruleDiagnostics(await lint(source, rules, 'src/app/example.ts'), rule)).toHaveLength(0)
  })
})
