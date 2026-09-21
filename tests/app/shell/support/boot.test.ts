import { describe, expect, mock, test } from 'bun:test'

import { defineComponent, h, nextTick, onMounted } from 'vue'

import { observeBootErrors } from '@/app/shell/support/boot'

import { createTestRenderer, hostNode } from '#tests/helpers/vue/renderer'

function mountApp(root: ReturnType<typeof defineComponent>) {
  const app = createTestRenderer().createApp(root)
  const observer = observeBootErrors(app)
  const logged = mock(() => undefined)
  const restoreConsole = console.error
  console.error = logged
  try {
    app.mount(hostNode())
  } finally {
    console.error = restoreConsole
  }
  return { app, observer, logged }
}

describe('boot error observer', () => {
  test('captures a setup failure that leaves the first render blank', async () => {
    const error = new TypeError('Promise.withResolvers is not a function')
    const Broken = defineComponent({
      setup() {
        throw error
      },
      render: () => h('div')
    })
    const { app, observer, logged } = mountApp(Broken)
    await nextTick()
    expect(observer.stop()).toEqual({ error })
    expect(logged).toHaveBeenCalledWith(error)
    expect(app.config.errorHandler).toBeUndefined()
  })

  test('leaves lifecycle hook errors to the regular error handling', async () => {
    const Flaky = defineComponent({
      setup() {
        onMounted(() => {
          throw new Error('non-fatal')
        })
        return () => h('div', 'rendered')
      }
    })
    const { observer, logged } = mountApp(Flaky)
    await nextTick()
    expect(observer.stop()).toBeUndefined()
    expect(logged).toHaveBeenCalledTimes(1)
  })

  test('forwards to and restores a previously installed handler', () => {
    const app = createTestRenderer().createApp(defineComponent({ render: () => h('div') }))
    const previous = mock(() => undefined)
    app.config.errorHandler = previous
    const observer = observeBootErrors(app)
    const error = new Error('boom')
    app.config.errorHandler?.(error, null, 'setup function')
    expect(previous).toHaveBeenCalledWith(error, null, 'setup function')
    expect(observer.stop()).toEqual({ error })
    expect(app.config.errorHandler).toBe(previous)
  })
})
