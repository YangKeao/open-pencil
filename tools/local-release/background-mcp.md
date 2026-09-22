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

## Options without changing application logic

Research on 2026-09-22 found no supported Tauri/macOS configuration that guarantees animation frames for a fully hidden window. This is a bounded finding, not a claim that no private mechanism exists. Current WebKit source agrees with the observed behavior, but is not an exact source match for the installed system WebKit binary.

- **Keep the window visible without focusing it.** WebKit's macOS visibility check considers the window/view visibility and occlusion; focus is not part of that check. A tiled window or visible area on another display should avoid the hidden-state suspension. Keep it on a currently displayed desktop and avoid minimizing, hiding or fully covering it. Our earlier non-frontmost smoke passed; arbitrary monitor/Space arrangements have not been tested.
- **Activate for UI-dependent MCP calls.** Before `open_file` or `switch_page`, activate OpenPencil with the existing macOS `open` command and leave it visible for the operation. This has worked in local acceptance. It can interrupt focus, so batch operations when using this approach. It is a workflow workaround, not hidden-window support.
- **Use the existing headless CLI for background authoring.** Supplying a `.fig` path to `openpencil eval` runs without the editor UI. This turn verified the installed 0.15.1 CLI could load a dedicated fixture, select its Android page, rename a rectangle, write a new file, and read the changed node back. Output: ignored `scratch/acceptance-disabled/headless-verified.fig`. Use a new output file and open it for review; this mode does not operate on unsaved in-memory UI edits. Fonts/rendering and complex file fidelity need their own checks.

### Why the other knobs are not a verified fix

`WKPreferences.setInactiveSchedulingPolicy(.none)` changes process throttling/assertion preferences. Separately, `Page::setIsVisibleInternal(false)` calls `suspendScriptedAnimations()` unconditionally. The hidden-page CSS-animation preference gates CSS timeline suspension, not that scripted-animation call. Disabling DOM timer throttling or process suppression therefore does not directly remove the frame dependency.

Apple documented `NSAppSleepDisabled` as a per-app diagnostic option in its Mavericks release notes. That is an App Nap control, not a promise to keep hidden WebKit animation frames running. It has not been tested on this Mac, and no defaults were changed during this research.

WebKit also exposes private window-occlusion detection control, but Tauri does not expose it as a supported config field. The current visibility implementation still rejects a non-visible window even if occlusion detection is off. Runtime injection or replacing animation-frame scheduling would change runtime behavior and was not attempted.

Sources:

- https://github.com/tauri-apps/tauri/issues/5250#issuecomment-2569380578
- https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/Cocoa/WKPreferences.mm
- https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp
- https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/mac/PageClientImplMac.mm
- https://developer.apple.com/library/archive/releasenotes/MacOSX/WhatsNewInOSX/Articles/MacOSX10_9.html
- https://openpencil.dev/programmable/cli/scripting
