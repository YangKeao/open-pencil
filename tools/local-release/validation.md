# Local release validation — 2026-09-22

Built source: `ed9d98142ad1a337e3a67865bb2161e94b7cd0fa`, based on upstream `v0.15.1`.

- Before the fix: 4 of 6 targeted bridge regression cases failed.
- After the fix: all 6 passed; the related automation/MCP suites passed 106 tests (492 assertions).
- TypeScript and production type-aware lint passed. The complete production web/Tauri build passed using Bun 1.4.2 and Rust 1.98.1 on Apple Silicon macOS.
- The App ZIP is ad-hoc signed. Signature verification passed before packaging and after unpacking through a local-source Nix derivation.
- Live HTTP MCP with OpenPencil Local in the foreground passed: switch by name and ID, fresh request current-page persistence, page-scoped reads without changing the current page, explicit switch with matching page scope, marker edit, save, close, reopen and read-back.
- Acceptance used a dedicated two-page rectangle fixture, not the user's design. No user content was edited.

## Limitations

Initial file opening returned a 20-second RPC timeout while the app was in the background; the document became available after the user brought it forward. A later switch also timed out waiting for presentation, although the page state changed. Activating the app before the same sequence allowed it to pass. This is a separate foreground/background rendering constraint that this narrow page-state fix does not address.

Full browser and native WebDriver test suites were not run. This release is not Developer ID signed or notarized. It disables in-app upstream updates and requires the separately installed MCP server.

The full nix-darwin configuration build also passed using the published GitHub ZIP, including fixed-hash download verification. The resulting Nix-store App passed `codesign --verify --deep --strict`.

System activation completed. The Homebrew `/Applications/OpenPencil.app` was removed, and `/Applications/Nix Apps/OpenPencil Local.app` passed signature verification and the complete live HTTP MCP acceptance sequence (including initial file opening). The original `good-things-v2.fig` was then reopened without editing it.

## Revision 2 — disabled throttling and FIG save fix

Source: `7375c2c30bbdb468907146e0a2a74cf05b4a49bb`. App version `0.15.1+yangkeao.2`.

The desktop window explicitly configures `backgroundThrottling: "disabled"`. A separately committed save fix uses an additional MessagePort listener instead of replacing the parser's original-archive response handler. Previously an unchanged imported document could hang during save; the existing edit-before-save smoke test missed that path.

The new shared-port regression test failed before the fix and passed after it. All six related population/import/export tests passed (30 assertions). Production lint, types, web and native builds and code-signature verification passed. Live MCP verified immediate save after opening an unchanged fixture, then page switching, editing, save and reopen. Full test suites were not repeated.

The user's open design was recovered through a same-value page-name update followed by Save As, invalidating the affected archive cache without changing the page name. The recovered file parsed independently with three pages and 244 nodes. The original disk file and an additional backup were preserved.

Post-activation background acceptance: the native application menu successfully hid the window, confirmed by LaunchServices `(hidden)`. Under that verified state, `open_file` timed out at 20 seconds, while a read-only document query returned in approximately 0.01 seconds. In a separate test with the document already loaded, reading and saving passed while hidden, but `switch_page` failed with the presentation timeout. Thus `disabled` alone does not resolve the visibility-dependent open/switch waits. Long background idle, minimized windows and battery impact remain unverified.

The recovered real design also opened and saved successfully in revision 2 without an intervening edit. The full nix-darwin build downloaded the published revision-2 ZIP, verified its fixed hash and completed; the Nix-packaged App passed signature verification. System activation completed. The running executable and verified code signature are from `/Applications/Nix Apps/OpenPencil Local.app`, version `0.15.1+yangkeao.2`. The ordinary open/save/switch/edit/reopen sequence passed from that installation.

The manual acceptance helper initially leaked HTTP MCP sessions and hit the server limit of 10. The helper now sends DELETE for its session on exit. The old orphan MCP process was restarted without changing authentication or tool preferences; the separate hidden save/switch result above was reproduced with clean sessions. This test-client issue is distinct from the rendering timeout.
