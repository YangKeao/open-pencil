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

System activation and a smoke check from `/Applications/Nix Apps` are deployment checks to record after `darwin-rebuild switch` completes.
