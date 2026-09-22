# Background MCP timeout investigation

Observed on the installed local-v0.15.1-1 build, macOS 26.6. This investigation does not change the published App.

## Evidence

- Page switching commits editor state, then waits for presentation in `src/app/editor/session/create.ts`. The preparation controller rejects after 10 seconds without an acknowledgement.
- The renderer schedules work via `requestAnimationFrame` in `packages/vue/src/canvas/surface/render-loop.ts`.
- File opening and viewport fitting also await animation frames in `src/app/tabs/index.ts` and `src/app/document/io/browser.ts`. These waits have no fallback.
- A background switch returned a presentation timeout, while a later request reported the new current page. Opening a fixture timed out at the RPC boundary and completed after the window came forward.
- The same switch/read/edit/save/reopen sequence passed with the native App in the foreground, including from the final Nix installation.

This strongly points to an operation-completion contract coupled to visibility-dependent rendering; it is not another loss of the selected page. Precise background lifecycle behavior still needs dedicated native validation.

## Recommended follow-up

1. Separate committed document/page readiness from visible presentation in the automation path. Await parsing, lazy population, fonts and layout, and propagate their failures. Permit MCP state operations to finish without an on-screen frame; schedule repaint normally when visible. Do not swallow all timeouts or report partially loaded documents as ready.
2. Replace the file-opening animation-frame-only yields with a bounded, cancellable scheduling path. Account for visibility changing after a request starts, not only a one-time `document.hidden` check. Keep foreground loading feedback intact.
3. Evaluate Tauri `backgroundThrottling: "disabled"` for the desktop automation use case. Tauri supports this on macOS 14+; the currently pinned Tauri/Wry versions expose it. It avoids broader WebView suspension, but should not be assumed to restore offscreen animation frames. Measure idle CPU/battery impact before enabling it globally.
4. Treat image export separately: it must render the requested output offscreen or report a real rendering failure. Document-state completion is not evidence that an image has rendered.

Acceptance must cover foreground, fully covered, minimized, and hidden windows; foreground-to-background transitions during requests; first open and lazy page loads; and a return to the foreground showing the committed state. Repeat after at least five minutes in the background to exercise suspension. Verify invalid files, missing fonts, cancellation and real layout/render errors still propagate. Sleeping Macs and a quit App remain outside the background-operation guarantee.

Reference: https://v2.tauri.app/reference/javascript/api/namespacewebview/#backgroundthrottling

## Revision 2 installed verification

`backgroundThrottling: "disabled"` is now installed in revision 2. With the window hidden through its native menu and LaunchServices confirming `(hidden)`, read-only requests and saving an already loaded document succeeded. Opening a new file still returned a 20-second RPC timeout; switching an already loaded page still returned the presentation timeout. Restoring the window allowed the pending import to finish. This verifies that the configuration change alone does not fix the animation-frame/presentation dependency described above.
