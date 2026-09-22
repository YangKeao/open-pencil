import 'fake-indexeddb/auto'
import { afterEach, expect, spyOn, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { SceneGraph } from '@open-pencil/scene-graph'

import type { AutomationTarget } from '@/app/automation/bridge/target'
import { createAutomationToolHandler } from '@/app/automation/bridge/tool-handlers'
import { createEditorStore } from '@/app/editor/session'

const cleanup: (() => void)[] = []
afterEach(() => {
  for (const dispose of cleanup.splice(0).reverse()) dispose()
})

function setup() {
  const graph = new SceneGraph()
  const first = graph.getPages()[0]
  const second = graph.addPage('Second')
  const store = createEditorStore(graph)
  cleanup.push(() => store.dispose())
  // Rendering is outside this bridge test. Keep the asynchronous store boundary.
  const switchPage = spyOn(store, 'switchPage').mockImplementation(async (id) => {
    await Promise.resolve()
    store.state.currentPageId = id
  })
  cleanup.push(() => switchPage.mockRestore())
  const handle = createAutomationToolHandler((currentStore, pageId) => {
    const api = new FigmaAPI(currentStore.graph)
    api.currentPage = api.wrapNode(pageId ?? currentStore.state.currentPageId)
    return api
  })
  async function call(name: string, args = {}, pageId = store.state.currentPageId) {
    const target: AutomationTarget = {
      store,
      documentId: 'test-document',
      documentName: 'Test document',
      pageId,
      pageName: graph.getNode(pageId)?.name ?? ''
    }
    return handle(target, { name, args })
  }
  return { first, second, store, switchPage, call }
}

for (const by of ['name', 'id'] as const) {
  test(`switch_page by ${by} persists across separate bridge calls`, async () => {
    const { second, switchPage, call } = setup()
    expect(await call('switch_page', { page: second[by] })).toEqual({
      ok: true,
      result: { page: second.name, id: second.id }
    })
    expect(switchPage).toHaveBeenCalledWith(second.id)
    expect(await call('get_current_page')).toEqual({
      ok: true,
      result: { id: second.id, name: second.name }
    })
  })
}

test('a page-scoped read does not switch the visible page', async () => {
  const { first, second, store, switchPage, call } = setup()
  expect(await call('get_current_page', {}, second.id)).toEqual({
    ok: true,
    result: { id: second.id, name: second.name }
  })
  expect(store.state.currentPageId).toBe(first.id)
  expect(switchPage).not.toHaveBeenCalled()
})

test('explicit switch_page activates even the already targeted page', async () => {
  const { second, store, call } = setup()
  await call('switch_page', { page: second.id }, second.id)
  expect(store.state.currentPageId).toBe(second.id)
})

test('a failed page-scoped switch leaves the visible page unchanged', async () => {
  const { first, second, store, switchPage, call } = setup()
  expect(await call('switch_page', { page: 'Missing page' }, second.id)).toEqual({
    ok: true,
    result: { error: 'Page "Missing page" not found' }
  })
  expect(store.state.currentPageId).toBe(first.id)
  expect(switchPage).not.toHaveBeenCalled()
})

test('switch_page waits for the editor to finish switching', async () => {
  const { second, store, switchPage, call } = setup()
  const entered = Promise.withResolvers<undefined>()
  const ready = Promise.withResolvers<undefined>()
  switchPage.mockImplementation(async (id) => {
    entered.resolve(undefined)
    await ready.promise
    store.state.currentPageId = id
  })
  let completed = false
  const response = call('switch_page', { page: second.id }).then(() => {
    completed = true
    return undefined
  })
  try {
    await Promise.race([entered.promise, response])
    expect(completed).toBe(false)
  } finally {
    ready.resolve(undefined)
    await response
  }
  expect(store.state.currentPageId).toBe(second.id)
})
