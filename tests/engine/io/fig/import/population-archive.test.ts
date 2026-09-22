import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import {
  registerFigPopulationWorker,
  registerOriginalArchiveRequest,
  releaseFigPopulationWorker,
  requestOriginalArchive
} from '#core/kiwi/fig/population/client'

test('population registration preserves original archive responses on the shared port', async () => {
  const graph = new SceneGraph()
  const channel = new MessageChannel()
  const workerURL = URL.createObjectURL(new Blob(['void 0'], { type: 'text/javascript' }))
  const worker = new Worker(workerURL)
  const archive = Promise.withResolvers<Uint8Array>()
  const bytes = new Uint8Array([1, 2, 3])
  channel.port1.onmessage = (event: MessageEvent<{ type: string; bytes: Uint8Array }>) => {
    if (event.data.type === 'original-archive-result') archive.resolve(event.data.bytes)
  }
  channel.port2.onmessage = () => {
    channel.port2.postMessage({ type: 'original-archive-result', requestId: 'save', bytes })
  }
  channel.port2.start()
  registerFigPopulationWorker(graph, worker, channel.port1)
  registerOriginalArchiveRequest(graph, () => {
    channel.port1.postMessage({ type: 'original-archive', requestId: 'save' })
    return archive.promise
  })
  const timeout = setTimeout(() => archive.reject(new Error('Archive response was lost')), 250)
  try {
    expect(await requestOriginalArchive(graph)).toEqual(bytes)
  } finally {
    clearTimeout(timeout)
    releaseFigPopulationWorker(graph)
    channel.port2.close()
    URL.revokeObjectURL(workerURL)
  }
})
